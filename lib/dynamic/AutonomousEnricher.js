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
const TU = require('../utils/TuyaNormalizer');

class AutonomousEnricher {
  
  constructor(homey) {
    this.homey = homey;
    try {
      this.logger = (this.homey && !this.homey.isDestroyed && this.homey.app) || console;
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

  _rssTooHigh() {
    try {
      const mem = process.memoryUsage();
      return (mem.rss || 0) > 50 * 1024 * 1024 || (mem.heapUsed || 0) > 38 * 1024 * 1024;
    } catch { return false; }
  }

  async start() {
    this.logger.log('[AUTONOMOUS-ENRICHER] 🚀 Starting Zero-Touch Update Service (Local-First Mode)...');

    // P183 memory guard: skip startup local-load (mfs_db.json is 6.87MB).
    // The data is already available via DeviceFingerprintDB at pairing time.
    // Loading it again into liveMappings just wastes 7MB of RSS permanently.
    // We keep liveMappings empty until a device actually needs enrichment.
    this.logger.log('[AUTONOMOUS-ENRICHER] Local load deferred (P183: RSS guard — mfs_db available via DeviceFingerprintDB)');

    // Schedule periodic remote checks as fallback — after 2 hours (not 1h)
    // to avoid competing with LiveDataUpdater which runs at boot+30min.
    this.interval = this.homey.setTimeout(() => {
      if (!this._destroyed) this.fetchLatestMappings();
      this.interval = this.homey.setInterval(() => {
        if (this._destroyed) {return;}
        if (!this._rssTooHigh()) this.fetchLatestMappings();
        else this.logger.log('[AUTONOMOUS-ENRICHER] Skip remote fetch — RSS pressure');
      }, this.CHECK_INTERVAL);
    }, 2 * 60 * 60 * 1000); // Wait 2h after boot (staggered from LiveDataUpdater)
  }

  async loadLocalMappings() {
    // P183: guard — skip if RSS already high (called only on explicit demand)
    if (this._rssTooHigh()) {
      this.logger.log('[AUTONOMOUS-ENRICHER] Skip loadLocalMappings — RSS pressure');
      return;
    }
    try {
      if (fs.existsSync(this.LOCAL_DB_PATH)) {
        this.logger.log(`[AUTONOMOUS-ENRICHER] 📥 Loading Local MFS DB as Primary Source...`);
        const rawBuf = fs.readFileSync(this.LOCAL_DB_PATH); // Buffer — avoids UTF-16 string allocation
        const parsed = JSON.parse(rawBuf);
        
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
    const caseInsensitiveKey = TU.findCI(Object.keys(this.liveMappings), manufacturerName);
    
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
