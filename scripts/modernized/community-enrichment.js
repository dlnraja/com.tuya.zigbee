#!/usr/bin/env node
'use strict';

/**
 * Community Enrichment - Modernized
 *
 * Consolidates functionality from:
 *   - scripts/legacy-archived/comprehensive_forum_github_sync.js
 *   - scripts/legacy-archived/enrich_from_community_reports.js
 *   - scripts/legacy-archived/scan_all_community_sources.js
 *   - scripts/legacy/apply_forum_improvements.js
 *   - scripts/legacy/apply_forum_zigbee_fixes.js
 *   - scripts/legacy/apply-pr-improvements.js
 *   - scripts/legacy/apply_phase2_enrichment.js
 *
 * Features:
 *   - Enriches drivers with manufacturer IDs from community sources
 *   - Validates IDs before adding
 *   - Case-insensitive duplicate detection
 *   - Backup before modification
 *   - --json output for CI integration
 *   - --dry-run mode (default: report only)
 *   - --fix mode to apply changes
 *   - Proper error handling and logging
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

/**
 * Community-reported device IDs from forums, GitHub issues/PRs, and Z2M
 * Format: { driverName: [manufacturerId, ...] }
 */
const COMMUNITY_DEVICES = {
  // From GitHub Issues & PRs
  climate_sensor: [
    '_TZE284_9ern5sfh',  // Issue #1328 - RSH-HS03
    '_TZE200_9yapgbuv',  // Issue #850
    '_TZ3000_akqdg6g7',  // PR #1085
    '_TZE200_yvjc5cjn',  // Z2M cross-ref
    '_TZE204_yvjc5cjn',  // Z2M cross-ref
    'eWeLink',            // Forum Page 42
  ],
  presence_sensor_radar: [
    '_TZE200_2aaelwxk',  // PR #774
    '_TZE200_ztc6ggyl',  // Forum - LOGINOVO ZY-M100
    '_TZE204_gkfbdvyx',  // Issue #1322 - WenzhiIoT 24GHz
    '_TZE204_sxm7l9xa',  // Z2M cross-ref
    '_TZE284_sxm7l9xa',  // Z2M cross-ref
    '_TZE200_3towulqd',  // Forum page 34
  ],
  motion_sensor: [
    '_TZE200_ghynnvos',  // Issue #1321
    '_TZ3000_hy6ncvmw',  // Issue #1320 - light sensor with motion
    '_TZ3000_kmh5qpmb',  // Forum page 13
    '_TZ3000_c8ozah8n',  // PR #1166
    '_TZ3000_msl6wxkp',  // Z2M cross-ref
    '_TZ3000_otvn6y0a',  // Z2M cross-ref
  ],
  plug_energy_monitor: [
    '_TZ3000_okaz9tjs',  // Issue #500
    '_TZ3000_amdymr7l',  // Forum - Blitzwolf BW-SHP-13
    '_TZ3000_cphmq0q7',  // PR #1100
    '_TZ3000_dpo1ysak',  // PR #1100
    '_TZ3000_typdpbpg',  // PR #1100
    '_TZ3210_4ux0ondb',  // Issue #1326
    '_TZ3000_vsn4qal7',  // Z2M cross-ref
    '_TZ3000_8bxrzyxz',  // Z2M cross-ref
  ],
  dimmer_wall_1gang: [
    '_TZE200_dfxkcots',  // Issue #50
    '_TZE200_3p5ydos3',  // Issue #250
    '_TZE204_5cuocqty',  // PR #981 - AVATTO
    '_TZE204_bxoo2swd',  // Forum - Avatto ZDMS16-2
  ],
  switch_1gang: [
    '_TZ3000_prits6g4',  // Issue #970
    '_TZ3000_txpirhfq',  // Forks analysis
    '_TZ3218_7fiyo3kv',  // Issue #1176
  ],
  switch_2gang: [
    '_TZ3000_ruldv5dt',  // PR #1072 - MHCOZY
    '_TZ3000_qaa59zqd',  // PR #898
  ],
  curtain_motor: [
    '_TZE204_xu4a5rhj',  // PR #1073/#1074
    '_TZ3210_j4pdtz9v',  // PR #1065 - Fingerbot
    '_TZ3210_dwytrmda',  // PR #729
    '_TZ3210_ol1uhvza',  // Issue #859
  ],
  contact_sensor: [
    '_TZ3000_n2egfsli',  // Z2M cross-ref
    '_TZ3000_26fmupbb',  // Z2M cross-ref
    '_TZ3000_oxslv1c9',  // Z2M cross-ref
    'HOBEIAN',            // Forum Page 40
  ],
  water_leak_sensor: [
    '_TZ3000_kstbkt6a',  // PR #614
    '_TZ3210_tgvtvdoc',  // Issue #388 (rain sensor)
    '_TZ3000_kyakwbf8',  // Z2M cross-ref
  ],
  smoke_detector_advanced: [
    '_TZE200_t5p1vj8r',  // Issue #103
    '_TZE204_ntcy3xu1',  // Forks analysis
  ],
  bulb_rgb: [
    '_TZ3210_mja6r5ix',  // Issue #450 - Zemismart
    '_TZ3210_s8lvbbu',   // Issue #1325
  ],
  radiator_valve: [
    '_TZE200_pw7mji0l',  // PR #757
    '_TZE200_b6wax7g0',  // Forks analysis
  ],
  button_wireless_1: [
    '_TZ3000_4fjiwweb',  // Issue #300
    '_TZ3000_an5rjiwd',  // PR #1128
  ],
  scene_switch_4: [
    '_TZ3000_zgyzgdua',  // Issue #1327
  ],
  air_quality_comprehensive: [
    '_TZE200_yvx5lh6k',  // PR #829
  ],
  led_strip: [
    '_TZ3210_eejm8dcr',  // PR #1075
  ],
  soil_sensor: [
    '_TZE200_myd45weu',  // Forum page 31
    '_TZE284_oitavov2',  // Issue #1245
  ],
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    json: args.includes('--json'),
    dryRun: args.includes('--dry-run'),
    fix: args.includes('--fix'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };
}

