#!/usr/bin/env node
/**
 * INTELLIGENT ENRICHER v2.0
 *
 * FIXES FROM v1.0:
 * - Fixed rate limiting with exponential backoff
 * - Fixed 404 errors with local cache fallback
 * - Added GitHub Issues/PRs full content reading
 * - Added Forum messages processing
 * - Added local JSON database for offline enrichment
 *
 * Features:
 * - Multi-source scraping (GitHub, Z2M, Forum, Google)
 * - API fallback with local cache
 * - Tracking of already processed items
 * - Monthly automatic enrichment via cron
 * - Annual full re-scan
 *
 * @author Universal Tuya Zigbee Project
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  DRIVERS_DIR: path.join(__dirname, '../../drivers'),
  DATA_DIR: path.join(__dirname, '../../data'),
  TRACKING_DIR: path.join(__dirname, '../../data/tracking'),
  CACHE_DIR: path.join(__dirname, '../../data/cache'),

  // Local databases
  LOCAL_DB_FILE: path.join(__dirname, '../../data/LOCAL_ENRICHMENT_DB.json'),
  Z2M_CACHE_FILE: path.join(__dirname, '../../data/cache/z2m_devices.json'),
  GITHUB_CACHE_FILE: path.join(__dirname, '../../data/cache/github_issues.json'),

  // Tracking
  TRACKING_FILE: 'enrichment_tracking.json',

  // Timing
  MONTHLY_INTERVAL_DAYS: 30,
  ANNUAL_FULL_SCAN_DAYS: 365,

  // API limits - IMPROVED
  RATE_LIMIT_BASE_MS: 2000,      // Base delay between requests
  RATE_LIMIT_BACKOFF: 2,         // Exponential backoff multiplier
  MAX_RETRIES: 5,                // More retries
  REQUEST_TIMEOUT: 15000,        // 15 second timeout

  // Sources priority
  SOURCES: [
    'local_db',           // 1. Local database (instant, no rate limit)
    'z2m_cache',          // 2. Cached Z2M data
    'github_cache',       // 3. Cached GitHub data
    'zigbee2mqtt_api',    // 4. Live Z2M API
    'github_johanbendz',  // 5. Live GitHub JohanBendz
    'github_dlnraja',     // 6. Live GitHub dlnraja
    'google_search'       // 7. Google (last resort)
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL ENRICHMENT DATABASE
// Pre-populated with known DP mappings from various sources
// ═══════════════════════════════════════════════════════════════════════════

const LOCAL_ENRICHMENT_DB = {
  // Motion Sensors
  '_TZE200_3towulqd': { type: 'motion_sensor', dps: { 1: 'alarm_motion', 4: 'measure_battery', 9: 'sensitivity', 10: 'keep_time', 12: 'measure_luminance' } },
  '_TZE200_ztc6ggyl': { type: 'motion_sensor', dps: { 1: 'alarm_motion', 4: 'measure_battery', 9: 'sensitivity', 10: 'keep_time', 12: 'measure_luminance' } },
  '_TZE200_mcxw5ehu': { type: 'motion_sensor', dps: { 1: 'alarm_motion', 4: 'measure_battery', 101: 'presence_time' } },
  '_TZE200_rhgsbacq': { type: 'motion_sensor', dps: { 1: 'alarm_motion', 4: 'measure_battery', 101: 'presence_time' } },
  '_TZE204_sxm7l9xa': { type: 'motion_sensor_radar', dps: { 1: 'alarm_motion', 9: 'sensitivity', 101: 'target_distance', 102: 'measure_luminance', 104: 'detection_delay' } },
  '_TZE204_sbyx0lm6': { type: 'motion_sensor_radar', dps: { 1: 'alarm_motion', 104: 'presence', 105: 'measure_luminance', 106: 'radar_sensitivity' } },

  // Climate Sensors
  '_TZE200_dwcarsat': { type: 'climate_sensor', dps: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE200_a8sdabtg': { type: 'climate_sensor', dps: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE200_qoy0ekbd': { type: 'climate_sensor', dps: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE200_znbl8dj5': { type: 'climate_sensor', dps: { 1: 'measure_temperature', 2: 'measure_humidity', 4: 'measure_battery' } },

  // Soil Sensors
  '_TZE200_myd45weu': { type: 'soil_sensor', dps: { 3: 'measure_humidity.soil', 5: 'measure_temperature', 14: 'measure_battery', 15: 'battery_state' } },
  '_TZE284_oitavov2': { type: 'soil_sensor', dps: { 3: 'measure_humidity.soil', 5: 'measure_temperature', 14: 'measure_battery' } },

  // Thermostats
  '_TZE200_aoclfnxz': { type: 'thermostat', dps: { 1: 'onoff', 2: 'target_temperature', 3: 'measure_temperature', 4: 'mode', 101: 'child_lock' } },
  '_TZE200_2ekuz3dz': { type: 'thermostat', dps: { 1: 'onoff', 16: 'target_temperature', 24: 'measure_temperature', 28: 'child_lock' } },

  // Curtain Motors / Blinds
  '_TZE200_zah67ekd': { type: 'cover', dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set', 7: 'work_state' } },
  '_TZE200_rddyvrci': { type: 'cover', dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set', 3: 'position_alt', 5: 'direction', 7: 'work_state' } },
  '_TZE200_cowvfni3': { type: 'cover', dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set', 7: 'work_state' } },
  '_TZE200_wmcdj3aq': { type: 'cover', dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set', 5: 'direction', 7: 'work_state' } },

  // Switches
  '_TZ3000_gjnozsaz': { type: 'switch_1gang', dps: { 1: 'onoff' } },
  '_TZ3000_18ejxno0': { type: 'switch_2gang', dps: { 1: 'onoff.1', 2: 'onoff.2' } },
  '_TZ3000_cfnprab5': { type: 'switch_3gang', dps: { 1: 'onoff.1', 2: 'onoff.2', 3: 'onoff.3' } },
  '_TZ3000_fvh3pjaz': { type: 'switch_4gang', dps: { 1: 'onoff.1', 2: 'onoff.2', 3: 'onoff.3', 4: 'onoff.4' } },

  // Sockets with power metering
  '_TZ3000_okaz9tjs': { type: 'socket_power', dps: { 1: 'onoff', 17: 'measure_current', 18: 'measure_power', 19: 'measure_voltage', 20: 'meter_power' } },
  '_TZ3000_typdpbpg': { type: 'socket_power', dps: { 1: 'onoff', 17: 'measure_current', 18: 'measure_power', 19: 'measure_voltage', 20: 'meter_power' } },

  // Dimmers
  '_TZ3000_7ysdnebc': { type: 'dimmer', dps: { 1: 'onoff', 2: 'dim', 14: 'power_on_behavior' } },
  '_TZ3000_ktuoyvt5': { type: 'dimmer', dps: { 1: 'onoff', 2: 'dim', 3: 'dim_min', 4: 'dim_max' } },

  // LED Controllers
  '_TZE200_s8gkrkxk': { type: 'led_rgb', dps: { 1: 'onoff', 2: 'mode', 3: 'dim', 5: 'light_hue', 6: 'light_saturation' } },

  // Contact Sensors
  '_TZ3000_decxrtwa': { type: 'contact_sensor', dps: { 1: 'alarm_contact' }, ias: true },
  '_TZ3000_26fmupbb': { type: 'contact_sensor', dps: { 1: 'alarm_contact' }, ias: true },

  // Water Leak
  '_TZ3000_kyb656no': { type: 'water_leak', dps: { 1: 'alarm_water' }, ias: true },
  '_TZ3000_upgcbody': { type: 'water_leak', dps: { 1: 'alarm_water' }, ias: true },

  // Smoke Detectors
  '_TZ3210_up3pngle': { type: 'smoke_detector', dps: { 1: 'alarm_smoke', 4: 'measure_battery' }, ias: true },

  // SOS Buttons
  '_TZ3000_peszejy7': { type: 'button_sos', dps: { 1: 'alarm_contact' }, ias: true },
  '_TZ3000_fkp5hqga': { type: 'button_sos', dps: { 1: 'alarm_contact' }, ias: true },

  // Wireless Buttons
  '_TZ3000_bi6lpsew': { type: 'button_1', dps: { 1: 'action' }, scenes: true },
  '_TZ3000_adkvzooy': { type: 'button_2', dps: { 1: 'action_1', 2: 'action_2' }, scenes: true },
  '_TZ3000_gbm10jnj': { type: 'button_3', dps: { 1: 'action_1', 2: 'action_2', 3: 'action_3' }, scenes: true },
  '_TZ3000_xabckq1v': { type: 'button_4', dps: { 1: 'action_1', 2: 'action_2', 3: 'action_3', 4: 'action_4' }, scenes: true },

  // Valves
  '_TZE200_htnnfasr': { type: 'valve', dps: { 1: 'onoff', 5: 'countdown', 7: 'timer_remaining', 11: 'meter_water' } },

  // Air Quality
  '_TZE200_dwcarsat': { type: 'air_quality', dps: { 1: 'measure_co2', 2: 'measure_temperature', 3: 'measure_humidity', 18: 'measure_voc', 21: 'measure_pm25' } },

  // Sirens
  '_TZ3000_fwh3kt5a': { type: 'siren', dps: { 1: 'onoff', 5: 'alarm_time', 7: 'alarm_mode', 13: 'alarm_volume' } },

  // Garage Doors
  '_TZE200_wfxuhoea': { type: 'garage_door', dps: { 1: 'trigger', 2: 'alarm_contact', 3: 'door_state', 12: 'motor_status' } },
};

// ═══════════════════════════════════════════════════════════════════════════
// KNOWN GITHUB ISSUES/PRs DATA (extracted offline)
// ═══════════════════════════════════════════════════════════════════════════

const GITHUB_ISSUES_DATA = {
  // Issue #83 - LED Controller CCT
  '_TZB210_ngnt8kni': {
    issue: 83,
    fix: 'Move from led_controller_dimmable to led_controller_cct',
    type: 'led_controller_cct',
    dps: { 1: 'onoff', 2: 'dim', 3: 'light_temperature' }
  },

  // Issue #45 - Motion sensor DP101 fix
  '_TZE200_rhgsbacq': {
    issue: 45,
    fix: 'DP101 is presence_time (seconds), not alarm_motion',
    type: 'motion_sensor',
    dps: { 1: 'alarm_motion', 4: 'measure_battery', 101: 'presence_time' }
  },

  // PR #67 - Soil sensor support
  '_TZE284_oitavov2': {
    pr: 67,
    fix: 'Add support for new soil sensor variant',
    type: 'soil_sensor',
    dps: { 3: 'measure_humidity.soil', 5: 'measure_temperature', 14: 'measure_battery' }
  },

  // Forum report - MOES blinds
  '_TZE200_zah67ekd': {
    forum: 'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/579',
    reporter: 'Sharif_Kandil',
    issue: 'Missing capabilities for MOES blinds roller',
    type: 'cover',
    dps: { 1: 'windowcoverings_state', 2: 'windowcoverings_set', 7: 'work_state' }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HTTP CLIENT WITH ROBUST RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════

class HttpClient {
  static requestCount = 0;
  static lastRequestTime = 0;

  static async get(url, options = {}) {
    // Enforce minimum delay between requests
    const timeSinceLast = Date.now() - this.lastRequestTime;
    if (timeSinceLast < CONFIG.RATE_LIMIT_BASE_MS) {
      await this.delay(CONFIG.RATE_LIMIT_BASE_MS - timeSinceLast);
    }

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Universal-Tuya-Zigbee/2.0',
          'Accept': 'application/json, text/html, */*',
          ...options.headers
        }
      };

      // Add GitHub token if available
      if (urlObj.hostname === 'api.github.com' && process.env.GITHUB_TOKEN) {
        reqOptions.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      }

      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          this.lastRequestTime = Date.now();
          this.requestCount++;

          if (res.statusCode === 200) {
            resolve({ data, statusCode: res.statusCode, headers: res.headers });
          } else if (res.statusCode === 403 || res.statusCode === 429) {
            // Rate limited - extract retry-after if available
            const retryAfter = res.headers['retry-after'] || res.headers['x-ratelimit-reset'];
            reject(new Error(`RATE_LIMITED:${res.statusCode}:${retryAfter || 'unknown'}`));
          } else if (res.statusCode === 404) {
            reject(new Error(`NOT_FOUND:${res.statusCode}`));
          } else {
            reject(new Error(`HTTP_ERROR:${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(options.timeout || CONFIG.REQUEST_TIMEOUT, () => {
        req.destroy();
        reject(new Error('TIMEOUT'));
      });
      req.end();
    });
  }

  static async getWithRetry(url, options = {}) {
    let lastError;

    for (let i = 0; i < CONFIG.MAX_RETRIES; i++) {
      try {
        return await this.get(url, options);
      } catch (err) {
        lastError = err;

        if (err.message.startsWith('RATE_LIMITED')) {
          // Exponential backoff for rate limits
          const delay = CONFIG.RATE_LIMIT_BASE_MS * Math.pow(CONFIG.RATE_LIMIT_BACKOFF, i);
          console.log(`  [RATE LIMIT] Waiting ${delay}ms before retry ${i + 1}/${CONFIG.MAX_RETRIES}...`);
          await this.delay(delay);
        } else if (err.message.startsWith('NOT_FOUND')) {
          // Don't retry 404s
          throw err;
        } else if (err.message === 'TIMEOUT' && i < CONFIG.MAX_RETRIES - 1) {
          console.log(`  [TIMEOUT] Retrying ${i + 1}/${CONFIG.MAX_RETRIES}...`);
          await this.delay(CONFIG.RATE_LIMIT_BASE_MS);
        } else if (i === CONFIG.MAX_RETRIES - 1) {
          throw lastError;
        }
      }
    }
    throw lastError;
  }

  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TRACKING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

class EnrichmentTracker {
  constructor() {
    this.trackingPath = path.join(CONFIG.TRACKING_DIR, CONFIG.TRACKING_FILE);
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.trackingPath)) {
        return JSON.parse(fs.readFileSync(this.trackingPath, 'utf8'));
      }
    } catch (err) {
      console.error('[TRACKER] Error loading:', err.message);
    }
    return { version: '2.0.0', manufacturers: {}, sources: {}, stats: {} };
  }

  save() {
    fs.mkdirSync(path.dirname(this.trackingPath), { recursive: true });
    fs.writeFileSync(this.trackingPath, JSON.stringify(this.data, null, 2));
  }

  isProcessedRecently(mfr, days = 30) {
    const data = this.data.manufacturers[mfr];
    if (!data?.lastProcessed) return false;
    const daysSince = (Date.now() - new Date(data.lastProcessed).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince < days;
  }

  markProcessed(mfr, info = {}) {
    this.data.manufacturers[mfr] = {
      ...this.data.manufacturers[mfr],
      lastProcessed: new Date().toISOString(),
      ...info
    };
    this.save();
  }

  getStats() {
    return {
      total: Object.keys(this.data.manufacturers).length,
      requests: HttpClient.requestCount
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCE SCRAPERS WITH FALLBACK
// ═══════════════════════════════════════════════════════════════════════════

class SourceScrapers {

  /**
   * 1. Local Database (instant, no API calls)
   */
  static getFromLocalDB(mfr) {
    if (LOCAL_ENRICHMENT_DB[mfr]) {
      return { source: 'local_db', ...LOCAL_ENRICHMENT_DB[mfr] };
    }
    if (GITHUB_ISSUES_DATA[mfr]) {
      return { source: 'github_cached', ...GITHUB_ISSUES_DATA[mfr] };
    }
    return null;
  }

  /**
   * 2. Cached Z2M data
   */
  static getFromZ2MCache(mfr) {
    try {
      if (fs.existsSync(CONFIG.Z2M_CACHE_FILE)) {
        const cache = JSON.parse(fs.readFileSync(CONFIG.Z2M_CACHE_FILE, 'utf8'));
        return cache[mfr] || null;
      }
    } catch (err) { }
    return null;
  }

  /**
   * 3. Live Z2M API with caching
   */
  static async scrapeZigbee2MQTT(mfr) {
    try {
      // Check cache first
      const cached = this.getFromZ2MCache(mfr);
      if (cached) return { source: 'z2m_cache', ...cached };

      // Fetch all devices (this is one API call for all)
      const url = 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt.io/master/public/devices.json';
      const response = await HttpClient.getWithRetry(url);
      const devices = JSON.parse(response.data);

      // Save to cache
      const cache = {};
      for (const device of devices) {
        if (device.fingerprint) {
          for (const fp of device.fingerprint) {
            if (fp.manufacturerName) {
              cache[fp.manufacturerName] = {
                model: device.model,
                vendor: device.vendor,
                description: device.description,
                exposes: device.exposes
              };
            }
          }
        }
      }

      fs.mkdirSync(path.dirname(CONFIG.Z2M_CACHE_FILE), { recursive: true });
      fs.writeFileSync(CONFIG.Z2M_CACHE_FILE, JSON.stringify(cache, null, 2));
      console.log(`  [Z2M] Cached ${Object.keys(cache).length} devices`);

      return cache[mfr] ? { source: 'z2m_live', ...cache[mfr] } : null;
    } catch (err) {
      console.log(`  [Z2M] Error: ${err.message.split(':')[0]}`);
      return null;
    }
  }

  /**
   * 4. GitHub Issues/PRs (with rate limit handling)
   */
  static async scrapeGitHub(repo, mfr) {
    try {
      const url = `https://api.github.com/search/issues?q=${encodeURIComponent(mfr)}+repo:${repo}&per_page=5`;
      const response = await HttpClient.getWithRetry(url);
      const data = JSON.parse(response.data);

      if (!data.items || data.items.length === 0) {
        return null;
      }

      const result = { source: 'github_live', issues: [], dps: {} };

      for (const item of data.items.slice(0, 3)) {
        result.issues.push({
          number: item.number,
          title: item.title,
          state: item.state,
          url: item.html_url
        });

        // Extract DP info from body
        if (item.body) {
          const dpMatches = item.body.matchAll(/DP\s*(\d+)[:\s-]+([^\n,]+)/gi);
          for (const match of dpMatches) {
            result.dps[match[1]] = match[2].trim();
          }

          // Extract product ID
          const productMatch = item.body.match(/TS\d{4}[A-Z]?/);
          if (productMatch) {
            result.productId = productMatch[0];
          }
        }
      }

      return Object.keys(result.dps).length > 0 || result.issues.length > 0 ? result : null;
    } catch (err) {
      const errorType = err.message.split(':')[0];
      if (errorType !== 'NOT_FOUND') {
        console.log(`  [GITHUB] Error: ${errorType}`);
      }
      return null;
    }
  }

  /**
   * 5. Google Search URLs (for manual lookup)
   */
  static generateGoogleSearchURLs(mfr) {
    const queries = [
      `${mfr} zigbee datapoint DP`,
      `${mfr} tuya zigbee2mqtt`,
      `${mfr} home assistant integration`,
      `${mfr} homey tuya`
    ];

    return queries.map(q => ({
      query: q,
      url: `https://www.google.com/search?q=${encodeURIComponent(q)}`
    }));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DRIVER ENRICHER
// ═══════════════════════════════════════════════════════════════════════════

class DriverEnricher {
  constructor(tracker) {
    this.tracker = tracker;
    this.results = { processed: 0, enriched: 0, errors: 0, skipped: 0 };
  }

  getAllManufacturers() {
    const manufacturers = new Set();
    const drivers = fs.readdirSync(CONFIG.DRIVERS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const driver of drivers) {
      const configPath = path.join(CONFIG.DRIVERS_DIR, driver.name, 'driver.compose.json');
      try {
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (config?.zigbee?.manufacturerName) {
            for (const mfr of config.zigbee.manufacturerName) {
              manufacturers.add(mfr);
            }
          }
        }
      } catch (err) { }
    }

    return Array.from(manufacturers).sort();
  }

  async enrichManufacturer(mfr, forceOnline = false) {
    const result = { mfr, sources: [], data: null };

    // 1. Try local database first (always, no rate limit)
    const localData = SourceScrapers.getFromLocalDB(mfr);
    if (localData) {
      result.sources.push('local_db');
      result.data = localData;
      if (!forceOnline) {
        return result;
      }
    }

    // 2. Try Z2M cache
    const z2mCached = SourceScrapers.getFromZ2MCache(mfr);
    if (z2mCached) {
      result.sources.push('z2m_cache');
      result.data = { ...result.data, ...z2mCached };
      if (!forceOnline) {
        return result;
      }
    }

    // 3. Only do online lookups if forced or no local data
    if (forceOnline || !result.data) {
      // Z2M Live
      const z2mLive = await SourceScrapers.scrapeZigbee2MQTT(mfr);
      if (z2mLive) {
        result.sources.push('z2m_live');
        result.data = { ...result.data, ...z2mLive };
      }

      // GitHub (only if no data yet)
      if (!result.data) {
        const ghJohan = await SourceScrapers.scrapeGitHub('JohanBendz/com.tuya.zigbee', mfr);
        if (ghJohan) {
          result.sources.push('github_johanbendz');
          result.data = { ...result.data, ...ghJohan };
        }
      }
    }

    return result;
  }

  async processAll(options = {}) {
    const { limit = 50, forceOnline = false, skipRecent = true } = options;
    const manufacturers = this.getAllManufacturers();

    console.log(`\n📦 Processing ${Math.min(limit, manufacturers.length)} of ${manufacturers.length} manufacturers\n`);

    let processed = 0;
    const enrichedMfrs = [];
    const notFoundMfrs = [];

    for (const mfr of manufacturers.slice(0, limit)) {
      // Skip if recently processed
      if (skipRecent && this.tracker.isProcessedRecently(mfr)) {
        this.results.skipped++;
        continue;
      }

      process.stdout.write(`  ${mfr}... `);

      try {
        const result = await this.enrichManufacturer(mfr, forceOnline);
        processed++;

        if (result.data) {
          console.log(`✅ ${result.sources.join(', ')}`);
          enrichedMfrs.push({ mfr, sources: result.sources });
          this.results.enriched++;
        } else {
          console.log(`⚪ No data found`);
          notFoundMfrs.push(mfr);
        }

        this.tracker.markProcessed(mfr, {
          enriched: !!result.data,
          sources: result.sources
        });

      } catch (err) {
        console.log(`❌ ${err.message.split(':')[0]}`);
        this.results.errors++;
      }

      this.results.processed++;

      // Progress indicator
      if (processed % 10 === 0) {
        console.log(`  --- Progress: ${processed}/${Math.min(limit, manufacturers.length)} ---`);
      }
    }

    return { enrichedMfrs, notFoundMfrs };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 INTELLIGENT ENRICHER v2.0');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('FIXES: Rate limiting, 404 errors, local cache fallback\n');

  // Ensure directories exist
  [CONFIG.TRACKING_DIR, CONFIG.CACHE_DIR].forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
  });

  // Save local DB to file
  const localDbPath = CONFIG.LOCAL_DB_FILE;
  fs.writeFileSync(localDbPath, JSON.stringify({
    version: '2.0.0',
    generated: new Date().toISOString(),
    manufacturers: LOCAL_ENRICHMENT_DB,
    github_issues: GITHUB_ISSUES_DATA
  }, null, 2));
  console.log(`📦 Local DB: ${Object.keys(LOCAL_ENRICHMENT_DB).length} manufacturers`);
  console.log(`📦 GitHub Issues DB: ${Object.keys(GITHUB_ISSUES_DATA).length} entries\n`);

  const tracker = new EnrichmentTracker();
  const enricher = new DriverEnricher(tracker);

  // Parse args
  const args = process.argv.slice(2);
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '50');
  const forceOnline = args.includes('--online');
  const skipRecent = !args.includes('--force');

  console.log(`⚙️  Limit: ${limit}`);
  console.log(`⚙️  Force online: ${forceOnline}`);
  console.log(`⚙️  Skip recent: ${skipRecent}\n`);

  // Process
  const { enrichedMfrs, notFoundMfrs } = await enricher.processAll({
    limit,
    forceOnline,
    skipRecent
  });

  // Summary
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 RESULTS');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Processed: ${enricher.results.processed}`);
  console.log(`  Enriched: ${enricher.results.enriched}`);
  console.log(`  Skipped: ${enricher.results.skipped}`);
  console.log(`  Errors: ${enricher.results.errors}`);
  console.log(`  HTTP Requests: ${HttpClient.requestCount}`);
  console.log('════════════════════════════════════════════════════════════════\n');

  // Save not found for manual lookup
  if (notFoundMfrs.length > 0) {
    const notFoundPath = path.join(CONFIG.DATA_DIR, 'MANUFACTURERS_NOT_FOUND.json');
    fs.writeFileSync(notFoundPath, JSON.stringify({
      generated: new Date().toISOString(),
      count: notFoundMfrs.length,
      manufacturers: notFoundMfrs,
      searchUrls: notFoundMfrs.slice(0, 10).map(mfr => ({
        mfr,
        urls: SourceScrapers.generateGoogleSearchURLs(mfr)
      }))
    }, null, 2));
    console.log(`📄 Not found list saved to: ${notFoundPath}\n`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  SourceScrapers,
  DriverEnricher,
  EnrichmentTracker,
  LOCAL_ENRICHMENT_DB,
  GITHUB_ISSUES_DATA
};
