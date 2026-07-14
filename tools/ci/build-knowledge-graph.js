#!/usr/bin/env node
/**
 * build-knowledge-graph.js — P56 Knowledge Graph Builder
 *
 * Cross-references ALL documentation, code, drivers, fingerprints, issues,
 * and lessons in the project to build a queryable knowledge graph.
 *
 * Source files (15 categories):
 *   - All docs/**\/*.md (236 files)
 *   - All *.md at root (18 files: AGENTS.md, AI_INSTRUCTIONS.md, etc.)
 *   - All drivers/<driver>/driver.compose.json (431 drivers, mfrs+pids)
 *   - lib/tuya/fingerprints.json (4K mfrs)
 *   - data/mfs_db.json (Sacred Couples)
 *   - AGENTS.md lessons (P18, P19, P22, P23, P38.6, P51, P55, ...)
 *   - .github/state/*.json (crawled data)
 *
 * Entities extracted:
 *   - drivers: by name, with mfrs/pids/capabilities
 *   - fingerprints: by mfr
 *   - issues: by GH issue number
 *   - lessons: by P# (P18, P19, ...)
 *   - workflows: by name
 *   - sources: by name
 *   - commands: by name
 *
 * Relations:
 *   - driver->mfr, driver->capability
 *   - mfr->pid (Sacred Couple)
 *   - issue->driver, issue->mfr, issue->fix
 *   - fix->file, fix->commit
 *   - lesson->workflow, lesson->source
 *   - workflow->script, workflow->cron
 *   - source->script, source->cache
 *
 * Output: .github/state/knowledge-graph.json (queryable)
 *         .github/state/knowledge-graph-summary.md (human-readable)
 *
 * Usage:
 *   node tools/ci/build-knowledge-graph.js
 *   node tools/ci/build-knowledge-graph.js --query=<term>
 *   node tools/ci/build-knowledge-graph.js --summary
 *   node tools/ci/build-knowledge-graph.js --stats
 */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(REPO, '.github', 'state');
const OUTPUT_FILE = path.join(STATE_DIR, 'knowledge-graph.json');
const SUMMARY_FILE = path.join(STATE_DIR, 'knowledge-graph-summary.md');
const args = process.argv.slice(2);
const QUERY = (() => { const a = args.find(x => x.startsWith('--query=')); return a ? a.split('=')[1] : null; })();
const SHOW_SUMMARY = args.includes('--summary');
const SHOW_STATS = args.includes('--stats');

// ── Patterns for entity extraction ─────────────────────────────────────
const PATTERNS = {
  // Manufacturer IDs: _TZxxxx_yyyy or _TYZBxx_yyyy
  MFR: /\b_T[YZ](?:E2\d{2}|ZB\d{2}|Z\d{4})[_-][A-Za-z0-9]+/g,
  // Product IDs: TSxxxx or specific patterns
  PID: /\bTS\d{4}[A-Za-z0-9_]*\b/g,
  // GH issue numbers: #123 or issue 123
  ISSUE: /#(\d{3,})\b|\bissue[ \t]+#?(\d{3,})/gi,
  // Lesson numbers: P18, P19.1, P55.3
  LESSON: /\bP(\d{1,3})(?:\.(\d{1,2}))?\b/g,
  // File paths: .js, .yml, .json
  FILE: /(?:\.github\/workflows\/|\bscripts\/|\blib\/|\btools\/|\bdrivers\/)[A-Za-z0-9_\-./]+\.(?:js|yml|json)\b/g,
  // Driver names: lowercase_snake_case (avoid matching code, focus on file paths)
  DRIVER: /drivers\/([a-z][a-z0-9_]+)\//g,
  // Capability IDs: onoff, dim, measure_temperature (Homey standard)
  CAPABILITY: /\b(measure_[a-z]+|alarm_[a-z_]+|onoff|dim|dim_[a-z]+|target_[a-z]+|button_[a-z_0-9]+)\b/g,
  // Workflow names
  WORKFLOW: /[\w-]+\.yml/g,
};

