#!/usr/bin/env node
/**
 * error-tracker.js - Error Tracker Cartography
 *
 * Scans the entire codebase for errors, warnings, and anti-patterns.
 * Categorizes by severity, tracks resolution status, and generates an
 * error report as HTML + text.
 *
 * Usage: node scripts/cartography/error-tracker.js [--output path] [--fix-candidates]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');

// ---------------------------------------------------------------------------
// Error / Anti-Pattern Rules
// ---------------------------------------------------------------------------

const RULES = [
  // Critical errors
  {
    id: 'BANNED_CONSOLE_LOG',
    severity: 'error',
    category: 'code-quality',
    pattern: /console\.(log|warn|error)\s*\(/g,
    message: 'Direct console.*() call (use this.log/this.error instead)',
    fixable: true,
    scope: ['drivers']
  },
  {
    id: 'BANNED_LINEAR_BATTERY',
    severity: 'error',
    category: 'anti-pattern',
    pattern: /\(.*voltage\s*-\s*\d+\.?\d*\)\s*\/\s*\d+\.?\d*/g,
    message: 'Linear battery formula detected (use UnifiedBatteryHandler)',
    fixable: false,
    scope: ['drivers', 'lib']
  },
  {
    id: 'MISSING_DESTROY_GUARD',
    severity: 'error',
    category: 'lifecycle',
    pattern: /setCapabilityValue\s*\(/g,
    contextPattern: /_destroyed|onDeleted|onUninit/,
    message: 'setCapabilityValue without _destroyed guard',
    needsContext: true,
    fixable: true,
    scope: ['drivers']
  },
  {
    id: 'BANNED_ZB_MODELID',
    severity: 'error',
    category: 'settings-key',
    pattern: /zb_modelId\b/g,
    message: 'Wrong settings key zb_modelId (use zb_model_id)',
    fixable: true,
    scope: ['drivers', 'lib']
  },
  {
    id: 'BANNED_ZB_MANUFACTURERNAME',
    severity: 'error',
    category: 'settings-key',
    pattern: /zb_manufacturerName\b/g,
    message: 'Wrong settings key zb_manufacturerName (use zb_manufacturer_name)',
    fixable: true,
    scope: ['drivers', 'lib']
  },

  // Warnings
  {
    id: 'MISSING_PHYSICAL_BUTTON_MIXIN',
    severity: 'warning',
    category: 'mixin',
    filePattern: /switch|plug|dimmer/i,
    pattern: /class\s+\w+\s+extends\s+HybridSwitchBase/,
    absencePattern: /PhysicalButtonMixin/,
    message: 'Switch/plug driver may be missing PhysicalButtonMixin',
    fixable: true,
    scope: ['drivers']
  },
  {
    id: 'MISSING_MARK_APP_COMMAND',
    severity: 'warning',
    category: 'bidirectional-sync',
    pattern: /registerCapabilityListener\s*\(/g,
    absencePattern: /markAppCommand/,
    message: 'Capability listener without markAppCommand()',
    fixable: true,
    scope: ['drivers']
  },
  {
    id: 'MISSING_BATTERY_MIXIN',
    severity: 'warning',
    category: 'mixin',
    filePattern: /sensor/i,
    pattern: /class\s+\w+\s+extends/,
    absencePattern: /BatteryMixin|UnifiedBatteryHandler/,
    message: 'Sensor driver may be missing BatteryMixin',
    fixable: true,
    scope: ['drivers']
  },
  {
    id: 'BACKLIGHT_STRING_VIOLATION',
    severity: 'warning',
    category: 'value-type',
    pattern: /backlightMode\s*===?\s*\d|backlightMode\s*===?\s*['"][\d]+['"]/g,
    message: 'Backlight compared as number (should use string comparison)',
    fixable: true,
    scope: ['drivers', 'lib']
  },
  {
    id: 'WRONG_IMPORT_PATH',
    severity: 'warning',
    category: 'import',
    pattern: /require\s*\(\s*['"]\.\.\/\.\.\/lib\/TuyaZigbeeDevice['"]\)/g,
    message: 'Wrong import path for TuyaZigbeeDevice',
    fixable: true,
    scope: ['drivers']
  },
  {
    id: 'TITLE_FORMATTED_BUG',
    severity: 'warning',
    category: 'flow-card',
    pattern: /\[\[device\]\]/g,
    message: 'titleFormatted contains [[device]] (causes bugs)',
    fixable: true,
    scope: ['drivers']
  },
  {
    id: 'UNSAFE_JSON_READ',
    severity: 'warning',
    category: 'memory',
    pattern: /readFileSync\s*\([^)]*,\s*['"]utf8['"]\)\s*\)/g,
    message: 'readFileSync with utf8 encoding (use Buffer-based loading for large files)',
    fixable: true,
    scope: ['lib']
  },
  {
    id: 'MISSING_ERROR_HANDLING',
    severity: 'warning',
    category: 'robustness',
    pattern: /require\s*\(\s*['"][^'"]+['"]\s*\)/g,
    absencePattern: /try|catch|safe.*[Rr]equire/,
    message: 'require() call without try/catch wrapper',
    fixable: false,
    scope: ['lib']
  },

  // Info / Suggestions
  {
    id: 'GENERIC_DRIVER_NAME',
    severity: 'info',
    category: 'naming',
    filePattern: /device\.js$/,
    pattern: /class\s+Device\s+extends/g,
    message: 'Generic class name "Device" (consider descriptive name)',
    fixable: false,
    scope: ['drivers']
  },
  {
    id: 'MISSING_JSDOC',
    severity: 'info',
    category: 'documentation',
    filePattern: /device\.js$/,
    pattern: /^class\s+\w+\s+extends/g,
    absencePattern: /\/\*\*|@param|@returns/,
    message: 'Class without JSDoc documentation',
    fixable: false,
    scope: ['drivers']
  },
  {
    id: 'HARDCODED_DP_ID',
    severity: 'info',
    category: 'maintainability',
    pattern: /dpId\s*[:=]\s*\d+/g,
    message: 'Hardcoded DP ID (consider using constant)',
    fixable: false,
    scope: ['drivers', 'lib']
  }
];

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

function scanFile(filePath, relativePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch { return []; }

  const lines = content.split('\n');
  const hits = [];

  for (const rule of RULES) {
    // Check scope
    if (rule.scope) {
      const inScope = rule.scope.some(s => relativePath.startsWith(s + '/') || relativePath.startsWith(s + '\\'));
      if (!inScope) continue;
    }

    // Check file pattern
    if (rule.filePattern && !rule.filePattern.test(filePath)) continue;

    // Find matches
    let match;
    rule.pattern.lastIndex = 0;
    while ((match = rule.pattern.exec(content)) !== null) {
      // Get line number
      const beforeMatch = content.substring(0, match.index);
      const lineNum = beforeMatch.split('\n').length;
      const lineText = lines[lineNum - 1] || '';

      // Check context pattern if needed
      if (rule.needsContext && rule.contextPattern) {
        // Check if there's a _destroyed guard nearby (within 20 lines)
        const start = Math.max(0, lineNum - 20);
        const end = Math.min(lines.length, lineNum + 5);
        const context = lines.slice(start, end).join('\n');
        if (rule.contextPattern.test(context)) continue; // Guard found, skip
      }

      // Check absence pattern (for rules that warn when pattern is missing)
      if (rule.absencePattern) {
        if (rule.absencePattern.test(content)) continue; // Pattern found, no issue
      }

      hits.push({
        rule: rule.id,
        severity: rule.severity,
        category: rule.category,
        message: rule.message,
        file: relativePath,
        line: lineNum,
        code: lineText.trim().substring(0, 120),
        fixable: rule.fixable
      });
    }

    // For absence rules: check if trigger pattern exists but absence pattern is missing
    if (rule.absencePattern && !rule.needsContext) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(content) && !rule.absencePattern.test(content)) {
        hits.push({
          rule: rule.id,
          severity: rule.severity,
          category: rule.category,
          message: rule.message,
          file: relativePath,
          line: 0,
          code: '(file-level absence)',
          fixable: rule.fixable
        });
      }
    }
  }

  return hits;
}

function scanDirectory(dir, scope) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and .git
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.homeycompose') continue;
      results.push(...scanDirectory(fullPath, scope));
    } else if (entry.name.endsWith('.js')) {
      const relativePath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
      const hits = scanFile(fullPath, relativePath);
      results.push(...hits);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Report Generator
// ---------------------------------------------------------------------------

function categorizeHits(hits) {
  const byRule = {};
  const bySeverity = { error: [], warning: [], info: [] };
  const byCategory = {};
  const byFile = {};

  for (const hit of hits) {
    bySeverity[hit.severity] = bySeverity[hit.severity] || [];
    bySeverity[hit.severity].push(hit);

    byRule[hit.rule] = byRule[hit.rule] || [];
    byRule[hit.rule].push(hit);

    byCategory[hit.category] = byCategory[hit.category] || [];
    byCategory[hit.category].push(hit);

    byFile[hit.file] = byFile[hit.file] || [];
    byFile[hit.file].push(hit);
  }

  return { byRule, bySeverity, byCategory, byFile };
}

function generateHTML(hits, categorized) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const topFiles = Object.entries(categorized.byFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20);

  const ruleSummaries = Object.entries(categorized.byRule)
    .map(([ruleId, ruleHits]) => ({
      id: ruleId,
      count: ruleHits.length,
      severity: ruleHits[0].severity,
      category: ruleHits[0].category,
      message: ruleHits[0].message,
      fixable: ruleHits[0].fixable
    }))
    .sort((a, b) => {
      const sev = { error: 0, warning: 1, info: 2 };
      return (sev[a.severity] - sev[b.severity]) || (b.count - a.count);
    });

  const categoryStats = Object.entries(categorized.byCategory)
    .map(([cat, catHits]) => ({
      category: cat,
      total: catHits.length,
      errors: catHits.filter(h => h.severity === 'error').length,
      warnings: catHits.filter(h => h.severity === 'warning').length,
      info: catHits.filter(h => h.severity === 'info').length
    }))
    .sort((a, b) => b.total - a.total);

  const maxCount = Math.max(...ruleSummaries.map(r => r.count), 1);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Universal Tuya Zigbee - Error Tracker</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
    background: #0a0e17; color: #c9d1d9; padding: 20px; line-height: 1.6;
  }
  h1 { color: #f85149; margin-bottom: 5px; }
  h2 { color: #79c0ff; margin: 24px 0 12px; border-bottom: 1px solid #21262d; padding-bottom: 6px; }
  .subtitle { color: #8b949e; margin-bottom: 20px; }
  .summary-bar { display: flex; gap: 20px; margin: 16px 0; flex-wrap: wrap; }
  .summary-item { padding: 10px 16px; border-radius: 8px; }
  .summary-item.error { background: rgba(248,81,73,0.15); border: 1px solid #da3633; }
  .summary-item.warning { background: rgba(210,153,34,0.15); border: 1px solid #9e6a03; }
  .summary-item.info { background: rgba(31,111,235,0.15); border: 1px solid #1f6feb; }
  .summary-item .num { font-size: 1.8em; font-weight: 700; }
  .summary-item.error .num { color: #f85149; }
  .summary-item.warning .num { color: #d29922; }
  .summary-item.info .num { color: #58a6ff; }
  .summary-item .label { font-size: 0.85em; color: #8b949e; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #21262d; font-size: 0.88em; }
  th { color: #79c0ff; }
  .bar { height: 14px; background: #21262d; border-radius: 3px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 3px; }
  .sev-badge { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 0.75em; font-weight: 600; color: #fff; }
  .sev-error { background: #da3633; }
  .sev-warning { background: #9e6a03; }
  .sev-info { background: #1f6feb; }
  .hit-list { max-height: 500px; overflow-y: auto; }
  .hit-item {
    padding: 6px 10px; margin: 3px 0; border-left: 3px solid #30363d;
    background: #161b22; border-radius: 0 4px 4px 0; font-size: 0.88em;
  }
  .hit-item.err { border-color: #da3633; }
  .hit-item.warn { border-color: #9e6a03; }
  .hit-item.inf { border-color: #1f6feb; }
  .hit-file { color: #58a6ff; font-family: monospace; }
  .hit-line { color: #8b949e; }
  .hit-code { color: #c9d1d9; background: #0d1117; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 0.85em; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
  .fixable-tag { display: inline-block; padding: 0 4px; border-radius: 4px; font-size: 0.7em; background: #238636; color: #fff; margin-left: 4px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 800px) { .grid-2 { grid-template-columns: 1fr; } }
  pre { background: #161b22; padding: 12px; border-radius: 6px; border: 1px solid #30363d; font-size: 0.85em; overflow-x: auto; }
</style>
</head>
<body>

<h1>Error Tracker</h1>
<p class="subtitle">Universal Tuya Zigbee - Codebase Anti-Pattern & Error Scan | ${timestamp}</p>

<div class="summary-bar">
  <div class="summary-item error">
    <div class="num">${categorized.bySeverity.error.length}</div>
    <div class="label">Errors</div>
  </div>
  <div class="summary-item warning">
    <div class="num">${categorized.bySeverity.warning.length}</div>
    <div class="label">Warnings</div>
  </div>
  <div class="summary-item info">
    <div class="num">${categorized.bySeverity.info.length}</div>
    <div class="label">Info</div>
  </div>
  <div class="summary-item" style="background:rgba(63,185,80,0.15);border:1px solid #238636">
    <div class="num" style="color:#3fb950">${hits.filter(h => h.fixable).length}</div>
    <div class="label">Auto-Fixable</div>
  </div>
</div>

<!-- Rule Breakdown -->
<h2>Rule Breakdown (${ruleSummaries.length} rules triggered)</h2>
<table>
  <thead><tr><th>Rule</th><th>Severity</th><th>Category</th><th>Count</th><th>Fixable</th></tr></thead>
  <tbody>
  ${ruleSummaries.map(r => `
    <tr>
      <td style="font-family:monospace;color:#58a6ff">${r.id}</td>
      <td><span class="sev-badge sev-${r.severity}">${r.severity}</span></td>
      <td>${r.category}</td>
      <td>${r.count}</td>
      <td>${r.fixable ? '<span class="fixable-tag">AUTO-FIX</span>' : '<span style="color:#8b949e">manual</span>'}</td>
    </tr>`).join('')}
  </tbody>
</table>

<!-- Category Stats -->
<h2>By Category</h2>
<div class="grid-2">
  ${categoryStats.map(c => `
  <div style="padding:10px;background:#161b22;border:1px solid #30363d;border-radius:6px">
    <div style="font-weight:600;color:#79c0ff">${c.category}</div>
    <div style="font-size:0.85em;margin:4px 0">
      <span class="sev-badge sev-error" style="margin-right:4px">${c.errors} E</span>
      <span class="sev-badge sev-warning" style="margin-right:4px">${c.warnings} W</span>
      <span class="sev-badge sev-info">${c.info} I</span>
      <span style="margin-left:8px;color:#8b949e">Total: ${c.total}</span>
    </div>
    <div class="bar"><div class="bar-fill" style="width:${(c.total / hits.length * 100)}%;background:${c.errors > 0 ? '#da3633' : c.warnings > 0 ? '#9e6a03' : '#1f6feb'}"></div></div>
  </div>`).join('')}
</div>

<!-- Top Offending Files -->
<h2>Top Files with Issues (${topFiles.length})</h2>
<table>
  <thead><tr><th>File</th><th>Issues</th><th>Errors</th><th>Warnings</th><th>Info</th></tr></thead>
  <tbody>
  ${topFiles.map(([file, fileHits]) => `
    <tr>
      <td style="font-family:monospace;color:#58a6ff">${file}</td>
      <td>${fileHits.length}</td>
      <td>${fileHits.filter(h => h.severity === 'error').length || '-'}</td>
      <td>${fileHits.filter(h => h.severity === 'warning').length || '-'}</td>
      <td>${fileHits.filter(h => h.severity === 'info').length || '-'}</td>
    </tr>`).join('')}
  </tbody>
</table>

<!-- All Hits -->
<h2>All Findings (${hits.length})</h2>
<div class="hit-list">
  ${hits.map(h => `
  <div class="hit-item ${h.severity === 'error' ? 'err' : h.severity === 'warning' ? 'warn' : 'inf'}">
    <span class="sev-badge sev-${h.severity}">${h.severity}</span>
    <span style="font-family:monospace;color:#58a6ff;margin-left:4px">${h.rule}</span>
    ${h.fixable ? '<span class="fixable-tag">AUTO-FIX</span>' : ''}
    <div style="margin-top:2px">
      <span class="hit-file">${h.file}</span>
      ${h.line > 0 ? `<span class="hit-line">:${h.line}</span>` : ''}
    </div>
    <div style="color:#8b949e;font-size:0.85em;margin-top:1px">${h.message}</div>
    ${h.code && h.code !== '(file-level absence)' ? `<div class="hit-code">${h.code.substring(0, 100)}</div>` : ''}
  </div>`).join('')}
</div>

<pre>
=== Error Tracker Summary ===
Errors: ${categorized.bySeverity.error.length}
Warnings: ${categorized.bySeverity.warning.length}
Info: ${categorized.bySeverity.info.length}
Auto-fixable: ${hits.filter(h => h.fixable).length}
Rules triggered: ${ruleSummaries.length}
Generated: ${timestamp}
</pre>

</body>
</html>`;
}

function generateTextReport(hits, categorized) {
  const lines = [];
  lines.push('=== Error Tracker Report ===');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Errors: ${categorized.bySeverity.error.length}`);
  lines.push(`Warnings: ${categorized.bySeverity.warning.length}`);
  lines.push(`Info: ${categorized.bySeverity.info.length}`);
  lines.push(`Auto-fixable: ${hits.filter(h => h.fixable).length}`);
  lines.push('');

  // By severity
  for (const sev of ['error', 'warning', 'info']) {
    const sevHits = categorized.bySeverity[sev];
    if (sevHits.length === 0) continue;
    lines.push(`--- ${sev.toUpperCase()} (${sevHits.length}) ---`);
    for (const h of sevHits.slice(0, 50)) {
      lines.push(`  [${h.rule}] ${h.file}:${h.line} - ${h.message}`);
    }
    if (sevHits.length > 50) lines.push(`  ... and ${sevHits.length - 50} more`);
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('[ERROR-TRACKER] Scanning codebase for errors and anti-patterns...');

  const args = process.argv.slice(2);
  let htmlOutput = path.join(ROOT, 'scripts', 'cartography', 'error-output.html');
  let textOutput = true;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) htmlOutput = args[++i];
    if (args[i] === '--fix-candidates') { /* already default */ }
  }

  // Scan directories
  const hits = [];
  console.log('[ERROR-TRACKER] Scanning drivers/...');
  hits.push(...scanDirectory(DRIVERS_DIR, 'drivers'));

  console.log('[ERROR-TRACKER] Scanning lib/...');
  hits.push(...scanDirectory(LIB_DIR, 'lib'));

  console.log(`[ERROR-TRACKER] Found ${hits.length} total findings`);

  const categorized = categorizeHits(hits);

  // Generate HTML
  console.log('[ERROR-TRACKER] Generating HTML report...');
  const html = generateHTML(hits, categorized);
  fs.writeFileSync(htmlOutput, html, 'utf8');
  console.log(`[ERROR-TRACKER] HTML: ${htmlOutput}`);

  // Generate text
  if (textOutput) {
    const text = generateTextReport(hits, categorized);
    const textPath = htmlOutput.replace(/\.html$/, '.txt');
    fs.writeFileSync(textPath, text, 'utf8');
    console.log(`[ERROR-TRACKER] Text: ${textPath}`);
  }

  // Summary
  console.log(`[ERROR-TRACKER] Summary:`);
  console.log(`  Errors: ${categorized.bySeverity.error.length}`);
  console.log(`  Warnings: ${categorized.bySeverity.warning.length}`);
  console.log(`  Info: ${categorized.bySeverity.info.length}`);
  console.log(`  Auto-fixable: ${hits.filter(h => h.fixable).length}`);
}

main();
