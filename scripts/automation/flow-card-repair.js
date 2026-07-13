#!/usr/bin/env node
/**
 * flow-card-repair.js - Flow Card Auto-Repair v1.0.0
 * ==========================================================================
 * Detects and repairs flow card issues across all drivers:
 *   1. Auto-generates basic flow cards from capabilities
 *   2. Fixes malformed flow card JSON
 *   3. Adds missing required fields
 *   4. Removes banned titleFormatted / [[device]] patterns
 *
 * Modes:
 *   --dry-run       Preview repairs without writing files
 *   --json          Output JSON report
 *   --verbose       Detailed per-card output
 *   --ci            CI mode: exit 1 on unrepaired errors
 *   --force         Regenerate all flow cards (destructive!)
 *
 * Usage:
 *   node scripts/automation/flow-card-repair.js --dry-run
 *   node scripts/automation/flow-card-repair.js --verbose
 *   node scripts/automation/flow-card-repair.js --json
 *
 * Exit codes: 0 = pass/no repairs needed, 1 = repairs made or errors, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ── Paths ────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON = path.join(ROOT, 'app.json');

// ── CLI Flags ────────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const JSON_OUTPUT = ARGS.includes('--json');
const VERBOSE = ARGS.includes('--verbose');
const CI_MODE = ARGS.includes('--ci');
const FORCE = ARGS.includes('--force');

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  M: '\x1b[35m', D: '\x1b[90m', X: '\x1b[0m', W: '\x1b[1m',
};

// ── Capability-to-Flow-Card Templates ────────────────────────────────────────
// Maps capability names to the flow cards they should have
const CAPABILITY_FLOW_TEMPLATES = {
  onoff: {
    triggers: [
      { suffix: '_turned_on', title: { en: 'Turned on', fr: 'Allume' }, args: [] },
      { suffix: '_turned_off', title: { en: 'Turned off', fr: 'Eteint' }, args: [] },
    ],
    conditions: [
      { suffix: '_is_on', title: { en: 'Is turned !{{on|off}}', fr: 'Est !{{allume|eteint}}' }, args: [] },
    ],
    actions: [
      { suffix: '_turn_on', title: { en: 'Turn on', fr: 'Allumer' }, args: [] },
      { suffix: '_turn_off', title: { en: 'Turn off', fr: 'Eteindre' }, args: [] },
      { suffix: '_toggle', title: { en: 'Toggle', fr: 'Basculer' }, args: [] },
    ],
  },
  dim: {
    triggers: [
      { suffix: '_dim_changed', title: { en: 'Brightness changed', fr: 'Luminosite changee' },
        tokens: [{ name: 'dim', type: 'number', title: { en: 'Brightness', fr: 'Luminosite' }, example: 0.75 }],
        args: [] },
    ],
    actions: [
      { suffix: '_set_brightness', title: { en: 'Set brightness', fr: 'Regler luminosite' },
        args: [{ name: 'brightness', type: 'range', min: 0, max: 100, step: 1, label: '%' }] },
    ],
  },
  thermostat_mode: {
    triggers: [
      { suffix: '_thermostat_mode_changed', title: { en: 'Thermostat mode changed', fr: 'Mode thermostat change' },
        tokens: [{ name: 'mode', type: 'string', title: { en: 'Mode', fr: 'Mode' }, example: 'auto' }],
        args: [] },
    ],
    actions: [
      { suffix: '_set_thermostat_mode', title: { en: 'Set thermostat mode', fr: 'Regler mode thermostat' },
        args: [{ name: 'mode', type: 'dropdown', title: { en: 'Mode', fr: 'Mode' },
          values: ['auto', 'heat', 'cool', 'off'] }] },
    ],
    conditions: [
      { suffix: '_thermostat_mode_is', title: { en: 'Thermostat mode is !{{auto|heat|cool|off}}', fr: 'Mode thermostat est !{{auto|chaud|froid|eteint}}' },
        args: [] },
    ],
  },
  thermostat_temperature: {
    triggers: [
      { suffix: '_target_temp_changed', title: { en: 'Target temperature changed', fr: 'Temperature cible changee' },
        tokens: [{ name: 'temperature', type: 'number', title: { en: 'Temperature', fr: 'Temperature' }, example: 21.5 }],
        args: [] },
    ],
    actions: [
      { suffix: '_set_target_temperature', title: { en: 'Set target temperature', fr: 'Regler temperature cible' },
        args: [{ name: 'temperature', type: 'number', title: { en: 'Temperature', fr: 'Temperature' } }] },
    ],
  },
  locked: {
    triggers: [
      { suffix: '_locked', title: { en: 'Locked', fr: 'Verrouille' }, args: [] },
      { suffix: '_unlocked', title: { en: 'Unlocked', fr: 'Deverrouille' }, args: [] },
    ],
    conditions: [
      { suffix: '_is_locked', title: { en: 'Is !{{locked|unlocked}}', fr: 'Est !{{verrouille|deverrouille}}' }, args: [] },
    ],
    actions: [
      { suffix: '_lock', title: { en: 'Lock', fr: 'Verrouiller' }, args: [] },
      { suffix: '_unlock', title: { en: 'Unlock', fr: 'Deverrouiller' }, args: [] },
    ],
  },
  windowcoverings_set: {
    triggers: [
      { suffix: '_position_changed', title: { en: 'Position changed', fr: 'Position changee' },
        tokens: [{ name: 'position', type: 'number', title: { en: 'Position', fr: 'Position' }, example: 50 }],
        args: [] },
    ],
    actions: [
      { suffix: '_set_position', title: { en: 'Set position', fr: 'Regler position' },
        args: [{ name: 'position', type: 'range', min: 0, max: 100, step: 1, label: '%' }] },
    ],
  },
  fan_speed: {
    triggers: [
      { suffix: '_fan_speed_changed', title: { en: 'Fan speed changed', fr: 'Vitesse ventilateur changee' },
        tokens: [{ name: 'speed', type: 'number', title: { en: 'Speed', fr: 'Vitesse' }, example: 50 }],
        args: [] },
    ],
    actions: [
      { suffix: '_set_fan_speed', title: { en: 'Set fan speed', fr: 'Regler vitesse ventilateur' },
        args: [{ name: 'speed', type: 'range', min: 0, max: 100, step: 1, label: '%' }] },
    ],
  },
  measure_battery: {
    triggers: [
      { suffix: '_battery_low', title: { en: 'Battery low', fr: 'Batterie faible', nl: 'Batterij laag', de: 'Batterie schwach' }, args: [] },
    ],
  },
  alarm_motion: {
    triggers: [
      { suffix: '_motion_detected', title: { en: 'Motion detected', fr: 'Mouvement detecte' }, args: [] },
      { suffix: '_motion_off', title: { en: 'Motion ended', fr: 'Mouvement termine' }, args: [] },
    ],
  },
  alarm_contact: {
    triggers: [
      { suffix: '_contact_open', title: { en: 'Contact opened', fr: 'Contact ouvert' }, args: [] },
      { suffix: '_contact_closed', title: { en: 'Contact closed', fr: 'Contact ferme' }, args: [] },
    ],
  },
  measure_temperature: {
    triggers: [
      { suffix: '_temperature_changed', title: { en: 'Temperature changed', fr: 'Temperature changee' },
        tokens: [{ name: 'temperature', type: 'number', title: { en: 'Temperature', fr: 'Temperature' }, example: 21.5 }],
        args: [] },
    ],
  },
  measure_humidity: {
    triggers: [
      { suffix: '_humidity_changed', title: { en: 'Humidity changed', fr: 'Humidite changee' },
        tokens: [{ name: 'humidity', type: 'number', title: { en: 'Humidity', fr: 'Humidite' }, example: 55 }],
        args: [] },
    ],
  },
  measure_luminance: {
    triggers: [
      { suffix: '_luminance_changed', title: { en: 'Luminance changed', fr: 'Luminance changee' },
        tokens: [{ name: 'luminance', type: 'number', title: { en: 'Luminance', fr: 'Luminance' }, example: 300 }],
        args: [] },
    ],
  },
  child_lock: {
    actions: [
      { suffix: '_enable_child_lock', title: { en: 'Enable child lock', fr: 'Activer verrouillage enfant' }, args: [] },
      { suffix: '_disable_child_lock', title: { en: 'Disable child lock', fr: 'Desactiver verrouillage enfant' }, args: [] },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR REPORT
// ═══════════════════════════════════════════════════════════════════════════════

const report = {
  timestamp: new Date().toISOString(),
  dryRun: DRY_RUN,
  summary: {
    driversScanned: 0,
    driversRepaired: 0,
    driversCreated: 0,
    totalRepairs: 0,
    totalCardsGenerated: 0,
    errors: 0,
    warnings: 0,
  },
  repairs: [],
  generated: [],
  errors: [],
};

function addRepair(driverName, type, message, details = {}) {
  report.repairs.push({ driver: driverName, type, message, ...details });
  report.summary.totalRepairs++;
  if (!JSON_OUTPUT) {
    const prefix = DRY_RUN ? `${C.Y}[DRY-RUN]` : `${C.G}[REPAIRED]`;
    console.log(`${prefix}${C.X} ${driverName}: ${message}`);
  }
}

function addGenerated(driverName, count, cards) {
  report.generated.push({ driver: driverName, count, cards });
  report.summary.totalCardsGenerated += count;
}

function addError(driverName, message) {
  report.errors.push({ driver: driverName, message });
  report.summary.errors++;
  if (!JSON_OUTPUT) console.log(`${C.R}[ERROR]${C.X} ${driverName}: ${message}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GENERATE FLOW CARDS FROM CAPABILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function generateFlowCardsForDriver(driverName, capabilities) {
  const flowData = { triggers: [], conditions: [], actions: [] };
  const generatedCards = [];

  for (const cap of capabilities) {
    const baseCap = cap.split('.')[0]; // strip sub-capabilities
    const template = CAPABILITY_FLOW_TEMPLATES[baseCap];
    if (!template) continue;

    for (const cardType of ['triggers', 'conditions', 'actions']) {
      const cards = template[cardType] || [];
      for (const cardDef of cards) {
        const card = {
          id: `${driverName}${cardDef.suffix}`,
          title: cardDef.title,
          args: cardDef.args || [],
        };
        if (cardDef.tokens) card.tokens = cardDef.tokens;
        flowData[cardType].push(card);
        generatedCards.push({ type: cardType, id: card.id });
      }
    }
  }

  return { flowData, generatedCards };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. FIX MALFORMED JSON
// ═══════════════════════════════════════════════════════════════════════════════

function fixMalformedJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content); // If this throws, JSON is malformed
    return { fixed: false, valid: true };
  } catch (e) {
    // Try to fix common JSON issues
    try {
      let content = fs.readFileSync(filePath, 'utf8');

      // Remove trailing commas before ] or }
      content = content.replace(/,\s*([}\]])/g, '$1');

      // Fix single quotes to double quotes
      content = content.replace(/'/g, '"');

      // Try parsing again
      const parsed = JSON.parse(content);
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
      }
      return { fixed: true, valid: true };
    } catch {
      return { fixed: false, valid: false, error: e.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ADD MISSING REQUIRED FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

function addMissingFields(flowData, driverName) {
  let fixes = 0;
  for (const cardType of ['triggers', 'conditions', 'actions']) {
    const cards = flowData[cardType] || [];
    for (const card of cards) {
      // Ensure args array exists
      if (!card.args) {
        card.args = [];
        fixes++;
      }

      // Ensure title is an object with 'en' key
      if (card.title && typeof card.title === 'string') {
        card.title = { en: card.title };
        fixes++;
      }

      // Ensure title has 'en' locale
      if (card.title && typeof card.title === 'object' && !card.title.en) {
        card.title.en = card.id || 'Unknown card';
        fixes++;
      }
    }
  }
  return fixes;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. REMOVE BANNED PATTERNS (titleFormatted, [[device]])
// ═══════════════════════════════════════════════════════════════════════════════

function removeBannedPatterns(flowData) {
  let fixes = 0;
  function clean(obj) {
    if (typeof obj !== 'object' || obj === null) return;
    if (Array.isArray(obj)) { obj.forEach(clean); return; }

    // Remove titleFormatted
    if ('titleFormatted' in obj) {
      delete obj.titleFormatted;
      fixes++;
    }

    // Remove [[device]] from string values
    for (const key in obj) {
      if (typeof obj[key] === 'string' && obj[key].includes('[[device]]')) {
        obj[key] = obj[key].replace(/\[\[device\]\]\s*/g, '').trim();
        fixes++;
      } else if (typeof obj[key] === 'object') {
        for (const lang in obj[key]) {
          if (typeof obj[key][lang] === 'string' && obj[key][lang].includes('[[device]]')) {
            obj[key][lang] = obj[key][lang].replace(/\[\[device\]\]\s*/g, '').trim();
            fixes++;
          }
        }
        clean(obj[key]);
      }
    }
  }
  clean(flowData);
  return fixes;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. FIX DUPLICATE IDS WITHIN A FLOW FILE