// ── Knowledge Graph class ─────────────────────────────────────────────
class KnowledgeGraph {
  constructor() {
    this.entities = {
      drivers: new Map(),       // name -> { mfrs, pids, capabilities, file }
      fingerprints: new Map(),  // mfr -> { sources, pids, drivers }
      issues: new Map(),        // num -> { title, drivers, mfrs, status }
      lessons: new Map(),       // pNum -> { title, lessons, references }
      files: new Map(),         // path -> { type, references }
      workflows: new Map(),     // name -> { schedule, script, cron }
      sources: new Map(),       // name -> { tier, script, workflow }
      capabilities: new Map(),  // name -> { drivers[] }
    };
    this.relations = [];        // { from, type, to, context }
    this.docs = [];             // { path, size, mtime, entities_extracted }
    this.stats = {
      totalEntities: 0,
      totalRelations: 0,
      totalDocsScanned: 0,
      totalBytesScanned: 0,
      byType: {},
      scanDurationMs: 0,
      generatedAt: null,
    };
  }

  // Add an entity
  addEntity(type, key, props) {
    if (!this.entities[type]) return;
    if (!this.entities[type].has(key)) {
      this.entities[type].set(key, { ...props, references: [] });
    } else {
      Object.assign(this.entities[type].get(key), props);
    }
    this.stats.totalEntities = Object.values(this.entities).reduce((s, m) => s + m.size, 0);
  }

  // Add a relation
  addRelation(from, type, to, context) {
    this.relations.push({ from, type, to, context: (context || '').substring(0, 200) });
    this.stats.totalRelations = this.relations.length;
  }

  // Extract entities from a text
  extractFromText(text, sourcePath) {
    const found = { mfrs: new Set(), pids: new Set(), issues: new Set(), lessons: new Set(), files: new Set(), drivers: new Set(), capabilities: new Set(), workflows: new Set() };
    let match;
    if ((match = text.match(PATTERNS.MFR)) !== null) match.forEach(m => found.mfrs.add(m.toUpperCase()));
    if ((match = text.match(PATTERNS.PID)) !== null) match.forEach(p => found.pids.add(p));
    if ((match = text.match(PATTERNS.ISSUE)) !== null) match.forEach(m => { const num = m.replace(/[^\d]/g, ''); if (num) found.issues.add(num); });
    if ((match = text.match(PATTERNS.LESSON)) !== null) match.forEach(m => { const lp = m.startsWith('P') ? m : 'P' + m; found.lessons.add(lp); });
    if ((match = text.match(PATTERNS.FILE)) !== null) match.forEach(f => found.files.add(f));
    if ((match = text.match(PATTERNS.DRIVER)) !== null) match.forEach(d => found.drivers.add(d));
    if ((match = text.match(PATTERNS.CAPABILITY)) !== null) match.forEach(c => found.capabilities.add(c));
    if ((match = text.match(PATTERNS.WORKFLOW)) !== null) match.forEach(w => found.workflows.add(w));

    // Register all entities
    found.mfrs.forEach(m => this.addEntity('fingerprints', m, { sources: [sourcePath] }));
    found.pids.forEach(p => found.mfrs.forEach(m => this.addRelation(`mfr:${m}`, 'paired-with', `pid:${p}`, sourcePath)));
    found.issues.forEach(i => this.addEntity('issues', i, { title: '', references: [sourcePath] }));
    found.lessons.forEach(l => this.addEntity('lessons', l, { title: '', references: [sourcePath] }));
    found.files.forEach(f => this.addEntity('files', f, { type: 'unknown', references: [sourcePath] }));
    found.drivers.forEach(d => this.addEntity('drivers', d, { file: `drivers/${d}/`, references: [sourcePath] }));
    found.capabilities.forEach(c => this.addEntity('capabilities', c, { drivers: [] }));
    found.workflows.forEach(w => this.addEntity('workflows', w.replace('.yml', ''), { references: [sourcePath] }));

    return found;
  }

  // Query the knowledge graph
  query(term) {
    const lc = term.toLowerCase();
    const results = { drivers: [], mfrs: [], pids: [], issues: [], lessons: [], files: [], workflows: [], capabilities: [], relations: [] };
    for (const [key, value] of this.entities.drivers) if (key.includes(lc) || (value.mfrs || []).some(m => m.toLowerCase().includes(lc))) results.drivers.push({ key, value });
    for (const [key, value] of this.entities.fingerprints) if (key.toLowerCase().includes(lc)) results.mfrs.push({ key, value });
    for (const [key, value] of this.entities.lessons) if (key.toLowerCase().includes(lc)) results.lessons.push({ key, value });
    for (const [key, value] of this.entities.issues) if (key === term || (value.title || '').toLowerCase().includes(lc)) results.issues.push({ key, value });
    for (const [key, value] of this.entities.files) if (key.toLowerCase().includes(lc)) results.files.push({ key, value });
    for (const [key, value] of this.entities.workflows) if (key.includes(lc)) results.workflows.push({ key, value });
    for (const [key, value] of this.entities.capabilities) if (key.includes(lc)) results.capabilities.push({ key, value });
    for (const r of this.relations) {
      const s = (r.from + ' ' + r.type + ' ' + r.to).toLowerCase();
      if (s.includes(lc)) results.relations.push(r);
    }
    return results;
  }

