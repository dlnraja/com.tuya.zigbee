#!/usr/bin/env node
/**
 * ADVANCED SCRAPER UNLIMITED - Contourne limites API et 4044
 * Méthodes: Pagination, retry, multiples endpoints, cache intelligent
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CACHE_DIR = path.join(ROOT, '.external_sources');
const OUTPUT_FILE = path.join(CACHE_DIR, `advanced_scrape_${Date.now()}.json`);

// Ensure cache dir exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const SCRAPE_SOURCES = {
  // Zigbee2MQTT GitHub - Multiple endpoints
  z2m_devices: {
    url: 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt.io/master/docs/devices/devices.js',
    parser: 'js_export',
    rateLimit: 1000
  },
  z2m_converters: {
    url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
    parser: 'typescript',
    rateLimit: 1000
  },
  
  // Blakadder - Multiple pages
  blakadder_tuya: {
    url: 'https://zigbee.blakadder.com/assets/tuya_devices.json',
    parser: 'json',
    rateLimit: 2000
  },
  
  // Alternative GitHub repos
  zha_quirks: {
    url: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py',
    parser: 'python',
    rateLimit: 1000
  },
  
  // Johan Bendz original repo (history)
  johan_devices: {
    url: 'https://api.github.com/repos/JohanBendz/com.tuya.zigbee/contents/drivers',
    parser: 'github_api',
    rateLimit: 5000,
    auth: false
  }
};

class UnlimitedScraper {
  constructor() {
    this.results = {
      manufacturers: new Set(),
      productIds: new Set(),
      devices: [],
      sources: {},
      metadata: {
        scraped: new Date().toISOString(),
        totalRequests: 0,
        errors: 0,
        cached: 0
      }
    };
    
    this.cache = new Map();
    this.loadCache();
  }
  
  loadCache() {
    const cacheFile = path.join(CACHE_DIR, 'scraper_cache.json');
    if (fs.existsSync(cacheFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        Object.entries(data).forEach(([key, value]) => {
          this.cache.set(key, value);
        });
        console.log(`📦 Loaded ${this.cache.size} cached entries`);
      } catch (error) {
        console.warn('Cache load failed:', error.message);
      }
    }
  }
  
  saveCache() {
    const cacheFile = path.join(CACHE_DIR, 'scraper_cache.json');
    const cacheObj = Object.fromEntries(this.cache);
    fs.writeFileSync(cacheFile, JSON.stringify(cacheObj, null, 2));
    console.log(`💾 Saved ${this.cache.size} cache entries`);
  }
  
  async fetch(url, options = {}) {
    const cacheKey = url;
    
    // Check cache (24h TTL)
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      const age = Date.now() - cached.timestamp;
      if (age < 24 * 60 * 60 * 1000) {
        this.results.metadata.cached++;
        return cached.data;
      }
    }
    
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Homey-Tuya-Scraper/2.0',
        ...options.headers
      };
      
      const req = client.get(url, { headers }, (res) => {
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          this.results.metadata.totalRequests++;
          
          if (res.statusCode === 200) {
            // Cache successful response
            this.cache.set(cacheKey, {
              data,
              timestamp: Date.now()
            });
            resolve(data);
          } else if (res.statusCode === 403 || res.statusCode === 429) {
            // Rate limited - wait and retry
            console.warn(`⏳ Rate limited (${res.statusCode}), waiting...`);
            setTimeout(() => {
              this.fetch(url, options).then(resolve).catch(reject);
            }, 10000);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  }
  
  parseJsExport(content) {
    // Extract devices from JS export format
    const matches = content.matchAll(/_TZ[0-9A-Z]{1,4}_[a-z0-9]{8}/g);
    for (const match of matches) {
      this.results.manufacturers.add(match[0]);
    }
    
    const productMatches = content.matchAll(/TS\d{4}[A-F]?/g);
    for (const match of productMatches) {
      this.results.productIds.add(match[0]);
    }
  }
  
  parseTypescript(content) {
    // Extract from TypeScript source
    const mfrRegex = /manufacturerName:\s*\[([^\]]+)\]/g;
    let match;
    while ((match = mfrRegex.exec(content)) !== null) {
      const mfrs = match[1].match(/'([^']+)'/g);
      if (mfrs) {
        mfrs.forEach(m => {
          const clean = m.replace(/'/g, '');
          if (clean.startsWith('_TZ')) {
            this.results.manufacturers.add(clean);
          }
        });
      }
    }
    
    const modelRegex = /model:\s*'(TS\d{4}[A-F]?)'/g;
    while ((match = modelRegex.exec(content)) !== null) {
      this.results.productIds.add(match[1]);
    }
  }
  
  parseJson(content) {
    try {
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        data.forEach(device => {
          if (device.manufacturerName) {
            this.results.manufacturers.add(device.manufacturerName);
          }
          if (device.model) {
            this.results.productIds.add(device.model);
          }
          if (device.vendor) {
            this.results.manufacturers.add(device.vendor);
          }
        });
      }
    } catch (error) {
      console.error('JSON parse error:', error.message);
    }
  }
  
  parsePython(content) {
    // Extract from Python source
    const matches = content.matchAll(/_TZ[0-9A-Z]{1,4}_[a-z0-9]{8}/g);
    for (const match of matches) {
      this.results.manufacturers.add(match[0]);
    }
  }
  
  async scrapeSource(name, config) {
    console.log(`🔍 Scraping ${name}...`);
    
    try {
      const content = await this.fetch(config.url, {});
      
      const beforeMfrs = this.results.manufacturers.size;
      const beforeProds = this.results.productIds.size;
      
      // Parse based on type
      switch (config.parser) {
        case 'js_export':
          this.parseJsExport(content);
          break;
        case 'typescript':
          this.parseTypescript(content);
          break;
        case 'json':
          this.parseJson(content);
          break;
        case 'python':
          this.parsePython(content);
          break;
        case 'github_api':
          // Special handling for GitHub API
          try {
            const data = JSON.parse(content);
            this.results.sources[name] = { count: data.length };
          } catch (e) {}
          break;
      }
      
      const addedMfrs = this.results.manufacturers.size - beforeMfrs;
      const addedProds = this.results.productIds.size - beforeProds;
      
      console.log(`  ✅ +${addedMfrs} manufacturers, +${addedProds} products`);
      
      this.results.sources[name] = {
        success: true,
        manufacturers: addedMfrs,
        productIds: addedProds
      };
      
      // Rate limiting
      if (config.rateLimit) {
        await new Promise(resolve => setTimeout(resolve, config.rateLimit));
      }
      
    } catch (error) {
      console.error(`  ❌ ${name}: ${error.message}`);
      this.results.metadata.errors++;
      this.results.sources[name] = {
        success: false,
        error: error.message
      };
    }
  }
  
  async scrapeAll() {
    console.log('🚀 UNLIMITED SCRAPER - Starting...\n');
    
    for (const [name, config] of Object.entries(SCRAPE_SOURCES)) {
      await this.scrapeSource(name, config);
    }
    
    this.saveCache();
  }
  
  generateOutput() {
    const output = {
      metadata: this.results.metadata,
      sources: this.results.sources,
      manufacturers: Array.from(this.results.manufacturers).sort(),
      productIds: Array.from(this.results.productIds).sort(),
      stats: {
        totalManufacturers: this.results.manufacturers.size,
        totalProductIds: this.results.productIds.size,
        cacheHitRate: this.results.metadata.cached / this.results.metadata.totalRequests
      }
    };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SCRAPING COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total manufacturers: ${output.stats.totalManufacturers}`);
    console.log(`Total product IDs: ${output.stats.totalProductIds}`);
    console.log(`Requests made: ${this.results.metadata.totalRequests}`);
    console.log(`Cache hits: ${this.results.metadata.cached}`);
    console.log(`Errors: ${this.results.metadata.errors}`);
    console.log(`Output: ${path.relative(ROOT, OUTPUT_FILE)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

// Run
(async () => {
  const scraper = new UnlimitedScraper();
  await scraper.scrapeAll();
  scraper.generateOutput();
})();
