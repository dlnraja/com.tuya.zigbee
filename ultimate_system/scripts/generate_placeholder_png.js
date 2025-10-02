#!/usr/bin/env node
/*
 * generate_placeholder_png.js
 * --------------------------------------------------------------
 * Generate a solid-color PNG image with specified dimensions and
 * RGBA color. Useful for producing compliant Homey assets
 * (e.g. 500×500). Usage:
 *   node ultimate_system/scripts/generate_placeholder_png.js \
 *        --width 500 --height 500 \
 *        --color "#1E88E5" \
 *        --output drivers/curtain_motor/assets/images/large.png
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { width: 500, height: 500, color: '#1E88E5', output: null };
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    const value = args[i + 1];
    switch (key) {
      case '--width':
        result.width = parseInt(value, 10);
        i += 0;
        break;
      case '--height':
        result.height = parseInt(value, 10);
        i += 0;
        break;
      case '--color':
        result.color = value;
        i += 0;
        break;
      case '--output':
        result.output = value;
        i += 0;
        break;
      default:
        break;
    }
  }
  if (!result.output) {
    throw new Error('Missing --output path');
  }
  if (!Number.isFinite(result.width) || !Number.isFinite(result.height)) {
    throw new Error('Invalid width/height');
  }
  return result;
}

function expandColor(color) {
  let hex = color.trim();
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (hex.length === 3) {
    hex = hex.split('').map((ch) => ch + ch).join('');
  }
  if (hex.length === 6) {
    hex += 'FF';
  }
  if (hex.length !== 8) {
    throw new Error(`Unsupported color format: ${color}`);
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = parseInt(hex.slice(6, 8), 16);
  return { r, g, b, a };
}

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xEDB88320 & mask);
    }
  }
  return ~crc >>> 0;
}

function writeUInt32BE(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value, 0);
  return buffer;
}

function createChunk(type, data) {
  const length = writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function buildPng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const row = Buffer.alloc(1 + width * 4);
  row[0] = 0; // filter type 0
  for (let x = 0; x < width; x += 1) {
    const offset = 1 + x * 4;
    row[offset] = rgba.r;
    row[offset + 1] = rgba.g;
    row[offset + 2] = rgba.b;
    row[offset + 3] = rgba.a;
  }

  const raw = Buffer.alloc(row.length * height);
  for (let y = 0; y < height; y += 1) {
    row.copy(raw, y * row.length);
  }

  const compressed = zlib.deflateSync(raw);

  const chunks = [
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', Buffer.alloc(0)),
  ];

  return Buffer.concat([signature, ...chunks]);
}

function main() {
  try {
    const args = parseArgs();
    const color = expandColor(args.color);
    const pngBuffer = buildPng(args.width, args.height, color);
    const outputPath = path.resolve(args.output);
    const parent = path.dirname(outputPath);
    fs.mkdirSync(parent, { recursive: true });
    fs.writeFileSync(outputPath, pngBuffer);
    console.log(`✅ PNG ${args.width}×${args.height} généré : ${outputPath}`);
  } catch (error) {
    console.error('❌ Impossible de générer le PNG :', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildPng,
};