  // Convert to plain JSON object
  toJSON() {
    const ents = {};
    for (const [type, map] of Object.entries(this.entities)) {
      ents[type] = Object.fromEntries(map);
    }
    return {
      meta: {
        generatedAt: new Date().toISOString(),
        ...this.stats,
        byType: Object.fromEntries(Object.entries(this.entities).map(([k, m]) => [k, m.size])),
      },
      entities: ents,
      relations: this.relations,
      docs: this.docs,
    };
  }
}

// ── Builders ───────────────────────────────────────────────────────────

// Recursively walk a directory and process files matching patterns
function walkDir(dir, filter, callback) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.cache' || entry.name.startsWith('.')) continue;
      walkDir(full, filter, callback);
    } else if (!filter || filter(entry.name)) {
      callback(full);
    }
  }
}

// Build the knowledge graph from all sources
function buildGraph(kg) {
  const t0 = Date.now();

  // 1. All docs/**/*.md
  walkDir(path.join(REPO, 'docs'), (n) => n.endsWith('.md'), (f) => {
    const stat = fs.statSync(f);
    const text = fs.readFileSync(f, 'utf8');
    kg.extractFromText(text, f);
    kg.docs.push({ path: f.replace(REPO + path.sep, ''), size: stat.size, mtime: stat.mtime.toISOString() });
    kg.stats.totalDocsScanned++;
    kg.stats.totalBytesScanned += stat.size;
  });

  // 2. All root *.md
  for (const f of fs.readdirSync(REPO).filter(n => n.endsWith('.md'))) {
    const full = path.join(REPO, f);
    if (fs.statSync(full).isFile()) {
      const text = fs.readFileSync(full, 'utf8');
      kg.extractFromText(text, full);
      kg.docs.push({ path: f, size: fs.statSync(full).size, mtime: fs.statSync(full).mtime.toISOString() });
      kg.stats.totalDocsScanned++;
      kg.stats.totalBytesScanned += fs.statSync(full).size;
    }
  }

  // 3. All driver.compose.json — extract manufacturerName + productId
  walkDir(path.join(REPO, 'drivers'), (n) => n === 'driver.compose.json', (f) => {
    try {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      const driverName = path.basename(path.dirname(f));
      const mfrs = data.zigbee?.manufacturerName || [];
      const pids = data.zigbee?.productId || [];
      const caps = Object.keys(data.capabilities || {});
      kg.addEntity('drivers', driverName, { mfrs, pids, capabilities: caps, file: f.replace(REPO + path.sep, '') });
      mfrs.forEach(m => kg.addRelation(`driver:${driverName}`, 'has-mfr', `mfr:${m.toUpperCase()}`));
      pids.forEach(p => kg.addRelation(`driver:${driverName}`, 'has-pid', `pid:${p}`));
      caps.forEach(c => {
        if (!kg.entities.capabilities.has(c)) kg.addEntity('capabilities', c, { drivers: [] });
        const cap = kg.entities.capabilities.get(c);
        if (!cap.drivers.includes(driverName)) cap.drivers.push(driverName);
      });
      kg.docs.push({ path: f.replace(REPO + path.sep, ''), size: fs.statSync(f).size, mtime: fs.statSync(f).mtime.toISOString() });
      kg.stats.totalDocsScanned++;
      kg.stats.totalBytesScanned += fs.statSync(f).size;
    } catch (e) { /* skip */ }
  });

  // 4. lib/tuya/fingerprints.json
  const fpFile = path.join(REPO, 'lib', 'tuya', 'fingerprints.json');
  if (fs.existsSync(fpFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(fpFile));
      const fps = data.fingerprints || data;
      for (const [mfr, info] of Object.entries(fps)) {
        if (typeof info === 'object') {
          kg.addEntity('fingerprints', mfr.toUpperCase(), { productId: info.productId || info.model, source: 'lib/tuya/fingerprints.json' });
        }
      }
    } catch (e) { /* skip */ }
  }

  // 5. data/mfs_db.json (Sacred Couples)
  const mfsFile = path.join(REPO, 'data', 'mfs_db.json');
  if (fs.existsSync(mfsFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(mfsFile));
      // mfs_db has different shapes — try to find Sacred Couples
      const mfrs = data.manufacturers || data.mfrs || data;
      if (typeof mfrs === 'object') {
        for (const [mfr, info] of Object.entries(mfrs).slice(0, 1000)) { // cap at 1K to avoid OOM
          if (typeof info === 'object' && info.pid) {
            kg.addEntity('fingerprints', mfr.toUpperCase(), { productId: info.pid, source: 'data/mfs_db.json', drivers: info.drivers || [] });
            kg.addRelation(`mfr:${mfr.toUpperCase()}`, 'sacred-couple', `pid:${info.pid}`, 'data/mfs_db.json');
          }
        }
      }
    } catch (e) { /* skip */ }
  }

  // 6. .github/workflows/*.yml — extract cron + script refs
  walkDir(path.join(REPO, '.github', 'workflows'), (n) => n.endsWith('.yml'), (f) => {
    try {
      const text = fs.readFileSync(f, 'utf8');
      const name = path.basename(f).replace('.yml', '');
      const cronMatch = text.match(/cron:\s*['"]([^'"]+)['"]/);
      const scriptMatches = [...text.matchAll(/run:\s*\|\s*\n((?:\s+\S+.*\n)+)/g)];
      kg.addEntity('workflows', name, { cron: cronMatch ? cronMatch[1] : null, file: f.replace(REPO + path.sep, '') });
      if (cronMatch) {
        kg.addRelation(`workflow:${name}`, 'runs-on-cron', `cron:${cronMatch[1]}`, f);
      }
    } catch (e) { /* skip */ }
  });

  kg.stats.scanDurationMs = Date.now() - t0;
  kg.stats.generatedAt = new Date().toISOString();
  return kg;
}

