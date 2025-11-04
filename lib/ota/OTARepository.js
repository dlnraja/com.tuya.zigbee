'use strict';

/**
 * OTARepository - Firmware Image Repository
 * 
 * Inspired by fairecasoimeme/zigbee-OTA
 * Multi-source OTA firmware repository for Zigbee devices
 * 
 * Features:
 * - Multi-source support (Koenkk, fairecasoimeme)
 * - Local cache management
 * - Manufacturer-specific images
 * - Version tracking
 * - Automatic downloads
 */

const https = require('https');
const http = require('http');

class OTARepository {
  
  constructor(homey) {
    this.homey = homey;
    this.cache = new Map();
    this.sources = [
      'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/images',
      'https://raw.githubusercontent.com/fairecasoimeme/zigbee-OTA/master/images'
    ];
    
    this.manifestCache = null;
    this.manifestTimestamp = null;
    this.manifestCacheDuration = 24 * 60 * 60 * 1000; // 24 hours
  }
  
  /**
   * Find OTA image for device
   */
  async findImage(manufacturerCode, imageType, currentVersion) {
    const key = `${manufacturerCode}_${imageType}`;
    
    this.log(`[OTA] Finding image for ${key}, current version: ${currentVersion}`);
    
    // Check cache
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (Date.now() - cached.timestamp < this.manifestCacheDuration) {
        this.log(`[OTA] Using cached image for ${key}`);
        return cached.image;
      }
    }
    
    // Search in sources
    for (const source of this.sources) {
      try {
        const manifest = await this.downloadManifest(source);
        const image = this.findImageInManifest(manifest, manufacturerCode, imageType, currentVersion);
        
        if (image) {
          // Cache the image
          this.cache.set(key, {
            image: image,
            timestamp: Date.now()
          });
          
          this.log(`[OTA] Found image in ${source}: v${image.fileVersion}`);
          return image;
        }
      } catch (err) {
        this.error(`[OTA] Failed to download from ${source}:`, err.message);
      }
    }
    
    this.log(`[OTA] No image found for ${key}`);
    return null;
  }
  
  /**
   * Find image in manifest
   */
  findImageInManifest(manifest, manufacturerCode, imageType, currentVersion) {
    if (!Array.isArray(manifest)) return null;
    
    return manifest.find(img => 
      img.manufacturerCode === manufacturerCode &&
      img.imageType === imageType &&
      img.fileVersion > currentVersion
    );
  }
  
  /**
   * Download manifest from source
   */
  async downloadManifest(source) {
    // Check cache
    if (this.manifestCache && this.manifestTimestamp) {
      if (Date.now() - this.manifestTimestamp < this.manifestCacheDuration) {
        return this.manifestCache;
      }
    }
    
    const url = `${source}/index.json`;
    
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const manifest = JSON.parse(data);
            
            // Cache manifest
            this.manifestCache = manifest;
            this.manifestTimestamp = Date.now();
            
            resolve(manifest);
          } catch (err) {
            reject(err);
          }
        });
      }).on('error', reject);
    });
  }
  
  /**
   * Download OTA image file
   */
  async downloadImage(imageUrl) {
    return new Promise((resolve, reject) => {
      const protocol = imageUrl.startsWith('https') ? https : http;
      
      protocol.get(imageUrl, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
      }).on('error', reject);
    });
  }
  
  /**
   * Get supported manufacturers
   */
  async getSupportedManufacturers() {
    const manufacturers = new Set();
    
    for (const source of this.sources) {
      try {
        const manifest = await this.downloadManifest(source);
        manifest.forEach(img => manufacturers.add(img.manufacturerCode));
      } catch (err) {
        // Continue with next source
      }
    }
    
    return Array.from(manufacturers);
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.manifestCache = null;
    this.manifestTimestamp = null;
    this.log('[OTA] Cache cleared');
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      manifestCached: !!this.manifestCache,
      manifestAge: this.manifestTimestamp 
        ? Date.now() - this.manifestTimestamp 
        : null
    };
  }
  
  // Logging helpers
  log(...args) {
    console.log('[OTARepository]', ...args);
  }
  
  error(...args) {
    console.error('[OTARepository]', ...args);
  }
}

module.exports = OTARepository;
