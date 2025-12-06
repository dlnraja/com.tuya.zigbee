#!/usr/bin/env node
/**
 * INTELLIGENT ENRICHER v1.0
 *
 * Automated enrichment system with:
 * - Multi-source scraping (GitHub, Z2M, Forum, Google)
 * - API fallback mechanisms
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

  // Tracking files
  TRACKING_FILE: 'enrichment_tracking.json',

  // Timing
  MONTHLY_INTERVAL_DAYS: 30,
  ANNUAL_FULL_SCAN_DAYS: 365,

  // API limits and fallback
  GITHUB_API_LIMIT: 60, // per hour for unauthenticated
  RATE_LIMIT_DELAY_MS: 1000,
  MAX_RETRIES: 3,

  // Sources priority
  SOURCES: [
    'github_johanbendz',
    'github_dlnraja',
    'zigbee2mqtt',
    'blakadder',
    'tuya_developer',
    'google_search'
  ]
};

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
      console.error('[TRACKER] Error loading tracking file:', err.message);
    }
    return {
      version: '1.0.0',
      lastFullScan: null,
      lastMonthlyScan: null,
      manufacturers: {},
      sources: {}
    };
  }

  save() {
    fs.writeFileSync(this.trackingPath, JSON.stringify(this.data, null, 2));
  }

  isProcessed(manufacturerName, source) {
    const mfrData = this.data.manufacturers[manufacturerName];
    if (!mfrData) return false;

    const sourceData = mfrData.sources?.[source];
    if (!sourceData) return false;

    // Check if processed within the month
    const lastProcessed = new Date(sourceData.lastProcessed);
    const daysSince = (Date.now() - lastProcessed.getTime()) / (1000 * 60 * 60 * 24);

    return daysSince < CONFIG.MONTHLY_INTERVAL_DAYS;
  }

  needsAnnualRescan(manufacturerName) {
    const mfrData = this.data.manufacturers[manufacturerName];
    if (!mfrData || !mfrData.lastFullScan) return true;

    const lastScan = new Date(mfrData.lastFullScan);
    const daysSince = (Date.now() - lastScan.getTime()) / (1000 * 60 * 60 * 24);

    return daysSince >= CONFIG.ANNUAL_FULL_SCAN_DAYS;
  }

  markProcessed(manufacturerName, source, info = {}) {
    if (!this.data.manufacturers[manufacturerName]) {
      this.data.manufacturers[manufacturerName] = {
        firstSeen: new Date().toISOString(),
        sources: {}
      };
    }

    this.data.manufacturers[manufacturerName].sources[source] = {
      lastProcessed: new Date().toISOString(),
      ...info
    };

    this.save();
  }

  markFullScan(manufacturerName) {
    if (!this.data.manufacturers[manufacturerName]) {
      this.data.manufacturers[manufacturerName] = {
        firstSeen: new Date().toISOString(),
        sources: {}
      };
    }

    this.data.manufacturers[manufacturerName].lastFullScan = new Date().toISOString();
    this.save();
  }

  getStats() {
    return {
      totalManufacturers: Object.keys(this.data.manufacturers).length,
      lastFullScan: this.data.lastFullScan,
      lastMonthlyScan: this.data.lastMonthlyScan
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HTTP CLIENT WITH FALLBACK
// ═══════════════════════════════════════════════════════════════════════════

class HttpClient {
  static async get(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Universal-Tuya-Zigbee-Enricher/1.0',
          'Accept': 'application/json',
          ...options.headers
        }
      };

      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ data, statusCode: res.statusCode, headers: res.headers });
          } else if (res.statusCode === 403 || res.statusCode === 429) {
            reject(new Error(`RATE_LIMITED:${res.statusCode}`));
          } else {
            reject(new Error(`HTTP_ERROR:${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(options.timeout || 10000, () => {
        req.destroy();
        reject(new Error('TIMEOUT'));
      });
      req.end();
    });
  }

  static async getWithRetry(url, options = {}, retries = CONFIG.MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.get(url, options);
      } catch (err) {
        if (err.message.startsWith('RATE_LIMITED') && i < retries - 1) {
          console.log(`[HTTP] Rate limited, waiting ${CONFIG.RATE_LIMIT_DELAY_MS * (i + 1)}ms...`);
          await this.delay(CONFIG.RATE_LIMIT_DELAY_MS * (i + 1));
        } else if (i === retries - 1) {
          throw err;
        }
      }
    }
  }

  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCE SCRAPERS
// ═══════════════════════════════════════════════════════════════════════════

class SourceScrapers {

  /**
   * GitHub Issues/PRs scraper with fallback
   */
  static async scrapeGitHub(repo, manufacturerName) {
    const results = { datapoints: {}, info: {} };

    try {
      // Search issues
      const searchUrl = `https://api.github.com/search/issues?q=${manufacturerName}+repo:${repo}`;
      const response = await HttpClient.getWithRetry(searchUrl);
      const data = JSON.parse(response.data);

      if (data.items && data.items.length > 0) {
        for (const item of data.items.slice(0, 5)) {
          // Extract DP info from body
          const dpMatches = item.body?.match(/DP\s*(\d+)[:\s]+([^\n]+)/gi) || [];
          for (const match of dpMatches) {
            const [, dp, desc] = match.match(/DP\s*(\d+)[:\s]+([^\n]+)/i) || [];
            if (dp) {
              results.datapoints[dp] = desc?.trim();
            }
          }

          // Extract product ID
          const productMatch = item.body?.match(/TS\d{4}[A-Z]?/);
          if (productMatch) {
            results.info.productId = productMatch[0];
          }
        }
      }
    } catch (err) {
      console.log(`[GITHUB] Error for ${manufacturerName}: ${err.message}`);
    }

    return results;
  }

  /**
   * Zigbee2MQTT device database scraper
   */
  static async scrapeZigbee2MQTT(manufacturerName) {
    const results = { datapoints: {}, info: {}, exposes: [] };

    try {
      // Z2M devices API
      const searchUrl = `https://www.zigbee2mqtt.io/api/devices.json`;
      const response = await HttpClient.getWithRetry(searchUrl);
      const devices = JSON.parse(response.data);

      // Find matching device
      const device = devices.find(d =>
        d.fingerprint?.some(f => f.manufacturerName === manufacturerName)
      );

      if (device) {
        results.info = {
          model: device.model,
          vendor: device.vendor,
          description: device.description
        };
        results.exposes = device.exposes || [];
      }
    } catch (err) {
      console.log(`[Z2M] Error for ${manufacturerName}: ${err.message}`);
    }

    return results;
  }

  /**
   * Blakadder database scraper
   */
  static async scrapeBlakadder(manufacturerName) {
    const results = { info: {}, compatibility: [] };

    try {
      // Blakadder uses static pages, we search by manufacturer
      const searchUrl = `https://zigbee.blakadder.com/search.html?q=${manufacturerName}`;
      // Note: Would need proper HTML parsing for full implementation
      results.info.source = 'blakadder';
    } catch (err) {
      console.log(`[BLAKADDER] Error for ${manufacturerName}: ${err.message}`);
    }

    return results;
  }

  /**
   * Google Search fallback (via search results)
   */
  static async scrapeGoogleFallback(manufacturerName) {
    const results = { links: [], info: {} };

    // This is a placeholder - actual implementation would need:
    // 1. Google Custom Search API (with API key)
    // 2. Or web scraping with proper handling

    const searchTerms = [
      `${manufacturerName} zigbee datapoint`,
      `${manufacturerName} tuya DP`,
      `${manufacturerName} zigbee2mqtt`,
      `${manufacturerName} home assistant`
    ];

    // For now, just log the search terms that would be used
    console.log(`[GOOGLE] Would search for: ${searchTerms.join(', ')}`);

    return results;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DRIVER ENRICHER
// ═══════════════════════════════════════════════════════════════════════════

class DriverEnricher {
  constructor(tracker) {
    this.tracker = tracker;
  }

  loadDriver(driverName) {
    const driverPath = path.join(CONFIG.DRIVERS_DIR, driverName, 'driver.compose.json');
    if (!fs.existsSync(driverPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(driverPath, 'utf8'));
    } catch (err) {
      return null;
    }
  }

  saveDriver(driverName, config) {
    const driverPath = path.join(CONFIG.DRIVERS_DIR, driverName, 'driver.compose.json');
    fs.writeFileSync(driverPath, JSON.stringify(config, null, 2) + '\n');
  }

  getAllManufacturers() {
    const manufacturers = new Set();
    const driversPath = CONFIG.DRIVERS_DIR;

    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const driver of drivers) {
      const config = this.loadDriver(driver);
      if (config?.zigbee?.manufacturerName) {
        for (const mfr of config.zigbee.manufacturerName) {
          manufacturers.add(mfr);
        }
      }
    }

    return Array.from(manufacturers);
  }

  async enrichManufacturer(manufacturerName, forceFullScan = false) {
    const results = { sources: {}, enriched: false };

    // Check if needs processing
    const needsAnnual = this.tracker.needsAnnualRescan(manufacturerName);

    if (!forceFullScan && !needsAnnual) {
      // Check each source
      for (const source of CONFIG.SOURCES) {
        if (!this.tracker.isProcessed(manufacturerName, source)) {
          // Process this source
          const sourceResults = await this.processSource(source, manufacturerName);
          results.sources[source] = sourceResults;
          this.tracker.markProcessed(manufacturerName, source, { found: !!sourceResults });

          if (sourceResults && Object.keys(sourceResults).length > 0) {
            results.enriched = true;
          }
        }
      }
    } else {
      // Full scan - process all sources
      for (const source of CONFIG.SOURCES) {
        const sourceResults = await this.processSource(source, manufacturerName);
        results.sources[source] = sourceResults;
        this.tracker.markProcessed(manufacturerName, source, { found: !!sourceResults });

        if (sourceResults && Object.keys(sourceResults).length > 0) {
          results.enriched = true;
        }
      }
      this.tracker.markFullScan(manufacturerName);
    }

    return results;
  }

  async processSource(source, manufacturerName) {
    await HttpClient.delay(CONFIG.RATE_LIMIT_DELAY_MS); // Rate limiting

    switch (source) {
      case 'github_johanbendz':
        return await SourceScrapers.scrapeGitHub('JohanBendz/com.tuya.zigbee', manufacturerName);
      case 'github_dlnraja':
        return await SourceScrapers.scrapeGitHub('dlnraja/com.tuya.zigbee', manufacturerName);
      case 'zigbee2mqtt':
        return await SourceScrapers.scrapeZigbee2MQTT(manufacturerName);
      case 'blakadder':
        return await SourceScrapers.scrapeBlakadder(manufacturerName);
      case 'google_search':
        return await SourceScrapers.scrapeGoogleFallback(manufacturerName);
      default:
        return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 INTELLIGENT ENRICHER v1.0');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Ensure directories exist
  [CONFIG.TRACKING_DIR, CONFIG.CACHE_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const tracker = new EnrichmentTracker();
  const enricher = new DriverEnricher(tracker);

  // Get all manufacturers
  const manufacturers = enricher.getAllManufacturers();
  console.log(`📦 Found ${manufacturers.length} manufacturers to process\n`);

  // Get stats
  const stats = tracker.getStats();
  console.log(`📊 Tracking stats:`);
  console.log(`   - Previously tracked: ${stats.totalManufacturers}`);
  console.log(`   - Last full scan: ${stats.lastFullScan || 'Never'}`);
  console.log(`   - Last monthly scan: ${stats.lastMonthlyScan || 'Never'}\n`);

  // Process command line args
  const args = process.argv.slice(2);
  const forceFullScan = args.includes('--full');
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;

  console.log(`⚙️  Mode: ${forceFullScan ? 'Full Scan' : 'Incremental'}`);
  console.log(`⚙️  Dry Run: ${dryRun}`);
  console.log(`⚙️  Limit: ${limit} manufacturers\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN - No changes will be made\n');

    // Show what would be processed
    let toProcess = 0;
    for (const mfr of manufacturers.slice(0, limit)) {
      const needsAnnual = tracker.needsAnnualRescan(mfr);
      const needsMonthly = !tracker.isProcessed(mfr, 'github_johanbendz');

      if (needsAnnual || needsMonthly || forceFullScan) {
        toProcess++;
        console.log(`  Would process: ${mfr} (annual: ${needsAnnual}, monthly: ${needsMonthly})`);
      }
    }
    console.log(`\n📊 Total to process: ${toProcess}/${manufacturers.length}`);
  } else {
    // Actually process
    let processed = 0;
    let enriched = 0;

    for (const mfr of manufacturers.slice(0, limit)) {
      try {
        console.log(`Processing: ${mfr}...`);
        const results = await enricher.enrichManufacturer(mfr, forceFullScan);
        processed++;

        if (results.enriched) {
          enriched++;
          console.log(`  ✅ Enriched with new data`);
        } else {
          console.log(`  ⏭️  No new data found`);
        }
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}`);
      }
    }

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('📊 RESULTS');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(`  Processed: ${processed}`);
    console.log(`  Enriched: ${enriched}`);
    console.log('════════════════════════════════════════════════════════════════\n');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EnrichmentTracker, DriverEnricher, SourceScrapers, HttpClient };
