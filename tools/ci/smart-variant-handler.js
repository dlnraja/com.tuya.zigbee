#!/usr/bin/env node
/**
 * P32.2 — Smart Variant Handler
 *
 * Handles the COMPLEXITY of Tuya devices:
 * - 1 manufacturer can have MULTIPLE variants
 * - 1 manufacturer can have MULTIPLE productIds
 * - 1 manufacturer can have MULTIPLE device names
 * - Same manufacturer+productId can have DIFFERENT drivers in different commits
 * - Some manufacturers have different productId variations that mean different things
 *
 * This tool:
 * 1. Groups FPs by mfr
 * 2. Detects multi-variant manufacturers
 * 3. Detects mfrs with multiple productIds
 * 4. Detects mfrs with multiple drivers
 * 5. Auto-generates Sacred Couples (mfr+pid → driver) matrix
 * 6. Suggests canonical naming for each variant
 * 7. Detects FPs that need attention (e.g. wrong driver, missing driver.compose entry)
 *
 * Output: .github/state/variant-matrix.json
 */

'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const fpFile = path.join(repoRoot, 'lib', 'tuya', 'fingerprints.json');
const driversDir = path.join(repoRoot, 'drivers');
const outputFile = path.join(repoRoot, '.github', 'state', 'variant-matrix.json');

// ─── Load fingerprints + driver metadata ────────────────────────
function loadFingerprints() {
  return JSON.parse(fs.readFileSync(fpFile, 'utf8'));
}

function loadDriverMetadata() {
  const drivers = {};
  for (const name of fs.readdirSync(driversDir)) {
    const composeFile = path.join(driversDir, name, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      drivers[c.id || name] = {
        id: c.id || name,
        name: c.name,
        capabilities: c.capabilities || [],
        endpoints: c.zigbee?.endpoints || {},
        manufacturerName: c.zigbee?.manufacturerName || [],
        productId: c.zigbee?.productId || [],
      };
    } catch (e) { /* ignore */ }
  }
  return drivers;
}

// ─── VARIANT GROUPING ───────────────────────────────────────────
function groupByMfr(fps) {
  const groups = {};
  for (const [mfr, fp] of Object.entries(fps)) {
    if (!groups[mfr]) {
      groups[mfr] = {
        mfr,
        variants: [],
        productIds: new Set(),
        drivers: new Set(),
        types: new Set(),
        powerSources: new Set(),
        batteryTypes: new Set(),
        capabilities: new Set(),
      };
    }
    groups[mfr].variants.push(fp);
    for (const pid of fp.modelIds || []) groups[mfr].productIds.add(pid);
    groups[mfr].drivers.add(fp.driverId);
    groups[mfr].types.add(fp.type);
    groups[mfr].powerSources.add(fp.powerSource);
    if (fp.batteryType) groups[mfr].batteryTypes.add(fp.batteryType);
    for (const cap of fp.capabilities || []) groups[mfr].capabilities.add(cap);
  }
  return groups;
}

// ─── DETECT MULTI-VARIANT MFRs ──────────────────────────────────
function findMultiVariantMfrs(groups) {
  const results = [];
  for (const [mfr, group] of Object.entries(groups)) {
    const issues = [];
    if (group.variants.length > 1) {
      issues.push(`${group.variants.length} FP entries for same mfr (should be 1)`);
    }
    if (group.productIds.size > 1) {
      issues.push(`${group.productIds.size} productIds: ${[...group.productIds].join(', ')}`);
    }
    if (group.drivers.size > 1) {
      issues.push(`${group.drivers.size} different drivers: ${[...group.drivers].join(', ')}`);
    }
    if (group.powerSources.size > 1) {
      issues.push(`Conflicting power sources: ${[...group.powerSources].join(', ')}`);
    }
    if (issues.length > 0) {
      results.push({
        mfr,
        variantCount: group.variants.length,
        productIds: [...group.productIds],
        drivers: [...group.drivers],
        types: [...group.types],
        powerSources: [...group.powerSources],
        batteryTypes: [...group.batteryTypes],
        capabilities: [...group.capabilities],
        issues,
        severity: group.drivers.size > 1 ? 'high' : (group.variants.length > 1 ? 'medium' : 'low'),
      });
    }
  }
  return results.sort((a, b) => b.variantCount - a.variantCount);
}

// ─── SACRED COUPLES MATRIX ───────────────────────────────────────
function buildSacredCouples(groups) {
  const couples = [];
  for (const [mfr, group] of Object.entries(groups)) {
    for (const pid of group.productIds) {
      for (const driver of group.drivers) {
        couples.push({
          mfr,
          pid,
          driver,
          type: [...group.types][0] || 'unknown',
          powerSource: [...group.powerSources][0] || 'unknown',
        });
      }
    }
  }
  return couples;
}

// ─── DRIVER COMPOSE.JSON SYNC CHECK ─────────────────────────────
function checkDriverComposeSync(multiVariants, drivers) {
  const issues = [];
  for (const mv of multiVariants) {
    for (const pid of mv.productIds) {
      for (const drv of mv.drivers) {
        const driverMeta = drivers[drv];
        if (!driverMeta) {
          issues.push({
            mfr: mv.mfr,
            pid,
            driver: drv,
            type: 'missing-driver',
            message: `Driver "${drv}" not found in drivers/ directory`,
          });
          continue;
        }
        // Check if mfr is in driver.compose.json
        const mfrLower = mv.mfr.toLowerCase();
        const inCompose = driverMeta.manufacturerName.some(m => m.toLowerCase() === mfrLower);
        if (!inCompose) {
          issues.push({
            mfr: mv.mfr,
            pid,
            driver: drv,
            type: 'mfr-not-in-compose',
            message: `mfr "${mv.mfr}" not in driver.compose.json manufacturerName list for "${drv}"`,
          });
        }
        // Check if pid is in driver.compose.json
        const pidInCompose = driverMeta.productId.some(p => p === pid || pid.startsWith(p));
        if (!pidInCompose) {
          issues.push({
            mfr: mv.mfr,
            pid,
            driver: drv,
            type: 'pid-not-in-compose',
            message: `productId "${pid}" not in driver.compose.json productId list for "${drv}"`,
          });
        }
      }
    }
  }
  return issues;
}

