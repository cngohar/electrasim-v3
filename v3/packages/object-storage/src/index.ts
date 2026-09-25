import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { ObjectStore } from "@electrasim/platform-contracts";
import { S3Client } from "bun";

function validKey(key: string): boolean {
  return (
    /^(?:[a-zA-Z0-9][a-zA-Z0-9._-]*\/)*[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(key) && !key.includes("..")
  );
}

export class LocalObjectStore implements ObjectStore {
  private readonly root: string;
  constructor(root: string) {
    this.root = resolve(root);
  }

  async put(key: string, value: Uint8Array, _contentType: string): Promise<void> {
    const path = this.path(key);
    await mkdir(dirname(path), { recursive: true });
    await Bun.write(path, value);
  }
  async get(key: string): Promise<Uint8Array | null> {
    const file = Bun.file(this.path(key));
    return (await file.exists()) ? new Uint8Array(await file.arrayBuffer()) : null;
  }
  async delete(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }
  private path(key: string): string {
    if (!validKey(key)) throw new Error("invalid_object_key");
    const path = resolve(this.root, key);
    if (!path.startsWith(`${this.root}/`)) throw new Error("invalid_object_key");
    return path;
  }
}

export class S3ObjectStore implements ObjectStore {
  private readonly client: S3Client;
  constructor(config: {
    readonly endpoint: string;
    readonly bucket: string;
    readonly region?: string;
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
  }) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      bucket: config.bucket,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      ...(config.region ? { region: config.region } : {}),
    });
  }
  async put(key: string, value: Uint8Array, contentType: string): Promise<void> {
    if (!validKey(key)) throw new Error("invalid_object_key");
    await this.client.file(key).write(value, { type: contentType });
  }
  async get(key: string): Promise<Uint8Array | null> {
    if (!validKey(key)) throw new Error("invalid_object_key");
    const file = this.client.file(key);
    return (await file.exists()) ? new Uint8Array(await file.arrayBuffer()) : null;
  }
  async delete(key: string): Promise<void> {
    if (!validKey(key)) throw new Error("invalid_object_key");
    await this.client.file(key).delete();
  }
}
