#!/usr/bin/env node
/**
 * 🎨 Image Generator - Coherent Images per Category
 * Based on Johan Bendz designs + Homey SDK3 guidelines
 */

const fs = require('fs');
const path = require('path');

class ImageGenerator {
  constructor() {
    this.categories = {
      motion: { color: '#FF6B6B', icon: '🏃', size: '500x500' },
      switch: { color: '#4ECDC4', icon: '💡', size: '500x500' },
      plug: { color: '#45B7D1', icon: '🔌', size: '500x500' },
      curtain: { color: '#96CEB4', icon: '🪟', size: '500x500' },
      climate: { color: '#FFEAA7', icon: '🌡️', size: '500x500' },
      contact: { color: '#DDA0DD', icon: '🚪', size: '500x500' }
    };
  }

  generateAllImages() {
    console.log('🎨 Generating coherent images...');
    const driversDir = './drivers';
    
    fs.readdirSync(driversDir).forEach(driverName => {
      this.generateDriverImages(driverName);
    });
    
    console.log('✅ Image generation complete');
  }

  generateDriverImages(driverName) {
    const category = this.detectCategory(driverName);
    const imagesDir = path.join('./drivers', driverName, 'assets', 'images');
    
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    // Generate simple placeholder images (SVG-based)
    this.createSVGImage(imagesDir, 'large.png', category, driverName);
    this.createSVGImage(imagesDir, 'small.png', category, driverName);
  }

  detectCategory(driverName) {
    const name = driverName.toLowerCase();
    if (name.includes('motion') || name.includes('pir')) return 'motion';
    if (name.includes('switch')) return 'switch';
    if (name.includes('plug')) return 'plug';
    if (name.includes('curtain')) return 'curtain';
    if (name.includes('climate') || name.includes('temp')) return 'climate';
    if (name.includes('contact') || name.includes('door')) return 'contact';
    return 'switch';
  }

  createSVGImage(dir, filename, category, driverName) {
    const config = this.categories[category];
    const svg = `<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
      <rect width="500" height="500" fill="${config.color}" rx="50"/>
      <text x="250" y="200" font-family="Arial" font-size="100" text-anchor="middle" fill="white">${config.icon}</text>
      <text x="250" y="320" font-family="Arial" font-size="20" text-anchor="middle" fill="white">${category.toUpperCase()}</text>
      <text x="250" y="350" font-family="Arial" font-size="16" text-anchor="middle" fill="white">${driverName}</text>
    </svg>`;
    
    fs.writeFileSync(path.join(dir, filename.replace('.png', '.svg')), svg);
  }
}

module.exports = ImageGenerator;