// ─── SMART DEVICE NAME GENERATION ───────────────────────────────
function suggestCanonicalName(mfr, group) {
  const drv = [...group.drivers][0];
  const pids = [...group.productIds];
  const power = [...group.powerSources][0];
  const type = [...group.types][0];

  // Common patterns
  const nameMap = {
    'switch_1gang': 'Smart Switch 1-Gang',
    'switch_2gang': 'Smart Switch 2-Gang',
    'switch_3gang': 'Smart Switch 3-Gang',
    'switch_4gang': 'Smart Switch 4-Gang',
    'climate_sensor': 'Climate Sensor',
    'motion_sensor': 'Motion Sensor',
    'contact_sensor': 'Contact Sensor',
    'water_leak_sensor': 'Water Leak Sensor',
    'soil_sensor': 'Soil Moisture Sensor',
    'button_wireless_1': '1-Button Wireless Remote',
    'button_wireless_2': '2-Button Wireless Remote',
    'button_wireless_3': '3-Button Wireless Remote',
    'button_wireless_4': '4-Button Wireless Remote',
    'button_wireless_smart': 'Multi-Button Smart Remote',
    'button_wireless_usb': 'USB Wireless Button',
    'smart_knob_rotary': 'Smart Rotary Knob',
    'switch_1gang_usb': '1-Gang Smart Switch + USB',
    'valve_irrigation': 'Smart Irrigation Valve',
    'garage_door': 'Garage Door Controller',
    'smart_knob': 'Smart Knob',
  };

  return {
    mfr,
    suggestedName: nameMap[drv] || `${drv} (${pids[0] || 'unknown'})`,
    shortName: nameMap[drv]?.toLowerCase().replace(/ /g, '-') || drv,
    alternativeNames: [
      `${mfr} ${pids[0] || ''}`.trim(),
      `${type} ${power}`.trim(),
      drv,
    ].filter(n => n),
  };
}

// ─── STATS ───────────────────────────────────────────────────────
function computeStats(fps, groups, multiVariants, couples, issues) {
  return {
    totalFingerprints: Object.keys(fps).length,
    uniqueManufacturers: Object.keys(groups).length,
    multiVariantManufacturers: multiVariants.length,
    sacredCouples: couples.length,
    driverComposeSyncIssues: issues.length,
    driversWithMultiplePids: [...new Set(multiVariants.flatMap(m => m.drivers))].length,
    averageVariantsPerMfr: (Object.keys(fps).length / Object.keys(groups).length).toFixed(2),
  };
}

// ─── MAIN ────────────────────────────────────────────────────────
function main() {
  console.log('🧬 P32.2 — Smart Variant Handler');
  console.log('═'.repeat(60));
  console.log('Reading fingerprints + driver metadata...');
  
  const fps = loadFingerprints();
  const drivers = loadDriverMetadata();
  const groups = groupByMfr(fps);
  const multiVariants = findMultiVariantMfrs(groups);
  const couples = buildSacredCouples(groups);
  const issues = checkDriverComposeSync(multiVariants, drivers);

  console.log(`  ${Object.keys(fps).length} fingerprints`);
  console.log(`  ${Object.keys(groups).length} unique manufacturers`);
  console.log(`  ${multiVariants.length} multi-variant manufacturers`);
  console.log(`  ${couples.length} sacred couples (mfr+pid → driver)`);
  console.log(`  ${issues.length} driver.compose.json sync issues`);

  // Generate canonical names for all multi-variant mfrs
  const canonicalNames = {};
  for (const mv of multiVariants) {
    canonicalNames[mv.mfr] = suggestCanonicalName(mv.mfr, groups[mv.mfr]);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    stats: computeStats(fps, groups, multiVariants, couples, issues),
    multiVariantManufacturers: multiVariants,
    sacredCouples: couples,
    driverComposeSyncIssues: issues,
    canonicalNames,
    driverMetadata: Object.fromEntries(
      Object.entries(drivers).map(([k, v]) => [k, {
        name: v.name,
        capabilities: v.capabilities,
        mfrCount: v.manufacturerName.length,
        pidCount: v.productId.length,
      }])
    ),
  };

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));

  console.log('');
  console.log('─'.repeat(60));
  console.log('TOP MULTI-VARIANT MFRs:');
  for (const mv of multiVariants.slice(0, 10)) {
    console.log(`  [${mv.severity.toUpperCase()}] ${mv.mfr}`);
    console.log(`     ${mv.variantCount} variants, ${mv.productIds.length} pids, ${mv.drivers.length} drivers`);
    if (mv.issues.length > 0) {
      for (const i of mv.issues.slice(0, 2)) console.log(`     - ${i}`);
    }
  }
  console.log('─'.repeat(60));
  console.log('Report:', outputFile, `(${Math.round(fs.statSync(outputFile).size / 1024)}KB)`);
}

main();