// ── Main ───────────────────────────────────────────────────────────────
function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function showStats(kg) {
  const j = kg.toJSON();
  console.log('=== KNOWLEDGE GRAPH STATS ===');
  console.log(`Generated:    ${j.meta.generatedAt}`);
  console.log(`Scan time:    ${j.meta.scanDurationMs}ms`);
  console.log(`Docs scanned: ${j.meta.totalDocsScanned} (${(j.meta.totalBytesScanned/1024/1024).toFixed(2)} MB)`);
  console.log(`Total entities: ${j.meta.totalEntities}`);
  console.log(`Total relations: ${j.meta.totalRelations}`);
  console.log('');
  console.log('By type:');
  for (const [k, v] of Object.entries(j.meta.byType)) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }
}

function showQuery(kg, term) {
  const r = kg.query(term);
  console.log(`\n=== Query: "${term}" ===`);
  if (r.drivers.length) {
    console.log(`\nDrivers (${r.drivers.length}):`);
    for (const { key, value } of r.drivers.slice(0, 20)) {
      console.log(`  ${key}`);
      if (value.mfrs && value.mfrs.length) console.log(`    mfrs: ${value.mfrs.slice(0, 3).join(', ')}${value.mfrs.length > 3 ? '...' : ''}`);
    }
  }
  if (r.mfrs.length) {
    console.log(`\nMfrs (${r.mfrs.length}):`);
    for (const { key, value } of r.mfrs.slice(0, 20)) console.log(`  ${key}`);
  }
  if (r.lessons.length) {
    console.log(`\nLessons (${r.lessons.length}):`);
    for (const { key, value } of r.lessons.slice(0, 20)) {
      console.log(`  ${key} (refs: ${value.references ? value.references.length : 0})`);
    }
  }
  if (r.issues.length) {
    console.log(`\nIssues (${r.issues.length}):`);
    for (const { key, value } of r.issues.slice(0, 20)) {
      console.log(`  #${key} (refs: ${value.references ? value.references.length : 0})`);
    }
  }
  if (r.workflows.length) {
    console.log(`\nWorkflows (${r.workflows.length}):`);
    for (const { key, value } of r.workflows.slice(0, 20)) {
      console.log(`  ${key} (cron: ${value.cron || 'manual'})`);
    }
  }
  if (r.capabilities.length) {
    console.log(`\nCapabilities (${r.capabilities.length}):`);
    for (const { key, value } of r.capabilities.slice(0, 20)) {
      console.log(`  ${key} (used in ${value.drivers ? value.drivers.length : 0} drivers)`);
    }
  }
  if (r.relations.length) {
    console.log(`\nRelations (${r.relations.length}):`);
    for (const r2 of r.relations.slice(0, 20)) {
      console.log(`  ${r2.from} --[${r2.type}]--> ${r2.to}`);
    }
  }
  if (!Object.values(r).some(arr => arr.length)) {
    console.log('  (no matches)');
  }
}