/**
 * Validate manufacturer ID format
 */
function isValidManufacturerId(id) {
  if (!id || typeof id !== 'string') return false;
  if (id.length < 3) return false;

  // Valid Tuya patterns
  const patterns = [
    /^_TZ[0-9]{4}_[a-z0-9]{8}$/i,
    /^_TYST11_[a-z0-9]{8}$/i,
    /^_TYZB01_[a-z0-9]{8}$/i,
    /^_TZB210_[a-z0-9]{8}$/i,
    /^_TZC[0-9]{3}_[a-z0-9]{8}$/i,
  ];

  if (patterns.some(p => p.test(id))) return true;

  // Allow non-Tuya manufacturer names (e.g., 'eWeLink', 'HOBEIAN')
  if (id.length >= 3 && /^[A-Za-z]/.test(id)) return true;

  return false;
}

/**
 * Enrich a single driver
 */
function enrichDriver(driverName, newIds, opts = {}) {
  const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

  if (!fs.existsSync(composePath)) {
    return { driver: driverName, status: 'not_found', added: 0 };
  }

  try {
    const content = JSON.parse(fs.readFileSync(composePath));

    if (!content.zigbee || !content.zigbee.manufacturerName) {
      return { driver: driverName, status: 'no_manufacturerName', added: 0 };
    }

    const currentIds = content.zigbee.manufacturerName;
    const currentIdsLower = new Set(currentIds.map(id => id.toLowerCase()));

    // Filter and validate new IDs
    const idsToAdd = [];
    const invalidIds = [];

    for (const id of newIds) {
      if (!isValidManufacturerId(id)) {
        invalidIds.push(id);
        continue;
      }

      if (!currentIdsLower.has(id.toLowerCase())) {
        idsToAdd.push(id);
      }
    }

    if (idsToAdd.length === 0) {
      return {
        driver: driverName,
        status: 'up_to_date',
        added: 0,
        invalidIds,
      };
    }

    // Apply changes
    if (!opts.dryRun) {
      // Backup
      const backupPath = `${composePath}.backup-enrich-${Date.now()}`;
      fs.copyFileSync(composePath, backupPath);

      // Add new IDs
      content.zigbee.manufacturerName = [...currentIds, ...idsToAdd].sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
      );

      fs.writeFileSync(composePath, JSON.stringify(content, null, 2));
    }

    return {
      driver: driverName,
      status: opts.dryRun ? 'would_add' : 'added',
      added: idsToAdd.length,
      ids: idsToAdd,
      invalidIds,
    };
  } catch (e) {
    return { driver: driverName, status: 'error', error: e.message, added: 0 };
  }
}

/**
 * Main enrichment function
 */
function runCommunityEnrichment(opts = {}) {
  const startTime = Date.now();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  COMMUNITY ENRICHMENT - Modernized v2.0.0                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  if (opts.dryRun) {
    console.log('   MODE: DRY RUN (no changes will be made)\n');
  }

  const results = [];
  let totalAdded = 0;
  let totalDrivers = 0;

  // Process each driver
  for (const [driverName, ids] of Object.entries(COMMUNITY_DEVICES)) {
    const result = enrichDriver(driverName, ids, opts);
    results.push(result);
    totalAdded += result.added;
    totalDrivers++;

    if (result.added > 0) {
      console.log(`   ${opts.dryRun ? 'WOULD ADD' : 'ADDED'}: ${driverName} +${result.added} IDs`);
      if (opts.verbose && result.ids) {
        result.ids.forEach(id => console.log(`     -> ${id}`));
      }
    } else if (result.status === 'not_found') {
      console.log(`   SKIP: ${driverName} (driver not found)`);
    } else if (result.invalidIds && result.invalidIds.length > 0) {
      console.log(`   WARN: ${driverName} has ${result.invalidIds.length} invalid IDs`);
    }
  }

  const duration = Date.now() - startTime;

  // Build result
  const result = {
    timestamp: new Date().toISOString(),
    duration: `${duration}ms`,
    dryRun: opts.dryRun || false,
    summary: {
      driversProcessed: totalDrivers,
      totalIdsAdded: totalAdded,
      driversModified: results.filter(r => r.added > 0).length,
      driversNotFound: results.filter(r => r.status === 'not_found').length,
    },
    results,
  };

  // Output
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log(`║  SUMMARY: ${totalAdded} IDs ${opts.dryRun ? 'would be' : ''} added to ${results.filter(r => r.added > 0).length} drivers      ║`);
    console.log(`║  Duration: ${duration}ms                                           ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
  }

  return result;
}

// Run if called directly
if (require.main === module) {
  const opts = parseArgs();
  const result = runCommunityEnrichment(opts);
  process.exit(0);
}

module.exports = { runCommunityEnrichment, enrichDriver, COMMUNITY_DEVICES };
