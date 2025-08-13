/**
 * 🖼️ Generate All Driver Images - Universal Tuya Zigbee
 * Creates PNG images for all drivers in the project
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

class ImageGenerator {
  constructor() {
    this.projectRoot = process.cwd();
    this.stats = {
      total: 0,
      generated: 0,
      skipped: 0,
      errors: 0
    };
  }

  /**
   * CRC32 calculation for PNG chunks
   */
  crc32(buf) {
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

  /**
   * Convert number to 32-bit big-endian buffer
   */
  u32be(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n >>> 0, 0);
    return b;
  }

  /**
   * Create PNG chunk
   */
  chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const len = this.u32be(data.length);
    const crc = this.u32be(this.crc32(Buffer.concat([typeBuf, data])));
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  /**
   * Generate PNG image data
   */
  makePng(width, height, color = [128, 128, 128]) {
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;  // bit depth
    ihdrData[9] = 2;  // color type (Truecolor)
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    const IHDR = this.chunk('IHDR', ihdrData);

    // Raw image data: for each row: 1 filter byte (0) + width*3 bytes (RGB)
    const bytesPerRow = 1 + width * 3;
    const raw = Buffer.alloc(bytesPerRow * height);
    
    for (let y = 0; y < height; y++) {
      const rowStart = y * bytesPerRow;
      raw[rowStart] = 0; // filter byte
      
      for (let x = 0; x < width; x++) {
        const pixelStart = rowStart + 1 + x * 3;
        raw[pixelStart] = color[0];     // R
        raw[pixelStart + 1] = color[1]; // G
        raw[pixelStart + 2] = color[2]; // B
      }
    }
    
    const IDAT = this.chunk('IDAT', zlib.deflateSync(raw));
    const IEND = this.chunk('IEND', Buffer.alloc(0));
    
    return Buffer.concat([signature, IHDR, IDAT, IEND]);
  }

  /**
   * Generate images for a specific driver
   */
  generateDriverImages(driverPath, driverName) {
    try {
      const assetsPath = path.join(driverPath, 'assets');
      const imagesPath = path.join(assetsPath, 'images');
      
      // Create assets directory if it doesn't exist
      if (!fs.existsSync(assetsPath)) {
        fs.mkdirSync(assetsPath, { recursive: true });
      }
      
      // Create images directory if it doesn't exist
      if (!fs.existsSync(imagesPath)) {
        fs.mkdirSync(imagesPath, { recursive: true });
      }
      
      // Generate different image sizes with different colors
      const images = [
        { name: 'small.png', width: 75, height: 75, color: [64, 128, 255] },
        { name: 'large.png', width: 500, height: 500, color: [128, 128, 128] },
        { name: 'xlarge.png', width: 1000, height: 1000, color: [192, 192, 192] }
      ];
      
      for (const img of images) {
        const imagePath = path.join(imagesPath, img.name);
        
        // Skip if image already exists
        if (fs.existsSync(imagePath)) {
          continue;
        }
        
        const pngData = this.makePng(img.width, img.height, img.color);
        fs.writeFileSync(imagePath, pngData);
        this.stats.generated++;
      }
      
      // Generate icon.svg if it doesn't exist
      const iconPath = path.join(assetsPath, 'icon.svg');
      if (!fs.existsSync(iconPath)) {
        const svgContent = this.generateIconSVG(driverName);
        fs.writeFileSync(iconPath, svgContent);
        this.stats.generated++;
      }
      
      return true;
      
    } catch (error) {
      console.error(`❌ Error generating images for ${driverName}:`, error.message);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Generate simple SVG icon
   */
  generateIconSVG(driverName) {
    const iconType = this.getIconTypeFromDriverName(driverName);
    
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <rect width="24" height="24" fill="none"/>
  <g fill="currentColor">
    ${this.getIconPath(iconType)}
  </g>
</svg>`;
  }

  /**
   * Get icon type from driver name
   */
  getIconTypeFromDriverName(driverName) {
    if (driverName.includes('switch') || driverName.includes('ts000')) {
      return 'switch';
    } else if (driverName.includes('plug') || driverName.includes('ts011')) {
      return 'plug';
    } else if (driverName.includes('light') || driverName.includes('ts050')) {
      return 'light';
    } else if (driverName.includes('sensor') || driverName.includes('ts020')) {
      return 'sensor';
    } else if (driverName.includes('cover') || driverName.includes('ts060')) {
      return 'cover';
    } else if (driverName.includes('thermostat')) {
      return 'thermostat';
    } else {
      return 'generic';
    }
  }

  /**
   * Get SVG path for icon type
   */
  getIconPath(iconType) {
    const paths = {
      switch: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
      plug: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
      light: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
      sensor: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
      cover: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
      thermostat: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
      generic: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>'
    };
    
    return paths[iconType] || paths.generic;
  }

  /**
   * Find all drivers in the project
   */
  findAllDrivers() {
    const drivers = [];
    const tuyaPath = path.join(this.projectRoot, 'drivers/tuya_zigbee/models');
    const zigbeePath = path.join(this.projectRoot, 'drivers/zigbee/models');
    
    if (fs.existsSync(tuyaPath)) {
      const tuyaDrivers = fs.readdirSync(tuyaPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => ({
          path: path.join(tuyaPath, dirent.name),
          name: dirent.name,
          type: 'tuya_zigbee'
        }));
      drivers.push(...tuyaDrivers);
    }
    
    if (fs.existsSync(zigbeePath)) {
      const zigbeeDrivers = fs.readdirSync(zigbeePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => ({
          path: path.join(zigbeePath, dirent.name),
          name: dirent.name,
          type: 'zigbee'
        }));
      drivers.push(...zigbeeDrivers);
    }
    
    return drivers;
  }

  /**
   * Generate images for all drivers
   */
  async generateAllImages() {
    console.log('🖼️  Starting image generation for all drivers...\n');
    
    const startTime = Date.now();
    const drivers = this.findAllDrivers();
    this.stats.total = drivers.length;
    
    console.log(`📁 Found ${drivers.length} drivers to process\n`);
    
    for (const driver of drivers) {
      console.log(`🔧 Processing ${driver.type}/${driver.name}...`);
      
      if (this.generateDriverImages(driver.path, driver.name)) {
        console.log(`  ✅ Images generated successfully`);
      } else {
        console.log(`  ❌ Failed to generate images`);
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Print summary
    console.log('\n📊 IMAGE GENERATION SUMMARY');
    console.log('============================');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📁 Total Drivers: ${this.stats.total}`);
    console.log(`✅ Generated: ${this.stats.generated}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`📈 Success Rate: ${Math.round(((this.stats.total - this.stats.errors) / this.stats.total) * 100)}%`);
    
    return this.stats.errors === 0;
  }
}

// Export for use in other scripts
module.exports = ImageGenerator;

// Run if called directly
if (require.main === module) {
  const generator = new ImageGenerator();
  generator.generateAllImages()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
