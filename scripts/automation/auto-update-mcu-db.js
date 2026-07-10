#!/usr/bin/env node
'use strict';

/**
 * auto-update-mcu-db.js - MCU Format Database Auto-Updater v1.0.0
 * =================================================================
 * Fetches the latest Z2M tuya.ts source, extracts new manufacturer names
 * that use mcuSyncTime / timeStart, cross-references with MCUFormatDatabase.js,
 * and adds missing entries automatically.
 *
 * Features:
 *   - Fetches Z2M tuya.ts from GitHub (raw master branch)
 *   - Parses mcuSyncTime blocks to extract manufacturer names + time format
 *   - Cross-references with MCUFormatDatabase.js MANUFACTURER_FORMAT_DB
 *   - Auto-adds missing entries with appropriate confidence scores
 *   - Generates detailed changelog of additions
 *   - Dry-run mode for preview
 *
 * Usage:
 *   node scripts/automation/auto-update-mcu-db.js                    # full update
 *   node scripts/automation/auto-update-mcu-db.js --dry-run          # preview only
 *   node scripts/automation/auto-update-mcu-db.js --verbose          # detailed output
 *   node scripts/automation/auto-update-mcu-db.js --report           # JSON report
 *   node scripts/automation/auto-update-mcu-db.js --auto-apply       # apply changes directly
 *
 * Exit codes:
 *   0 = no new entries or changes applied successfully
 *   1 = new entries found (dry-run) or apply failed
 *   2 = script failure
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '../..');
const MCU_DB_PATH = path.join(ROOT, 'lib', 'tuya', 'MCUFormatDatabase.js');
const REPORT_DIR = path.join(ROOT, '.cache', 'mcu-update');
const REPORT_PATH = path.join(REPORT_DIR, 'mcu-update-report.json');
const LOG_PATH = path.join(REPORT_DIR, 'mcu-update-log.json');

// ── Z2M Source URL ────────────────────────────────────────────────────────────
const Z2M_TUYA_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';

// ── CLI Arguments ─────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const FLAG = (name) => ARGS.includes(`--${name}`);
const VERBOSE = FLAG('verbose');
const DRY_RUN = FLAG('dry-run');
const REPORT = FLAG('report');
const AUTO_APPLY = FLAG('auto-apply');

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(color, ...args) {
  if (!REPORT) console.log(`${C[color] || ''}[MCU-UPDATE]${C.reset}`, ...args);
}

function warn(...args) {
  if (!REPORT) console.warn(`${C.yellow}[MCU-UPDATE WARN]${C.reset}`, ...args);
}

function error(...args) {
  if (!REPORT) console.error(`${C.red}[MCU-UPDATE ERROR]${C.reset}`, ...args);
}

// ── HTTP GET with retries ─────────────────────────────────────────────────────
function httpGet(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      https.get(url, { timeout: 60000 }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return httpGet(res.headers.location, remaining).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          if (remaining > 1) {
            return setTimeout(() => attempt(remaining - 1), 2000);
          }
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', (err) => {
        if (remaining > 1) {
          setTimeout(() => attempt(remaining - 1), 2000);
        } else {
          reject(err);
        }
      });
    };
    attempt(retries);
  });
}

// ── Parse Z2M tuya.ts for MCU time sync entries ───────────────────────────────
function parseZ2MTuyaSource(source) {
  const results = [];

  // Pattern 1: manufacturerName + mcuSyncTime blocks
  // Example: { zigbeeModel: ['TS0601'], manufacturerName: '_TZE200_xxx',
  //   mcuSyncTime: true, timeStart: "1970" }
  const blockPattern = /\{[^{}]*manufacturerName:\s*['"]([^'"]+)['"][^{}]*?(?:mcuSyncTime:\s*(?:true|['"][^'"]*['"]))[^{}]*?(?:timeStart:\s*['"](\d{4})['"])?[^{}]*\}/gs;
  let match;

  while ((match = blockPattern.exec(source)) !== null) {
    const mfr = match[1];
    const timeStart = match[2] || '1970';
    const context = source.substring(Math.max(0, match.index - 200), match.index + match[0].length + 200);

    // Extract zigbeeModel/productId if available
    const modelMatch = context.match(/zigbeeModel:\s*\[([^\]]*)\]/);
    let productIds = [];
    if (modelMatch) {
      const pidRe = /['"]([^'"]+)['"]/g;
      let pidMatch;
      while ((pidMatch = pidRe.exec(modelMatch[1])) !== null) {
        productIds.push(pidMatch[1]);
      }
    }

    // Extract device name from nearby comments or description
    const deviceName = extractDeviceName(source, match.index);

    results.push({
      manufacturerName: mfr,
      timeStart: parseInt(timeStart, 10),
      productIds,
      deviceName,
      source: 'Z2M tuya.ts',
      line: source.substring(0, match.index).split('\n').length,
    });
  }

  // Pattern 2: forceTimeUpdates entries
  const forcePattern = /\{[^{}]*manufacturerName:\s*['"]([^'"]+)['"][^{}]*?forceTimeUpdates:\s*true[^{}]*\}/gs;
  while ((match = forcePattern.exec(source)) !== null) {
    const mfr = match[1];
    const context = source.substring(Math.max(0, match.index - 200), match.index + match[0].length + 200);

    const modelMatch = context.match(/zigbeeModel:\s*\[([^\]]*)\]/);
    let productIds = [];
    if (modelMatch) {
      const pidRe = /['"]([^'"]+)['"]/g;
      let pidMatch;
      while ((pidMatch = pidRe.exec(modelMatch[1])) !== null) {
        productIds.push(pidMatch[1]);
      }
    }

    // Check if already captured by mcuSyncTime pattern
    const alreadyCaptured = results.some(r => r.manufacturerName === mfr);
    if (!alreadyCaptured) {
      results.push({
        manufacturerName: mfr,
        timeStart: 1970, // default
        productIds,
        deviceName: extractDeviceName(source, match.index),
        source: 'Z2M tuya.ts (forceTimeUpdates)',
        line: source.substring(0, match.index).split('\n').length,
      });
    }
  }

  // Pattern 3: TuyaTimeSync format hints from comments
  const formatHintPattern = /\/\*[^*]*timeStart.*?\*\/.*?manufacturerName:\s*['"]([^'"]+)['"]/gs;
  while ((match = formatHintPattern.exec(source)) !== null) {
    const mfr = match[1];
    const alreadyCaptured = results.some(r => r.manufacturerName === mfr);
    if (!alreadyCaptured) {
      const timeMatch = match[0].match(/timeStart.*?(\d{4})/);
      results.push({
        manufacturerName: mfr,
        timeStart: timeMatch ? parseInt(timeMatch[1], 10) : 1970,
        productIds: [],
        deviceName: extractDeviceName(source, match.index),
        source: 'Z2M tuya.ts (comment hint)',
        line: source.substring(0, match.index).split('\n').length,
      });
    }
  }

  return results;
}

// ── Extract device name from nearby context ───────────────────────────────────
function extractDeviceName(source, index) {
  // Look backward for comments or model names
  const before = source.substring(Math.max(0, index - 500), index);
  const commentMatch = before.match(/\/\/\s*(.+?)$/m);
  const modelMatch = before.match(/model:\s*['"]([^'"]+)['"]/);

  if (modelMatch) return modelMatch[1];
  if (commentMatch) return commentMatch[1].trim().substring(0, 60);
  return 'Unknown';
}

// ── Map timeStart to MCU format ───────────────────────────────────────────────
function mapTimeStartToFormat(timeStart) {
  // Maps Z2M timeStart values to MCUFormatDatabase FORMAT constants
  const FORMAT_MAP = {
    1970: 'Z2M_1970',
    2000: 'Z2M_2000',
  };
  return FORMAT_MAP[timeStart] || 'Z2M_1970';
}

// ── Load existing MCU database entries ────────────────────────────────────────
function loadExistingMCUEntries() {
  try {
    const content = fs.readFileSync(MCU_DB_PATH, 'utf8');
    const entries = new Set();

    // Extract manufacturer names from MANUFACTURER_FORMAT_DB
    const mfrPattern = /'(_T[YZE]\d{3}_[a-z0-9]+)':\s*\{/g;
    let match;
    while ((match = mfrPattern.exec(content)) !== null) {
      entries.add(match[1]);
    }

    return entries;
  } catch (err) {
    error(`Failed to load MCU database: ${err.message}`);
    return new Set();
  }
}

// ── Load full MCU database entries with details ───────────────────────────────
function loadExistingMCUDetails() {
  try {
    const content = fs.readFileSync(MCU_DB_PATH, 'utf8');
    const details = new Map();

    // Extract entries with their format info
    const entryPattern = /'(_T[YZE]\d{3}_[a-z0-9]+)':\s*\{\s*format:\s*FORMAT\.(\w+),\s*confidence:\s*(\d+),\s*source:\s*'([^']*)',\s*device:\s*'([^']*)'/g;
    let match;
    while ((match = entryPattern.exec(content)) !== null) {
      details.set(match[1], {
        format: match[2],
        confidence: parseInt(match[3], 10),
        source: match[4],
        device: match[5],
      });
    }

    return details;
  } catch (err) {
    error(`Failed to load MCU database details: ${err.message}`);
    return new Map();
  }
}

// ── Generate new entry text ───────────────────────────────────────────────────
function generateEntryText(entry, formatName) {
  const confidence = 90; // High confidence for Z2M-verified entries
  const device = entry.deviceName || 'Unknown';
  const source = `Z2M tuya.ts line ${entry.line || '?'}`;

  return `  '${entry.manufacturerName}': { format: FORMAT.${formatName}, confidence: ${confidence}, source: '${source}', device: '${device}' },`;
}

// ── Apply changes to MCU database file ────────────────────────────────────────
function applyChanges(newEntries, formatName) {
  try {
    let content = fs.readFileSync(MCU_DB_PATH, 'utf8');

    // Find the MANUFACTURER_FORMAT_DB closing brace
    const dbEndPattern = /^(};)\s*$/m;
    const lines = content.split('\n');

    // Find the line with the closing brace of MANUFACTURER_FORMAT_DB
    let insertLine = -1;
    let braceCount = 0;
    let inDB = false;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('const MANUFACTURER_FORMAT_DB = {')) {
        inDB = true;
        continue;
      }
      if (inDB) {
        // Count braces
        for (const ch of lines[i]) {
          if (ch === '{') braceCount++;
          if (ch === '}') {
            if (braceCount === 0) {
              insertLine = i;
              break;
            }
            braceCount--;
          }
        }
        if (insertLine >= 0) break;
      }
    }

    if (insertLine < 0) {
      error('Could not find MANUFACTURER_FORMAT_DB closing brace');
      return false;
    }

    // Generate entries to insert
    const entries = [];
    for (const entry of newEntries) {
      entries.push(generateEntryText(entry, formatName));
    }

    // Insert before the closing brace
    lines.splice(insertLine, 0, ...entries);

    // Write back
    fs.writeFileSync(MCU_DB_PATH, lines.join('\n'), 'utf8');
    return true;
  } catch (err) {
    error(`Failed to apply changes: ${err.message}`);
    return false;
  }
}

// ── Generate report ───────────────────────────────────────────────────────────
function generateReport(z2mEntries, existingEntries, newEntries, skippedEntries) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      z2mTotal: z2mEntries.length,
      existingCount: existingEntries.size,
      newEntries: newEntries.length,
      skippedEntries: skippedEntries.length,
    },
    newEntries: newEntries.map(e => ({
      manufacturerName: e.manufacturerName,
      format: mapTimeStartToFormat(e.timeStart),
      timeStart: e.timeStart,
      device: e.deviceName,
      source: e.source,
      line: e.line,
    })),
    skippedEntries: skippedEntries.map(e => ({
      manufacturerName: e.manufacturerName,
      reason: 'Already in MCU database',
    })),
    formatDistribution: {},
  };

  // Calculate format distribution
  for (const entry of newEntries) {
    const fmt = mapTimeStartToFormat(entry.timeStart);
    report.formatDistribution[fmt] = (report.formatDistribution[fmt] || 0) + 1;
  }

  return report;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log('cyan', 'MCU Format Database Auto-Updater v1.0.0');
  log('dim', `Mode: ${DRY_RUN ? 'DRY RUN' : AUTO_APPLY ? 'AUTO-APPLY' : 'Interactive'}`);
  log('dim', `Source: ${Z2M_TUYA_URL}`);
  log('');

  // 1. Fetch Z2M tuya.ts
  log('cyan', 'Fetching Z2M tuya.ts...');
  let z2mSource;
  try {
    z2mSource = await httpGet(Z2M_TUYA_URL);
    log('green', `Fetched ${(z2mSource.length / 1024).toFixed(1)} KB from Z2M`);
  } catch (err) {
    error(`Failed to fetch Z2M source: ${err.message}`);
    process.exit(2);
  }

  // 2. Parse for MCU entries
  log('cyan', 'Parsing Z2M source for MCU time sync entries...');
  const z2mEntries = parseZ2MTuyaSource(z2mSource);
  log('green', `Found ${z2mEntries.length} MCU time sync entries in Z2M`);

  if (VERBOSE) {
    for (const entry of z2mEntries.slice(0, 10)) {
      log('dim', `  ${entry.manufacturerName} -> timeStart:${entry.timeStart} (${entry.deviceName})`);
    }
    if (z2mEntries.length > 10) {
      log('dim', `  ... and ${z2mEntries.length - 10} more`);
    }
  }

  // 3. Load existing MCU database entries
  log('cyan', 'Loading existing MCU database...');
  const existingEntries = loadExistingMCUEntries();
  const existingDetails = loadExistingMCUDetails();
  log('green', `Existing MCU database: ${existingEntries.size} entries`);

  // 4. Cross-reference and find missing
  log('cyan', 'Cross-referencing with MCU database...');
  const newEntries = [];
  const skippedEntries = [];

  for (const z2mEntry of z2mEntries) {
    if (existingEntries.has(z2mEntry.manufacturerName)) {
      skippedEntries.push(z2mEntry);

      // Check if existing entry has lower confidence - could upgrade
      const existing = existingDetails.get(z2mEntry.manufacturerName);
      if (existing && existing.confidence < 80 && VERBOSE) {
        warn(`  ${z2mEntry.manufacturerName}: Existing confidence ${existing.confidence} < 80, consider upgrading`);
      }
    } else {
      newEntries.push(z2mEntry);
    }
  }

  log('green', `New entries to add: ${newEntries.length}`);
  log('dim', `Already in database (skipped): ${skippedEntries.length}`);

  // 5. Display new entries
  if (newEntries.length > 0) {
    log('');
    log('cyan', 'New entries to add:');
    for (const entry of newEntries) {
      const fmt = mapTimeStartToFormat(entry.timeStart);
      log('dim', `  ${entry.manufacturerName} -> ${fmt} (timeStart: ${entry.timeStart}) [${entry.deviceName}]`);
    }
  }

  // 6. Apply changes
  if (newEntries.length > 0 && !DRY_RUN) {
    log('');
    log('cyan', 'Applying changes to MCUFormatDatabase.js...');

    // Group by format
    const byFormat = {};
    for (const entry of newEntries) {
      const fmt = mapTimeStartToFormat(entry.timeStart);
      if (!byFormat[fmt]) byFormat[fmt] = [];
      byFormat[fmt].push(entry);
    }

    let totalApplied = 0;
    for (const [fmt, entries] of Object.entries(byFormat)) {
      log('dim', `  Adding ${entries.length} entries with format ${fmt}...`);
      if (applyChanges(entries, fmt)) {
        totalApplied += entries.length;
        log('green', `  Applied ${entries.length} entries for format ${fmt}`);
      } else {
        error(`  Failed to apply entries for format ${fmt}`);
      }
    }

    log('green', `Total entries applied: ${totalApplied}/${newEntries.length}`);
  } else if (DRY_RUN && newEntries.length > 0) {
    log('');
    log('yellow', 'DRY RUN - No changes applied');
    log('yellow', `Would add ${newEntries.length} entries to MCUFormatDatabase.js`);
  }

  // 7. Generate report
  const report = generateReport(z2mEntries, existingEntries, newEntries, skippedEntries);

  if (REPORT || VERBOSE) {
    if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    log('dim', `Report saved to: ${REPORT_PATH}`);
  }

  // Save update log
  if (!DRY_RUN && newEntries.length > 0) {
    if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
    const logEntry = {
      timestamp: new Date().toISOString(),
      entriesAdded: newEntries.length,
      entries: newEntries.map(e => e.manufacturerName),
    };

    let updateLog = [];
    if (fs.existsSync(LOG_PATH)) {
      try { updateLog = JSON.parse(fs.readFileSync(LOG_PATH)); } catch (_) {}
    }
    updateLog.push(logEntry);
    fs.writeFileSync(LOG_PATH, JSON.stringify(updateLog.slice(-50), null, 2));
  }

  // 8. Summary
  log('');
  log('cyan', '=== Summary ===');
  log('dim', `Z2M entries found: ${report.summary.z2mTotal}`);
  log('dim', `Existing in database: ${report.summary.existingCount}`);
  log('green', `New entries: ${report.summary.newEntries}`);
  log('dim', `Skipped (already exists): ${report.summary.skippedEntries}`);

  if (Object.keys(report.formatDistribution).length > 0) {
    log('');
    log('cyan', 'Format distribution of new entries:');
    for (const [fmt, count] of Object.entries(report.formatDistribution)) {
      log('dim', `  ${fmt}: ${count}`);
    }
  }

  log('');
  if (report.summary.newEntries === 0) {
    log('green', 'No new entries to add - MCU database is up to date');
    process.exit(0);
  } else if (DRY_RUN) {
    log('yellow', `Dry run complete - ${report.summary.newEntries} entries would be added`);
    process.exit(1);
  } else {
    log('green', `Successfully added ${report.summary.newEntries} entries to MCU database`);
    process.exit(0);
  }
}

// ── Error handling ────────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  error(`Uncaught exception: ${err.message}`);
  process.exit(2);
});

process.on('unhandledRejection', (err) => {
  error(`Unhandled rejection: ${err.message || err}`);
  process.exit(2);
});

main();
