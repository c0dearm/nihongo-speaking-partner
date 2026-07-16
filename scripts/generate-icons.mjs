import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Writes a simple solid/styled uncompressed RGBA PNG buffer
function createPngBuffer(width, height) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowSize);

  const bgColor = [15, 23, 42, 255]; // #0f172a
  const sunColor = [225, 29, 72, 255]; // #e11d48
  const barColor = [255, 255, 255, 255]; // white

  const cx = width / 2;
  const cy = height * 0.43;
  const sunR = width * 0.215;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      let color = bgColor;

      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= sunR * sunR) {
        color = sunColor;
        // Simple vertical bars inside sun
        const barW = width * 0.03;
        if (
          (Math.abs(dx) < barW * 0.5 && Math.abs(dy) < sunR * 0.7) ||
          (Math.abs(dx - barW * 2) < barW * 0.5 && Math.abs(dy) < sunR * 0.5) ||
          (Math.abs(dx + barW * 2) < barW * 0.5 && Math.abs(dy) < sunR * 0.5)
        ) {
          color = barColor;
        }
      }

      rawData[pixelOffset] = color[0];
      rawData[pixelOffset + 1] = color[1];
      rawData[pixelOffset + 2] = color[2];
      rawData[pixelOffset + 3] = color[3];
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG header chunks
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // Compression
  ihdrData.writeUInt8(0, 11); // Filter
  ihdrData.writeUInt8(0, 12); // Interlace

  function makeChunk(type, data) {
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = zlib.crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal >>> 0, 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createPngBuffer(192, 192));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createPngBuffer(512, 512));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPngBuffer(180, 180));
console.log('Generated PNG icons successfully in public/');
