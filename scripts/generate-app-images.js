// !/usr/bin/env node
/**
 * @file generate-app-images.js
 * @description Génère les images requises pour l'app Homey (large.png, small.png)
 * @author dlnraja
 * @date 2025-01-29
 */

'use strict';

const fs = require('fs');
const path = require('path');

function log(msg) {
  console.log(`[app-images] ${msg}`);
}

function createPlaceholderPNG(width, height, outputPath) {
  // Créer un PNG simple avec les dimensions requises
  // Header PNG basique
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdrChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0D]), // length
    Buffer.from('IHDR'),
    ihdrData,
    Buffer.from(ihdrCrc.toString(16).padStart(8, '0'), 'hex')
  ]);
  
  // IDAT chunk (données d'image minimales)
  const idatData = Buffer.from([0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01]);
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), idatData]));
  const idatChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0A]), // length
    Buffer.from('IDAT'),
    idatData,
    Buffer.from(idatCrc.toString(16).padStart(8, '0'), 'hex')
  ]);
  
  // IEND chunk
  const iendCrc = crc32(Buffer.from('IEND'));
  const iendChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // length
    Buffer.from('IEND'),
    Buffer.from(iendCrc.toString(16).padStart(8, '0'), 'hex')
  ]);
  
  const pngBuffer = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  
  try {
    fs.writeFileSync(outputPath, pngBuffer);
    log(`Created ${width}x${height} PNG: ${outputPath}`);
    return true;
  } catch (err) {
    log(`Error creating PNG: ${err.message}`);
    return false;
  }
}

function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc = crcTable[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Table CRC32 pré-calculée
const crcTable = new Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function generateAppImages() {
  log('Generating Homey app images...');
  
  // Créer le dossier s'il n'existe pas
  const imagesDir = 'assets/images';
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    log(`Created directory: ${imagesDir}`);
  }
  
  let success = 0;
  
  // large.png (500x500) - Image principale de l'app
  if (createPlaceholderPNG(500, 500, 'assets/images/large.png')) {
    success++;
  }
  
  // small.png (250x250) - Petite image de l'app  
  if (createPlaceholderPNG(250, 250, 'assets/images/small.png')) {
    success++;
  }
  
  log(`Generated ${success}/2 app images successfully`);
  return success === 2;
}

function main() {
  try {
    if (generateAppImages()) {
      log('All app images generated successfully');
      process.exit(0);
    } else {
      log('Some images failed to generate');
      process.exit(1);
    }
  } catch (err) {
    log(`Error: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateAppImages };
