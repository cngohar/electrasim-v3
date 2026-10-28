import { HTTPException } from 'hono/http-exception';
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
function bad(): never {
  throw new HTTPException(400, {
    message: 'Choose a valid, static JPG, PNG or WebP image up to 2048 × 2048 pixels and 2 MiB.',
  });
}
function dimensions(width: number, height: number) {
  if (width < 1 || height < 1 || width > 2048 || height > 2048) bad();
}
function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let cursor = 0;
  for (const part of parts) {
    result.set(part, cursor);
    cursor += part.length;
  }
  return result;
}
function ascii(b: Uint8Array, start: number, count: number) {
  return String.fromCharCode(...b.slice(start, start + count));
}
function crc(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const b of bytes) {
    value ^= b;
    for (let i = 0; i < 8; i++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
/** Parse signatures, complete bounded container/frames and dimensions; strip metadata.
 * This is not a general image decoder. Browsers resize/re-encode chosen photos as PNG;
 * server checks never trust the extension or declared MIME. No SVG or animation.
 */
export async function validateAvatar(input: ArrayBuffer, declared: string) {
  const b = new Uint8Array(input);
  if (!b.length || b.length > MAX_AVATAR_BYTES) bad();
  const v = new DataView(input);
  let type = '';
  let bytes: Uint8Array;
  if (
    b.length >= 33 &&
    b[0] === 137 &&
    ascii(b, 1, 3) === 'PNG' &&
    b[4] === 13 &&
    b[5] === 10 &&
    b[6] === 26 &&
    b[7] === 10
  ) {
    type = 'image/png';
    const chunks = [b.slice(0, 8)];
    let offset = 8;
    let header = false;
    let ended = false;
    let data = false;
    let width = 0;
    let height = 0;
    let bits = 0;
    let color = 0;
    const compressed: Uint8Array[] = [];
    while (offset < b.length) {
      if (offset + 12 > b.length) bad();
      const size = v.getUint32(offset);
      if (size > b.length - offset - 12) bad();
      const tag = ascii(b, offset + 4, 4);
      const content = b.slice(offset + 8, offset + 8 + size);
      if (crc(b.slice(offset + 4, offset + 8 + size)) !== v.getUint32(offset + 8 + size)) bad();
      if (!header && tag !== 'IHDR') bad();
      if (tag === 'IHDR') {
        if (header || size !== 13) bad();
        header = true;
        width = v.getUint32(offset + 8);
        height = v.getUint32(offset + 12);
        dimensions(width, height);
        bits = content[8];
        color = content[9];
        if (
          !(
            { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] } as Record<
              number,
              number[]
            >
          )[color]?.includes(bits) ||
          content[10] !== 0 ||
          content[11] !== 0 ||
          content[12] !== 0
        )
          bad();
      } else if (tag === 'IDAT') {
        data = true;
        compressed.push(content);
      } else if (tag === 'IEND') {
        if (size !== 0 || !data) bad();
        ended = true;
      } else if (!['PLTE', 'tRNS'].includes(tag) && tag[0] === tag[0].toUpperCase()) bad();
      if (['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'].includes(tag))
        chunks.push(b.slice(offset, offset + size + 12));
      offset += size + 12;
      if (ended) break;
    }
    if (!ended || offset !== b.length) bad();
    // Validate compressed size and scanline filters without allocating an expanded image.
    const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[color];
    const stride = Math.ceil((width * channels * bits) / 8) + 1;
    const expected = stride * height;
    try {
      const reader = new Blob([concat(compressed)])
        .stream()
        .pipeThrough(new DecompressionStream('deflate'))
        .getReader();
      let count = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        for (let i = 0; i < part.value.length; i++)
          if ((count + i) % stride === 0 && part.value[i] > 4) {
            await reader.cancel();
            bad();
          }
        count += part.value.length;
        if (count > expected) {
          await reader.cancel();
          bad();
        }
      }
      if (count !== expected) bad();
    } catch {
      bad();
    }
    bytes = concat(chunks);
  } else if (b.length >= 12 && b[0] === 255 && b[1] === 216) {
    type = 'image/jpeg';
    const chunks = [b.slice(0, 2)];
    let offset = 2;
    let frame = false;
    let scan = false;
    while (offset < b.length) {
      if (b[offset] !== 255) bad();
      let marker = offset + 1;
      while (b[marker] === 255) marker++;
      const tag = b[marker];
      if (tag === 217) {
        if (!scan || marker + 1 !== b.length) bad();
        chunks.push(b.slice(offset));
        offset = b.length;
        break;
      }
      if (tag === 0 || tag === 216 || (tag >= 208 && tag <= 215)) bad();
      if (marker + 2 >= b.length) bad();
      const size = v.getUint16(marker + 1);
      const end = marker + 1 + size;
      if (size < 2 || end > b.length) bad();
      if ([192, 193, 194].includes(tag)) {
        if (size < 8 || frame) bad();
        dimensions(v.getUint16(marker + 6), v.getUint16(marker + 4));
        frame = true;
      } else if (tag >= 195 && tag <= 207 && ![196, 200, 204].includes(tag)) bad();
      if (tag === 218) {
        if (!frame || size < 6) bad();
        scan = true;
        let cursor = end;
        while (cursor < b.length - 1) {
          if (b[cursor] === 255) {
            if (b[cursor + 1] === 0 || (b[cursor + 1] >= 208 && b[cursor + 1] <= 215)) {
              cursor += 2;
              continue;
            }
            break;
          }
          cursor++;
        }
        if (cursor === end || cursor >= b.length - 1) bad();
        chunks.push(b.slice(offset, cursor));
        offset = cursor;
        continue;
      }
      if (!(tag >= 224 && tag <= 239) && tag !== 254) chunks.push(b.slice(offset, end));
      offset = end;
    }
    if (!frame || !scan || b[b.length - 2] !== 255 || b[b.length - 1] !== 217) bad();
    bytes = concat(chunks);
  } else if (
    b.length >= 20 &&
    ascii(b, 0, 4) === 'RIFF' &&
    ascii(b, 8, 4) === 'WEBP' &&
    v.getUint32(4, true) + 8 === b.length
  ) {
    type = 'image/webp';
    const chunks: Uint8Array[] = [];
    let offset = 12;
    let frame = false;
    while (offset < b.length) {
      if (offset + 8 > b.length) bad();
      const tag = ascii(b, offset, 4);
      const size = v.getUint32(offset + 4, true);
      const end = offset + 8 + size + (size % 2);
      if (end > b.length) bad();
      const data = offset + 8;
      if (tag === 'VP8 ') {
        if (frame || size < 10 || b[data + 3] !== 157 || b[data + 4] !== 1 || b[data + 5] !== 42)
          bad();
        dimensions(v.getUint16(data + 6, true) & 16383, v.getUint16(data + 8, true) & 16383);
        frame = true;
      } else if (tag === 'VP8L') {
        if (frame || size < 5 || b[data] !== 47) bad();
        const value = v.getUint32(data + 1, true);
        if (value >>> 29) bad();
        dimensions((value & 16383) + 1, ((value >>> 14) & 16383) + 1);
        frame = true;
      } else if (tag === 'VP8X') {
        if (size !== 10 || b[data] & 2) bad();
        dimensions(
          1 + b[data + 4] + (b[data + 5] << 8) + (b[data + 6] << 16),
          1 + b[data + 7] + (b[data + 8] << 8) + (b[data + 9] << 16),
        );
      } else if (['ANIM', 'ANMF'].includes(tag)) bad();
      else if (!['ALPH', 'ICCP', 'EXIF', 'XMP '].includes(tag)) bad();
      if (['VP8 ', 'VP8L', 'ALPH', 'VP8X'].includes(tag)) {
        const chunk = b.slice(offset, end);
        if (tag === 'VP8X') chunk[8] &= 16;
        chunks.push(chunk);
      }
      offset = end;
    }
    if (!frame) bad();
    const content = concat(chunks);
    bytes = new Uint8Array(content.length + 12);
    bytes.set(b.slice(0, 12));
    new DataView(bytes.buffer).setUint32(4, content.length + 4, true);
    bytes.set(content, 12);
  } else bad();
  if (type !== declared) bad();
  return { bytes, type };
}
