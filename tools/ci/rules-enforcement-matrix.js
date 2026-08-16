#!/usr/bin/env node
/**
 * rules-enforcement-matrix.js — P183
 *
 * The project states ~90 rules across .cursorrules, AGENTS.md, CORE_RULES.md and
 * docs/rules/**. Prose cannot tell you which of them a build actually enforces,
 * so a rule can rot for months while everyone assumes CI covers it.
 *
 * This maps each machine-checkable rule to the gate that enforces it and then
 * VERIFIES the mapping: the source document must exist, the enforcer file must
 * exist, and when a signature is given it must still appear in that file. A
 * renamed or deleted gate therefore fails here instead of silently going quiet.
 *
 * It deliberately does not re-implement the checks — it audits their presence.
 *
 * Usage:
 *   node tools/ci/rules-enforcement-matrix.js
 *   node tools/ci/rules-enforcement-matrix.js --json
 *   node tools/ci/rules-enforcement-matrix.js --strict   # exit 1 on broken references
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const REPORT_MD = path.join(ROOT, 'reports', 'RULES_ENFORCEMENT_MATRIX.md');
const REPORT_JSON = path.join(ROOT, '.github', 'state', 'rules-enforcement-matrix.json');

const args = process.argv.slice(2);
const AS_JSON = args.includes('--json');
const STRICT = args.includes('--strict');

/**
 * enforcedBy: path to the gate. signature: a string that must still be present
 * in that gate, so a rewrite that drops the check is caught too.
 * unenforced: the rule is real but only a human can apply it.
 */
