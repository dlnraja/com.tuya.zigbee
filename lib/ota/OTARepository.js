'use strict';

/**
 * OTARepository - Firmware Image Repository
 *
 * Inspired by fairecasoimeme/zigbee-OTA and Zigbee2MQTT OTA guide
 * Multi-source OTA firmware repository for Zigbee devices
 *
 * Features:
 * - Multi-source support (Koenkk, fairecasoimeme)
 * - Tuya/Xiaomi OTA integration (via TuyaXiaomiOTAProvider)
 * - Local cache management
 * - Manufacturer-specific images
 * - Version tracking
 * - Automatic downloads
 * - SHA512 verification
 *
 * Sources:
 * - https://www.zigbee2mqtt.io/guide/usage/ota_updates.html
 * - https://www.zigbee2mqtt.io/advanced/more/tuya_xiaomi_ota_url.html
 * - https://github.com/Koenkk/zigbee-OTA
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');
const TuyaXiaomiOTAProvider = require('./TuyaXiaomiOTAProvider');

class OTARepository {

  constructor(homey) {
    this.homey = homey;
    this.cache = new Map();

    // Official OTA index URLs (not image folders)
    this.indexUrls = [
      'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json',
      'https://raw.githubusercontent.com/fairecasoimeme/zigbee-OTA/master/index.json'
    ];

    // Legacy image folder sources (for backwards compatibility)
    this.sources = [
      'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/images',
      'https://raw.githubusercontent.com/fairecasoimeme/zigbee-OTA/master/images'
    ];

    this.manifestCache = null;
    this.manifestTimestamp = null;
    this.manifestCacheDuration = 6 * 60 * 60 * 1000; // 6 hours (reduced from 24h)

    // Tuya/Xiaomi specific provider
    this.tuyaXiaomiProvider = new TuyaXiaomiOTAProvider(homey);
  }

  /**
   * Find OTA image for device
   *
   * @param {number} manufacturerCode - Zigbee manufacturer code
   * @param {number} imageType - OTA image type
   * @param {number} currentVersion - Current firmware version
   * @param {string} modelId - Optional model ID for precise matching
   * @returns {Object|null} OTA image info
   */
  async findImage(manufacturerCode, imageType, currentVersion, modelId = null) {
    const key = `${manufacturerCode}_${imageType}_${modelId || 'any'}`;

    this.log(`[OTA] Finding image for ${key}, current version: ${currentVersion}`);

    // Check cache
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (Date.now() - cached.timestamp < this.manifestCacheDuration) {
        this.log(`[OTA] Using cached image for ${key}`);
        return cached.image;
      }
    }

    // First try Tuya/Xiaomi provider for known manufacturers
    const TUYA_CODES = [4417, 4098]; // 0x1141, 0x1002
    const XIAOMI_CODES = [4447, 4151, 4406]; // 0x115F, 0x1037, 0x1136

    if (TUYA_CODES.includes(manufacturerCode) || XIAOMI_CODES.includes(manufacturerCode)) {
      try {
        // Use deviceInfo object format for TuyaXiaomiOTAProvider
        const deviceInfo = typeof modelId === 'object' ? modelId : { modelId };
        const image = await this.tuyaXiaomiProvider.findImage(
          manufacturerCode, imageType, currentVersion, deviceInfo
        );

        if (image) {
          this.cache.set(key, { image, timestamp: Date.now() });
          this.log(`[OTA] Found Tuya/Xiaomi image: v${image.fileVersion}`);
          return image;
        }
      } catch (err) {
        this.error(`[OTA] Tuya/Xiaomi provider error:`, err.message);
      }
    }

    // Search in index URLs
    for (const indexUrl of this.indexUrls) {
      try {
        const manifest = await this.downloadManifest(indexUrl);
        const image = this.findImageInManifest(manifest, manufacturerCode, imageType, currentVersion, modelId);

        if (image) {
          // Cache the image
          this.cache.set(key, {
            image: image,
            timestamp: Date.now()
          });

          this.log(`[OTA] Found image in ${indexUrl}: v${image.fileVersion}`);
          return image;
        }
      } catch (err) {
        this.error(`[OTA] Failed to download from ${indexUrl}:`, err.message);
      }
    }

    this.log(`[OTA] No image found for ${key}`);
    return null;
  }

  /**
   * Find image in manifest
   *
   * @param {Array} manifest - OTA index manifest
   * @param {number} manufacturerCode - Manufacturer code
   * @param {number} imageType - Image type
   * @param {number} currentVersion - Current version
   * @param {string} modelId - Optional model ID
   * @returns {Object|null} Best matching image
   */
  findImageInManifest(manifest, manufacturerCode, imageType, currentVersion, modelId = null) {
    if (!Array.isArray(manifest)) return null;

    // Find all candidates
    const candidates = manifest.filter(img => {
      if (img.manufacturerCode !== manufacturerCode) return false;
      if (img.imageType !== imageType) return false;
      if (img.fileVersion <= currentVersion) return false;

      // Model ID matching (if specified and available)
      if (modelId && img.modelId && img.modelId !== modelId) return false;

      return true;
    });

    if (candidates.length === 0) return null;

    // Sort by version (highest first) and return best match
    candidates.sort((a, b) => b.fileVersion - a.fileVersion);
    return candidates[0];
  }

  /**
   * Download manifest from source URL
   *
   * @param {string} url - Index URL (full URL to index.json)
   * @returns {Array} Manifest array
   */
  async downloadManifest(url) {
    // Check cache
    if (this.manifestCache && this.manifestTimestamp) {
      if (Date.now() - this.manifestTimestamp < this.manifestCacheDuration) {
        return this.manifestCache;
      }
    }

    // Ensure URL points to index.json
    if (!url.endsWith('.json')) {
      url = `${url}/index.json`;
    }

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
   * Download OTA image file with optional SHA512 verification
   *
   * @param {string} imageUrl - URL to OTA image
   * @param {string} expectedSha512 - Optional expected SHA512 hash
   * @returns {Buffer} Image data
   */
  async downloadImage(imageUrl, expectedSha512 = null) {
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

          // Verify SHA512 if provided
          if (expectedSha512) {
            const actualHash = crypto.createHash('sha512').update(buffer).digest('hex');
            if (actualHash !== expectedSha512) {
              reject(new Error(`SHA512 mismatch! Expected: ${expectedSha512.substring(0, 16)}..., Got: ${actualHash.substring(0, 16)}...`));
              return;
            }
            this.log('[OTA] SHA512 verification passed');
          }

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

  /**
   * Get Tuya/Xiaomi OTA provider
   */
  getTuyaXiaomiProvider() {
    return this.tuyaXiaomiProvider;
  }

  /**
   * Check for Tuya device update
   *
   * @param {Object} device - Homey device
   * @returns {Object} Update info
   */
  async checkTuyaUpdate(device) {
    return this.tuyaXiaomiProvider.checkForUpdate(device);
  }

  /**
   * Get all available Tuya OTA images
   */
  async getTuyaImages() {
    return this.tuyaXiaomiProvider.getTuyaImages();
  }

  /**
   * Get all available Xiaomi/Aqara OTA images
   */
  async getXiaomiImages() {
    return this.tuyaXiaomiProvider.getXiaomiImages();
  }

  /**
   * Get OTA statistics including Tuya/Xiaomi
   */
  async getFullStats() {
    const repoStats = this.getCacheStats();
    const tuyaXiaomiStats = await this.tuyaXiaomiProvider.getStats();

    return {
      repository: repoStats,
      tuyaXiaomi: tuyaXiaomiStats
    };
  }

  // Logging helpers
  log(...args) {
    if (this.homey) {
      this.homey.log('[OTARepository]', ...args);
    } else {
      console.log('[OTARepository]', ...args);
    }
  }

  error(...args) {
    if (this.homey) {
      this.homey.error('[OTARepository]', ...args);
    } else {
      console.error('[OTARepository]', ...args);
    }
  }
}

module.exports = OTARepository;
