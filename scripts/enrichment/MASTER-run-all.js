'use strict';

/**
 * MASTER ENRICHMENT PIPELINE v2.0
 *
 * Runs ALL enrichment scripts in optimal order:
 * 1. Fetch from all sources
 * 2. Merge new IDs
 * 3. Fix invalid IDs
 * 4. Complete capabilities
 * 5. Add DP mappings
 * 6. Generate icons
 * 7. Verify all drivers
 * 8. Generate reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = './scripts/enrichment';
const ICONS_DIR = './scripts/icons';

// Script execution order
const PIPELINE = [
  // Phase 1: Fetch data from sources
  { name: 'Parse Z2M Tuya', script: 'parse-z2m-tuya.js', optional: true },
  { name: 'Fetch All Sources', script: 'fetch-all-sources.js', optional: true },
  { name: 'Fetch JohanBendz Ecosystem', script: 'fetch-johanbendz-ecosystem.js', optional: true },

  // Phase 2: Merge new IDs
  { name: 'Intelligent Merge', script: 'intelligent-merge.js', args: '--apply', optional: true },
  { name: 'Merge All Sources', script: 'merge-all-sources.js', args: '--apply', optional: true },

  // Phase 3: Fix and enhance
  { name: 'Auto-Fix Driver Issues', script: 'auto-fix-and-enrich.js' },
  { name: 'Complete All Drivers', script: 'complete-all-drivers.js' },
  { name: 'Enrich DP Mappings', script: 'enrich-from-z2m-detailed.js' },

  // Phase 4: Generate assets
  { name: 'Generate Icons', script: '../icons/generate-driver-icons.js', dir: SCRIPTS_DIR },

  // Phase 5: Verify
  { name: 'Verify Drivers', script: 'verify-and-enrich-drivers.js' }
];

class MasterPipeline {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  runScript(config) {
    const scriptPath = path.join(SCRIPTS_DIR, config.script);
    const fullPath = config.script.startsWith('../')
      ? path.join(SCRIPTS_DIR, config.script)
      : scriptPath;

    if (!fs.existsSync(fullPath) && config.optional) {
      return { success: true, skipped: true };
    }

    try {
      const cmd = config.args
        ? `node ${fullPath} ${config.args}`
        : `node ${fullPath}`;

      execSync(cmd, {
        stdio: 'inherit',
        timeout: 120000 // 2 min timeout
      });

      return { success: true };
    } catch (err) {
      if (config.optional) {
        return { success: true, skipped: true };
      }
      return { success: false, error: err.message };
    }
  }

  countIds() {
    const driversDir = './drivers';
    const ids = new Set();

    fs.readdirSync(driversDir).forEach(driver => {
      const composePath = path.join(driversDir, driver, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        const content = fs.readFileSync(composePath, 'utf8');
        const matches = content.match(/_TZ[E0-9]{1,4}_[a-z0-9]+/gi) || [];
        matches.forEach(id => ids.add(id.toLowerCase()));
      }
    });

    return ids.size;
  }

  run() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║         MASTER ENRICHMENT PIPELINE v2.0                           ║');
    console.log('║         Universal Tuya Zigbee - Complete Enrichment               ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    console.log('');

    const initialIds = this.countIds();
    console.log(`📊 Initial IDs: ${initialIds}`);
    console.log('');

    // Run each script
    PIPELINE.forEach((config, index) => {
      console.log('');
      console.log(`═══════════════════════════════════════════════════════════════════`);
      console.log(`[${index + 1}/${PIPELINE.length}] ${config.name}`);
      console.log(`═══════════════════════════════════════════════════════════════════`);

      const result = this.runScript(config);
      this.results.push({ ...config, ...result });

      if (result.skipped) {
        console.log(`   ⏭️ Skipped (optional/not found)`);
      } else if (result.success) {
        console.log(`   ✅ Completed`);
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
    });

    // Final summary
    const finalIds = this.countIds();
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);

    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                    PIPELINE COMPLETE                              ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📊 Results:`);
    console.log(`   Initial IDs: ${initialIds}`);
    console.log(`   Final IDs:   ${finalIds}`);
    console.log(`   New IDs:     +${finalIds - initialIds}`);
    console.log(`   Duration:    ${duration}s`);
    console.log('');
    console.log(`📋 Scripts Run:`);

    this.results.forEach(r => {
      const status = r.skipped ? '⏭️' : (r.success ? '✅' : '❌');
      console.log(`   ${status} ${r.name}`);
    });

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      initialIds,
      finalIds,
      newIds: finalIds - initialIds,
      scripts: this.results
    };

    const reportDir = './data/enrichment';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(reportDir, 'master-pipeline-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('');
    console.log(`💾 Report saved to: data/enrichment/master-pipeline-report.json`);

    return report;
  }
}

if (require.main === module) {
  const pipeline = new MasterPipeline();
  pipeline.run();
}

module.exports = MasterPipeline;
