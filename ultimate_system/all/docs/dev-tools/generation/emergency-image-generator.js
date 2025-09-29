#!/usr/bin/env node

/**
 * Emergency Image Generator
 * Creates properly sized placeholder images for drivers missing assets
 * Ensures SDK3 compliance with correct dimensions
 */

const fs = require('fs');
const path = require('path');

// Simple PNG generator for 75x75 and 500x500 placeholder images
function generatePNG(width, height, color = '#4CAF50') {
    // Create a simple colored PNG buffer
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    // PNG header and basic structure
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // IHDR chunk (image header)
    const ihdrData = Buffer.allocUnsafe(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData.writeUInt8(8, 8);  // bit depth
    ihdrData.writeUInt8(2, 9);  // color type (RGB)
    ihdrData.writeUInt8(0, 10); // compression
    ihdrData.writeUInt8(0, 11); // filter
    ihdrData.writeUInt8(0, 12); // interlace
    
    const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
    const ihdrChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x0D]), // length
        Buffer.from('IHDR'),
        ihdrData,
        Buffer.from([ihdrCrc >> 24, (ihdrCrc >> 16) & 0xFF, (ihdrCrc >> 8) & 0xFF, ihdrCrc & 0xFF])
    ]);
    
    // Simple IDAT chunk with solid color
    const pixelData = Buffer.alloc(width * height * 3);
    for (let i = 0; i < pixelData.length; i += 3) {
        pixelData[i] = r;
        pixelData[i + 1] = g;
        pixelData[i + 2] = b;
    }
    
    // Add filter bytes (0 for no filter)
    const rowData = Buffer.alloc(height * (width * 3 + 1));
    for (let y = 0; y < height; y++) {
        rowData[y * (width * 3 + 1)] = 0; // filter byte
        pixelData.copy(rowData, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
    }
    
    // Compress data (simple, uncompressed DEFLATE)
    const idatData = Buffer.concat([
        Buffer.from([0x78, 0x01]), // DEFLATE header
        Buffer.from([0x01]), // final block, uncompressed
        Buffer.from([rowData.length & 0xFF, (rowData.length >> 8) & 0xFF]), // length
        Buffer.from([(~rowData.length) & 0xFF, ((~rowData.length) >> 8) & 0xFF]), // ~length
        rowData,
        Buffer.from([0x00, 0x00, 0x00, 0x00]) // Adler32 checksum (simplified)
    ]);
    
    const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), idatData]));
    const idatChunk = Buffer.concat([
        Buffer.from([(idatData.length >> 24) & 0xFF, (idatData.length >> 16) & 0xFF, (idatData.length >> 8) & 0xFF, idatData.length & 0xFF]),
        Buffer.from('IDAT'),
        idatData,
        Buffer.from([idatCrc >> 24, (idatCrc >> 16) & 0xFF, (idatCrc >> 8) & 0xFF, idatCrc & 0xFF])
    ]);
    
    // IEND chunk
    const iendCrc = crc32(Buffer.from('IEND'));
    const iendChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x00]), // length
        Buffer.from('IEND'),
        Buffer.from([iendCrc >> 24, (iendCrc >> 16) & 0xFF, (iendCrc >> 8) & 0xFF, iendCrc & 0xFF])
    ]);
    
    return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

// Simple CRC32 implementation
function crc32(buffer) {
    const table = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
    }
    
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buffer.length; i++) {
        crc = table[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

class EmergencyImageGenerator {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversPath = path.join(this.projectRoot, 'drivers');
        this.generatedCount = 0;
        
        console.log('🚨 Emergency Image Generator - SDK3 Compliant Images');
    }

    async run() {
        console.log('\n🔍 Scanning for drivers with missing or invalid images...');
        
        try {
            const drivers = fs.readdirSync(this.driversPath);
            
            for (const driverName of drivers) {
                const driverPath = path.join(this.driversPath, driverName);
                const stat = fs.statSync(driverPath);
                
                if (stat.isDirectory()) {
                    await this.processDriver(driverName, driverPath);
                }
            }
            
            console.log(`\n✅ Generated ${this.generatedCount} emergency images`);
            return { generated: this.generatedCount };
            
        } catch (error) {
            console.error('❌ Error during emergency image generation:', error);
            throw error;
        }
    }

    async processDriver(driverName, driverPath) {
        const assetsPath = path.join(driverPath, 'assets');
        
        // Ensure assets directory exists
        if (!fs.existsSync(assetsPath)) {
            fs.mkdirSync(assetsPath, { recursive: true });
        }
        
        const smallImagePath = path.join(assetsPath, 'small.png');
        const largeImagePath = path.join(assetsPath, 'large.png');
        
        let generated = false;
        
        // Check and create small image (75x75)
        if (!fs.existsSync(smallImagePath) || this.isInvalidSize(smallImagePath, 75, 75)) {
            console.log(`🔨 Creating small.png for: ${driverName}`);
            const smallPNG = generatePNG(75, 75, this.getColorForDriver(driverName));
            fs.writeFileSync(smallImagePath, smallPNG);
            generated = true;
        }
        
        // Check and create large image (500x500)
        if (!fs.existsSync(largeImagePath) || this.isInvalidSize(largeImagePath, 500, 500)) {
            console.log(`🔨 Creating large.png for: ${driverName}`);
            const largePNG = generatePNG(500, 500, this.getColorForDriver(driverName));
            fs.writeFileSync(largeImagePath, largePNG);
            generated = true;
        }
        
        if (generated) {
            this.generatedCount++;
        }
    }

    isInvalidSize(imagePath, expectedWidth, expectedHeight) {
        try {
            const imageBuffer = fs.readFileSync(imagePath);
            
            // Simple PNG dimension check
            if (imageBuffer.length < 24) return true;
            
            // Check PNG signature
            const signature = imageBuffer.slice(0, 8);
            const expectedSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
            if (!signature.equals(expectedSignature)) return true;
            
            // Read width and height from IHDR chunk
            const width = imageBuffer.readUInt32BE(16);
            const height = imageBuffer.readUInt32BE(20);
            
            return width !== expectedWidth || height !== expectedHeight;
            
        } catch (error) {
            return true; // If we can't read it, it's invalid
        }
    }

    getColorForDriver(driverName) {
        const name = driverName.toLowerCase();
        
        // Color coding by device category
        if (name.includes('switch') || name.includes('relay')) return '#4CAF50';
        if (name.includes('sensor')) return '#2196F3';
        if (name.includes('light') || name.includes('bulb')) return '#FF9800';
        if (name.includes('lock') || name.includes('security')) return '#F44336';
        if (name.includes('curtain') || name.includes('blind') || name.includes('cover')) return '#9C27B0';
        if (name.includes('thermostat') || name.includes('climate')) return '#FF5722';
        if (name.includes('plug') || name.includes('socket')) return '#607D8B';
        if (name.includes('remote') || name.includes('button')) return '#795548';
        
        return '#4CAF50'; // Default green
    }
}

// Execute if run directly
if (require.main === module) {
    const generator = new EmergencyImageGenerator();
    generator.run().catch(console.error);
}

module.exports = EmergencyImageGenerator;
