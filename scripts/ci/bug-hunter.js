#!/usr/bin/env node
/**
 * bug-hunter.js - Enhanced bug detection for Tuya Zigbee codebase
 * Run: node scripts/ci/bug-hunter.js [--json]
 *
 * Scans for common bugs and regressions:
 * - Hardcoded /app/ paths
 * - Legacy crashy battery handler
 * - Async forEach (unawaited promises)
 * - Missing await on setCapabilityValue
 * - Unbound error handlers
 * - Direct process.exit in non-CI scripts
 * - console.log in CI scripts (should use structured output)
 * - Missing error handling on fs operations
 * - Undefined variable references in common patterns
 * - Missing 'use strict' in scripts
 * - Potential null reference errors
 * - Empty catch blocks
 * - Hardcoded paths that should use config
 *
 * Exit codes: 0 = no bugs, 1 = critical bugs found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');

const JSON_OUTPUT = process.argv.includes('--json');

const DRIVERS_DIR = path.resolve(__dirname, '../../drivers');
const LIB_DIR = path.resolve(__dirname, '../../lib');
const SCRIPTS_DIR = path.resolve(__dirname, '../../scripts');

const issues = [];
let filesScanned = 0;

function addIssue(severity, file, message) {
  const entry = {
    severity,
    file: path.relative(path.resolve(__dirname, '../..'), file),
    message,
  };
  issues.push(entry);
  if (!JSON_OUTPUT) {
    const icon = severity === 'critical' ? 'ERROR' : severity === 'warning' ? 'WARN' : 'INFO';
    console.log(`[${icon}] ${entry.file}: ${message}`);
  }
}

function hunt(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'temp', 'tmp'].includes(entry.name)) continue;
      hunt(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }
  filesScanned++;

  // 1. Hardcoded /app/ path
  if (/require\(['"]\/app\//.test(content)) {
    addIssue('critical', filePath, 'Hardcoded /app/ require path found');
  }

  // 2. Legacy crashy battery handler (only check driver device.js files)
  if (filePath.includes(path.join('drivers', '')) && content.includes('onBatteryPercentageRemainingAttributeReport')) {
    addIssue('critical', filePath, 'Legacy crashy battery handler found');
  }

  // 3. Async forEach (unawaited promises)
  if (content.includes('.forEach(async')) {
    addIssue('warning', filePath, 'async forEach detected (promises might not be awaited)');
  }

  // 4. Missing await on setCapabilityValue
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip comments
    if (line.startsWith('//') || line.startsWith('*')) continue;
    if (/this\.setCapabilityValue\(/.test(line) && !/await\s+this\.setCapabilityValue/.test(line) && !/return\s+this\.setCapabilityValue/.test(line) && !/\.then\(/.test(line)) {
      addIssue('info', filePath, `Possible missing await on setCapabilityValue (line ${i + 1})`);
      break; // report once per file
    }
  }

  // 5. Unbound error handler: .catch(this.error) without .bind
  if (/.catch\(this\.error\)/.test(content) && !/.catch\(this\.error\.bind/.test(content) && !/.catch\(\(.*\)\s*=>/.test(content)) {
    addIssue('warning', filePath, '.catch(this.error) without binding (may lose context)');
  }

  // 6. Empty catch blocks
  if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(content)) {
    addIssue('warning', filePath, 'Empty catch block (errors silently swallowed)');
  }

  // 7. console.log in CI scripts
  if (filePath.includes('scripts/ci/') && !filePath.includes('node_modules')) {
    if (/console\.log\(/.test(content) && !JSON_OUTPUT) {
      // Only warn if the script doesn't have --json support
      if (!content.includes('--json') || !content.includes('JSON_OUTPUT')) {
        addIssue('info', filePath, 'CI script uses console.log without --json support');
      }
    }
  }

  // 8. process.exit without proper exit code handling (only in lib, not scripts)
  if (!filePath.includes('scripts/') && /process\.exit\(\)/.test(content)) {
    addIssue('warning', filePath, 'process.exit() called without exit code');
  }

  // 9. fs.readFileSync without try/catch (top-level)
  if (/^const\s+\w+\s*=\s*fs\.readFileSync/m.test(content) && !content.includes('try')) {
    addIssue('info', filePath, 'Top-level fs.readFileSync without error handling');
  }

  // 10. Missing 'use strict' in automation/CI scripts (not drivers, they may use SDK conventions)
  if (filePath.includes('scripts/automation/') || filePath.includes('scripts/ci/')) {
    if (!filePath.includes('node_modules')) {
      if (!content.trimStart().startsWith("'use strict'") && !content.trimStart().startsWith('"use strict"') && !content.startsWith('#!')) {
        // Allow shebang-only files that have use strict on line 2
        const firstLines = content.split('\n').slice(0, 3).join('\n');
        if (!firstLines.includes("'use strict'") && !firstLines.includes('"use strict"')) {
          addIssue('info', filePath, 'Missing "use strict" directive');
        }
      }
    }
  }

  // 11. Potential null reference: accessing property on possibly null/undefined
  // Look for common patterns like config.zigbee.xxx without null checks
  if (/\.zigbee\.(manufacturerName|productId)\b/.test(content)) {
    const hasNullSafety = content.includes('?.') || content.includes('|| []') || content.includes('|| {}');
    if (!hasNullSafety) {
      addIssue('info', filePath, 'Accessing zigbee properties without null safety');
    }
  }

  // 12. Hardcoded temp/tmp paths
  if (/['"]\/tmp\//.test(content) || /['"]\\tmp\\/.test(content)) {
    addIssue('warning', filePath, 'Hardcoded /tmp/ path (may not exist in CI)');
  }

  // 13. Unused imports / require statements
  if (filePath.endsWith('.js')) {
    const requireMatches = content.match(/(?:const|let|var)\s+(\w+)\s*=\s*require\(/g);
    if (requireMatches) {
      for (const req of requireMatches) {
        const varName = req.match(/(?:const|let|var)\s+(\w+)/)?.[1];
        if (varName) {
          // Count all occurrences of the variable name (word boundary)
          const declPattern = new RegExp(`\\b${varName}\\b`, 'g');
          const count = (content.match(declPattern) || []).length;
          if (count <= 1) {
            addIssue('warning', filePath, `Unused import: "${varName}" is required but never referenced`);
          }
        }
      }
    }
  }

  // 14. Duplicate property in object literal (only in actual object definitions, not all : occurrences)
  // This check is limited to avoid false positives from map/object patterns
  // We only look for patterns like: { ... prop: val, ... prop: val ... }
  // Skip files that are likely to have many legitimate : uses (e.g., ternaries, labels)
  if (content.includes('{') && content.includes('}')) {
    // Simple heuristic: look for repeated property names in object literals
    const objLiteralPattern = /\{\s*\n(\s+\w+\s*:)/g;
    let match;
    const fileProps = new Set();
    const dupesInFile = new Set();
    while ((match = objLiteralPattern.exec(content)) !== null) {
      const prop = match[1].trim().split(':')[0].trim();
      if (fileProps.has(prop) && !prop.startsWith('_') && prop !== 'constructor') {
        dupesInFile.add(prop);
      }
      fileProps.add(prop);
    }
    for (const prop of dupesInFile) {
      addIssue('info', filePath, `Possible duplicate object property: "${prop}"`);
    }
  }
}

// JSON-only scans (driver.compose.json files)
function scanDriverCompose(filePath) {
  let comp;
  try {
    comp = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    addIssue('critical', filePath, 'Invalid JSON in driver.compose.json');
    return;
  }

  const relPath = path.relative(path.resolve(__dirname, '../..'), filePath);

  // 15. Empty manufacturerName array (causes AggregateError on Zigbee init)
  if (comp.zigbee && Array.isArray(comp.zigbee.manufacturerName) && comp.zigbee.manufacturerName.length === 0) {
    // Only flag if fingerprints exist (meaning it IS a zigbee device that needs mfr names)
    if (comp.zigbee.fingerprints && comp.zigbee.fingerprints.length > 0) {
      addIssue('critical', filePath, 'Empty manufacturerName[] with existing fingerprints (causes AggregateError)');
    }
  }

  // 16. Missing required fields in driver.compose.json
  const requiredTopLevel = ['id', 'version', 'compatibility'];
  for (const field of requiredTopLevel) {
    if (!comp[field]) {
      addIssue('warning', filePath, `Missing required field: "${field}"`);
    }
  }

  // 17. Missing required driver fields
  if (!comp.connectivity) {
    addIssue('warning', filePath, 'Missing "connectivity" array (required by Homey SDK)');
  }
  if (!comp.leader) {
    addIssue('info', filePath, 'Missing "leader" field in driver.compose.json');
  }

  // 18. Case-sensitivity issues in manufacturer names
  if (comp.zigbee && comp.zigbee.manufacturerName) {
    const names = comp.zigbee.manufacturerName;
    const seenLower = new Map();
    for (const name of names) {
      const lower = name.toLowerCase();
      if (seenLower.has(lower) && seenLower.get(lower) !== name) {
        addIssue('warning', filePath, `Case-sensitivity conflict: "${name}" vs "${seenLower.get(lower)}" (same lowercase)`);
      }
      seenLower.set(lower, name);
    }
  }

  // 19. Duplicate fingerprints (collision detection)
  if (comp.zigbee && comp.zigbee.fingerprints) {
    const fpSet = new Set();
    for (const fp of comp.zigbee.fingerprints) {
      const key = `${fp.profileId || ''}:${fp.endpoint || ''}:${fp.clusterId || ''}`;
      if (fpSet.has(key)) {
        addIssue('warning', filePath, `Duplicate fingerprint entry: profileId=${fp.profileId} endpoint=${fp.endpoint} cluster=${fp.clusterId}`);
      }
      fpSet.add(key);
    }
  }
}

// Scan driver.compose.json files for JSON-specific issues
function huntJson(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'temp', 'tmp'].includes(entry.name)) continue;
      huntJson(fullPath);
    } else if (entry.isFile() && entry.name === 'driver.compose.json') {
      scanDriverCompose(fullPath);
    }
  }
}

// Cross-driver fingerprint collision scan
function scanCrossDriverCollisions() {
  const fpMap = new Map(); // key -> [{ driver, profileId, endpoint, clusterId }]
  if (!fs.existsSync(DRIVERS_DIR)) return;

  const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(DRIVERS_DIR, d.name, 'driver.compose.json'));

  for (const fp of driverDirs) {
    let comp;
    try {
      comp = JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch { continue; }

    if (!comp.zigbee || !comp.zigbee.fingerprints) continue;
    const driverDir = path.basename(path.dirname(fp));

    for (const f of comp.zigbee.fingerprints) {
      const key = `${f.profileId || ''}:${f.endpoint || ''}:${f.clusterId || ''}:${f.deviceId || ''}`;
      if (!fpMap.has(key)) fpMap.set(key, []);
      fpMap.get(key).push({ driver: driverDir, profileId: f.profileId, endpoint: f.endpoint, clusterId: f.clusterId, deviceId: f.deviceId });
    }
  }

  for (const [key, entries] of fpMap) {
    if (entries.length > 1) {
      const drivers = [...new Set(entries.map(e => e.driver))];
      if (drivers.length > 1) {
        addIssue('warning', 'cross-driver', `Fingerprint collision: ${key} shared by ${drivers.join(', ')}`);
      }
    }
  }
}

// Main
try {
  if (!JSON_OUTPUT) console.log('Bug Hunter scanning...\n');

  hunt(DRIVERS_DIR);
  hunt(LIB_DIR);
  hunt(SCRIPTS_DIR);
  huntJson(DRIVERS_DIR);
  scanCrossDriverCollisions();

  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const warningIssues = issues.filter(i => i.severity === 'warning');

  if (JSON_OUTPUT) {
    const output = {
      timestamp: new Date().toISOString(),
      filesScanned,
      totalIssues: issues.length,
      critical: criticalIssues.length,
      warnings: warningIssues.length,
      issues,
      exitCode: criticalIssues.length > 0 ? 1 : 0,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`\nScanned ${filesScanned} files.`);
    if (issues.length === 0) {
      console.log('[BUG-HUNTER] No bugs found.');
    } else {
      console.log(`[BUG-HUNTER] Found ${issues.length} issue(s): ${criticalIssues.length} critical, ${warningIssues.length} warnings.`);
    }
  }

  process.exit(criticalIssues.length > 0 ? 1 : 0);
} catch (e) {
  if (!JSON_OUTPUT) console.error(`[BUG-HUNTER] Fatal error: ${e.message}`);
  process.exit(2);
}
