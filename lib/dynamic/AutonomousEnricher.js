'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🌐 AUTONOMOUS ENRICHER (Zero-Touch Updates)                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Runs silently in the background of the Homey App.                           ║
 * ║  Periodically fetches the latest Tuya DP mappings and configurations         ║
 * ║  from a remote master source, allowing devices to be supported without       ║
 * ║  requiring an App Store update.                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const https = require('https');
const crypto = require('crypto');

class AutonomousEnricher {
  
  constructor(homey) {
    this.homey = homey;
    this.logger = this.homey.app || console;
    
    // URL to the central mfs_db.json or dynamic DP map (Simulation using a Gist or raw Github)
    // In production, this would be a dedicated Tuya MFS DB URL.
    this.REMOTE_DB_URL = 'https://raw.githubusercontent.com/blakadder/zigbee/master/_data/tuya.json'; 
    this.CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
    
    this.liveMappings = {};
    this.currentHash = null;
  }

  async start() {
    this.logger.log('[AUTONOMOUS-ENRICHER] 🚀 Starting Zero-Touch Update Service...');
    
    // Initial fetch
    await this.fetchLatestMappings();
    
    // Schedule periodic checks
    this.interval = this.homey.setInterval(() => {
      this.fetchLatestMappings();
    }, this.CHECK_INTERVAL);
  }

  async fetchLatestMappings() {
    try {
      this.logger.log(`[AUTONOMOUS-ENRICHER] 📥 Checking for latest Tuya mappings...`);
      
      const rawData = await this._httpGet(this.REMOTE_DB_URL);
      const hash = crypto.createHash('md5').update(rawData).digest('hex');
      
      if (this.currentHash !== hash) {
        this.logger.log(`[AUTONOMOUS-ENRICHER] 🔄 New mappings found! (Hash: ${hash})`);
        this.currentHash = hash;
        
        try {
          const parsed = JSON.parse(rawData);
          // Assuming the remote JSON has a structured mapping
          // In reality, we adapt it to our TuyaDataPointEngine format
          this.liveMappings = parsed.manufacturers || parsed;
          this.logger.log(`[AUTONOMOUS-ENRICHER] ✅ Live memory mappings updated!`);
        } catch(parseErr) {
          // It might not be JSON, just a simulation text
          this.logger.error(`[AUTONOMOUS-ENRICHER] ❌ Failed to parse remote DB:`, parseErr.message);
        }
      } else {
        this.logger.log(`[AUTONOMOUS-ENRICHER] ⚡ Mappings are up to date.`);
      }
    } catch (err) {
      this.logger.error(`[AUTONOMOUS-ENRICHER] ⚠️ Remote fetch failed, using local cache:`, err.message);
    }
  }

  /**
   * Called by TuyaSpecificDevice when it doesn't recognize a DP
   */
  getDynamicMapping(manufacturerName, dpId) {
    if (!this.liveMappings || !this.liveMappings[manufacturerName]) {
      return null;
    }
    
    const deviceConfig = this.liveMappings[manufacturerName];
    // Example: {"1": "measure_temperature", "2": "measure_humidity"}
    if (deviceConfig.dps && deviceConfig.dps[dpId]) {
      return deviceConfig.dps[dpId];
    }
    
    return null;
  }

  _httpGet(url) {
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'Homey-Tuya-Enricher/1.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return resolve(this._httpGet(res.headers.location));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  stop() {
    if (this.interval) {
      this.homey.clearInterval(this.interval);
    }
  }
}

module.exports = AutonomousEnricher;
