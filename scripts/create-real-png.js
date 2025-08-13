// !/usr/bin/env node
const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      const mask = -(c & 1);
      c = (c >>> 1) ^ (0xEDB88320 & mask);
    }
  }
  return ~c >>> 0;
}

function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = u32be(data.length);
  const crc = u32be(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(width, height) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type (Truecolor)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const IHDR = chunk('IHDR', ihdrData);

  // Raw image data: for each row: 1 filter byte (0) + width*3 bytes (RGB)
  const bytesPerRow = 1 + width * 3;
  const raw = Buffer.alloc(bytesPerRow * height, 0x00); // black image
  const IDAT = chunk('IDAT', zlib.deflateSync(raw));

  const IEND = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, IHDR, IDAT, IEND]);
}

const large = makePng(500, 500);
const small = makePng(250, 175);

fs.mkdirSync('assets/images', { recursive: true });
fs.writeFileSync('assets/images/large.png', large);
fs.writeFileSync('assets/images/small.png', small);
console.log('✅ PNG images (large 500x500, small 250x175) generated successfully');
