import type { ObjectStore } from "@electrasim/platform-contracts";
import { type ContentBody, ContentStudioError } from "./index.ts";

export interface ContentMediaRepository {
  record(input: {
    readonly id: string;
    readonly objectKey: string;
    readonly originalFilename: string;
    readonly contentType: string;
    readonly byteSize: number;
    readonly sha256: string;
    readonly width: number;
    readonly height: number;
    readonly altText: string;
    readonly actorUserId: string;
    readonly requestId: string;
  }): Promise<void>;
  get(input: { readonly id: string; readonly actorUserId: string }): Promise<{
    readonly objectKey: string;
    readonly contentType: string;
    readonly altText: string;
  } | null>;
}

export interface UploadedContentMedia {
  readonly id: string;
  readonly url: string;
  readonly referenceUrl: string;
  readonly contentType: string;
  readonly width: number;
  readonly height: number;
  readonly altText: string;
}

export class ContentMediaService {
  constructor(
    private readonly objects: ObjectStore,
    private readonly repository: ContentMediaRepository,
    private readonly nextId: () => string = () => crypto.randomUUID(),
  ) {}

  async upload(input: {
    readonly bytes: Uint8Array;
    readonly filename: string;
    readonly declaredContentType: string;
    readonly altText: string;
    readonly actorUserId: string;
    readonly requestId: string;
  }): Promise<UploadedContentMedia> {
    if (input.bytes.byteLength < 16 || input.bytes.byteLength > 5 * 1024 * 1024) {
      throw new ContentStudioError("invalid_content");
    }
    const image = inspectImage(input.bytes);
    if (
      !image ||
      image.contentType !== input.declaredContentType ||
      image.width > 8000 ||
      image.height > 8000
    ) {
      throw new ContentStudioError("invalid_content");
    }
    const altText = input.altText.trim();
    if (!altText || altText.length > 300 || !/^[^/\\]{1,180}$/.test(input.filename)) {
      throw new ContentStudioError("invalid_content");
    }
    const id = this.nextId();
    const objectKey = `content/${id}.${image.extension}`;
    const digestInput = new Uint8Array(input.bytes.byteLength);
    digestInput.set(input.bytes);
    const sha256 = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", digestInput.buffer)),
    )
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    await this.objects.put(objectKey, input.bytes, image.contentType);
    try {
      await this.repository.record({
        id,
        objectKey,
        originalFilename: input.filename,
        contentType: image.contentType,
        byteSize: input.bytes.byteLength,
        sha256,
        width: image.width,
        height: image.height,
        altText,
        actorUserId: input.actorUserId,
        requestId: input.requestId,
      });
    } catch (error) {
      await this.objects.delete(objectKey).catch(() => undefined);
      throw error;
    }
    return {
      id,
      url: `/api/admin/content/media/${id}`,
      referenceUrl: `/api/public/media/${id}`,
      contentType: image.contentType,
      width: image.width,
      height: image.height,
      altText,
    };
  }

  async getPreview(input: { readonly id: string; readonly actorUserId: string }): Promise<{
    readonly bytes: Uint8Array;
    readonly contentType: string;
    readonly altText: string;
  } | null> {
    const metadata = await this.repository.get(input);
    if (!metadata) return null;
    const bytes = await this.objects.get(metadata.objectKey);
    return bytes ? { bytes, contentType: metadata.contentType, altText: metadata.altText } : null;
  }
}

export interface PublishedMediaRepository {
  getPublished(id: string): Promise<{
    readonly objectKey: string;
    readonly contentType: string;
    readonly byteSize: number;
    readonly sha256: string;
  } | null>;
}

export class PublishedMediaService {
  constructor(
    private readonly objects: ObjectStore,
    private readonly repository: PublishedMediaRepository,
  ) {}

  async get(id: string): Promise<{
    readonly bytes: Uint8Array;
    readonly contentType: string;
    readonly sha256: string;
  } | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return null;
    }
    const metadata = await this.repository.getPublished(id);
    if (!metadata) return null;
    const bytes = await this.objects.get(metadata.objectKey);
    if (!bytes || bytes.byteLength !== metadata.byteSize) return null;
    return { bytes, contentType: metadata.contentType, sha256: metadata.sha256 };
  }
}

export function collectContentMediaIds(body: ContentBody): readonly string[] {
  const ids = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value !== "string") return;
    const direct = value.match(/\/api\/(?:admin\/content|public)\/media\/([0-9a-f-]{36})/i)?.[1];
    if (direct) ids.add(direct.toLowerCase());
    if (/^[0-9a-f-]{36}$/i.test(value)) ids.add(value.toLowerCase());
  };
  if (body.format === "markdown") {
    for (const match of body.markdown.matchAll(
      /\/api\/(?:admin\/content|public)\/media\/([0-9a-f-]{36})/gi,
    )) {
      if (match[1]) ids.add(match[1].toLowerCase());
    }
  } else {
    const visit = (value: unknown) => {
      if (Array.isArray(value)) return value.forEach(visit);
      if (!value || typeof value !== "object") return add(value);
      for (const [key, child] of Object.entries(value)) {
        if (key === "mediaId" || key === "src") add(child);
        else visit(child);
      }
    };
    visit(body.document);
  }
  return [...ids].slice(0, 50);
}

function inspectImage(
  bytes: Uint8Array,
): { contentType: string; extension: string; width: number; height: number } | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return {
      contentType: "image/png",
      extension: "png",
      width: readU32(bytes, 16),
      height: readU32(bytes, 20),
    };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1] ?? 0;
      const length = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc9, 0xca, 0xcb].includes(marker)) {
        const height = ((bytes[offset + 5] ?? 0) << 8) | (bytes[offset + 6] ?? 0);
        const width = ((bytes[offset + 7] ?? 0) << 8) | (bytes[offset + 8] ?? 0);
        return { contentType: "image/jpeg", extension: "jpg", width, height };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" &&
    String.fromCharCode(...bytes.slice(12, 16)) === "VP8X"
  ) {
    const width = 1 + readU24Le(bytes, 24);
    const height = 1 + readU24Le(bytes, 27);
    return { contentType: "image/webp", extension: "webp", width, height };
  }
  return null;
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) * 0x1000000 +
    ((bytes[offset + 1] ?? 0) << 16) +
    ((bytes[offset + 2] ?? 0) << 8) +
    (bytes[offset + 3] ?? 0)
  );
}
function readU24Le(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16);
}