const RULES = [
  // ── Zigbee identity / fingerprints ───────────────────────────────────────
  { id: 'Z1', domain: 'zigbee', rule: 'Settings keys are zb_model_id / zb_manufacturer_name, never camelCase', source: '.cursorrules', enforcedBy: 'tools/ci/regression-lessons-gate.js' },
  { id: 'Z2', domain: 'zigbee', rule: 'Fingerprint identity is the couple (manufacturerName, productId); the same mfr may live in several drivers with different pids', source: 'AGENTS.md', enforcedBy: 'tools/ci/dual-claim-compose-gate.js', signature: 'dual-claim' },
  { id: 'Z3', domain: 'zigbee', rule: 'Two drivers must not claim the same (mfr, pid) couple', source: 'AGENTS.md', enforcedBy: 'scripts/validation/check-driver-collisions.js' },
  { id: 'Z4', domain: 'zigbee', rule: 'No wildcards in manufacturerName', source: 'docs/rules/DEVELOPMENT_RULES.md', enforcedBy: 'scripts/validation/check-fingerprint-health.js' },
  { id: 'Z5', domain: 'zigbee', rule: 'manufacturerName arrays must never be empty', source: 'scripts/validate/homey-mandatory-check.js', enforcedBy: 'scripts/validate/homey-mandatory-check.js', signature: 'M09' },
  { id: 'Z6', domain: 'zigbee', rule: 'Marketing model names (ZG-*) are not Zigbee productIds; keep them but never rely on them', source: 'data/marketing-model-alias-registry.json', enforcedBy: 'tools/ci/battery-button-intelligence-gate.js', signature: "'F1'" },
  { id: 'Z7', domain: 'zigbee', rule: 'Manufacturer matching goes through CaseInsensitiveMatcher, not manual toLowerCase', source: '.github/CONTRIBUTING.md', unenforced: 'no gate scans for ad-hoc toLowerCase on manufacturer strings' },
  { id: 'Z8', domain: 'zigbee', rule: 'Fingerprints removed from a driver must be justified; bulk enrichment must not silently delete identity data', source: 'reports/ (Cluster A/F, 94 commits)', enforcedBy: 'tools/ci/anti-bot-regression-gate.js' },
  { id: 'Z9', domain: 'zigbee', rule: 'Every manufacturerName a user reported in an issue, on the forum or in a crash diagnostic must be claimed by some driver', source: 'reports/P184_CROSS_SOURCE_TRIAGE_2026-08-16.md', enforcedBy: 'tools/ci/cross-source-user-report-triage.js', signature: 'humanGaps' },

  // ── Battery ──────────────────────────────────────────────────────────────
  { id: 'B1', domain: 'battery', rule: 'Linear voltage-to-percent formulas are banned; use the non-linear discharge curves', source: '.cursorrules', enforcedBy: 'tools/ci/battery-button-intelligence-gate.js', signature: "'B3'" },
  { id: 'B2', domain: 'battery', rule: 'ZCL batteryPercentageRemaining is 0-200 and must be normalized, never used raw', source: 'docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md', enforcedBy: 'tools/ci/battery-button-intelligence-gate.js', signature: "'B2'" },
  { id: 'B3', domain: 'battery', rule: 'A battery transform must not be a no-op that pins the capability to a constant', source: 'reports/P180_BATTERY_BUTTON_VARIANT_2026-08-16.md', enforcedBy: 'tools/ci/battery-button-intelligence-gate.js', signature: "'B1'" },
  { id: 'B4', domain: 'battery', rule: 'Pure mains devices strip measure_battery and declare no energy.batteries', source: '.cursorrules', enforcedBy: 'tools/ci/battery-button-intelligence-gate.js', signature: "'B4'" },
  { id: 'B5', domain: 'battery', rule: 'measure_battery in a manifest requires an energy.batteries array', source: 'docs/rules/DEVELOPMENT_RULES.md', enforcedBy: 'scripts/validate/homey-mandatory-check.js' },
  { id: 'B6', domain: 'battery', rule: 'batteryVoltage unit (V / 100mV / mV) must be detected, not assumed', source: 'reports/P182_SOS_BATTERY_AND_BUTTON_VERIFICATION_2026-08-16.md', enforcedBy: 'tools/ci/battery-button-intelligence-gate.js', signature: "'B5'" },
  { id: 'B7', domain: 'battery', rule: 'Do not hardcode value/10 or value/100 for temperature and humidity; use the smart divisor', source: '.cursorrules', enforcedBy: 'tools/ci/adaptive-double-division-gate.js' },

  // ── Buttons / flows / capabilities ───────────────────────────────────────
  { id: 'F1', domain: 'flows', rule: 'titleFormatted must never contain [[device]]', source: '.cursorrules', enforcedBy: 'scripts/maintenance/sanitize-manifest.cjs' },
  { id: 'F2', domain: 'flows', rule: 'Flow card IDs are globally unique across all drivers', source: '.cursorrules', enforcedBy: 'scripts/validation/verify_flows_integrity.js' },
  { id: 'F3', domain: 'flows', rule: 'Virtual buttons route through safeSetCapabilityValue, never raw setCapabilityValue on a button capability', source: '.cursorrules', enforcedBy: 'tools/ci/regression-lessons-gate.js' },
  { id: 'F4', domain: 'flows', rule: 'registerRunListener must not be written as registerRunListenerasync', source: 'AGENTS.md', enforcedBy: 'tools/ci/regression-lessons-gate.js', signature: 'registerRunListener' },
  { id: 'F5', domain: 'flows', rule: 'A declared alarm capability must have a reachable write path', source: 'reports/P181_PHANTOM_CAPABILITY_SWEEP_2026-08-16.md', enforcedBy: 'tools/ci/battery-button-intelligence-gate.js', signature: "'C1'" },
  { id: 'F6', domain: 'flows', rule: 'Capabilities created at runtime should also be declared in the manifest', source: 'reports/P182_SOS_BATTERY_AND_BUTTON_VERIFICATION_2026-08-16.md', enforcedBy: 'tools/ci/battery-button-intelligence-gate.js', signature: "'C2'" },
  { id: 'F7', domain: 'flows', rule: 'Backlight values are the strings off/normal/inverted, never numeric comparisons', source: '.cursorrules', unenforced: 'no gate inspects backlight comparisons' },
  { id: 'F8', domain: 'flows', rule: 'Mixin order is PhysicalButtonMixin(VirtualButtonMixin(Base))', source: '.cursorrules', unenforced: 'no gate parses the class expression order' },

  // ── SDK3 runtime ─────────────────────────────────────────────────────────
  { id: 'S1', domain: 'sdk3', rule: 'No bare setTimeout/setInterval in drivers and lib; use safe-timers', source: 'AGENTS.md', enforcedBy: 'tools/ci/regression-lessons-gate.js', signature: 'safe-timers' },
  { id: 'S2', domain: 'sdk3', rule: 'No console.log in driver code', source: 'CORE_RULES.md', enforcedBy: 'scripts/ci/zero-defect-control.js' },
  { id: 'S3', domain: 'sdk3', rule: 'Zigbee devices must not be left as a bare ZigBeeDevice without the hardening base', source: 'CORE_RULES.md', enforcedBy: 'tools/ci/bare-zigbee-device-gate.js' },
  { id: 'S4', domain: 'sdk3', rule: 'Large JSON databases are parsed from a Buffer, never from a utf8 string, to survive the 64MB heap', source: '.cursorrules', enforcedBy: 'tools/ci/homey-heap-json-gate.js' },
  { id: 'S5', domain: 'sdk3', rule: 'Two modules must not share a basename at different paths (class extends undefined)', source: 'git history signature S18', enforcedBy: 'tools/ci/module-load-health.js', signature: 'duplicateBasenames' },
  { id: 'S6', domain: 'sdk3', rule: 'Every JS file must parse', source: '.cursorrules', enforcedBy: 'scripts/PRE_COMMIT_CHECKS.js' },
  { id: 'S7', domain: 'sdk3', rule: 'Every runtime module must load, not merely parse: a base class that resolves to undefined or a module object crashes the app at startup', source: 'reports/P187_JS_CODEBASE_LOAD_HEALTH_2026-08-16.md', enforcedBy: 'tools/ci/module-load-health.js', signature: 'isEnvironmental' },

  // ── Manifest / publish ───────────────────────────────────────────────────
  { id: 'P1', domain: 'publish', rule: 'app.json, package.json and .homeycompose/app.json must agree on version', source: 'scripts/validate/homey-mandatory-check.js', enforcedBy: 'scripts/validate/homey-mandatory-check.js', signature: 'M08' },
  { id: 'P2', domain: 'publish', rule: 'The generated app.json stays compactly serialized; auto-fixes must preserve its formatting', source: 'reports/P183_KNOWLEDGE_CORPUS_SWEEP_2026-08-16.md', enforcedBy: 'scripts/validate/homey-mandatory-check.js', signature: 'reserializeLike' },
  { id: 'P3', domain: 'publish', rule: 'app.json stays under 4MB compacted; publish bundle under its own ceiling', source: 'AGENTS.md', enforcedBy: 'scripts/ci/publish-size-gate.cjs' },
  { id: 'P4', domain: 'publish', rule: 'energy.approximation must not coexist with measure_power or meter_power', source: '.cursorrules', enforcedBy: 'tools/ci/energy-compose-gate.js' },
  { id: 'P5', domain: 'publish', rule: 'app.json must stay in step with the driver compose files', source: 'docs/rules/POST_PROMOTION_PROTOCOL.md', enforcedBy: 'scripts/validation/app-json-dual-layer-validator.js' },
  { id: 'P6', domain: 'publish', rule: 'An Athom processing_failed that looks transient must not trigger a republish loop', source: '.cursor/rules/operational-memory-2026-08-15.mdc', enforcedBy: '.github/scripts/processing-failure-republish-check.js' },
  { id: 'P7', domain: 'publish', rule: 'The publish size ceiling may only go down; raising it is not a fix', source: 'git history Cluster D (24 -> 40 -> 45 -> 50 MB)', unenforced: 'the gate reads a threshold but nothing ratchets it' },

  // ── CI / workflows ───────────────────────────────────────────────────────
  { id: 'C1', domain: 'ci', rule: 'Every workflow sets defaults.run.shell: bash', source: '.cursorrules', enforcedBy: 'scripts/ci/validate-github-actions-policy.js' },
  { id: 'C2', domain: 'ci', rule: 'Every workflow YAML must parse and carry permissions, concurrency and timeout-minutes', source: '.github/WORKFLOW_GUIDELINES.md', enforcedBy: 'scripts/ci/validate-all-yaml.js' },
  { id: 'C3', domain: 'ci', rule: 'CI must never auto-modify driver source files; linters are report-only', source: '.cursorrules', unenforced: 'policy only — no gate blocks a workflow that writes to drivers/' },
  { id: 'C4', domain: 'ci', rule: 'Automation must not author changes to lib/**, drivers/**/device.js or app.js', source: 'git history section 5 (111 bot commits in runtime code)', unenforced: 'no gate inspects commit authorship against changed paths' },
  { id: 'C5', domain: 'ci', rule: 'Known regressions must never come back', source: 'reports/REGRESSION_LESSONS_GATE_2026-08-11.md', enforcedBy: 'tools/ci/regression-lessons-gate.js' },

  // ── Forum / comms ────────────────────────────────────────────────────────
  { id: 'M1', domain: 'forum', rule: 'REPLY_TOPICS is 140352 and nothing else', source: '.cursor/rules/forum-silent-humanize.mdc', enforcedBy: 'tools/ci/forum-ai-paste-gate.js' },
  { id: 'M2', domain: 'forum', rule: 'Never paste unchecked AI output into the Homey community', source: '.cursor/rules/forum-silent-humanize.mdc', enforcedBy: 'tools/ci/forum-ai-paste-gate.js' },
  { id: 'M3', domain: 'forum', rule: 'External sources are never credited in commits, changelogs or forum text', source: '.cursorrules', unenforced: 'wording policy — needs human review' },

  // ── Branch discipline ────────────────────────────────────────────────────
  { id: 'D1', domain: 'branches', rule: 'Never push directly to stable-v5; backport surgically after a clean master soak', source: 'docs/rules/DUAL_APP_VISION.md', unenforced: 'branch protection concern, not a repo script' },
  { id: 'D2', domain: 'branches', rule: 'Never full-tree sync between master and stable-v5', source: 'docs/rules/DUAL_APP_VISION.md', unenforced: 'human classification BOTH / MASTER_ONLY / STABLE_ONLY' },
  { id: 'D3', domain: 'branches', rule: 'App identity files are never copied across tracks', source: 'docs/rules/CROSS_APP_PROMPT_RULES.md', unenforced: 'no cross-branch diff gate exists' },
];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function contains(rel, needle) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8').includes(needle);
  } catch (err) {
    return false;
  }
}