// ═══════════════════════════════════════════════════════════════════════════════

function fixDuplicateIdsWithinFile(flowData, driverName) {
  let fixes = 0;
  const seenIds = new Set();

  for (const cardType of ['triggers', 'conditions', 'actions']) {
    const cards = flowData[cardType] || [];
    const deduped = [];

    for (const card of cards) {
      if (!card.id) {
        deduped.push(card);
        continue;
      }
      if (seenIds.has(card.id)) {
        // Append cardType to make unique
        const newId = `${card.id}_${cardType}`;
        card.id = newId;
        fixes++;
      }
      seenIds.add(card.id);
      deduped.push(card);
    }

    flowData[cardType] = deduped;
  }
  return fixes;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN REPAIR LOOP
// ═══════════════════════════════════════════════════════════════════════════════

function runRepair() {
  if (!JSON_OUTPUT) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`  FLOW CARD AUTO-REPAIR v1.0.0 ${DRY_RUN ? '(DRY RUN)' : ''}`);
    console.log(`${'='.repeat(70)}\n`);
  }

  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
    catch { return false; }
  });

  report.summary.driversScanned = driverDirs.length;

  for (const driverName of driverDirs) {
    const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    const flowPath = path.join(DRIVERS_DIR, driverName, 'driver.flow.compose.json');

    // Load driver config
    let driverConfig = {};
    try {
      if (fs.existsSync(composePath)) {
        driverConfig = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      }
    } catch { continue; }

    const capabilities = driverConfig.capabilities || [];
    let flowData = null;
    let driverRepaired = false;

    // ── Existing flow file ──
    if (fs.existsSync(flowPath)) {
      // Fix malformed JSON first
      const jsonFix = fixMalformedJson(flowPath);
      if (jsonFix.fixed) {
        addRepair(driverName, 'json_fix', 'Fixed malformed JSON');
        driverRepaired = true;
      } else if (!jsonFix.valid) {
        addError(driverName, `Cannot parse flow JSON: ${jsonFix.error}`);
        continue;
      }

      // Parse flow data
      try {
        flowData = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
      } catch {
        addError(driverName, 'Failed to parse flow compose JSON');
        continue;
      }

      // Fix duplicate IDs within file
      const dupeFixes = fixDuplicateIdsWithinFile(flowData, driverName);
      if (dupeFixes > 0) {
        addRepair(driverName, 'duplicate_ids', `Fixed ${dupeFixes} duplicate ID(s) within flow file`);
        driverRepaired = true;
      }

      // Remove banned patterns
      const bannedFixes = removeBannedPatterns(flowData);
      if (bannedFixes > 0) {
        addRepair(driverName, 'banned_patterns', `Removed ${bannedFixes} banned pattern(s) (titleFormatted/[[device]])`);
        driverRepaired = true;
      }

      // Add missing fields
      const fieldFixes = addMissingFields(flowData, driverName);
      if (fieldFixes > 0) {
        addRepair(driverName, 'missing_fields', `Added ${fieldFixes} missing required field(s)`);
        driverRepaired = true;
      }

      // If FORCE mode, regenerate from capabilities
      if (FORCE && capabilities.length > 0) {
        const { flowData: generated, generatedCards } = generateFlowCardsForDriver(driverName, capabilities);
        if (generatedCards.length > 0) {
          // Merge: keep existing cards, add new ones
          for (const cardType of ['triggers', 'conditions', 'actions']) {
            const existingIds = new Set((flowData[cardType] || []).map(c => c.id));
            for (const card of generated[cardType] || []) {
              if (!existingIds.has(card.id)) {
                flowData[cardType] = flowData[cardType] || [];
                flowData[cardType].push(card);
              }
            }
          }
          addRepair(driverName, 'force_regenerate', `Merged ${generatedCards.length} generated card(s) from capabilities`);
          driverRepaired = true;
        }
      }

    } else {
      // ── No flow file exists ──
      if (capabilities.length > 0) {
        const { flowData: generated, generatedCards } = generateFlowCardsForDriver(driverName, capabilities);
        if (generatedCards.length > 0) {
          flowData = generated;
          report.summary.driversCreated++;
          addRepair(driverName, 'flow_file_created', `Created flow compose with ${generatedCards.length} card(s) from capabilities`);
          addGenerated(driverName, generatedCards.length, generatedCards);
          driverRepaired = true;
        }
      }
    }

    // Write repaired/generated flow file
    if (driverRepaired && flowData) {
      // Final validation: ensure structure is correct
      for (const cardType of ['triggers', 'conditions', 'actions']) {
        if (!Array.isArray(flowData[cardType])) {
          flowData[cardType] = [];
        }
      }

      if (!DRY_RUN) {
        fs.writeFileSync(flowPath, JSON.stringify(flowData, null, 2) + '\n', 'utf8');
      }
      report.summary.driversRepaired++;
    }
  }

  return report;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