function showSummary(kg) {
  const j = kg.toJSON();
  let md = `# Knowledge Graph Summary\n\n`;
  md += `Generated: ${j.meta.generatedAt}\n`;
  md += `Scan time: ${j.meta.scanDurationMs}ms\n`;
  md += `Docs scanned: ${j.meta.totalDocsScanned} (${(j.meta.totalBytesScanned/1024/1024).toFixed(2)} MB)\n\n`;
  md += `## Entity counts\n\n| Type | Count |\n|---|---|\n`;
  for (const [k, v] of Object.entries(j.meta.byType)) md += `| ${k} | ${v} |\n`;
  md += `\n## Relations: ${j.meta.totalRelations}\n\n`;

  // Top workflows by references
  const wfs = [...kg.entities.workflows.entries()].map(([k, v]) => ({ k, refs: v.references?.length || 0, cron: v.cron })).sort((a, b) => b.refs - a.refs).slice(0, 15);
  md += `## Top workflows (most referenced)\n\n| Workflow | Cron | Refs |\n|---|---|---|\n`;
  for (const w of wfs) md += `| ${w.k} | ${w.cron || 'manual'} | ${w.refs} |\n`;

  // Top lessons
  const lss = [...kg.entities.lessons.entries()].map(([k, v]) => ({ k, refs: v.references?.length || 0 })).sort((a, b) => b.refs - a.refs).slice(0, 20);
  md += `\n## Top lessons (most referenced)\n\n| Lesson | Refs |\n|---|---|\n`;
  for (const l of lss) md += `| ${l.k} | ${l.refs} |\n`;

  // Top issues
  const iss = [...kg.entities.issues.entries()].map(([k, v]) => ({ k, refs: v.references?.length || 0 })).sort((a, b) => b.refs - a.refs).slice(0, 20);
  md += `\n## Top issues (most referenced)\n\n| Issue | Refs |\n|---|---|\n`;
  for (const i of iss) md += `| #${i.k} | ${i.refs} |\n`;

  // Top mfrs
  const mfrs = [...kg.entities.fingerprints.entries()].map(([k, v]) => ({ k, refs: v.references?.length || 0 })).sort((a, b) => b.refs - a.refs).slice(0, 15);
  md += `\n## Top mfrs (most referenced)\n\n| Mfr | Refs |\n|---|---|\n`;
  for (const m of mfrs) md += `| ${m.k} | ${m.refs} |\n`;

  // Top drivers by mfr count
  const drvs = [...kg.entities.drivers.entries()].filter(([k, v]) => (v.mfrs || []).length > 0).map(([k, v]) => ({ k, mfrs: v.mfrs.length, caps: (v.capabilities || []).length })).sort((a, b) => b.mfrs - a.mfrs).slice(0, 15);
  md += `\n## Top drivers (most mfrs)\n\n| Driver | Mfrs | Caps |\n|---|---|---|\n`;
  for (const d of drvs) md += `| ${d.k} | ${d.mfrs} | ${d.caps} |\n`;

  fs.writeFileSync(SUMMARY_FILE, md);
  console.log(`Summary: ${SUMMARY_FILE}`);
  console.log(md);
}

// Main
const kg = new KnowledgeGraph();
buildGraph(kg);
ensureDir(STATE_DIR);

if (QUERY) {
  showQuery(kg, QUERY);
} else if (SHOW_SUMMARY) {
  showSummary(kg);
} else if (SHOW_STATS) {
  showStats(kg);
  // Also save the full graph
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(kg.toJSON(), null, 2));
  console.log(`\nFull graph: ${OUTPUT_FILE}`);
} else {
  // Default: save full graph + summary
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(kg.toJSON(), null, 2));
  showSummary(kg);
  console.log(`\nFull graph: ${OUTPUT_FILE}`);
}
