#!/usr/bin/env node
'use strict';

/**
 * refuse-stable-test-overwrite.js (P193 / P195 / dual-app)
 *
 * Distinct Athom apps:
 *   Universal Tuya         = com.dlnraja.tuya.zigbee         (master 9.0 Test)
 *   Tuya Unified (Stable)  = com.dlnraja.tuya.zigbee.stable  (stable-v5)
 *
 * Never skip publishing the .stable id because Universal Tuya Test is 9.*.
 * Only refuse when we would publish into com.dlnraja.tuya.zigbee while Test is 9.*.
 *
 * Always exits 0. Writes skip=true|false to GITHUB_OUTPUT.
 */

const fs = require('fs');

const FORCE = /^(1|true|yes)$/i.test(String(process.env.STABLE_FORCE_TEST || ''));
const PAT = process.env.HOMEY_PAT;
const UNIVERSAL_TUYA = 'com.dlnraja.tuya.zigbee';
const STABLE_APP = 'com.dlnraja.tuya.zigbee.stable';

function readComposeId() {
  try {
    const j = JSON.parse(fs.readFileSync('.homeycompose/app.json', 'utf8'));
    if (j && typeof j.id === 'string' && j.id) {return j.id;}
  } catch (_e) { /* compose missing */ }
  return STABLE_APP;
}

const APP = process.env.APP_ID || process.env.TARGET_APP_ID || readComposeId();

function out(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }
}

function log(line) {
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
  }
}

function isStableAppId(id) {
  return String(id || '') === STABLE_APP || String(id || '').endsWith('.stable');
}

async function latestTestVersion() {
  if (!PAT) {return null;}
  let createClient;
  let getBuilds;
  try {
    ({ createClient, getBuilds } = require('./homey-apps-api-client'));
  } catch {
    return null;
  }
  try {
    const client = await createClient({ log });
    const list = await getBuilds(client, APP, { limit: 30 });
    const test = (Array.isArray(list) ? list : [])
      .filter((b) => String(b.state || b.channel || '').toLowerCase() === 'test')
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    return test[0] ? String(test[0].version || '').replace(/^v/i, '') : null;
  } catch (err) {
    log(`soak-guard: could not list builds (${err.message})`);
    return null;
  }
}

async function main() {
  if (FORCE) {
    log('soak-guard: STABLE_FORCE_TEST set — promote allowed.');
    out('skip', 'false');
    out('reason', 'force_test');
    return;
  }

  // Distinct Athom app: .stable never overwrites Universal Tuya 9.0
  if (isStableAppId(APP) || APP !== UNIVERSAL_TUYA) {
    log(`soak-guard: APP_ID=${APP} is not Universal Tuya — 9.x Test soak does not apply. Promote allowed.`);
    out('skip', 'false');
    out('reason', 'distinct_app_id');
    return;
  }

  const version = await latestTestVersion();
  if (!version) {
    log('soak-guard: Test version unknown — skip promote (fail-closed, would hit Universal Tuya).');
    out('skip', 'true');
    out('reason', 'unknown_test_version');
    return;
  }

  if (/^9\./.test(version)) {
    log(`soak-guard: Universal Tuya Test is ${version} (master soak). Skip overwrite of 9.0.`);
    out('skip', 'true');
    out('reason', `test_is_${version}`);
    return;
  }

  log(`soak-guard: Universal Tuya Test is ${version} — promote allowed.`);
  out('skip', 'false');
  out('reason', `test_is_${version}`);
}

main().catch((err) => {
  log(`soak-guard: ${err.message}`);
  if (isStableAppId(APP) || APP !== UNIVERSAL_TUYA) {
    out('skip', 'false');
    out('reason', 'guard_error_distinct_id');
    return;
  }
  out('skip', 'true');
  out('reason', 'guard_error');
});
