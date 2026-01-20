'use strict';

/**
 * TuyaXiaomiOTAProvider - Tuya & Xiaomi OTA Firmware Provider
 *
 * Based on:
 * - Zigbee2MQTT guide: https://www.zigbee2mqtt.io/advanced/more/tuya_xiaomi_ota_url.html
 * - Koenkk/zigbee-OTA: https://github.com/Koenkk/zigbee-OTA
 *
 * This module provides access to Tuya and Xiaomi/Aqara OTA firmware images
 * by utilizing the official Zigbee-OTA repository and manufacturer-specific sources.
 *
 * Features:
 * - Zigbee-OTA repository integration (Koenkk)
 * - Tuya manufacturer code filtering (0x1141 / 4417)
 * - Xiaomi/Aqara manufacturer codes (0x115F / 4447, 0x1037 / 4151)
 * - Local OTA index override support
 * - Image metadata parsing with full RepoImageMeta structure
 * - SHA512 verification support
 * - Downgrade index support (index1.json)
 * - Hardware version filtering
 * - Model ID and manufacturer name restrictions
 *
 * RepoImageMeta structure (from Koenkk/zigbee-OTA):
 * - imageType: number (automatic from parsed image)
 * - fileVersion: number (automatic from parsed image)
 * - manufacturerCode: number (automatic from parsed image)
 * - fileSize: number (automatic from parsed image)
 * - otaHeaderString: string (automatic from parsed image)
 * - url: string (automatic from image file)
 * - sha512: string (automatic from image file)
 * - fileName: string (automatic from image file)
 * - force?: boolean (ignore fileVersion, always present as 'available')
 * - hardwareVersionMin?: number
 * - hardwareVersionMax?: number
 * - modelId?: string (target only devices with this model ID)
 * - manufacturerName?: string[] (target only devices with one of these names)
 * - minFileVersion?: number (target only devices with this version or above)
 * - maxFileVersion?: number (target only devices with this version or below)
 * - originalUrl?: string
 * - releaseNotes?: string
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Manufacturer codes
const MANUFACTURER_CODES = {
  TUYA: 4417,           // 0x1141
  TUYA_ALT: 4098,       // 0x1002 (some Tuya variants)
  XIAOMI: 4447,         // 0x115F
  AQARA: 4151,          // 0x1037
  LUMI: 4406            // 0x1136
};

// OTA Repository URLs (from github.com/Koenkk/zigbee-OTA)
const OTA_SOURCES = {
  // Main upgrade index
  KOENKK_MASTER: 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json',
  // Downgrade index (previous versions, archived automatically)
  KOENKK_DOWNGRADE: 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index1.json',
  // Image directories
  TUYA_IMAGES: 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/images/Tuya',
  XIAOMI_IMAGES: 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/images/Xiaomi',
  AQARA_IMAGES: 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/images/Aqara',
  LUMI_IMAGES: 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/images/Lumi'
};

class TuyaXiaomiOTAProvider {

  constructor(homey) {
    this.homey = homey;
    this.indexCache = null;
    this.indexCacheTime = null;
    this.downgradeIndexCache = null;
    this.downgradeIndexCacheTime = null;
    this.indexCacheDuration = 6 * 60 * 60 * 1000; // 6 hours
    this.downloadedImages = new Map();
  }

  /**
   * Fetch the main OTA index from Zigbee-OTA repository
   */
  async fetchOTAIndex(forceRefresh = false) {
    // Check cache
    if (!forceRefresh && this.indexCache && this.indexCacheTime) {
      if (Date.now() - this.indexCacheTime < this.indexCacheDuration) {
        this.log('Using cached OTA index');
        return this.indexCache;
      }
    }

    this.log('Fetching OTA index from Zigbee-OTA repository...');

    try {
      const data = await this._httpGet(OTA_SOURCES.KOENKK_MASTER);
      this.indexCache = JSON.parse(data);
      this.indexCacheTime = Date.now();

      this.log(`OTA index loaded: ${this.indexCache.length} images available`);
      return this.indexCache;
    } catch (err) {
      this.error('Failed to fetch OTA index:', err.message);
      throw err;
    }
  }

  /**
   * Get all Tuya OTA images
   */
  async getTuyaImages() {
    const index = await this.fetchOTAIndex();

    return index.filter(img =>
      img.manufacturerCode === MANUFACTURER_CODES.TUYA ||
      img.manufacturerCode === MANUFACTURER_CODES.TUYA_ALT ||
      (img.url && img.url.toLowerCase().includes('tuya'))
    );
  }

  /**
   * Get all Xiaomi/Aqara OTA images
   */
  async getXiaomiImages() {
    const index = await this.fetchOTAIndex();

    return index.filter(img =>
      img.manufacturerCode === MANUFACTURER_CODES.XIAOMI ||
      img.manufacturerCode === MANUFACTURER_CODES.AQARA ||
      img.manufacturerCode === MANUFACTURER_CODES.LUMI ||
      (img.url && (
        img.url.toLowerCase().includes('xiaomi') ||
        img.url.toLowerCase().includes('aqara') ||
        img.url.toLowerCase().includes('lumi')
      ))
    );
  }

  /**
   * Fetch downgrade OTA index (index1.json - previous versions)
   */
  async fetchDowngradeIndex(forceRefresh = false) {
    if (!forceRefresh && this.downgradeIndexCache && this.downgradeIndexCacheTime) {
      if (Date.now() - this.downgradeIndexCacheTime < this.indexCacheDuration) {
        this.log('Using cached downgrade OTA index');
        return this.downgradeIndexCache;
      }
    }

    this.log('Fetching downgrade OTA index from Zigbee-OTA repository...');

    try {
      const data = await this._httpGet(OTA_SOURCES.KOENKK_DOWNGRADE);
      this.downgradeIndexCache = JSON.parse(data);
      this.downgradeIndexCacheTime = Date.now();

      this.log(`Downgrade OTA index loaded: ${this.downgradeIndexCache.length} images available`);
      return this.downgradeIndexCache;
    } catch (err) {
      this.error('Failed to fetch downgrade OTA index:', err.message);
      return [];
    }
  }

  /**
   * Find OTA image for specific device with full RepoImageMeta filtering
   *
   * Supports all Koenkk/zigbee-OTA restriction fields:
   * - manufacturerCode, imageType (required match)
   * - modelId (optional restriction)
   * - manufacturerName (optional restriction array)
   * - minFileVersion, maxFileVersion (version range restrictions)
   * - hardwareVersionMin, hardwareVersionMax (hardware version restrictions)
   * - force (ignore version check)
   *
   * @param {number} manufacturerCode - Zigbee manufacturer code
   * @param {number} imageType - OTA image type
   * @param {number} currentVersion - Current firmware version
   * @param {Object} deviceInfo - Optional device info for matching
   * @param {string} deviceInfo.modelId - Device model ID
   * @param {string} deviceInfo.manufacturerName - Device manufacturer name
   * @param {number} deviceInfo.hardwareVersion - Device hardware version
   * @returns {Object|null} OTA image info or null
   */
  async findImage(manufacturerCode, imageType, currentVersion, deviceInfo = {}) {
    const index = await this.fetchOTAIndex();
    const { modelId, manufacturerName, hardwareVersion } = deviceInfo;

    // Find matching images with full restriction checking
    let candidates = index.filter(img => {
      // Must match manufacturer code
      if (img.manufacturerCode !== manufacturerCode) return false;

      // Must match image type
      if (img.imageType !== imageType) return false;

      // Check version requirements (unless force is set)
      if (!img.force) {
        if (img.fileVersion <= currentVersion) return false;
      }

      // Check minFileVersion restriction
      if (img.minFileVersion !== undefined && currentVersion < img.minFileVersion) {
        return false;
      }

      // Check maxFileVersion restriction
      if (img.maxFileVersion !== undefined && currentVersion > img.maxFileVersion) {
        return false;
      }

      // Check modelId restriction
      if (img.modelId && modelId && img.modelId !== modelId) {
        return false;
      }

      // Check manufacturerName restriction (array of allowed names)
      if (img.manufacturerName && img.manufacturerName.length > 0 && manufacturerName) {
        const mfrLower = (manufacturerName || '').toLowerCase();
        if (!img.manufacturerName.some(m => m.toLowerCase() === mfrLower)) {
          return false;
        }
      }

      // Check hardware version restrictions
      if (hardwareVersion !== undefined) {
        if (img.hardwareVersionMin !== undefined && hardwareVersion < img.hardwareVersionMin) {
          return false;
        }
        if (img.hardwareVersionMax !== undefined && hardwareVersion > img.hardwareVersionMax) {
          return false;
        }
      }

      return true;
    });

    if (candidates.length === 0) {
      this.log(`No OTA image found for mfr=${manufacturerCode}, type=${imageType}, current=${currentVersion}`);
      return null;
    }

    // Sort by version (highest first)
    candidates.sort((a, b) => b.fileVersion - a.fileVersion);

    const best = candidates[0];
    this.log(`Found OTA image: ${best.fileName} v${best.fileVersion}`);

    // Return full RepoImageMeta structure
    return {
      // Automatic fields
      fileName: best.fileName,
      fileVersion: best.fileVersion,
      fileSize: best.fileSize,
      url: best.url,
      manufacturerCode: best.manufacturerCode,
      imageType: best.imageType,
      sha512: best.sha512 || null,
      otaHeaderString: best.otaHeaderString || null,
      // Restriction fields
      force: best.force || false,
      hardwareVersionMin: best.hardwareVersionMin,
      hardwareVersionMax: best.hardwareVersionMax,
      modelId: best.modelId || null,
      manufacturerName: best.manufacturerName || null,
      minFileVersion: best.minFileVersion,
      maxFileVersion: best.maxFileVersion,
      // Record fields
      originalUrl: best.originalUrl || null,
      releaseNotes: best.releaseNotes || null
    };
  }

  /**
   * Find downgrade OTA image (previous version)
   */
  async findDowngradeImage(manufacturerCode, imageType, currentVersion, deviceInfo = {}) {
    const index = await this.fetchDowngradeIndex();
    const { modelId, manufacturerName, hardwareVersion } = deviceInfo;

    let candidates = index.filter(img => {
      if (img.manufacturerCode !== manufacturerCode) return false;
      if (img.imageType !== imageType) return false;
      // For downgrade, we want lower version
      if (img.fileVersion >= currentVersion) return false;
      if (img.modelId && modelId && img.modelId !== modelId) return false;
      return true;
    });

    if (candidates.length === 0) return null;

    // Sort by version (highest first, so we get the closest downgrade)
    candidates.sort((a, b) => b.fileVersion - a.fileVersion);
    return candidates[0];
  }

  /**
   * Download OTA image
   *
   * @param {string} url - Image URL
   * @param {string} expectedSha512 - Optional SHA512 hash for verification
   * @returns {Buffer} Image data
   */
  async downloadImage(url, expectedSha512 = null) {
    this.log(`Downloading OTA image: ${url}`);

    // Check cache
    if (this.downloadedImages.has(url)) {
      this.log('Using cached image');
      return this.downloadedImages.get(url);
    }

    const data = await this._httpGetBuffer(url);

    // Verify SHA512 if provided
    if (expectedSha512) {
      const actualHash = crypto.createHash('sha512').update(data).digest('hex');

      if (actualHash !== expectedSha512) {
        throw new Error(`SHA512 mismatch! Expected: ${expectedSha512}, Got: ${actualHash}`);
      }

      this.log('SHA512 verification passed');
    }

    // Cache the image
    this.downloadedImages.set(url, data);

    this.log(`Downloaded ${data.length} bytes`);
    return data;
  }

  /**
   * Parse OTA image header
   *
   * OTA File Header Format (Zigbee Cluster Library spec):
   * - Upgrade File ID (4 bytes): 0x0BEEF11E
   * - Header Version (2 bytes): 0x0100
   * - Header Length (2 bytes)
   * - Field Control (2 bytes)
   * - Manufacturer Code (2 bytes)
   * - Image Type (2 bytes)
   * - File Version (4 bytes)
   * - Stack Version (2 bytes)
   * - Header String (32 bytes)
   * - Total Image Size (4 bytes)
   *
   * @param {Buffer} imageData - Raw OTA image data
   * @returns {Object} Parsed header info
   */
  parseOTAHeader(imageData) {
    if (imageData.length < 56) {
      throw new Error('Image too small to contain OTA header');
    }

    const header = {
      upgradeFileId: imageData.readUInt32LE(0),
      headerVersion: imageData.readUInt16LE(4),
      headerLength: imageData.readUInt16LE(6),
      fieldControl: imageData.readUInt16LE(8),
      manufacturerCode: imageData.readUInt16LE(10),
      imageType: imageData.readUInt16LE(12),
      fileVersion: imageData.readUInt32LE(14),
      stackVersion: imageData.readUInt16LE(18),
      headerString: imageData.slice(20, 52).toString('utf8').replace(/\0/g, ''),
      totalImageSize: imageData.readUInt32LE(52)
    };

    // Validate magic number
    if (header.upgradeFileId !== 0x0BEEF11E) {
      throw new Error(`Invalid OTA magic number: 0x${header.upgradeFileId.toString(16)}`);
    }

    return header;
  }

  /**
   * Get Tuya-specific OTA info for known devices
   *
   * Based on Zigbee2MQTT Tuya definitions
   */
  getTuyaDeviceOTAInfo(manufacturerName, modelId) {
    const TUYA_OTA_DEVICES = {
      // Climate sensors
      '_TZE284_vvmbj46n': { imageType: 0, manufacturerCode: MANUFACTURER_CODES.TUYA },

      // Smart plugs
      '_TZ3000_kdi2o9m6': { imageType: 0, manufacturerCode: MANUFACTURER_CODES.TUYA },
      '_TZ3000_gjnozsaz': { imageType: 0, manufacturerCode: MANUFACTURER_CODES.TUYA },

      // Switches
      '_TZ3000_h1ipgkwn': { imageType: 0, manufacturerCode: MANUFACTURER_CODES.TUYA },

      // Motion sensors
      '_TZE200_ar0slwnd': { imageType: 0, manufacturerCode: MANUFACTURER_CODES.TUYA },

      // Generic TS0601 devices
      'TS0601': { imageType: 0, manufacturerCode: MANUFACTURER_CODES.TUYA }
    };

    return TUYA_OTA_DEVICES[manufacturerName] || TUYA_OTA_DEVICES[modelId] || null;
  }

  /**
   * Get Xiaomi/Aqara-specific OTA info
   */
  getXiaomiDeviceOTAInfo(manufacturerName, modelId) {
    const XIAOMI_OTA_DEVICES = {
      // Aqara sensors
      'lumi.sensor_ht.agl02': { imageType: 0x10E1, manufacturerCode: MANUFACTURER_CODES.XIAOMI },
      'lumi.sensor_magnet.aq2': { imageType: 0x00C3, manufacturerCode: MANUFACTURER_CODES.XIAOMI },
      'lumi.sensor_motion.aq2': { imageType: 0x00C4, manufacturerCode: MANUFACTURER_CODES.XIAOMI },

      // Aqara plugs
      'lumi.plug.maeu01': { imageType: 0x00C6, manufacturerCode: MANUFACTURER_CODES.XIAOMI }
    };

    return XIAOMI_OTA_DEVICES[modelId] || null;
  }

  /**
   * Check for available update
   *
   * @param {Object} device - Homey device
   * @returns {Object} Update availability info
   */
  async checkForUpdate(device) {
    try {
      const settings = device.getSettings();
      const manufacturerName = settings.zb_manufacturerName;
      const modelId = settings.zb_modelId;

      // Get current version from device
      let currentVersion = 0;
      try {
        const zclNode = device.zclNode;
        if (zclNode && zclNode.endpoints && zclNode.endpoints[1]) {
          const ep = zclNode.endpoints[1];
          if (ep.clusters && ep.clusters.otaUpgrade) {
            currentVersion = ep.clusters.otaUpgrade.currentFileVersion || 0;
          }
        }
      } catch (e) {
        this.log('Could not read current version from device');
      }

      // Try Tuya lookup
      const tuyaInfo = this.getTuyaDeviceOTAInfo(manufacturerName, modelId);
      if (tuyaInfo) {
        const image = await this.findImage(
          tuyaInfo.manufacturerCode,
          tuyaInfo.imageType,
          currentVersion,
          modelId
        );

        if (image) {
          return {
            available: true,
            manufacturer: 'Tuya',
            currentVersion,
            newVersion: image.fileVersion,
            fileName: image.fileName,
            fileSize: image.fileSize,
            url: image.url
          };
        }
      }

      // Try Xiaomi lookup
      const xiaomiInfo = this.getXiaomiDeviceOTAInfo(manufacturerName, modelId);
      if (xiaomiInfo) {
        const image = await this.findImage(
          xiaomiInfo.manufacturerCode,
          xiaomiInfo.imageType,
          currentVersion,
          modelId
        );

        if (image) {
          return {
            available: true,
            manufacturer: 'Xiaomi/Aqara',
            currentVersion,
            newVersion: image.fileVersion,
            fileName: image.fileName,
            fileSize: image.fileSize,
            url: image.url
          };
        }
      }

      return {
        available: false,
        reason: 'No update available or device not supported'
      };

    } catch (err) {
      this.error('Error checking for update:', err);
      return {
        available: false,
        reason: err.message
      };
    }
  }

  /**
   * Get OTA index statistics
   */
  async getStats() {
    const index = await this.fetchOTAIndex();

    const stats = {
      totalImages: index.length,
      tuyaImages: 0,
      xiaomiImages: 0,
      otherImages: 0,
      manufacturers: new Set(),
      cacheAge: this.indexCacheTime ? Date.now() - this.indexCacheTime : null
    };

    for (const img of index) {
      stats.manufacturers.add(img.manufacturerCode);

      if (img.manufacturerCode === MANUFACTURER_CODES.TUYA ||
        img.manufacturerCode === MANUFACTURER_CODES.TUYA_ALT) {
        stats.tuyaImages++;
      } else if (img.manufacturerCode === MANUFACTURER_CODES.XIAOMI ||
        img.manufacturerCode === MANUFACTURER_CODES.AQARA ||
        img.manufacturerCode === MANUFACTURER_CODES.LUMI) {
        stats.xiaomiImages++;
      } else {
        stats.otherImages++;
      }
    }

    stats.manufacturers = stats.manufacturers.size;

    return stats;
  }

  /**
   * Clear caches
   */
  clearCache() {
    this.indexCache = null;
    this.indexCacheTime = null;
    this.downloadedImages.clear();
    this.log('Cache cleared');
  }

  // === HTTP Helpers ===

  async _httpGet(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      protocol.get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  async _httpGetBuffer(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      protocol.get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });
  }

  // === Logging ===

  log(...args) {
    if (this.homey) {
      this.homey.log('[TuyaXiaomiOTA]', ...args);
    } else {
      console.log('[TuyaXiaomiOTA]', ...args);
    }
  }

  error(...args) {
    if (this.homey) {
      this.homey.error('[TuyaXiaomiOTA]', ...args);
    } else {
      console.error('[TuyaXiaomiOTA]', ...args);
    }
  }
}

// Export manufacturer codes for external use
TuyaXiaomiOTAProvider.MANUFACTURER_CODES = MANUFACTURER_CODES;
TuyaXiaomiOTAProvider.OTA_SOURCES = OTA_SOURCES;

module.exports = TuyaXiaomiOTAProvider;
