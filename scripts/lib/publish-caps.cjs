'use strict';
// P3036c: ONE source for the publish Zigbee caps (config/publish-caps.json), read by prepare-publish,
// the platform budget gate, the KB coverage matrix, the tests and (through this CLI) the workflows.
// An env var with the historical name still overrides a value for a local experiment or a manual run;
// the publish workflows no longer set them.
//   node scripts/lib/publish-caps.cjs              -> JSON of the effective caps
//   node scripts/lib/publish-caps.cjs --github-env -> KEY=VALUE lines for "$GITHUB_ENV"
const fs = require('fs');
const path = require('path');

const ENV = {
  maxTotalCombos: 'HOMEY_ZIGBEE_MAX_TOTAL_COMBOS',
  maxDriverCombos: 'HOMEY_ZIGBEE_MAX_DRIVER_COMBOS',
  maxCaseForms: 'HOMEY_ZIGBEE_MAX_CASE_FORMS',
  kbTopupMaxTotal: 'HOMEY_ZIGBEE_KB_TOPUP_MAX_TOTAL',
  kbTopupMaxDriver: 'HOMEY_ZIGBEE_KB_TOPUP_MAX_DRIVER',
  ts0601TopupMaxTotal: 'HOMEY_ZIGBEE_TOPUP_MAX_TOTAL',
  ts0601TopupMaxDriver: 'HOMEY_ZIGBEE_TOPUP_MAX_DRIVER',
  // P3036d (owner decision 25/10/2026 17:29 Paris): the real bound is the uploaded app.json size;
  // top-ups may pass the 20000 combos seen accepted (1 = allowed, 0 = clamp to the measured maximum).
  maxUploadAppJsonBytes: 'HOMEY_MAX_UPLOAD_APP_JSON_BYTES',
  allowAboveMeasuredCombos: 'HOMEY_ZIGBEE_TOPUP_ALLOW_UNMEASURED',
  // P3041: 1 = the compaction and the TS0601 top-up spend no room on unsourced all-lower/all-upper twins
  // (never removes a form already in the payload); 1 = also prune such twins already pinned (owner yes needed).
  caseFormsNeedSource: 'HOMEY_ZIGBEE_CASE_FORMS_NEED_SOURCE',
  pruneArtifactCaseForms: 'HOMEY_ZIGBEE_PRUNE_ARTIFACT_CASE_FORMS',
};
const FILE = path.join('config', 'publish-caps.json');

function readFile(root) {
  return JSON.parse(fs.readFileSync(path.join(root, FILE), 'utf8'));
}

/** Effective caps: config/publish-caps.json, then an explicit env override (opts.env, default process.env). */
function loadPublishCaps(opts = {}) {
  const root = opts.root || path.join(__dirname, '..', '..');
  const env = opts.env === undefined ? process.env : (opts.env || {});
  const cfg = readFile(root);
  const out = { from: {} };
  for (const [k, e] of Object.entries(ENV)) {
    const v = env[e] !== undefined && env[e] !== '' ? Number(env[e]) : Number(cfg.caps[k] || 0);
    out[k] = Number.isFinite(v) ? v : 0;
    out.from[k] = env[e] !== undefined && env[e] !== '' ? 'env' : 'config';
  }
  out.measured = cfg.measured || {};
  return out;
}

/** Highest total the payload may legitimately reach (base cap or a top-up ceiling). */
function payloadCeiling(caps) {
  return Math.max(caps.maxTotalCombos || 0, caps.kbTopupMaxTotal || 0, caps.ts0601TopupMaxTotal || 0);
}

function toEnvLines(caps) {
  return Object.entries(ENV).map(([k, e]) => `${e}=${caps[k]}`);
}

module.exports = { ENV, FILE, loadPublishCaps, payloadCeiling, toEnvLines, readFile };

if (require.main === module) {
  const caps = loadPublishCaps({ env: {} });
  if (process.argv.includes('--github-env')) process.stdout.write(`${toEnvLines(caps).join('\n')}\n`);
  else process.stdout.write(`${JSON.stringify(caps, null, 2)}\n`);
}
