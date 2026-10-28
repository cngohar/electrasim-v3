import { describe, expect, it } from 'vitest';
import images from '../../../scripts/fixtures/profiles/avatar-images.json';
import { validateAvatar } from './avatar';
const buffer = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0)).buffer;
describe('bounded image validation', () => {
  for (const [format, type] of [
    ['jpeg', 'image/jpeg'],
    ['webp', 'image/webp'],
  ] as const) {
    it(`accepts complete ${format} containers produced by a real browser`, async () => {
      const image = await validateAvatar(buffer(images[format]), type);
      expect(image.type).toBe(type);
      expect(image.bytes.length).toBeGreaterThan(20);
    });
    it(`rejects truncated ${format} or a mismatched declared MIME`, async () => {
      const bytes = buffer(images[format]);
      await expect(validateAvatar(bytes.slice(0, bytes.byteLength - 3), type)).rejects.toThrow();
      await expect(validateAvatar(bytes, 'image/png')).rejects.toThrow();
    });
    it(`rejects trailing ${format} polyglot bytes`, async () => {
      const data = new Uint8Array(buffer(images[format]));
      const trailing = new Uint8Array(data.length + 8);
      trailing.set(data);
      trailing.set(new TextEncoder().encode('<script>'), data.length);
      await expect(validateAvatar(trailing.buffer, type)).rejects.toThrow();
    });
  }
  it('rejects SVG, fake signatures and oversized input before decoding', async () => {
    for (const bytes of [
      new TextEncoder().encode('<svg></svg>'),
      new Uint8Array([137, 80, 78, 71]),
      new Uint8Array(2 * 1024 * 1024 + 1),
    ])
      await expect(validateAvatar(Uint8Array.from(bytes).buffer, 'image/png')).rejects.toThrow();
  });
});
