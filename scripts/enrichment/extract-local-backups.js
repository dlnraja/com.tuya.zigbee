'use strict';

/**
 * EXTRACT LOCAL BACKUPS v1.0
 *
 * Scans all local backup folders for manufacturer IDs and device data
 */

const fs = require('fs');
const path = require('path');

const BACKUP_PATHS = [
  'C:\\Users\\HP\\Desktop\\backup-ultimate-20250904_120457',
  'C:\\Users\\HP\\Desktop\\homey app\\backup tuya',
  'C:\\Users\\HP\\Desktop\\homey app\\com.tuya.zigbee-SDK3'
];

const PATTERNS = {
  manufacturerId: /_TZ[E0-9]{1,4}_[a-z0-9]+/gi,
  productId: /TS[0-9]{3,4}[A-Z]?/gi
};

class LocalBackupExtractor {
  constructor() {
    this.manufacturerIds = new Set();
    this.productIds = new Set();
    this.filesScanned = 0;
    this.sources = new Map();
  }

  // Recursively find all JSON files
  findJsonFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;

    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            // Skip node_modules and .git
            if (item !== 'node_modules' && item !== '.git') {
              this.findJsonFiles(fullPath, files);
            }
          } else if (item.endsWith('.json')) {
            files.push(fullPath);
          }
        } catch (e) {
          // Skip inaccessible files
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }

    return files;
  }

  // Extract IDs from a file
  extractFromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Extract manufacturer IDs
      const mfrMatches = content.match(PATTERNS.manufacturerId) || [];
      mfrMatches.forEach(id => {
        const normalized = id.toLowerCase();
        this.manufacturerIds.add(normalized);

        // Track source
        if (!this.sources.has(normalized)) {
          this.sources.set(normalized, []);
        }
        this.sources.get(normalized).push(path.basename(path.dirname(filePath)));
      });

      // Extract product IDs
      const prodMatches = content.match(PATTERNS.productId) || [];
      prodMatches.forEach(id => this.productIds.add(id.toUpperCase()));

      this.filesScanned++;
      return mfrMatches.length + prodMatches.length;
    } catch (e) {
      return 0;
    }
  }

  // Scan all backup paths
  scanAll() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     LOCAL BACKUP EXTRACTOR v1.0                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    for (const backupPath of BACKUP_PATHS) {
      console.log(`📁 Scanning: ${backupPath}`);

      const files = this.findJsonFiles(backupPath);
      let found = 0;

      files.forEach(file => {
        found += this.extractFromFile(file);
      });

      console.log(`   Files: ${files.length}, IDs found: ${found}`);
    }

    console.log('');
    console.log(`📊 Total files scanned: ${this.filesScanned}`);
    console.log(`📊 Unique manufacturer IDs: ${this.manufacturerIds.size}`);
    console.log(`📊 Unique product IDs: ${this.productIds.size}`);
  }

  // Compare with current project
  findMissing() {
    const currentIds = new Set();
    const driversDir = './drivers';

    if (fs.existsSync(driversDir)) {
      const files = this.findJsonFiles(driversDir);
      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const matches = content.match(PATTERNS.manufacturerId) || [];
        matches.forEach(id => currentIds.add(id.toLowerCase()));
      });
    }

    const missing = [];
    this.manufacturerIds.forEach(id => {
      if (!currentIds.has(id)) {
        missing.push(id);
      }
    });

    console.log(`\n🔍 Missing from current project: ${missing.length}`);
    return missing;
  }

  // Save results
  saveResults() {
    const outputDir = './data/enrichment';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const output = {
      timestamp: new Date().toISOString(),
      stats: {
        filesScanned: this.filesScanned,
        manufacturerIds: this.manufacturerIds.size,
        productIds: this.productIds.size
      },
      manufacturerIds: Array.from(this.manufacturerIds).sort(),
      productIds: Array.from(this.productIds).sort()
    };

    const outputPath = path.join(outputDir, 'local-backup-ids.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`\n💾 Saved to: ${outputPath}`);
    return output;
  }

  run() {
    this.scanAll();
    const missing = this.findMissing();
    this.saveResults();

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('EXTRACTION COMPLETE');
    console.log(`  Total IDs from backups: ${this.manufacturerIds.size}`);
    console.log(`  Missing from project: ${missing.length}`);
    console.log('═══════════════════════════════════════════════════════════');

    return {
      all: Array.from(this.manufacturerIds),
      missing
    };
  }
}

if (require.main === module) {
  const extractor = new LocalBackupExtractor();
  extractor.run();
}

module.exports = LocalBackupExtractor;
