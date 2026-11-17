// Builds a real PNG of a given size (solid colour) without image libraries:
// IHDR + uncompressed (stored) deflate blocks + IEND, with correct CRCs.

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = (CRC_TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export function pngBytes(
  width: number,
  height: number,
  rgb: [number, number, number] = [200, 60, 40],
): Uint8Array<ArrayBuffer> {
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB

  const stride = width * 3 + 1;
  const raw = new Uint8Array(stride * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) raw.set(rgb, y * stride + 1 + x * 3);
  }

  const BLOCK = 65535;
  const blockCount = Math.max(1, Math.ceil(raw.length / BLOCK));
  const zlib = new Uint8Array(2 + raw.length + blockCount * 5 + 4);
  zlib.set([0x78, 0x01], 0);
  let o = 2;
  for (let i = 0; i < blockCount; i += 1) {
    const part = raw.subarray(i * BLOCK, (i + 1) * BLOCK);
    const len = part.length;
    zlib.set([i === blockCount - 1 ? 1 : 0, len & 0xff, len >> 8, ~len & 0xff, (~len >> 8) & 0xff], o);
    o += 5;
    zlib.set(part, o);
    o += len;
  }
  let a = 1;
  let b = 0;
  for (const x of raw) {
    a = (a + x) % 65521;
    b = (b + a) % 65521;
  }
  new DataView(zlib.buffer).setUint32(o, ((b << 16) | a) >>> 0);

  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib),
    chunk("IEND", new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export function png(width: number, height: number, rgb?: [number, number, number]): Blob {
  return new Blob([pngBytes(width, height, rgb)], { type: "image/png" });
}
