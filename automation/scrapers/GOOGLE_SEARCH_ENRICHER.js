#!/usr/bin/env node
/**
 * GOOGLE SEARCH ENRICHER v1.0
 *
 * Searches Google for each manufacturer name and extracts info from:
 * - First 2 pages of results (20 links)
 * - Reads each link to extract DP info
 * - Uses fallback mechanisms for rate limits
 *
 * IMPORTANT: Requires GOOGLE_API_KEY and GOOGLE_CSE_ID environment variables
 * Or can use web scraping fallback (less reliable)
 *
 * @author Universal Tuya Zigbee Project
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Google Custom Search API
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
  GOOGLE_CSE_ID: process.env.GOOGLE_CSE_ID || '',

  // Results per search
  RESULTS_PER_PAGE: 10,
  MAX_PAGES: 2, // First 2 pages = 20 results

  // Rate limiting
  DELAY_BETWEEN_SEARCHES_MS: 2000,
  DELAY_BETWEEN_PAGES_MS: 500,

  // Output
  OUTPUT_DIR: path.join(__dirname, '../../data/cache/google'),

  // Search queries template
  SEARCH_TEMPLATES: [
    '{mfr} zigbee datapoint DP',
    '{mfr} tuya zigbee cluster',
    '{mfr} zigbee2mqtt converter',
    '{mfr} home assistant zigbee'
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE SEARCH CLIENT
// ═══════════════════════════════════════════════════════════════════════════

class GoogleSearchClient {

  constructor() {
    this.hasApiKey = !!(CONFIG.GOOGLE_API_KEY && CONFIG.GOOGLE_CSE_ID);
    if (!this.hasApiKey) {
      console.log('⚠️  No Google API key configured - using limited fallback mode');
    }
  }

  /**
   * Search Google using Custom Search API
   */
  async searchWithApi(query, page = 1) {
    const startIndex = (page - 1) * CONFIG.RESULTS_PER_PAGE + 1;
    const url = `https://www.googleapis.com/customsearch/v1?key=${CONFIG.GOOGLE_API_KEY}&cx=${CONFIG.GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&start=${startIndex}`;

    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error.message));
            } else {
              resolve(json.items || []);
            }
          } catch (err) {
            reject(err);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Alternative: Generate search URLs for manual checking
   */
  generateSearchUrls(manufacturerName) {
    const urls = [];

    for (const template of CONFIG.SEARCH_TEMPLATES) {
      const query = template.replace('{mfr}', manufacturerName);
      urls.push({
        query,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`
      });
    }

    return urls;
  }

  /**
   * Search and collect all results
   */
  async searchAll(manufacturerName) {
    const results = {
      manufacturer: manufacturerName,
      timestamp: new Date().toISOString(),
      searches: [],
      links: [],
      extracted: {}
    };

    if (this.hasApiKey) {
      // Use API
      for (const template of CONFIG.SEARCH_TEMPLATES) {
        const query = template.replace('{mfr}', manufacturerName);

        try {
          for (let page = 1; page <= CONFIG.MAX_PAGES; page++) {
            console.log(`  Searching: "${query}" (page ${page})`);

            const items = await this.searchWithApi(query, page);

            results.searches.push({
              query,
              page,
              resultsCount: items.length
            });

            for (const item of items) {
              results.links.push({
                title: item.title,
                url: item.link,
                snippet: item.snippet,
                query
              });
            }

            await this.delay(CONFIG.DELAY_BETWEEN_PAGES_MS);
          }
        } catch (err) {
          console.error(`  Error searching "${query}": ${err.message}`);
        }

        await this.delay(CONFIG.DELAY_BETWEEN_SEARCHES_MS);
      }
    } else {
      // Generate URLs for manual checking
      results.searchUrls = this.generateSearchUrls(manufacturerName);
      results.note = 'API key not configured - URLs generated for manual checking';
    }

    return results;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════════

class ContentExtractor {

  /**
   * Extract DP information from text content
   */
  static extractDPInfo(text) {
    const dpInfo = {};

    // Pattern: DP followed by number, then description
    const dpPatterns = [
      /DP\s*(\d+)\s*[:\-=]\s*([^\n,;]+)/gi,
      /datapoint\s*(\d+)\s*[:\-=]\s*([^\n,;]+)/gi,
      /dp(\d+)\s*[:\-=]\s*([^\n,;]+)/gi
    ];

    for (const pattern of dpPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const dp = match[1];
        const desc = match[2].trim();
        if (!dpInfo[dp]) {
          dpInfo[dp] = [];
        }
        if (!dpInfo[dp].includes(desc)) {
          dpInfo[dp].push(desc);
        }
      }
    }

    return dpInfo;
  }

  /**
   * Extract cluster information from text
   */
  static extractClusterInfo(text) {
    const clusters = [];

    // Pattern: cluster ID (hex or decimal)
    const clusterPatterns = [
      /cluster\s*(0x[0-9a-fA-F]+)/gi,
      /cluster\s*(\d{4,5})/gi,
      /EF00|61184/gi
    ];

    for (const pattern of clusterPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const cluster = match[1] || match[0];
        if (!clusters.includes(cluster)) {
          clusters.push(cluster);
        }
      }
    }

    return clusters;
  }

  /**
   * Extract capability mappings
   */
  static extractCapabilities(text) {
    const capabilities = [];

    const capPatterns = [
      /measure_temperature|measure_humidity|measure_battery|measure_power/gi,
      /alarm_motion|alarm_contact|alarm_smoke|alarm_water/gi,
      /onoff|dim|windowcoverings/gi,
      /target_temperature|thermostat_mode/gi
    ];

    for (const pattern of capPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const cap = match[0].toLowerCase();
        if (!capabilities.includes(cap)) {
          capabilities.push(cap);
        }
      }
    }

    return capabilities;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔍 GOOGLE SEARCH ENRICHER v1.0');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }

  const client = new GoogleSearchClient();

  // Get manufacturer from args or use test
  const args = process.argv.slice(2);
  const manufacturers = args.length > 0 ? args : ['_TZE200_rhgsbacq'];

  for (const mfr of manufacturers) {
    console.log(`\n📦 Processing: ${mfr}`);
    console.log('─'.repeat(50));

    const results = await client.searchAll(mfr);

    // Save results
    const outputFile = path.join(CONFIG.OUTPUT_DIR, `${mfr.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

    console.log(`\n✅ Results saved to: ${outputFile}`);
    console.log(`   Links found: ${results.links?.length || 0}`);

    if (results.searchUrls) {
      console.log('\n📋 Manual search URLs generated:');
      for (const search of results.searchUrls) {
        console.log(`   ${search.query}`);
        console.log(`     Google: ${search.url}`);
      }
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('✅ DONE');
  console.log('════════════════════════════════════════════════════════════════\n');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { GoogleSearchClient, ContentExtractor };
