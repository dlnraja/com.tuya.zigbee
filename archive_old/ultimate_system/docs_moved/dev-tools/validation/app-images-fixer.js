#!/usr/bin/env node

/**
 * App Images Fixer
 * Fixes app-level images to be SDK3 compliant
 * Prevents validation errors from fallback image usage
 */

const fs = require('fs-extra');
const path = require('path');

class AppImagesFixer {
    constructor() {
        this.projectRoot = process.cwd();
        this.appImagesPath = path.join(this.projectRoot, 'assets', 'images');
        
        console.log('🎨 App Images Fixer - SDK3 Compliant App Images');
    }

    async run() {
        console.log('\n🔧 Fixing app-level images for SDK3 compliance...');
        
        try {
            await fs.ensureDir(this.appImagesPath);
            
            // Create proper 75x75 small.png
            const smallPNG = this.createMinimalPNG(75, 75, '#1E88E5'); // App brand color
            await fs.writeFile(path.join(this.appImagesPath, 'small.png'), smallPNG);
            console.log('✅ Fixed small.png: 75x75');
            
            // Create proper 500x500 large.png
            const largePNG = this.createMinimalPNG(500, 500, '#1E88E5');
            await fs.writeFile(path.join(this.appImagesPath, 'large.png'), largePNG);
            console.log('✅ Fixed large.png: 500x500');
            
            // Create proper 1000x1000 xlarge.png
            const xlargePNG = this.createMinimalPNG(1000, 1000, '#1E88E5');
            await fs.writeFile(path.join(this.appImagesPath, 'xlarge.png'), xlargePNG);
            console.log('✅ Fixed xlarge.png: 1000x1000');
            
            console.log('\n🎉 All app images fixed for SDK3 compliance');
            return { success: true, fixed: 3 };
            
        } catch (error) {
            console.error('❌ Error fixing app images:', error);
            throw error;
        }
    }

    createMinimalPNG(width, height, color = '#1E88E5') {
        // Convert hex color to RGB
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        // PNG signature
        const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        
        // IHDR chunk
        const ihdrData = Buffer.allocUnsafe(13);
        ihdrData.writeUInt32BE(width, 0);      // Width
        ihdrData.writeUInt32BE(height, 4);     // Height
        ihdrData.writeUInt8(8, 8);             // Bit depth
        ihdrData.writeUInt8(2, 9);             // Color type (RGB)
        ihdrData.writeUInt8(0, 10);            // Compression method
        ihdrData.writeUInt8(0, 11);            // Filter method
        ihdrData.writeUInt8(0, 12);            // Interlace method
        
        const ihdrCrc = this.calculateCRC32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
        const ihdrChunk = Buffer.concat([
            this.writeUInt32BE(13),              // Length
            Buffer.from('IHDR'),                 // Type
            ihdrData,                            // Data
            this.writeUInt32BE(ihdrCrc)          // CRC
        ]);
        
        // IDAT chunk with uncompressed data
        const bytesPerPixel = 3; // RGB
        const bytesPerRow = width * bytesPerPixel + 1; // +1 for filter byte
        const rawDataSize = height * bytesPerRow;
        const rawData = Buffer.alloc(rawDataSize);
        
        // Fill with solid color
        for (let y = 0; y < height; y++) {
            const rowOffset = y * bytesPerRow;
            rawData[rowOffset] = 0; // Filter type: None
            
            for (let x = 0; x < width; x++) {
                const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
                rawData[pixelOffset] = r;
                rawData[pixelOffset + 1] = g;
                rawData[pixelOffset + 2] = b;
            }
        }
        
        // DEFLATE compression (uncompressed blocks)
        const maxBlockSize = 65535;
        const deflateData = [];
        
        for (let offset = 0; offset < rawData.length; offset += maxBlockSize) {
            const blockSize = Math.min(maxBlockSize, rawData.length - offset);
            const isLast = offset + blockSize >= rawData.length;
            
            const blockHeader = Buffer.alloc(5);
            blockHeader[0] = isLast ? 0x01 : 0x00; // BFINAL and BTYPE
            blockHeader.writeUInt16LE(blockSize, 1);
            blockHeader.writeUInt16LE(~blockSize & 0xFFFF, 3);
            
            deflateData.push(blockHeader);
            deflateData.push(rawData.slice(offset, offset + blockSize));
        }
        
        const compressedData = Buffer.concat([
            Buffer.from([0x78, 0x01]), // DEFLATE header
            ...deflateData,
            this.writeUInt32BE(this.calculateAdler32(rawData)) // Adler32
        ]);
        
        const idatCrc = this.calculateCRC32(Buffer.concat([Buffer.from('IDAT'), compressedData]));
        const idatChunk = Buffer.concat([
            this.writeUInt32BE(compressedData.length), // Length
            Buffer.from('IDAT'),                       // Type
            compressedData,                            // Data
            this.writeUInt32BE(idatCrc)                // CRC
        ]);
        
        // IEND chunk
        const iendCrc = this.calculateCRC32(Buffer.from('IEND'));
        const iendChunk = Buffer.concat([
            this.writeUInt32BE(0),          // Length
            Buffer.from('IEND'),            // Type
            this.writeUInt32BE(iendCrc)     // CRC
        ]);
        
        return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
    }

    writeUInt32BE(value) {
        const buffer = Buffer.allocUnsafe(4);
        buffer.writeUInt32BE(value, 0);
        return buffer;
    }

    calculateCRC32(data) {
        const table = new Array(256);
        
        // Build CRC table
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[i] = c >>> 0;
        }
        
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) {
            crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    calculateAdler32(data) {
        let a = 1, b = 0;
        const MOD_ADLER = 65521;
        
        for (let i = 0; i < data.length; i++) {
            a = (a + data[i]) % MOD_ADLER;
            b = (b + a) % MOD_ADLER;
        }
        
        return (b << 16) | a;
    }
}

// Execute if run directly
if (require.main === module) {
    const fixer = new AppImagesFixer();
    fixer.run().catch(console.error);
}

module.exports = AppImagesFixer;
