'use strict';
/**
 * Regenerate discussion-harvest DISCOVERIES.md + fix JSON count.
 * WHY P2270/P2281: plan criteria — MD must match JSON ≥50; SHADOW only.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, 'reports', 'discussion-harvest-2026-08-26');
const JSON_PATH = path.join(DIR, 'DISCOVERIES.json');
const MD_PATH = path.join(DIR, 'DISCOVERIES.md');
const SUMMARY_PATH = path.join(DIR, 'SUMMARY.md');

const j = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const list = j.discoveries || [];

// Past-discovery lineage items (knowledge/workflow) — no invented pid
const extras = [
  {
    id: 'D070',
    source: 'P2280',
    topic: 'workflow',
    mfr: null,
    pid: null,
    summary: 'Dual-app inconsistency sweep: stable unsteal P2274–P2279 + BOTH TX/RX backport',
    tier: 'C',
    impl: 'done',
    driver: null,
    refs: ['reports/dual-inconsistency-2026-08-26/SUMMARY.md', 'config/architecture/dual-app-tracks.json'],
  },
  {
    id: 'D071',
    source: 'P102-P2268',
    topic: 'workflow',
    mfr: null,
    pid: null,
    summary: 'Workflow lineage: P102 forum silent → P2138 sacred matrix → P2206 privacy → P2228 CI vs Homey → P2267 E002 → P2268 parallel',
    tier: 'C',
    impl: 'done',
    driver: null,
    refs: ['.github/WORKFLOW_GUIDELINES.md', 'docs/architecture/CI_VS_HOMEY_RUNTIME.md', 'docs/knowledge/TUYA_E000_E001_E002.md'],
  },
  {
    id: 'D072',
    source: 'plan-keep',
    topic: 'cluster',
    mfr: null,
    pid: null,
    summary: 'Keep ZclClusterLexicon E002=manuSpecificTuya2 + CommunicationPathFinder sacredZclOnly penalties + WHY headers',
    tier: 'C',
    impl: 'done',
    driver: null,
    refs: ['lib/zigbee/ZclClusterLexicon.js', 'lib/protocol/CommunicationPathFinder.js', 'docs/architecture/COMM_PATHFINDING.md'],
  },
  {
    id: 'D073',
    source: 'P2281',
    topic: 'workflow',
    mfr: null,
    pid: null,
    summary: 'Workflow discovery lineage SSOT — past P102–P2266 + recent P2267/P2268 + present P2269+ wired in GHA',
    tier: 'C',
    impl: 'done',
    driver: null,
    refs: ['config/enrichment/discovery-lineage.json', 'tools/ci/discovery-lineage-enrich-gate.js'],
  },
];

const byId = new Map(list.map((d) => [d.id, d]));
for (const e of extras) {
  if (!byId.has(e.id)) {
    list.push(e);
    byId.set(e.id, e);
  } else {
    Object.assign(byId.get(e.id), e);
  }
}

j.discoveries = list;
j.count = list.length;
j.generatedAt = j.generatedAt || new Date().toISOString();
j.updated = new Date().toISOString().slice(0, 10);
j.mode = 'SHADOW';
j.rules = ['mfr+pid only', 'never invent pid', 'no forum POST'];

fs.writeFileSync(JSON_PATH, `${JSON.stringify(j, null, 2)}\n`);

const impl = {};
const tier = {};
for (const d of list) {
  impl[d.impl] = (impl[d.impl] || 0) + 1;
  tier[d.tier] = (tier[d.tier] || 0) + 1;
}

const rows = list.map((d) => {
  const couple = d.mfr && d.pid ? `${d.mfr}+${d.pid}` : (d.mfr || d.pid || '');
  const sum = String(d.summary || '').replace(/\|/g, '/');
  return `|${d.id}|${d.tier}|${d.impl}|${couple}|${sum}|`;
});

const md = [
  '# P2270 Discussion harvest',
  '',
  `Count: **${list.length}** (SHADOW · mfr+pid only · never invent pid)`,
  '',
  '| ID | Tier | Impl | Couple | Summary |',
  '|----|------|------|--------|---------|',
  ...rows,
  '',
  '## Keep (plan previous)',
  '',
  '- `ZclClusterLexicon` — E000/E001/E002 taxonomy (P2267)',
  '- `CommunicationPathFinder` + `PROTOCOL_PATHS` + `COMM_PATHFINDING.md`',
  '- SSOT: PROTOCOL / BATTERY / TIME / PARSER + `SPAGHETTI_MAP.md`',
  '- WHY comments on hotspots (P215)',
  '',
].join('\n');

fs.writeFileSync(MD_PATH, md);

const summary = [
  '# P2270 SUMMARY',
  '',
  `- discoveries: **${list.length}**`,
  `- by tier: ${JSON.stringify(tier)}`,
  `- by impl: ${JSON.stringify(impl)}`,
  '- watch only: D024 TH05-z ZigbeeTLc (no invent pid)',
  '- latest extras: D070 dual-app P2280 · D071 lineage P102–P2268 · D072 keep lexicon/pathfind',
  '',
  'Deliverables P2269/P2270 + P2271–P2279 + workflow enrich.',
  'Mode: SHADOW. Never invent productId. Never lock Nous/SoPhos (SergeP T99614).',
  '',
].join('\n');

fs.writeFileSync(SUMMARY_PATH, summary);
console.log(JSON.stringify({ count: list.length, impl, tier }, null, 2));
