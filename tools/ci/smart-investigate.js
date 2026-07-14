#!/usr/bin/env node
/**
 * smart-investigate.js — P56 Smart Autonomous Investigator
 *
 * Uses the Knowledge Graph (build-knowledge-graph.js) to answer questions
 * and cross-reference ALL sources (docs, drivers, fingerprints, lessons,
 * workflows, issues) for autonomous investigations.
 *
 * Input: a free-form question OR a specific term to investigate
 * Output: a comprehensive cross-referenced report saved to
 *         .github/state/investigations/<slug>.md
 *
 * Smart features:
 *   - Auto-detect query type: driver? fingerprint? issue? workflow? lesson?
 *   - Cross-reference all related entities (Sacred Couple, P-Number, etc.)
 *   - Surface related fixes and lessons learned
 *   - Suggest next actions
 *
 * Usage:
 *   node tools/ci/smart-investigate.js "what fixes exist for tuya-local"
 *   node tools/ci/smart-investigate.js "_TZE200_aoclfnxz"
 *   node tools/ci/smart-investigate.js "issue 506"
 *   node tools/ci/smart-investigate.js "P55"
 *   node tools/ci/smart-investigate.js "button_wireless_4"
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(REPO, '.github', 'state');
const KG_FILE = path.join(STATE_DIR, 'knowledge-graph.json');
const INV_DIR = path.join(STATE_DIR, 'investigations');
const gitExe = 'C:\\Program Files\\Git\\cmd\\git.exe';
function git(args) {
  return execFileSync(gitExe, args, { cwd: REPO, encoding: 'utf8' }).toString();
}

const query = process.argv[2];
if (!query) {
  console.log('Usage: node tools/ci/smart-investigate.js "<query>"');
  console.log('');
  console.log('Examples:');
  console.log('  node tools/ci/smart-investigate.js "_TZE200_aoclfnxz"');
  console.log('  node tools/ci/smart-investigate.js "issue 506"');
  console.log('  node tools/ci/smart-investigate.js "P55"');
  console.log('  node tools/ci/smart-investigate.js "button_wireless_4"');
  console.log('  node tools/ci/smart-investigate.js "tuya-local"');
  process.exit(1);
}

// ── Knowledge Graph loader ─────────────────────────────────────────────
let kg = null;
if (fs.existsSync(KG_FILE)) {
  kg = JSON.parse(fs.readFileSync(KG_FILE, 'utf8'));
} else {
  console.log('Knowledge graph not found, building it first...');
  require('child_process').execFileSync('node', ['tools/ci/build-knowledge-graph.js', '--stats'], { cwd: REPO, stdio: 'inherit' });
  kg = JSON.parse(fs.readFileSync(KG_FILE, 'utf8'));
}

if (!kg || !kg.entities) {
  console.error('Failed to load knowledge graph');
  process.exit(1);
}

console.log(`KG loaded: ${kg.meta.totalEntities} entities, ${kg.meta.totalRelations} relations`);

// ── Query detection ────────────────────────────────────────────────────
function detectQueryType(q) {
  const types = [];
  // GH issue
  if (/^#?\d{2,4}$/.test(q.replace(/issue/i, '').trim())) types.push('issue');
  // Lesson (P-N)
  if (/^P\d+/.test(q.toUpperCase())) types.push('lesson');
  // Mfr
  if (/^_T[YZ]/.test(q)) types.push('mfr');
  // Driver (path)
  if (/^[a-z][a-z0-9_]+$/.test(q)) types.push('driver');
  // Workflow
  if (q.endsWith('.yml') || /^(mega-crawl|publish|auto-fix|gmail|forum|shadow|recurrent|driver)/.test(q)) types.push('workflow');
  return types.length ? types : ['general'];
}

// ── Investigation report builder ────────────────────────────────────────
function investigate(q) {
  const types = detectQueryType(q);
  const lc = q.toLowerCase();
  const report = {
    query: q,
    detectedTypes: types,
    timestamp: new Date().toISOString(),
    findings: {},
    crossRefs: [],
    suggestedActions: [],
  };

  // 1. Find all entities matching
  const matches = {
    drivers: [],
    mfrs: [],
    issues: [],
    lessons: [],
    files: [],
    workflows: [],
    capabilities: [],
  };
  for (const [k, v] of Object.entries(kg.entities.drivers || {})) {
    if (k.toLowerCase().includes(lc) || (v.mfrs || []).some(m => m.toLowerCase().includes(lc))) {
      matches.drivers.push({ key: k, value: v });
    }
  }
  for (const [k, v] of Object.entries(kg.entities.fingerprints || {})) {
    if (k.toLowerCase().includes(lc)) matches.mfrs.push({ key: k, value: v });
  }
  for (const [k, v] of Object.entries(kg.entities.issues || {})) {
    if (k === q.replace('#', '') || (v.title || '').toLowerCase().includes(lc)) matches.issues.push({ key: k, value: v });
  }
  for (const [k, v] of Object.entries(kg.entities.lessons || {})) {
    if (k.toUpperCase() === q.toUpperCase() || k.toLowerCase().includes(lc)) matches.lessons.push({ key: k, value: v });
  }
  for (const [k, v] of Object.entries(kg.entities.files || {})) {
    if (k.toLowerCase().includes(lc)) matches.files.push({ key: k, value: v });
  }
  for (const [k, v] of Object.entries(kg.entities.workflows || {})) {
    if (k.toLowerCase().includes(lc)) matches.workflows.push({ key: k, value: v });
  }
  for (const [k, v] of Object.entries(kg.entities.capabilities || {})) {
    if (k.toLowerCase().includes(lc)) matches.capabilities.push({ key: k, value: v });
  }
  report.findings.matches = matches;

  // 2. Find all relations involving the matched entities
  const matchedKeys = new Set();
  for (const arr of Object.values(matches)) for (const m of arr) matchedKeys.add(m.key);
  for (const r of kg.relations || []) {
    const s = (r.from + ' ' + r.type + ' ' + r.to).toLowerCase();
    for (const k of matchedKeys) {
      if (s.includes(k.toLowerCase())) {
        report.crossRefs.push(r);
        break;
      }
    }
  }

  // 3. Suggest actions based on query type
  if (types.includes('mfr')) {
    const mfr = matches.mfrs[0];
    if (mfr) {
      report.suggestedActions.push(`Add ${q} to appropriate driver.compose.json (Sacred Couple: mfr+pid)`);
      report.suggestedActions.push(`Run: node tools/ci/apply-mfr-pid-cross-ref.js to auto-detect matching driver`);
      if (mfr.value.productId) {
        report.suggestedActions.push(`Pair with pid=${mfr.value.productId} (already in mfs_db)`);
      } else {
        report.suggestedActions.push(`Search for matching pid: node tools/ci/extract-new-mfrs-from-johan.js`);
      }
    }
  } else if (types.includes('issue')) {
    const issue = matches.issues[0];
    if (issue) {
      report.suggestedActions.push(`Investigate issue #${issue.key}: gh issue view ${issue.key}`);
      report.suggestedActions.push(`Cross-ref with P-N lessons: grep -r "P[0-9]" docs/ | grep "${issue.key}"`);
      report.suggestedActions.push(`Check related drivers: ${(matches.drivers || []).map(d => d.key).join(', ') || 'none'}`);
    }
  } else if (types.includes('lesson')) {
    const lesson = matches.lessons[0];
    if (lesson) {
      report.suggestedActions.push(`Read lesson ${lesson.key} context in MEMORY.md`);
      report.suggestedActions.push(`Cross-ref with related issues: ${(matches.issues || []).map(i => '#' + i.key).join(', ') || 'none'}`);
      report.suggestedActions.push(`Apply lesson to current task if relevant`);
    }
  } else if (types.includes('driver')) {
    const drv = matches.drivers[0];
    if (drv) {
      report.suggestedActions.push(`Investigate driver ${drv.key} (${(drv.value.mfrs || []).length} mfrs, ${(drv.value.capabilities || []).length} caps)`);
      report.suggestedActions.push(`Check conflicts: node tools/ci/categorize-collisions.js --driver=${drv.key}`);
      report.suggestedActions.push(`Find related Sacred Couples: node tools/ci/blakadder-cross-ref.js`);
    }
  } else if (types.includes('workflow')) {
    const wf = matches.workflows[0];
    if (wf) {
      report.suggestedActions.push(`Check workflow ${wf.key} (cron: ${wf.value.cron || 'manual'})`);
      report.suggestedActions.push(`View last runs: gh run list --workflow=${wf.key}.yml --limit 5`);
    }
  } else {
    // General query
    report.suggestedActions.push(`Run: node tools/ci/build-knowledge-graph.js --summary for full report`);
    report.suggestedActions.push(`Search docs: grep -r "${q}" docs/ AI_INSTRUCTIONS.md AGENTS.md`);
    report.suggestedActions.push(`Search drivers: grep -r "${q}" drivers/ | head -20`);
  }

  return report;
}

// ── Markdown report renderer ───────────────────────────────────────────
function renderMarkdown(report) {
  const q = report.query;
  const slug = q.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60) || 'query';
  let md = `# Smart Investigation: ${q}\n\n`;
  md += `**Generated**: ${report.timestamp}\n`;
  md += `**Detected types**: ${report.detectedTypes.join(', ')}\n`;
  md += `**KG**: ${kg.meta.totalEntities} entities, ${kg.meta.totalRelations} relations\n\n`;

  md += `## Findings\n\n`;
  const f = report.findings.matches;
  for (const [t, arr] of Object.entries(f)) {
    md += `### ${t} (${arr.length})\n\n`;
    for (const m of arr.slice(0, 15)) {
      md += `- **${m.key}**`;
      if (m.value.mfrs && m.value.mfrs.length) md += ` (mfrs: ${m.value.mfrs.length})`;
      if (m.value.capabilities && m.value.capabilities.length) md += ` (caps: ${m.value.capabilities.length})`;
      if (m.value.cron) md += ` (cron: ${m.value.cron})`;
      if (m.value.references && m.value.references.length) md += ` (refs: ${m.value.references.length})`;
      md += `\n`;
    }
    if (arr.length > 15) md += `- ... and ${arr.length - 15} more\n`;
    md += `\n`;
  }

  md += `## Cross-references (${report.crossRefs.length} relations)\n\n`;
  for (const r of report.crossRefs.slice(0, 50)) {
    md += `- ${r.from} --[${r.type}]--> ${r.to}`;
    if (r.context) md += ` *(in: ${r.context.replace(REPO, '').substring(0, 80)})*`;
    md += `\n`;
  }
  if (report.crossRefs.length > 50) md += `\n... and ${report.crossRefs.length - 50} more\n`;

  md += `\n## Suggested actions\n\n`;
  for (const a of report.suggestedActions) {
    md += `1. ${a}\n`;
  }

  md += `\n---\n\n_Generated by tools/ci/smart-investigate.js from Knowledge Graph_\n`;
  return { md, slug };
}

// ── Main ───────────────────────────────────────────────────────────────
const report = investigate(query);
const { md, slug } = renderMarkdown(report);

if (!fs.existsSync(INV_DIR)) fs.mkdirSync(INV_DIR, { recursive: true });
const outFile = path.join(INV_DIR, `${slug}.md`);
fs.writeFileSync(outFile, md);

console.log(`\n${md}\n`);
console.log(`\nReport saved: ${outFile}`);
