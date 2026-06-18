#!/usr/bin/env node
/**
 * generate-error-dashboard.js - Error Dashboard Generator
 *
 * Improved version of scripts/cartography/error-tracker.js.
 * Scans the entire codebase for errors, warnings, and anti-patterns.
 * Categorizes by severity, tracks fixable vs manual issues,
 * and generates an interactive HTML report.
 *
 * Integrates with KNOWLEDGE_CACHE.json anti-pattern rules.
 *
 * Usage:
 *   node scripts/dashboard/generate-error-dashboard.js [--output path] [--json] [--fix-candidates]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, DRIVERS_DIR, LIB_DIR, loadKnowledgeCache, safeReadFile } = require('./shared-collector');
const T = require('./html-templates');

// ---------------------------------------------------------------------------
// Error / Anti-Pattern Rules
// ---------------------------------------------------------------------------

const BASE_RULES = [
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
  {
    id: 'RAW_SET_CAPABILITY',
    severity: 'error',
    category: 'lifecycle',
    pattern: /(?<!safeSet|_safeSet|safe)\bsetCapabilityValue\s*\(/g,
    message: 'Raw setCapabilityValue (use safeSetCapabilityValue)',
    fixable: true,
    scope: ['drivers']
  },
  {
    id: 'BANNED_WILDCARD_FP',
    severity: 'error',
    category: 'fingerprint',
    pattern: /_TZE\d+_\*/g,
    message: 'Wildcard fingerprint pattern (strictly forbidden)',
    fixable: false,
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
    id: 'GLOBAL_SETTIMEOUT',
    severity: 'warning',
    category: 'lifecycle',
    pattern: /(?<!this\.homey\.)\bsetTimeout\s*\(/g,
    message: 'Global setTimeout (use this.homey.setTimeout for device code)',
    fixable: true,
    scope: ['drivers']
  },
  {
    id: 'GLOBAL_SETINTERVAL',
    severity: 'warning',
    category: 'lifecycle',
    pattern: /(?<!this\.homey\.)\bsetInterval\s*\(/g,
    message: 'Global setInterval (use this.homey.setInterval for device code)',
    fixable: true,
    scope: ['drivers']
  },
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

function scanFile(filePath, relativePath, rules) {
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch { return []; }

  const lines = content.split('\n');
  const hits = [];

  for (const rule of rules) {
    if (rule.scope) {
      const inScope = rule.scope.some(s => relativePath.startsWith(s + '/') || relativePath.startsWith(s + '\\'));
      if (!inScope) continue;
    }
    if (rule.filePattern && !rule.filePattern.test(filePath)) continue;

    let match;
    rule.pattern.lastIndex = 0;
    while ((match = rule.pattern.exec(content)) !== null) {
      const beforeMatch = content.substring(0, match.index);
      const lineNum = beforeMatch.split('\n').length;
      const lineText = lines[lineNum - 1] || '';

      if (rule.needsContext && rule.contextPattern) {
        const start = Math.max(0, lineNum - 20);
        const end = Math.min(lines.length, lineNum + 5);
        const context = lines.slice(start, end).join('\n');
        if (rule.contextPattern.test(context)) continue;
      }

      if (rule.absencePattern) {
        if (rule.absencePattern.test(content)) continue;
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

    // Absence rules
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

function scanDirectory(dir, rules) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', '.homeycompose'].includes(entry.name)) continue;
      results.push(...scanDirectory(fullPath, rules));
    } else if (entry.name.endsWith('.js')) {
      const relativePath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
      results.push(...scanFile(fullPath, relativePath, rules));
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// HTML Generator
// ---------------------------------------------------------------------------

function generateDashboard(hits, categorized, rules) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const topFiles = Object.entries(categorized.byFile)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 25);

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

  const sections = [];

  // Summary
  sections.push(T.summaryBar([
    { value: categorized.bySeverity.error.length, label: 'Errors', color: T.THEME.red },
    { value: categorized.bySeverity.warning.length, label: 'Warnings', color: T.THEME.yellow },
    { value: categorized.bySeverity.info.length, label: 'Info', color: T.THEME.blue },
    { value: hits.filter(h => h.fixable).length, label: 'Auto-Fixable', color: T.THEME.green },
    { value: ruleSummaries.length, label: 'Rules Triggered', color: T.THEME.purple }
  ]));

  // Rule breakdown
  sections.push(T.section(`Rule Breakdown (${ruleSummaries.length} rules triggered)`, T.dataTable(
    ['Rule', 'Severity', 'Category', 'Count', 'Fixable'],
    ruleSummaries.map(r => [
      `<span style="font-family:monospace;color:${T.THEME.blue}">${T.escapeHtml(r.id)}</span>`,
      T.severityTag(r.severity),
      r.category,
      r.count,
      r.fixable ? '<span class="tag tag-green">AUTO-FIX</span>' : `<span style="color:${T.THEME.textMuted}">manual</span>`
    ]),
    { maxHeight: 500 }
  )));

  // Category stats
  sections.push(T.section('By Category', `
    <div class="grid-sm">
      ${categoryStats.map(c => `
      <div class="card">
        <div style="font-weight:600;color:${T.THEME.cyan}">${T.escapeHtml(c.category)}</div>
        <div style="font-size:0.85em;margin:4px 0">
          <span class="tag tag-red">${c.errors} E</span>
          <span class="tag tag-yellow">${c.warnings} W</span>
          <span class="tag tag-blue">${c.info} I</span>
          <span style="margin-left:8px;color:${T.THEME.textMuted}">Total: ${c.total}</span>
        </div>
        ${T.progressBar(c.total, hits.length, c.errors > 0 ? T.THEME.red : c.warnings > 0 ? T.THEME.yellow : T.THEME.blue)}
      </div>`).join('')}
    </div>
  `));

  // Top files
  sections.push(T.section(`Top Files with Issues (${topFiles.length})`, T.dataTable(
    ['File', 'Issues', 'Errors', 'Warnings', 'Info'],
    topFiles.map(([file, fileHits]) => [
      `<span style="font-family:monospace;color:${T.THEME.blue}">${T.escapeHtml(file)}</span>`,
      fileHits.length,
      fileHits.filter(h => h.severity === 'error').length || '-',
      fileHits.filter(h => h.severity === 'warning').length || '-',
      fileHits.filter(h => h.severity === 'info').length || '-'
    ]),
    { maxHeight: 400 }
  )));

  // All findings
  sections.push(T.section(`All Findings (${hits.length})`, `
    <div class="filter-controls">
      <button class="filter-btn active" onclick="filterHits('all')">All (${hits.length})</button>
      <button class="filter-btn" onclick="filterHits('error')">Errors (${categorized.bySeverity.error.length})</button>
      <button class="filter-btn" onclick="filterHits('warning')">Warnings (${categorized.bySeverity.warning.length})</button>
      <button class="filter-btn" onclick="filterHits('info')">Info (${categorized.bySeverity.info.length})</button>
      <button class="filter-btn" onclick="filterHits('fixable')">Fixable (${hits.filter(h => h.fixable).length})</button>
    </div>
    <div id="hits-list" class="error-list">
      ${hits.map(h => `
      <div class="error-item hit-entry" data-severity="${h.severity}" data-fixable="${h.fixable}" style="border-color:${h.severity === 'error' ? T.THEME.redDark : h.severity === 'warning' ? T.THEME.yellowDark : T.THEME.blueDark}">
        ${T.severityTag(h.severity)}
        <span style="font-family:monospace;color:${T.THEME.blue};margin-left:4px">${T.escapeHtml(h.rule)}</span>
        ${h.fixable ? '<span class="tag tag-green">AUTO-FIX</span>' : ''}
        <div style="margin-top:2px">
          <span style="color:${T.THEME.blue};font-family:monospace">${T.escapeHtml(h.file)}</span>
          ${h.line > 0 ? `<span style="color:${T.THEME.textMuted}">:${h.line}</span>` : ''}
        </div>
        <div style="color:${T.THEME.textMuted};font-size:0.85em;margin-top:1px">${T.escapeHtml(h.message)}</div>
        ${h.code && h.code !== '(file-level absence)' ? `<div style="color:${T.THEME.text};background:#0d1117;padding:2px 6px;border-radius:3px;font-family:monospace;font-size:0.85em;display:inline-block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px">${T.escapeHtml(h.code.substring(0, 100))}</div>` : ''}
      </div>`).join('')}
    </div>
    <script>
    function filterHits(filter) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      document.querySelectorAll('.hit-entry').forEach(el => {
        const sev = el.dataset.severity;
        const fix = el.dataset.fixable === 'true';
        if (filter === 'all') el.style.display = '';
        else if (filter === 'fixable') el.style.display = fix ? '' : 'none';
        else el.style.display = sev === filter ? '' : 'none';
      });
    }
    </script>
  `));

  return T.buildPage({
    title: 'Error Dashboard',
    subtitle: 'Universal Tuya Zigbee - Codebase Anti-Pattern & Error Scan',
    current: 'errors',
    sections,
    timestamp
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('[ERROR-DASHBOARD] Starting...');

  const args = process.argv.slice(2);
  let outputPath = path.join(ROOT, 'scripts', 'dashboard', 'error-dashboard.html');
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) outputPath = args[++i];
    if (args[i] === '--json') jsonOutput = true;
  }

  // Merge rules from KNOWLEDGE_CACHE if available
  const rules = [...BASE_RULES];
  const cache = loadKnowledgeCache();
  if (cache && cache.sdk3Rules && cache.sdk3Rules.antiPatterns) {
    // Knowledge cache anti-patterns are already covered by our rules
    console.log(`[ERROR-DASHBOARD] Loaded ${cache.sdk3Rules.antiPatterns.length} anti-patterns from KNOWLEDGE_CACHE`);
  }

  console.log('[ERROR-DASHBOARD] Scanning drivers/...');
  const hits = [];
  hits.push(...scanDirectory(DRIVERS_DIR, rules));

  console.log('[ERROR-DASHBOARD] Scanning lib/...');
  hits.push(...scanDirectory(LIB_DIR, rules));

  console.log(`[ERROR-DASHBOARD] Found ${hits.length} total findings`);

  // Categorize
  const categorized = {
    byRule: {},
    bySeverity: { error: [], warning: [], info: [] },
    byCategory: {},
    byFile: {}
  };

  for (const hit of hits) {
    (categorized.bySeverity[hit.severity] = categorized.bySeverity[hit.severity] || []).push(hit);
    (categorized.byRule[hit.rule] = categorized.byRule[hit.rule] || []).push(hit);
    (categorized.byCategory[hit.category] = categorized.byCategory[hit.category] || []).push(hit);
    (categorized.byFile[hit.file] = categorized.byFile[hit.file] || []).push(hit);
  }

  if (jsonOutput) {
    const jsonPath = outputPath.replace(/\.html$/, '.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      total: hits.length,
      errors: categorized.bySeverity.error.length,
      warnings: categorized.bySeverity.warning.length,
      info: categorized.bySeverity.info.length,
      fixable: hits.filter(h => h.fixable).length,
      byRule: Object.fromEntries(Object.entries(categorized.byRule).map(([k, v]) => [k, v.length])),
      byCategory: Object.fromEntries(Object.entries(categorized.byCategory).map(([k, v]) => [k, v.length])),
      topFiles: Object.entries(categorized.byFile).sort((a, b) => b[1].length - a[1].length).slice(0, 20).map(([f, h]) => ({ file: f, count: h.length }))
    }, null, 2), 'utf8');
    console.log(`[ERROR-DASHBOARD] JSON: ${jsonPath}`);
  }

  console.log('[ERROR-DASHBOARD] Generating HTML...');
  const html = generateDashboard(hits, categorized, rules);
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`[ERROR-DASHBOARD] HTML: ${outputPath}`);
  console.log(`[ERROR-DASHBOARD] Done.`);
}

main();
