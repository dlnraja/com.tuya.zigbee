'use strict';
/**
 * scripts/digest/rules-digest.js — compact, machine-readable digest of the project rules, used
 * as guardrails by the enrichment scripts (leads-merge, safe-auto-commit consumers).
 *
 * Output: .github/state/rules-digest.json (gitignored → rebuilt at runtime). Regenerated ONLY
 * when the inputs changed (sha256 over every input file; actions/cache keyed on the same docs).
 *
 * Inputs: CORE_RULES.md, AGENTS.md, AI_CONTEXT_MANDATE.md, CONTRIBUTING.md, docs/rules/**,
 *   docs/ARCHITECTURAL_RULES.md, docs/DRIVER_MAPPING_POLICY.md, docs/DP_MAPPING_REFERENCE.md (headings),
 *   docs/knowledge/DEVICE_TRUTH.md, .cursor/rules/*.mdc, CHANGELOG.md (last 5 headings).
 * Contents:
 *   rules[]       — imperative lines (MUST/NEVER/ALWAYS/JAMAIS/TOUJOURS/sacred/P-codes), ≤200 chars
 *   guardrails{}  — booleans the scripts enforce (sacred couple, no invented pid, additive only…)
 *   deviceTruth{} — mfr → [driver ids] whose DEVICE_TRUTH note mentions it (pinned/“stays on”/“never”)
 *   changelog[]   — latest headings (what changed recently)
 * Usage: node scripts/digest/rules-digest.js [--out=path] [--force]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=').slice(1).join('=') : d; };
const DEFAULT_OUT = path.resolve(ROOT, '.github/state/rules-digest.json');
const MAIN = require.main === module;
const OUT = MAIN ? path.resolve(ROOT, arg('out', DEFAULT_OUT)) : DEFAULT_OUT; // CLI flags only when run directly
const FORCE = MAIN && process.argv.includes('--force');

function inputs() {
  const list = ['CORE_RULES.md', 'AGENTS.md', 'AI_CONTEXT_MANDATE.md', 'CONTRIBUTING.md',
    'docs/ARCHITECTURAL_RULES.md', 'docs/DRIVER_MAPPING_POLICY.md', 'docs/DP_MAPPING_REFERENCE.md',
    'docs/knowledge/DEVICE_TRUTH.md', 'CHANGELOG.md', 'README.md', '.homeychangelog.json', 'docs/automation/CI_FEEDBACK_LOOP.md'];
  for (const dir of ['docs/rules', '.cursor/rules']) {
    try { for (const f of fs.readdirSync(path.join(ROOT, dir)).sort()) if (/\.(md|mdc)$/.test(f)) list.push(`${dir}/${f}`); } catch { /* absent */ }
  }
  return list.filter((f) => fs.existsSync(path.join(ROOT, f)));
}

function hashOf(files) {
  const h = crypto.createHash('sha256');
  for (const f of files) { h.update(f + '\0'); h.update(fs.readFileSync(path.join(ROOT, f))); }
  return h.digest('hex');
}

