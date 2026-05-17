// Generates icon-192.png and icon-512.png using pure Node.js (no dependencies)
import { deflateSync } from 'zlib';
import { writeFileSync } from 'fs';

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = data || Buffer.alloc(0);
  const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
  const crcBuf = Buffer.concat([t, d]);
  const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, t, d, crcVal]);
}

function makePNG(size) {
  // Background: #050507 (very dark near-black)
  const bg = [5, 5, 7];
  // Lime accent: oklch(0.92 0.22 130) ≈ #CEFC00
  const lime = [206, 252, 0];

  // Draw each pixel
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = [0]; // filter byte = None
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2;
      const cy = y - size / 2;
      const r = size / 2;

      // Rounded square mask (squircle)
      const n = 4;
      const inBounds = Math.pow(Math.abs(cx) / (r * 0.88), n) + Math.pow(Math.abs(cy) / (r * 0.88), n) <= 1;

      if (!inBounds) {
        row.push(5, 5, 7); // match bg
        continue;
      }

      // Lime background gradient (top-left lighter)
      const gradFactor = 0.7 + 0.3 * (1 - (cx + cy + r * 2) / (r * 4));

      // Letter "G" drawn as pixels
      const gx = Math.round((cx / r) * 5 + 5); // 0–10 grid
      const gy = Math.round((cy / r) * 5 + 5);

      const G = [
        " XXXXX ",
        "X      ",
        "X  XXX ",
        "X     X",
        "X     X",
        " XXXXX ",
      ];
      const inG = gy >= 2 && gy <= 7 && gx >= 1 && gx <= 7 &&
        (G[gy - 2] || "")[gx - 1] === 'X';

      if (inG) {
        row.push(0, 0, 0); // black letter
      } else {
        const rf = Math.round(lime[0] * gradFactor);
        const gf = Math.round(lime[1] * gradFactor);
        const bf = Math.round(lime[2] * gradFactor);
        row.push(rf, gf, bf);
      }
    }
    rows.push(Buffer.from(row));
  }

  const rawData = Buffer.concat(rows);
  const compressed = deflateSync(rawData);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8);  // 8-bit depth
  ihdr.writeUInt8(2, 9);  // RGB color
  // bytes 10-12 = 0 (deflate, adaptive filter, no interlace)

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND'),
  ]);
}

writeFileSync('public/icon-192.png', makePNG(192));
writeFileSync('public/icon-512.png', makePNG(512));
console.log('✓ icon-192.png and icon-512.png created');
