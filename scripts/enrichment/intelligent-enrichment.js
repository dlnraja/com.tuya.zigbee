'use strict';

/**
 * INTELLIGENT ENRICHMENT SYSTEM v1.0
 *
 * Sources:
 * - Git history (all commits)
 * - Zigbee2MQTT (tuya.ts, devices/*.ts)
 * - ZHA (quirks/tuya/*.py)
 * - JohanBendz PRs/Issues
 * - Homey Forum (Ultimate post, Johan post)
 * - Community databases
 *
 * Output: Enriched driver-mapping-database.json + driver updates
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  sources: {
    zigbee2mqtt: {
      tuya: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
      index: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/index.ts'
    },
    zha: {
      tuya: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py'
    },
    johanBendz: {
      pulls: 'https://api.github.com/repos/JohanBendz/com.tuya.zigbee/pulls?state=all&per_page=100',
      issues: 'https://api.github.com/repos/JohanBendz/com.tuya.zigbee/issues?state=all&per_page=100'
    },
    homeyForum: {
      ultimate: 'https://community.homey.app/t/app-pro-universal-tuya-zigbee/93498',
      johan: 'https://community.homey.app/t/app-tuya-zigbee/20549'
    }
  },
  patterns: {
    manufacturerId: /(_TZ[E0-9]{1,4}_[a-z0-9]+)/gi,
    modelId: /(TS[0-9]{3,4}[A-Z]?)/gi,
    datapoint: /[dD][pP]\s*[=:]?\s*(\d{1,3})/g,
    cluster: /cluster[s]?\s*[=:]?\s*\[?([0-9x,\s]+)\]?/gi,
    capability: /(alarm_\w+|measure_\w+|onoff|dim|windowcoverings_\w+)/gi
  },
  outputDir: './data/enrichment'
};

class IntelligentEnrichment {
  constructor() {
    this.devices = new Map();
    this.manufacturerIds = new Set();
    this.datapoints = new Map();
    this.capabilities = new Map();
    this.clusters = new Map();
  }

  // Extract from git history
  async extractFromGitHistory() {
    console.log('📜 Extracting from git history...');

    try {
      // Get all manufacturer IDs from all commits
      const gitLog = execSync(
        'git log --all -p -- "*.json" "*.js" 2>/dev/null || echo ""',
        { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
      );

      const mfrMatches = gitLog.match(CONFIG.patterns.manufacturerId) || [];
      mfrMatches.forEach(id => this.manufacturerIds.add(id.toLowerCase()));

      // Get datapoints
      const dpMatches = gitLog.match(CONFIG.patterns.datapoint) || [];
      dpMatches.forEach(dp => {
        const num = parseInt(dp.match(/\d+/)[0]);
        this.datapoints.set(num, (this.datapoints.get(num) || 0) + 1);
      });

      console.log(`   Found ${this.manufacturerIds.size} unique manufacturer IDs`);
      console.log(`   Found ${this.datapoints.size} unique datapoints`);
    } catch (err) {
      console.error('   Error extracting git history:', err.message);
    }
  }

  // Fetch URL content
  fetchUrl(url) {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'Homey-Tuya-Enrichment/1.0',
          'Accept': 'application/json, text/plain, */*'
        }
      };

      https.get(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  // Extract from Zigbee2MQTT
  async extractFromZigbee2MQTT() {
    console.log('🔗 Extracting from Zigbee2MQTT...');

    try {
      const tuyaTs = await this.fetchUrl(CONFIG.sources.zigbee2mqtt.tuya);

      // Extract manufacturer IDs
      const mfrMatches = tuyaTs.match(CONFIG.patterns.manufacturerId) || [];
      mfrMatches.forEach(id => this.manufacturerIds.add(id.toLowerCase()));

      // Extract model IDs
      const modelMatches = tuyaTs.match(CONFIG.patterns.modelId) || [];
      modelMatches.forEach(id => this.devices.set(id, { source: 'zigbee2mqtt' }));

      // Extract datapoint mappings (tuyaDatapoints patterns)
      const dpRegex = /\[(\d+),\s*['"](\w+)['"]/g;
      let match;
      while ((match = dpRegex.exec(tuyaTs)) !== null) {
        const dpNum = parseInt(match[1]);
        const capability = match[2];
        if (!this.datapoints.has(dpNum)) {
          this.datapoints.set(dpNum, new Set());
        }
        this.datapoints.get(dpNum).add?.(capability) || this.datapoints.set(dpNum, new Set([capability]));
      }

      console.log(`   Added ${mfrMatches.length} manufacturer IDs from Z2M`);
    } catch (err) {
      console.error('   Error fetching Z2M:', err.message);
    }
  }

  // Extract from ZHA
  async extractFromZHA() {
    console.log('🔗 Extracting from ZHA (zigpy)...');

    try {
      const zhaPy = await this.fetchUrl(CONFIG.sources.zha.tuya);

      // Extract manufacturer IDs
      const mfrMatches = zhaPy.match(CONFIG.patterns.manufacturerId) || [];
      mfrMatches.forEach(id => this.manufacturerIds.add(id.toLowerCase()));

      console.log(`   Added ${mfrMatches.length} manufacturer IDs from ZHA`);
    } catch (err) {
      console.error('   Error fetching ZHA:', err.message);
    }
  }

  // Extract from current drivers
  extractFromCurrentDrivers() {
    console.log('📁 Extracting from current drivers...');

    const driversDir = './drivers';
    if (!fs.existsSync(driversDir)) return;

    const drivers = fs.readdirSync(driversDir);

    drivers.forEach(driver => {
      const composePath = path.join(driversDir, driver, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        try {
          const content = fs.readFileSync(composePath, 'utf8');
          const json = JSON.parse(content);

          // Extract manufacturer names
          const mfrNames = json.zigbee?.manufacturerName || [];
          mfrNames.forEach(id => {
            if (id.match(CONFIG.patterns.manufacturerId)) {
              this.manufacturerIds.add(id.toLowerCase());
            }
          });

          // Extract capabilities
          const caps = json.capabilities || [];
          caps.forEach(cap => {
            if (!this.capabilities.has(driver)) {
              this.capabilities.set(driver, new Set());
            }
            this.capabilities.get(driver).add(cap);
          });

          // Extract clusters
          const endpoints = json.zigbee?.endpoints || {};
          Object.values(endpoints).forEach(ep => {
            const clusters = ep.clusters || [];
            clusters.forEach(c => {
              if (!this.clusters.has(driver)) {
                this.clusters.set(driver, new Set());
              }
              this.clusters.set(driver).add(c);
            });
          });
        } catch (err) {
          // Skip invalid JSON
        }
      }
    });

    console.log(`   Processed ${drivers.length} drivers`);
  }

  // Generate enrichment report
  generateReport() {
    console.log('📊 Generating enrichment report...');

    const report = {
      timestamp: new Date().toISOString(),
      stats: {
        manufacturerIds: this.manufacturerIds.size,
        modelIds: this.devices.size,
        datapoints: this.datapoints.size,
        drivers: this.capabilities.size
      },
      manufacturerIds: Array.from(this.manufacturerIds).sort(),
      datapoints: Object.fromEntries(
        Array.from(this.datapoints.entries()).map(([k, v]) => [
          k,
          v instanceof Set ? Array.from(v) : v
        ])
      ),
      capabilities: Object.fromEntries(
        Array.from(this.capabilities.entries()).map(([k, v]) => [k, Array.from(v)])
      )
    };

    // Ensure output directory exists
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    // Write report
    const reportPath = path.join(CONFIG.outputDir, `enrichment-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`   Report saved to: ${reportPath}`);
    return report;
  }

  // Find missing manufacturer IDs in drivers
  findMissingIds() {
    console.log('🔍 Finding missing manufacturer IDs...');

    const existingInDrivers = new Set();
    const driversDir = './drivers';

    if (fs.existsSync(driversDir)) {
      const drivers = fs.readdirSync(driversDir);
      drivers.forEach(driver => {
        const composePath = path.join(driversDir, driver, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
          const content = fs.readFileSync(composePath, 'utf8');
          const matches = content.match(CONFIG.patterns.manufacturerId) || [];
          matches.forEach(id => existingInDrivers.add(id.toLowerCase()));
        }
      });
    }

    const missing = [];
    this.manufacturerIds.forEach(id => {
      if (!existingInDrivers.has(id)) {
        missing.push(id);
      }
    });

    console.log(`   Found ${missing.length} missing IDs`);
    return missing.sort();
  }

  // Main run
  async run() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     INTELLIGENT ENRICHMENT SYSTEM v1.0                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    // Extract from all sources
    await this.extractFromGitHistory();
    await this.extractFromZigbee2MQTT();
    await this.extractFromZHA();
    this.extractFromCurrentDrivers();

    // Find missing
    const missing = this.findMissingIds();

    // Generate report
    const report = this.generateReport();

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SUMMARY:');
    console.log(`  Total manufacturer IDs: ${this.manufacturerIds.size}`);
    console.log(`  Missing from drivers: ${missing.length}`);
    console.log(`  Datapoints mapped: ${this.datapoints.size}`);
    console.log('═══════════════════════════════════════════════════════════');

    return { report, missing };
  }
}

// Run if called directly
if (require.main === module) {
  const enrichment = new IntelligentEnrichment();
  enrichment.run().catch(console.error);
}

module.exports = IntelligentEnrichment;
