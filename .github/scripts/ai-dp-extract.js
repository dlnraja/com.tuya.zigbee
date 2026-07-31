#!/usr/bin/env node
'use strict';
/**
 * ai-dp-extract.js (P92.81)
 * AI-assisted DP mapping extraction from device support material, following
 * the "raccourci Gemini" doctrine — but routed through the project's OWN
 * guarded AI chain (.github/scripts/ai-helper.js: billing guard, daily
 * caps, circuit breaker) instead of raw unguarded API calls.
 *
 * Sources (free, no secrets):
 *  - recent GitHub issues labeled device-request / containing interview+DP logs
 *  - reports/forum-full-digest.md DP blocks
 *
 * Doctrine applied:
 *  - each source block TRUNCATED to 500 chars (structure, not history)
 *  - strict JSON output validation (DP number keys, enum|int|bool types)
 *  - billing guard enforced by construction (ai-helper.callAI)
 *  - output: .github/state/ai-dp-mappings.json (report only — human/curated
 *    review decides what enters dp_registry; no blind auto-merge)
 *
 * Usage: node .github/scripts/ai-dp-extract.js [--max-blocks 8]
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, '.github', 'state', 'ai-dp-mappings.json');
const MAX_BLOCKS = parseInt(process.argv[process.argv.indexOf('--max-blocks') + 1] || '8', 10) || 8;
const BLOCK_CHARS = 500; // doctrine: truncate to structure, never raw logs

const PROMPT = `[SYSTEM] Tu es un expert Zigbee Tuya. Extrais uniquement les mappings de Data Points (DP) de ce log. Réponds UNIQUEMENT en JSON valide.
[STRUCTURE_SORTIE] {"DP_Numero": {"type": "enum|int|bool", "values": [], "unite": ""}}
[LOG_ENTREE] `;

function collectBlocks() {
  const blocks = [];
  // 1. Recent device issues via gh (no secret beyond GITHUB_TOKEN)
  try {
    const raw = execSync(
      'gh issue list --repo dlnraja/com.tuya.zigbee --state all --search "DP OR datapoint OR interview" --limit 6 --json number,title,body',
      { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    for (const issue of JSON.parse(raw)) {
      const text = `${issue.title}\n${issue.body || ''}`;
      if (/\b(dp|datapoint|DP\d|_TZ\w{4}_\w+|cluster)/i.test(text)) {
        blocks.push({ source: `issue #${issue.number}`, text });
      }
    }
  } catch { /* gh unavailable offline — continue with local sources */ }

  // 2. Forum digest DP blocks
  const digest = path.join(ROOT, 'reports', 'forum-full-digest.md');
  if (fs.existsSync(digest)) {
    const content = fs.readFileSync(digest, 'utf8');
    for (const m of content.matchAll(/(DP\d+[^\n]{0,200}|datapoint[^\n]{0,200})/gi)) {
      blocks.push({ source: 'forum-digest', text: m[0] });
      if (blocks.length >= MAX_BLOCKS * 2) {break;}
    }
  }
  return blocks.slice(0, MAX_BLOCKS);
}

function validateExtraction(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {return null;}
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!/^\d{1,3}$/.test(k)) {continue;}
    if (!v || typeof v !== 'object') {continue;}
    const type = String(v.type || '').toLowerCase();
    if (!['enum', 'int', 'bool'].includes(type)) {continue;}
    out[k] = {
      type,
      values: Array.isArray(v.values) ? v.values.slice(0, 20) : [],
      unite: typeof v.unite === 'string' ? v.unite.slice(0, 20) : ''
    };
  }
  return Object.keys(out).length ? out : null;
}

async function main() {
  const blocks = collectBlocks();
  console.log(`[ai-dp-extract] ${blocks.length} blocs sources (tronqués à ${BLOCK_CHARS} chars)`);
  const results = { generated: new Date().toISOString(), doctrine: '500-char truncation + guarded ai-helper chain', extractions: [], skipped: 0, aiUnavailable: 0 };

  if (!blocks.length) {
    console.log('[ai-dp-extract] aucun bloc — rien à analyser');
  }

  let ai = null;
  try {ai = require('./ai-helper');} catch (err) {
    console.log(`[ai-dp-extract] ai-helper indisponible (${err.message}) — mode rapport seul`);
    results.aiUnavailable = blocks.length;
  }

  for (const block of blocks) {
    const truncated = block.text.slice(-BLOCK_CHARS);
    if (!ai) {results.skipped++; continue;}
    try {
      const answer = await ai.callAI(truncated, PROMPT, { taskType: 'analyze', complexity: 'low' });
      if (!answer) {results.skipped++; continue;}
      // Extract JSON from the answer (may be wrapped in markdown fences)
      const jsonMatch = String(answer).match(/\{[\s\S]*\}/);
      if (!jsonMatch) {results.skipped++; continue;}
      const parsed = JSON.parse(jsonMatch[0]);
      const valid = validateExtraction(parsed);
      if (valid) {
        results.extractions.push({ source: block.source, mappings: valid });
        console.log(`  ✓ ${block.source}: ${Object.keys(valid).length} DP extraits`);
      } else {
        results.skipped++;
      }
    } catch (err) {
      results.skipped++;
      console.log(`  ✗ ${block.source}: ${err.message}`);
    }
  }

  // Merge with previous report (keep history of last 50 extractions)
  let previous = [];
  try {previous = JSON.parse(fs.readFileSync(OUT, 'utf8')).extractions || [];} catch { /* first run */ }
  const seen = new Set(results.extractions.map(e => e.source));
  results.extractions = [...results.extractions, ...previous.filter(e => !seen.has(e.source))].slice(0, 50);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  console.log(`[ai-dp-extract] ${results.extractions.length} extractions conservées | ${results.skipped} ignorées | aucune fusion automatique (revue curée requise)`);
}

main().catch(err => {console.error(err.message); process.exit(0);});
