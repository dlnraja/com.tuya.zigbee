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
const fs = require('fs');
const path = require('path');
const CircuitBreaker = require('../utils/CircuitBreaker');

class AutonomousEnricher {
  
  constructor(homey) {
    this.homey = homey;
    try {
      this.logger = (this.homey && this.homey.app) || console;
    } catch (e) {
      this.logger = console;
    }
    
    // v9.0.40: Local First Vision
    this.LOCAL_DB_PATH = path.join(__dirname, '..', '..', 'data', 'mfs_db.json');
    this.REMOTE_DB_URL = 'https://raw.githubusercontent.com/blakadder/zigbee/master/_data/tuya.json'; 
    this.CHECK_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days (weekly fallback)
    
    this.liveMappings = {};
    this.currentHash = null;

    // v9.0.40 TITAN: Circuit breaker for fault tolerance
    this._breaker = new CircuitBreaker({
      name: 'AutonomousEnricher',
      failureThreshold: 3,
      resetTimeout: 60000,
      successThreshold: 1,
      maxBackoff: 600000,
      log: (msg) => this.logger.log(msg),
    });
  }

  async start() {
    this.logger.log('[AUTONOMOUS-ENRICHER] 🚀 Starting Zero-Touch Update Service (Local-First Mode)...');
    
    // Initial fetch from Local DB
    await this.loadLocalMappings();
    
    // Schedule periodic remote checks as fallback
    this.interval = this.homey.setTimeout(() => {
      this.fetchLatestMappings(); // First remote check after 1 hour maybe? Or wait the full 7 days? Let's just wait the interval
      this.interval = this.homey.setInterval(() => {
        if (this._destroyed) return;
        this.fetchLatestMappings();
      }, this.CHECK_INTERVAL);
    }, 60 * 60 * 1000); // Wait 1 hour after boot before doing a remote fetch to save resources on startup
  }

  async loadLocalMappings() {
    try {
      if (fs.existsSync(this.LOCAL_DB_PATH)) {
        this.logger.log(`[AUTONOMOUS-ENRICHER] 📥 Loading Local MFS DB as Primary Source...`);
        const rawData = fs.readFileSync(this.LOCAL_DB_PATH, 'utf8');
        const parsed = JSON.parse(rawData);
        
        // MFS DB might be an array or object. Let's merge it intelligently.
        if (Array.isArray(parsed)) {
          parsed.forEach(entry => {
            if (entry.manufacturerId) {
              this.liveMappings[entry.manufacturerId] = entry;
            }
          });
        } else {
          this.liveMappings = parsed.manufacturers || parsed;
        }
        
        this.currentHash = crypto.createHash('md5').update(rawData).digest('hex');
        this.logger.log(`[AUTONOMOUS-ENRICHER] ✅ Local MFS DB loaded!`);
      } else {
        this.logger.log(`[AUTONOMOUS-ENRICHER] ⚠️ Local MFS DB not found, will rely on remote fetch.`);
        await this.fetchLatestMappings();
      }
    } catch (err) {
      this.logger.error(`[AUTONOMOUS-ENRICHER] ❌ Failed to parse local DB:`, err.message);
      await this.fetchLatestMappings();
    }
  }

  async fetchLatestMappings() {
    try {
      this.logger.log(`[AUTONOMOUS-ENRICHER] 📥 Checking for latest Tuya mappings from Remote Fallback...`);
      
      const rawData = await this._httpGet(this.REMOTE_DB_URL);
      const hash = crypto.createHash('md5').update(rawData).digest('hex');
      
      if (this.currentHash !== hash) {
        this.logger.log(`[AUTONOMOUS-ENRICHER] 🔄 New mappings found! (Hash: ${hash})`);
        this.currentHash = hash;
        
        try {
          const parsed = JSON.parse(rawData);
          // Assuming the remote JSON has a structured mapping
          const remoteMap = parsed.manufacturers || parsed;
          
          // Merge Remote into Local Memory
          Object.assign(this.liveMappings, remoteMap);
          
          // Optionally save to disk to persist the fallback
          fs.writeFileSync(this.LOCAL_DB_PATH, JSON.stringify(this.liveMappings, null, 2));
          this.logger.log(`[AUTONOMOUS-ENRICHER] ✅ Live memory mappings updated and saved locally!`);
        } catch(parseErr) {
          // It might not be JSON, just a simulation text
          this.logger.error(`[AUTONOMOUS-ENRICHER] ❌ Failed to parse remote DB:`, parseErr.message);
        }
      } else {
        this.logger.log(`[AUTONOMOUS-ENRICHER] ⚡ Mappings are up to date.`);
      }
    } catch (err) {
      this.logger.error(`[AUTONOMOUS-ENRICHER] ⚠️ Remote fetch failed, continuing with local cache:`, err.message);
    }
  }

  /**
   * Called by TuyaSpecificDevice when it doesn't recognize a DP
   * v9.0.40: Implemented Case-Insensitive matching
   */
  getDynamicMapping(manufacturerName, dpId) {
    if (!this.liveMappings || !manufacturerName) {
      return null;
    }
    
    // Case Insensitive Match
    const targetMfr = manufacturerName.toLowerCase();
    const caseInsensitiveKey = Object.keys(this.liveMappings).find(
      key => key.toLowerCase() === targetMfr
    );
    
    if (!caseInsensitiveKey) {
      return null;
    }
    
    const deviceConfig = this.liveMappings[caseInsensitiveKey];
    // Example: {"1": "measure_temperature", "2": "measure_humidity"}
    if (deviceConfig && deviceConfig.dps && deviceConfig.dps[dpId]) {
      return deviceConfig.dps[dpId];
    }
    
    return null;
  }

  _httpGet(url) {
    // v9.0.40 TITAN: Wrap in circuit breaker for fault tolerance
    return this._breaker.exec(() => this._rawHttpGet(url));
  }

  _rawHttpGet(url) {
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'Homey-Tuya-Enricher/1.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return resolve(this._rawHttpGet(res.headers.location));
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
      this.homey.clearTimeout(this.interval);
    }
  }
}

module.exports = AutonomousEnricher;
