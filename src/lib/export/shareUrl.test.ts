import type { Circuit } from '@electrasim/domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_SHARE_DECOMPRESSED_BYTES,
  decodeShareURL,
  decompressShareText,
  encodeShareURL,
  hasLegacyShareQuery,
  migrateLegacyShareQueryToFragment,
  stripShareURLPayload,
} from './shareUrl';

const CIRCUIT: Circuit = {
  components: [{ id: 'live', type: 'live-terminal', x: 10, y: 20, state: {} }],
  wires: [],
};

describe('share URL', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/app/');
  });

  it('round-trips a circuit through a fragment that is not sent to the origin', async () => {
    const url = await encodeShareURL(CIRCUIT);
    const parsed = new URL(url);

    expect(parsed.searchParams.has('c')).toBe(false);
    expect(new URLSearchParams(parsed.hash.slice(1)).get('c')).toBeTruthy();
    await expect(decodeShareURL(url)).resolves.toEqual(CIRCUIT);
  });

  it('removes a legacy query payload when generating a new share URL', async () => {
    window.history.replaceState(null, '', '/app/?c=legacy&template=lighting#old-anchor');

    const url = new URL(await encodeShareURL(CIRCUIT));

    expect(url.searchParams.has('c')).toBe(false);
    expect(url.searchParams.get('template')).toBe('lighting');
    expect(url.hash).toContain('#old-anchor&c=');
    expect(new URLSearchParams(url.hash.slice(1)).get('c')).toBeTruthy();
  });

  it('migrates a legacy query payload into a recoverable fragment before persistence', async () => {
    const fragmentUrl = await encodeShareURL(CIRCUIT);
    const encoded = new URLSearchParams(new URL(fragmentUrl).hash.slice(1)).get('c');
    const legacyUrl = `https://electrasim.com/app/?template=lighting&c=${encodeURIComponent(encoded ?? '')}#panel=docs`;

    expect(hasLegacyShareQuery(legacyUrl)).toBe(true);
    await expect(decodeShareURL(legacyUrl)).resolves.toEqual(CIRCUIT);
    const migrated = migrateLegacyShareQueryToFragment(legacyUrl);
    const migratedUrl = new URL(migrated);
    expect(migratedUrl.searchParams.has('c')).toBe(false);
    expect(migratedUrl.searchParams.get('template')).toBe('lighting');
    expect(new URLSearchParams(migratedUrl.hash.slice(1)).get('panel')).toBe('docs');
    expect(new URLSearchParams(migratedUrl.hash.slice(1)).get('c')).toBe(encoded);
    // If persistence fails, a reload can still recover from the migrated fragment.
    await expect(decodeShareURL(migrated)).resolves.toEqual(CIRCUIT);
  });

  it('strips fragment payloads without removing unrelated fragment parameters', () => {
    expect(stripShareURLPayload('https://electrasim.com/app/#panel=docs&c=data', 'fragment')).toBe(
      'https://electrasim.com/app/#panel=docs',
    );
    expect(stripShareURLPayload('https://electrasim.com/app/#docs&c=data', 'fragment')).toBe(
      'https://electrasim.com/app/#docs',
    );
  });

  it('rejects a compression bomb before materializing decompressed text', async () => {
    const oversizedJson = JSON.stringify({
      version: 1,
      circuit: CIRCUIT,
      padding: 'x'.repeat(MAX_SHARE_DECOMPRESSED_BYTES),
    });
    const compressed = await gzip(oversizedJson);
    const encoded = bytesToBase64(compressed);
    expect(encoded.length).toBeLessThan(5120);
    const decodeSpy = vi.spyOn(TextDecoder.prototype, 'decode');

    try {
      await expect(decompressShareText(compressed)).rejects.toThrow(
        'Share payload is too large after decompression',
      );
      expect(decodeSpy).not.toHaveBeenCalled();
    } finally {
      decodeSpy.mockRestore();
    }
    await expect(
      decodeShareURL(`https://electrasim.com/app/#c=${encodeURIComponent(encoded)}`),
    ).resolves.toBeNull();
  });

  it('returns null for absent or invalid share data', async () => {
    await expect(decodeShareURL('https://electrasim.com/app/')).resolves.toBeNull();
    await expect(decodeShareURL('https://electrasim.com/app/#c=invalid')).resolves.toBeNull();
    await expect(
      decodeShareURL(`https://electrasim.com/app/#c=${'a'.repeat(5121)}`),
    ).resolves.toBeNull();
  });
});

async function gzip(value: string): Promise<Uint8Array> {
  const compression = new CompressionStream('gzip');
  const writer = compression.writable.getWriter();
  const writeComplete = writer.write(new TextEncoder().encode(value)).then(() => writer.close());
  const compressedResult = new Response(compression.readable).arrayBuffer();
  const [compressed] = await Promise.all([compressedResult, writeComplete]);
  return new Uint8Array(compressed);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
