#!/usr/bin/env node

/**
 * Comprehensive Image Fixer
 * Ensures all drivers have proper 75x75 and 500x500 images
 * Prevents fallback to app images which have wrong dimensions
 */

const fs = require('fs-extra');
const path = require('path');

class ComprehensiveImageFixer {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversPath = path.join(this.projectRoot, 'drivers');
        this.fixedCount = 0;
        
        console.log('🖼️  Comprehensive Image Fixer - Ensuring All Driver Images');
    }

    async run() {
        console.log('\n🔍 Scanning all drivers for image issues...');
        
        try {
            const drivers = await fs.readdir(this.driversPath);
            
            for (const driverName of drivers) {
                const driverPath = path.join(this.driversPath, driverName);
                const stat = await fs.stat(driverPath);
                
                if (stat.isDirectory()) {
                    await this.fixDriverImages(driverName, driverPath);
                }
            }
            
            console.log(`\n✅ Fixed ${this.fixedCount} drivers with image issues`);
            return { fixed: this.fixedCount };
            
        } catch (error) {
            console.error('❌ Error during image fixing:', error);
            throw error;
        }
    }

    async fixDriverImages(driverName, driverPath) {
        const assetsPath = path.join(driverPath, 'assets');
        const smallImagePath = path.join(assetsPath, 'small.png');
        const largeImagePath = path.join(assetsPath, 'large.png');
        
        let needsFix = false;
        
        // Ensure assets directory exists
        await fs.ensureDir(assetsPath);
        
        // Check small image
        if (!await fs.pathExists(smallImagePath) || !this.isCorrectSize(smallImagePath, 75, 75)) {
            needsFix = true;
        }
        
        // Check large image
        if (!await fs.pathExists(largeImagePath) || !this.isCorrectSize(largeImagePath, 500, 500)) {
            needsFix = true;
        }
        
        if (needsFix) {
            console.log(`🔨 Fixing images for: ${driverName}`);
            
            // Create proper 75x75 small image
            const smallPNG = this.createMinimalPNG(75, 75, this.getColorForDriver(driverName));
            await fs.writeFile(smallImagePath, smallPNG);
            
            // Create proper 500x500 large image
            const largePNG = this.createMinimalPNG(500, 500, this.getColorForDriver(driverName));
            await fs.writeFile(largeImagePath, largePNG);
            
            this.fixedCount++;
        }
    }

    isCorrectSize(imagePath, expectedWidth, expectedHeight) {
        try {
            const imageBuffer = fs.readFileSync(imagePath);
            
            // Check if it's a PNG and read dimensions
            if (imageBuffer.length < 24) return false;
            
            // Check PNG signature
            const signature = imageBuffer.slice(0, 8);
            const expectedSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
            if (!signature.equals(expectedSignature)) return false;
            
            // Read width and height from IHDR chunk
            const width = imageBuffer.readUInt32BE(16);
            const height = imageBuffer.readUInt32BE(20);
            
            return width === expectedWidth && height === expectedHeight;
            
        } catch (error) {
            return false;
        }
    }

    createMinimalPNG(width, height, color = '#4CAF50') {
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

    getColorForDriver(driverName) {
        const name = driverName.toLowerCase();
        
        // Category-based colors following Johan Bendz standards
        if (name.includes('switch') || name.includes('relay')) return '#4CAF50'; // Green
        if (name.includes('sensor') || name.includes('detector')) return '#2196F3'; // Blue
        if (name.includes('light') || name.includes('bulb') || name.includes('led')) return '#FF9800'; // Orange
        if (name.includes('lock') || name.includes('keypad')) return '#F44336'; // Red
        if (name.includes('curtain') || name.includes('blind') || name.includes('cover') || name.includes('shade')) return '#9C27B0'; // Purple
        if (name.includes('thermostat') || name.includes('climate') || name.includes('temperature_controller')) return '#FF5722'; // Deep Orange
        if (name.includes('plug') || name.includes('socket') || name.includes('outlet')) return '#607D8B'; // Blue Grey
        if (name.includes('remote') || name.includes('button') || name.includes('scene')) return '#795548'; // Brown
        if (name.includes('door') || name.includes('garage')) return '#9E9E9E'; // Grey
        if (name.includes('fan') || name.includes('air_conditioner') || name.includes('hvac')) return '#00BCD4'; // Cyan
        if (name.includes('water') || name.includes('valve') || name.includes('sprinkler')) return '#03A9F4'; // Light Blue
        if (name.includes('doorbell') || name.includes('siren')) return '#E91E63'; // Pink
        if (name.includes('feeder') || name.includes('pet')) return '#8BC34A'; // Light Green
        
        return '#4CAF50'; // Default green
    }
}

// Execute if run directly
if (require.main === module) {
    const fixer = new ComprehensiveImageFixer();
    fixer.run().catch(console.error);
}

module.exports = ComprehensiveImageFixer;