const results = RULES.map((r) => {
  const problems = [];

  // A rule whose source document vanished is a rule nobody can look up.
  const sourceIsFile = /[\\/.]/.test(r.source) && !r.source.includes(' ');
  if (sourceIsFile && !exists(r.source)) problems.push(`source document missing: ${r.source}`);

  let status;
  if (r.unenforced) {
    status = 'unenforced';
  } else if (!exists(r.enforcedBy)) {
    status = 'broken';
    problems.push(`enforcer missing: ${r.enforcedBy}`);
  } else if (r.signature && !contains(r.enforcedBy, r.signature)) {
    status = 'broken';
    problems.push(`enforcer no longer contains "${r.signature}": ${r.enforcedBy}`);
  } else {
    status = 'enforced';
  }

  return { ...r, status, problems };
});

const enforced = results.filter((r) => r.status === 'enforced');
const unenforced = results.filter((r) => r.status === 'unenforced');
const broken = results.filter((r) => r.status === 'broken');
const withProblems = results.filter((r) => r.problems.length);

const coverage = Math.round((enforced.length / results.length) * 100);

const summary = {
  generatedAt: new Date().toISOString(),
  totals: { rules: results.length, enforced: enforced.length, unenforced: unenforced.length, broken: broken.length, coveragePercent: coverage },
  rules: results,
};

fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
fs.writeFileSync(REPORT_JSON, JSON.stringify(summary, null, 2));

const icon = { enforced: 'enforced', unenforced: 'unenforced', broken: 'BROKEN' };
const md = [
  '# Rules Enforcement Matrix',
  '',
  `Generated: ${summary.generatedAt}`,
  '',
  `Machine-checkable rules tracked: **${results.length}** — enforced **${enforced.length}**, unenforced **${unenforced.length}**, broken references **${broken.length}** (coverage **${coverage}%**).`,
  '',
  'A rule is "broken" when the gate it names has been renamed, deleted, or no longer contains the check.',
  '',
  '| ID | Domain | Rule | Status | Enforced by / why not |',
  '|----|--------|------|--------|------------------------|',
  ...results.map((r) => `| ${r.id} | ${r.domain} | ${r.rule} | ${icon[r.status]} | ${r.status === 'unenforced' ? r.unenforced : `\`${r.enforcedBy}\``} |`),
  '',
];
if (withProblems.length) {
  md.push('## Broken references', '');
  for (const r of withProblems) md.push(`- **${r.id}** — ${r.problems.join('; ')}`);
  md.push('');
}
fs.mkdirSync(path.dirname(REPORT_MD), { recursive: true });
fs.writeFileSync(REPORT_MD, md.join('\n'));

if (AS_JSON) {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} else {
  console.log('[rules-matrix] rules=%d enforced=%d unenforced=%d broken=%d coverage=%d%%',
    results.length, enforced.length, unenforced.length, broken.length, coverage);
  for (const r of withProblems) console.log(`  BROKEN ${r.id}: ${r.problems.join('; ')}`);
  console.log('[rules-matrix] report: reports/RULES_ENFORCEMENT_MATRIX.md');
}

process.exit(STRICT && broken.length ? 1 : 0);