const IMPERATIVE = /\b(MUST|NEVER|ALWAYS|DO NOT|DON'T|FORBIDDEN|REQUIRED|JAMAIS|TOUJOURS|INTERDIT|OBLIGATOIRE|sacred|sacré|never invent|additive)\b|\bP\d{3,4}\b/;

function build() {
  const files = inputs();
  const inputsHash = hashOf(files);
  if (!FORCE && fs.existsSync(OUT)) {
    try { const cur = JSON.parse(fs.readFileSync(OUT, 'utf8')); if (cur.inputsHash === inputsHash) { console.log(`rules-digest up to date (${inputsHash.slice(0, 12)})`); return cur; } } catch { /* rebuild */ }
  }
  const rules = []; const seen = new Set(); const deviceTruth = {}; let changelog = []; let homeyChangelog = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (f === '.homeychangelog.json') {
      try { const j = JSON.parse(text); homeyChangelog = Object.keys(j).filter((v) => /^\d+\.\d+\.\d+$/.test(v)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })).slice(0, 5).map((v) => ({ v, en: String((j[v] && (j[v].en || Object.values(j[v])[0])) || '').slice(0, 160) })); } catch { /* ignore */ }
      continue;
    }
    if (f === 'CHANGELOG.md') { changelog = (text.match(/^#{1,3} .+$/gm) || []).slice(0, 5).map((s) => s.replace(/^#+\s*/, '').slice(0, 120)); continue; }
    if (f.endsWith('DEVICE_TRUTH.md')) {
      for (const line of text.split('\n')) {
        const m = /^\|\s*`([a-z0-9_]+)`\s*\|/.exec(line); if (!m) continue;
        for (const mfr of line.match(/_T[A-Z0-9]{2,5}_[a-z0-9]{8}/gi) || []) (deviceTruth[mfr.toLowerCase()] = deviceTruth[mfr.toLowerCase()] || new Set()).add(m[1]);
      }
    }
    if (f.endsWith('DP_MAPPING_REFERENCE.md')) continue; // headings only would be noise here; kept as an input for the hash
    for (const raw of text.split('\n')) {
      const line = raw.replace(/^[\s>*\-+#\d.)]+/, '').replace(/[*_`]{1,3}/g, '').trim();
      if (line.length < 20 || !IMPERATIVE.test(line) || /^(\/\/|\/\*|<!--|\{|\|)/.test(line) || /:$/.test(line)) continue;
      const k = line.toLowerCase().slice(0, 80); if (seen.has(k)) continue; seen.add(k);
      rules.push({ src: f, text: line.slice(0, 200) });
      if (rules.length >= 400) break;
    }
    if (rules.length >= 400) break;
  }
  const all = rules.map((r) => r.text).join('\n');
  const digest = {
    schema: 1, generatedAt: new Date().toISOString(), inputsHash, inputs: files,
    guardrails: {
      // Hard doctrine (always on); the `documented` flags show whether the docs state it explicitly.
      sacredCouple: true, noInventedPid: true, noCartesianCouples: true, additiveOnly: true,
      complementaryNeverBlocksPairing: true, heuristicNeedsExternalVerification: true,
      noStableToTest: true, noForumPosting: true, freeOnly: true,
      documented: {
        sacredCouple: /sacred|sacré/i.test(all), noInventedPid: /invent/i.test(all),
        additiveOnly: /additive|additif/i.test(all), complementary: /complementar|complémentaire/i.test(all),
      },
    },
    // App roles (DUAL_APP_VISION): enrichment scripts must respect them.
    appRoles: {
      'stable-v5': 'simple and stable, maximum device coverage; sourced couples only, no heuristics, never published to Test from Stable, never pushed by automation',
      master: 'advanced intelligence and heuristics (complementary handlers, adaptive DP/ZCL), Test channel via auto-publish after validation',
      'bastien-home': 'experimental branch — mined for leads, never promoted',
    },
    // Automation discoveries (2026-10) used as guardrails by the digest scripts.
    discoveries: {
      forumTopics: { 140352: 'Universal Tuya Zigbee (this app)', 26439: 'Tuya Zigbee (JohanBendz)', 89271: 'device-request archive', 146735: 'Tuya Smart Life', 154077: 'Tuya Local', 21313: 'Tuya Cloud' },
      quirkCategories: ['spurious-zero', 'null-invalid', 'wrong-scaling', 'reboot', 'overheat', 'over-reporting', 'duplicate-report', 'disconnect'],
      quirkConfirmation: '>= 2 distinct sources (hosts/repos), otherwise heuristic',
      aiPolicy: 'remote AI off by default (AI_FORCE_LOCAL); cancelled paid providers neutralized; Gemini/free tiers optional; repo variable AI_DISABLED=true removes every AI key; deterministic fallback always',
      scrapePolicy: 'keyless readers first; paid-capable scraper only with daily cap; repo variable FIRECRAWL_DISABLED=true removes the key',
      neutralWording: 'no external project names in commits, changelogs, PR/issue comments or tracking-issue comments — say "external cross-reference"',
    },
    homeyChangelog,
    deviceTruth: Object.fromEntries(Object.entries(deviceTruth).map(([k, v]) => [k, [...v]])),
    changelog, rules,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(digest, null, 1));
  console.log(`rules-digest rebuilt: ${rules.length} rules, ${Object.keys(digest.deviceTruth).length} DEVICE_TRUTH mfr pins, ${files.length} inputs → ${path.relative(ROOT, OUT)}`);
  return digest;
}

function load(file = OUT) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }

module.exports = { build, load, inputs };
if (require.main === module) build();
