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
    this._localLoaded = false;
    this._startupTimeout = null;
    this._checkInterval = null;

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

    // Local-first: try a best-effort local load soon after boot.
    // If RSS is already tight, we skip and keep remote enrichment guarded by circuit breaker.
    // Either way, the module must NEVER crash if offline.
    this.logger.log('[AUTONOMOUS-ENRICHER] Local-first: best-effort local load shortly after boot');

    // Best-effort local load (do not block boot)
    this._startupTimeout = this.homey.setTimeout(() => {
      if (this._destroyed) return;
      this.loadLocalMappings().catch(() => {});
    }, 30 * 1000);

    // Schedule periodic remote checks as fallback — after 2 hours (not 1h)
    // to avoid competing with LiveDataUpdater which runs at boot+30min.
    this._checkInterval = null;
    this.interval = this.homey.setTimeout(() => {
      if (!this._destroyed) this.fetchLatestMappings();
      this._checkInterval = this.homey.setInterval(() => {
        if (this._destroyed) {return;}
        if (!this._breaker.isAvailable) {
          this.logger.log('[AUTONOMOUS-ENRICHER] Skip remote fetch — circuit breaker open');
          return;
        }
        if (!this._rssTooHigh()) this.fetchLatestMappings();
        else this.logger.log('[AUTONOMOUS-ENRICHER] Skip remote fetch — RSS pressure');
      }, this.CHECK_INTERVAL);
    }, 2 * 60 * 60 * 1000); // Wait 2h after boot (staggered from LiveDataUpdater)
  }

  async loadLocalMappings() {
    // P183: guard — skip if RSS already high
    if (this._rssTooHigh()) {
      this.logger.log('[AUTONOMOUS-ENRICHER] Skip loadLocalMappings — RSS pressure');
      return;
    }

    if (this._localLoaded) return;

    try {
      if (fs.existsSync(this.LOCAL_DB_PATH)) {
        this.logger.log(`[AUTONOMOUS-ENRICHER] 📥 Loading Local MFS DB as Primary Source...`);
        const rawBuf = fs.readFileSync(this.LOCAL_DB_PATH); // Buffer — avoids UTF-16 string allocation
        const parsed = JSON.parse(rawBuf.toString('utf8'));
        
        // Current schema: object of manufacturerId -> entry, with a special `_meta` key.
        // Older schemas may have a `manufacturers` wrapper — support both safely.
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          if (parsed.manufacturers && typeof parsed.manufacturers === 'object') {
            this.liveMappings = parsed.manufacturers;
          } else {
            // Drop `_meta` to keep only the mapping payload.
            // Mutate the parsed object locally (no extra full-object clone).
            delete parsed._meta;
            this.liveMappings = parsed;
          }
        } else {
          this.logger.log('[AUTONOMOUS-ENRICHER] Local MFS DB schema unsupported; keeping empty mappings');
          this.liveMappings = {};
        }

        this.currentHash = crypto.createHash('md5').update(rawBuf).digest('hex');
        this._localLoaded = true;
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

      if (!this._breaker.isAvailable) {
        this.logger.log('[AUTONOMOUS-ENRICHER] Remote fetch skipped — circuit breaker open');
        return;
      }
      
      // Ensure we have at least the local cache path available.
      // Never block on local load; keep it best-effort.
      await this.loadLocalMappings().catch(() => {});

      const rawBuf = await this._httpGet(this.REMOTE_DB_URL);
      const hash = crypto.createHash('md5').update(rawBuf).digest('hex');
      
      if (this.currentHash !== hash) {
        this.logger.log(`[AUTONOMOUS-ENRICHER] 🔄 New mappings found! (Hash: ${hash})`);
        this.currentHash = hash;
        
        try {
          const parsed = JSON.parse(rawBuf.toString('utf8'));
          const remoteMap = parsed?.manufacturers && typeof parsed.manufacturers === 'object'
            ? parsed.manufacturers
            : (parsed && typeof parsed === 'object' ? parsed : null);

          if (remoteMap && typeof remoteMap === 'object') {
            // Merge remote into memory only.
            // (File system writes are risky in Homey runtime; keep the fallback in RAM.)
            Object.assign(this.liveMappings, remoteMap);
            this.logger.log(`[AUTONOMOUS-ENRICHER] ✅ Live memory mappings updated (remote merge)`);
          } else {
            this.logger.log('[AUTONOMOUS-ENRICHER] Remote schema unsupported; keeping local cache');
          }
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

    // Support multiple known local schemas safely.
    // We never throw here: "local-first" means "no crash".
    if (deviceConfig && typeof deviceConfig === 'object') {
      const dpTable =
        deviceConfig.dps ||
        deviceConfig.dp ||
        deviceConfig.dpMappings ||
        deviceConfig.dpsMappings;

      if (dpTable && typeof dpTable === 'object') {
        const key = dpId;
        const strKey = String(dpId);
        return dpTable[key] || dpTable[strKey] || null;
      }
    }
    
    return null;
  }

  _httpGet(url) {
    // v9.0.40 TITAN: Wrap in circuit breaker for fault tolerance
    return this._breaker.exec(() => this._rawHttpGet(url));
  }

  _rawHttpGet(url, redirects = 0) {
    return new Promise((resolve, reject) => {
      const MAX_REMOTE_BYTES = 3 * 1024 * 1024; // 3MB hard cap (Homey crash prevention)
      const MAX_REDIRECTS = 4;

      if (redirects > MAX_REDIRECTS) {
        return reject(new Error(`Too many redirects (${MAX_REDIRECTS})`));
      }

      https.get(url, { headers: { 'User-Agent': 'Homey-Tuya-Enricher/1.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const location = res.headers.location;
          if (!location) return reject(new Error('Redirect without location header'));
          return resolve(this._rawHttpGet(location, redirects + 1));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }

        let received = 0;
        const chunks = [];
        res.on('data', (chunk) => {
          received += chunk.length;
          if (received > MAX_REMOTE_BYTES) {
            res.destroy(new Error('Remote feed exceeds 3MB cap'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject).setTimeout(15000, () => reject(new Error('timeout 15s')));
    });
  }

  stop() {
    if (this._startupTimeout) {
      try { this.homey.clearTimeout(this._startupTimeout); } catch { /* noop */ }
      this._startupTimeout = null;
    }
    if (this.interval) {
      try { this.homey.clearTimeout(this.interval); } catch { /* noop */ }
      this.interval = null;
    }
    if (this._checkInterval) {
      try { this.homey.clearInterval(this._checkInterval); } catch { /* noop */ }
      this._checkInterval = null;
    }
  }
}

module.exports = AutonomousEnricher;