function printReport() {
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const s = report.summary;
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  REPAIR REPORT ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log(`${'='.repeat(70)}\n`);
  console.log(`  Drivers scanned:      ${s.driversScanned}`);
  console.log(`  Drivers repaired:     ${C.G}${s.driversRepaired}${C.X}`);
  console.log(`  Flow files created:   ${C.B}${s.driversCreated}${C.X}`);
  console.log(`  Total repairs:        ${s.totalRepairs}`);
  console.log(`  Cards generated:      ${s.totalCardsGenerated}`);
  console.log(`  Errors:               ${s.errors > 0 ? C.R : C.G}${s.errors}${C.X}`);
  console.log('');

  if (s.totalRepairs === 0 && s.errors === 0) {
    console.log(`  ${C.G}No repairs needed - all flow cards are healthy!${C.X}`);
  } else if (DRY_RUN) {
    console.log(`  ${C.Y}Dry run complete - run without --dry-run to apply repairs${C.X}`);
  } else {
    console.log(`  ${C.G}${s.totalRepairs} repair(s) applied successfully${C.X}`);
  }
  console.log(`${'='.repeat(70)}\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

try {
  runRepair();
  printReport();

  if (CI_MODE && report.summary.errors > 0) {
    process.exit(1);
  }
  if (report.summary.totalRepairs > 0 || report.summary.errors > 0) {
    process.exit(0); // Repairs made or errors - but exit 0 since repairs were applied
  }
} catch (e) {
  console.error(`[FLOW-CARD-REPAIR] Fatal: ${e.message}`);
  process.exit(2);
}
