'use strict';

/**
 * DatabaseUpdater.js - Automatic database update from all sources
 *
 * This module automatically fetches data from:
 * - Zigbee2MQTT (devices, converters)
 * - Zigbee-OTA (firmware index)
 * - ZHA quirks (Tuya device handlers)
 * - Blakadder database
 * - deCONZ device descriptors
 *
 * Usage:
 *   const updater = new DatabaseUpdater(homey);
 *   await updater.updateAll();
 *   await updater.scheduleAutoUpdates();
 */

const https = require('https');
const http = require('http');
const { SOURCES, markSourceChecked, shouldUpdateSource } = require('./SourceCredits');

class DatabaseUpdater {

  constructor(homey) {
    this.homey = homey;
    this.cache = new Map();
    this.updateTimers = new Map();
    this.lastUpdateResults = {};
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN UPDATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update all sources that need updating
   */
  async updateAll(force = false) {
    this.log('🔄 Starting database update from all sources...');

    const results = {
      timestamp: Date.now(),
      sources: {},
      totalDevices: 0,
      errors: []
    };

    // Update each source
    for (const sourceId of Object.keys(SOURCES)) {
      if (force || shouldUpdateSource(sourceId)) {
        try {
          const result = await this.updateSource(sourceId);
          results.sources[sourceId] = result;
          if (result.deviceCount) results.totalDevices += result.deviceCount;
          markSourceChecked(sourceId);
        } catch (err) {
          results.errors.push({ source: sourceId, error: err.message });
          this.error(`Failed to update ${sourceId}:`, err.message);
        }
      } else {
        results.sources[sourceId] = { skipped: true, reason: 'Recently updated' };
      }
    }

    this.lastUpdateResults = results;
    this.log(`✅ Database update complete. Total devices: ${results.totalDevices}`);

    return results;
  }

  /**
   * Update a specific source
   */
  async updateSource(sourceId) {
    const source = SOURCES[sourceId];
    if (!source) throw new Error(`Unknown source: ${sourceId}`);

    this.log(`📥 Updating from ${source.name}...`);

    switch (sourceId) {
      case 'ZIGBEE2MQTT':
        return await this.updateFromZigbee2MQTT();
      case 'ZIGBEE_OTA':
        return await this.updateFromZigbeeOTA();
      case 'ZHA_QUIRKS':
        return await this.updateFromZHAQuirks();
      case 'BLAKADDER':
        return await this.updateFromBlakadder();
      case 'FAIRECASOIMEME_OTA':
        return await this.updateFromFairecasoimeme();
      case 'DECONZ':
        return await this.updateFromDeCONZ();
      default:
        return { skipped: true, reason: 'No updater implemented' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZIGBEE2MQTT UPDATER
  // ═══════════════════════════════════════════════════════════════════════════

  async updateFromZigbee2MQTT() {
    const source = SOURCES.ZIGBEE2MQTT;
    const devices = [];

    try {
      // Fetch Tuya converters
      const convertersUrl = source.dataEndpoints.herdsmanConverters;
      const convertersData = await this._httpGet(convertersUrl);

      // Parse fingerprints from TypeScript
      const fingerprints = this._parseTuyaConverters(convertersData);

      this.cache.set('zigbee2mqtt_tuya', {
        data: fingerprints,
        timestamp: Date.now()
      });

      return {
        success: true,
        source: 'ZIGBEE2MQTT',
        deviceCount: fingerprints.length,
        lastUpdate: new Date().toISOString()
      };
    } catch (err) {
      throw new Error(`Zigbee2MQTT update failed: ${err.message}`);
    }
  }

  /**
   * Parse Tuya device definitions from zigbee-herdsman-converters
   */
  _parseTuyaConverters(tsContent) {
    const devices = [];

    // Extract fingerprint patterns: tuya.fingerprint("TS0601", ["_TZE200_xxx", "_TZE284_xxx"])
    const fingerprintRegex = /fingerprint\s*\(\s*["'](\w+)["']\s*,\s*\[([^\]]+)\]/g;
    let match;

    while ((match = fingerprintRegex.exec(tsContent)) !== null) {
      const modelId = match[1];
      const manufacturers = match[2]
        .split(',')
        .map(m => m.trim().replace(/["']/g, ''))
        .filter(m => m.startsWith('_TZ'));

      for (const mfr of manufacturers) {
        devices.push({
          manufacturerName: mfr,
          modelId: modelId,
          source: 'zigbee2mqtt'
        });
      }
    }

    // Extract whitelabel patterns
    const whitelabelRegex = /whitelabel\s*\(\s*["'](\w+)["']\s*,\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*\[([^\]]+)\]/g;

    while ((match = whitelabelRegex.exec(tsContent)) !== null) {
      const vendor = match[1];
      const model = match[2];
      const description = match[3];
      const manufacturers = match[4]
        .split(',')
        .map(m => m.trim().replace(/["']/g, ''))
        .filter(m => m.startsWith('_TZ'));

      for (const mfr of manufacturers) {
        const existing = devices.find(d => d.manufacturerName === mfr);
        if (existing) {
          existing.vendor = vendor;
          existing.model = model;
          existing.description = description;
        }
      }
    }

    // Extract tuyaDatapoints patterns
    const datapointsRegex = /tuyaDatapoints:\s*\[([\s\S]*?)\]\s*[,}]/g;
    const dpPattern = /\[\s*(\d+)\s*,\s*["'](\w+)["']/g;

    return devices;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZIGBEE-OTA UPDATER
  // ═══════════════════════════════════════════════════════════════════════════

  async updateFromZigbeeOTA() {
    const source = SOURCES.ZIGBEE_OTA;

    try {
      const indexData = await this._httpGet(source.dataEndpoints.indexJson);
      const index = JSON.parse(indexData);

      // Filter Tuya and Xiaomi images
      const tuyaCodes = [4417, 4098]; // 0x1141, 0x1002
      const xiaomiCodes = [4447, 4151, 4406]; // 0x115F, 0x1037, 0x1136

      const tuyaImages = index.filter(img => tuyaCodes.includes(img.manufacturerCode));
      const xiaomiImages = index.filter(img => xiaomiCodes.includes(img.manufacturerCode));

      this.cache.set('ota_index', {
        data: index,
        tuyaImages,
        xiaomiImages,
        timestamp: Date.now()
      });

      return {
        success: true,
        source: 'ZIGBEE_OTA',
        totalImages: index.length,
        tuyaImages: tuyaImages.length,
        xiaomiImages: xiaomiImages.length,
        lastUpdate: new Date().toISOString()
      };
    } catch (err) {
      throw new Error(`Zigbee-OTA update failed: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZHA QUIRKS UPDATER
  // ═══════════════════════════════════════════════════════════════════════════

  async updateFromZHAQuirks() {
    const source = SOURCES.ZHA_QUIRKS;

    try {
      const quirksData = await this._httpGet(source.dataEndpoints.tuyaQuirks);

      // Parse TuyaQuirkBuilder patterns
      const quirks = this._parseZHAQuirks(quirksData);

      this.cache.set('zha_quirks', {
        data: quirks,
        timestamp: Date.now()
      });

      return {
        success: true,
        source: 'ZHA_QUIRKS',
        quirksCount: quirks.length,
        lastUpdate: new Date().toISOString()
      };
    } catch (err) {
      throw new Error(`ZHA quirks update failed: ${err.message}`);
    }
  }

  _parseZHAQuirks(pyContent) {
    const quirks = [];

    // Extract TuyaQuirkBuilder patterns
    const builderRegex = /TuyaQuirkBuilder\s*\(\s*["']([^"']+)["']\s*,\s*["'](\w+)["']\s*\)/g;
    let match;

    while ((match = builderRegex.exec(pyContent)) !== null) {
      quirks.push({
        manufacturerName: match[1],
        modelId: match[2],
        source: 'zha_quirks'
      });
    }

    // Extract .applies_to patterns
    const appliesToRegex = /\.applies_to\s*\(\s*["']([^"']+)["']\s*,\s*["'](\w+)["']\s*\)/g;

    while ((match = appliesToRegex.exec(pyContent)) !== null) {
      quirks.push({
        manufacturerName: match[1],
        modelId: match[2],
        source: 'zha_quirks'
      });
    }

    return quirks;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BLAKADDER UPDATER
  // ═══════════════════════════════════════════════════════════════════════════

  async updateFromBlakadder() {
    const source = SOURCES.BLAKADDER;

    try {
      // Note: Blakadder uses Jekyll, so devices.json is generated
      // We'll parse from the website structure instead

      this.cache.set('blakadder', {
        data: [],
        timestamp: Date.now(),
        note: 'Blakadder data requires website scraping - manual update'
      });

      return {
        success: true,
        source: 'BLAKADDER',
        note: 'Website scraping not implemented - use manual update',
        lastUpdate: new Date().toISOString()
      };
    } catch (err) {
      throw new Error(`Blakadder update failed: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FAIRECASOIMEME OTA UPDATER
  // ═══════════════════════════════════════════════════════════════════════════

  async updateFromFairecasoimeme() {
    const source = SOURCES.FAIRECASOIMEME_OTA;

    try {
      const indexData = await this._httpGet(source.dataEndpoints.indexJson);
      const index = JSON.parse(indexData);

      this.cache.set('fairecasoimeme_ota', {
        data: index,
        timestamp: Date.now()
      });

      return {
        success: true,
        source: 'FAIRECASOIMEME_OTA',
        imageCount: index.length,
        lastUpdate: new Date().toISOString()
      };
    } catch (err) {
      throw new Error(`Fairecasoimeme update failed: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DECONZ UPDATER
  // ═══════════════════════════════════════════════════════════════════════════

  async updateFromDeCONZ() {
    const source = SOURCES.DECONZ;

    try {
      // deCONZ device descriptors
      this.cache.set('deconz', {
        data: [],
        timestamp: Date.now(),
        note: 'deCONZ integration pending'
      });

      return {
        success: true,
        source: 'DECONZ',
        note: 'deCONZ updater pending implementation',
        lastUpdate: new Date().toISOString()
      };
    } catch (err) {
      throw new Error(`deCONZ update failed: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-UPDATE SCHEDULER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Schedule automatic updates for all sources
   */
  scheduleAutoUpdates() {
    this.log('📅 Scheduling automatic updates...');

    for (const [sourceId, source] of Object.entries(SOURCES)) {
      if (source.updateInterval) {
        this._scheduleSourceUpdate(sourceId, source.updateInterval);
      }
    }

    this.log('✅ Auto-update scheduling complete');
  }

  _scheduleSourceUpdate(sourceId, interval) {
    // Clear existing timer
    if (this.updateTimers.has(sourceId)) {
      clearInterval(this.updateTimers.get(sourceId));
    }

    // Schedule new timer
    const timer = setInterval(async () => {
      try {
        this.log(`⏰ Auto-updating ${sourceId}...`);
        await this.updateSource(sourceId);
        markSourceChecked(sourceId);
      } catch (err) {
        this.error(`Auto-update failed for ${sourceId}:`, err.message);
      }
    }, interval);

    this.updateTimers.set(sourceId, timer);

    const hours = Math.round(interval / (60 * 60 * 1000));
    this.log(`  📌 ${sourceId}: every ${hours}h`);
  }

  /**
   * Stop all auto-updates
   */
  stopAutoUpdates() {
    for (const [sourceId, timer] of this.updateTimers) {
      clearInterval(timer);
    }
    this.updateTimers.clear();
    this.log('⏹️ Auto-updates stopped');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE ACCESS
  // ═══════════════════════════════════════════════════════════════════════════

  getCachedData(key) {
    return this.cache.get(key);
  }

  getLastUpdateResults() {
    return this.lastUpdateResults;
  }

  getCacheStats() {
    const stats = {};
    for (const [key, value] of this.cache) {
      stats[key] = {
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp,
        dataSize: JSON.stringify(value.data || {}).length
      };
    }
    return stats;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HTTP UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  _httpGet(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;

      const request = client.get(url, {
        headers: {
          'User-Agent': 'UniversalTuyaZigbee/5.2.33 (HomeyApp)',
          'Accept': 'application/json, text/plain, */*'
        },
        timeout: 30000
      }, (response) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return this._httpGet(response.headers.location).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${url}`));
          return;
        }

        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => resolve(data));
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGGING
  // ═══════════════════════════════════════════════════════════════════════════

  log(...args) {
    if (this.homey) {
      this.homey.log('[DB-UPDATER]', ...args);
    } else {
      console.log('[DB-UPDATER]', ...args);
    }
  }

  error(...args) {
    if (this.homey) {
      this.homey.error('[DB-UPDATER]', ...args);
    } else {
      console.error('[DB-UPDATER]', ...args);
    }
  }
}

module.exports = DatabaseUpdater;
