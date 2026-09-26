import type { Circuit } from '@electrasim/domain';
import { exportJSON, importJSON } from './circuitFormat';

const SHARE_PARAM = 'c';
const MAX_SHARE_ENCODED_CHARS = 5120;
// A compressed URL can expand substantially. Stop streaming before the general
// 10 MiB file-import ceiling so share links cannot create a decompression bomb.
export const MAX_SHARE_DECOMPRESSED_BYTES = 1024 * 1024;

export type SharePayloadLocation = 'fragment' | 'query';

export async function encodeShareURL(circuit: Circuit): Promise<string> {
  const input = new TextEncoder().encode(exportJSON(circuit));
  const compression = new CompressionStream('gzip');
  const writer = compression.writable.getWriter();
  const writeComplete = writer.write(input).then(() => writer.close());
  const compressedResult = new Response(compression.readable).arrayBuffer();
  const [compressed] = await Promise.all([compressedResult, writeComplete]);
  const encoded = bytesToBase64(new Uint8Array(compressed));
  if (encoded.length > MAX_SHARE_ENCODED_CHARS) {
    throw new Error(
      `Circuit too large for URL sharing (${encoded.length} encoded characters, max ${MAX_SHARE_ENCODED_CHARS}). Export as JSON instead.`,
    );
  }

  const url = new URL(window.location.href);
  // Fragments are not included in HTTP requests, access logs, or referrer URLs.
  // Remove a legacy query payload if this link was generated from an old share URL.
  url.searchParams.delete(SHARE_PARAM);
  url.hash = setFragmentSharePayload(url.hash, encoded, true);
  return url.toString();
}

export async function decodeShareURL(urlString?: string): Promise<Circuit | null> {
  try {
    const url = new URL(urlString ?? window.location.href);
    const fragment = new URLSearchParams(url.hash.slice(1));
    // Query decoding remains for old links only. New links always use the fragment.
    const encoded = fragment.get(SHARE_PARAM) ?? url.searchParams.get(SHARE_PARAM);
    if (!encoded) return null;
    if (encoded.length > MAX_SHARE_ENCODED_CHARS) return null;

    const binary = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    const decompressed = await decompressShareText(binary);
    return importJSON(decompressed);
  } catch {
    return null;
  }
}

export function hasLegacyShareQuery(urlString = window.location.href): boolean {
  return new URL(urlString).searchParams.has(SHARE_PARAM);
}

/** Moves an old origin-visible query payload into the local-only fragment. */
export function migrateLegacyShareQueryToFragment(urlString: string): string {
  const url = new URL(urlString);
  const encoded = url.searchParams.get(SHARE_PARAM);
  if (!encoded) return url.toString();

  url.searchParams.delete(SHARE_PARAM);
  url.hash = setFragmentSharePayload(url.hash, encoded, false);
  return url.toString();
}

/** Returns the same URL without the selected share payload, preserving unrelated state. */
export function stripShareURLPayload(urlString: string, location: SharePayloadLocation): string {
  const url = new URL(urlString);
  if (location === 'query') {
    url.searchParams.delete(SHARE_PARAM);
    return url.toString();
  }

  url.hash = fragmentSegments(url.hash)
    .filter((segment) => !new URLSearchParams(segment).has(SHARE_PARAM))
    .join('&');
  return url.toString();
}

function setFragmentSharePayload(hash: string, encoded: string, replace: boolean): string {
  const segments = fragmentSegments(hash);
  const hasSharePayload = segments.some((segment) => new URLSearchParams(segment).has(SHARE_PARAM));
  if (hasSharePayload && !replace) return segments.join('&');

  const retained = replace
    ? segments.filter((segment) => !new URLSearchParams(segment).has(SHARE_PARAM))
    : segments;
  const share = new URLSearchParams();
  share.set(SHARE_PARAM, encoded);
  return [...retained, share.toString()].join('&');
}

function fragmentSegments(hash: string): string[] {
  const fragment = hash.replace(/^#/, '');
  return fragment ? fragment.split('&').filter(Boolean) : [];
}

export async function decompressShareText(compressed: Uint8Array): Promise<string> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(compressed);
      controller.close();
    },
  });
  const reader = source.pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_SHARE_DECOMPRESSED_BYTES) {
        await reader.cancel('Share payload exceeded the decompressed byte limit.');
        throw new Error('Share payload is too large after decompression.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const output = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(output);
}

/** Avoids the argument-count limit hit by spreading large compressed payloads. */
function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}
