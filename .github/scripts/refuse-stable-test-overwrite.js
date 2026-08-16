#!/usr/bin/env node
'use strict';

/**
 * refuse-stable-test-overwrite.js (P193 / P195)
 *
 * Shared App ID `com.dlnraja.tuya.zigbee`: promoting stable 5.12.x to Test
 * overwrites a soaking master 9.0.x build. Skip promote unless the operator
 * sets STABLE_FORCE_TEST=1 / force_test=true.
 *
 * Always exits 0. Writes skip=true|false to GITHUB_OUTPUT.
 */

const fs = require('fs');

const FORCE = /^(1|true|yes)$/i.test(String(process.env.STABLE_FORCE_TEST || ''));
const PAT = process.env.HOMEY_PAT;
const APP = process.env.APP_ID || 'com.dlnraja.tuya.zigbee';

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
    log('soak-guard: STABLE_FORCE_TEST set — promote allowed (will overwrite shared Test).');
    out('skip', 'false');
    return;
  }

  const version = await latestTestVersion();
  if (!version) {
    log('soak-guard: Test version unknown — skip promote (fail-closed, shared App ID).');
    out('skip', 'true');
    out('reason', 'unknown_test_version');
    return;
  }

  if (/^9\./.test(version)) {
    log(`soak-guard: Test is ${version} (master soak). Skip stable→Test overwrite.`);
    out('skip', 'true');
    out('reason', `test_is_${version}`);
    return;
  }

  log(`soak-guard: Test is ${version} — stable promote allowed.`);
  out('skip', 'false');
  out('reason', `test_is_${version}`);
}

main().catch((err) => {
  log(`soak-guard: ${err.message}`);
  out('skip', 'true');
  out('reason', 'guard_error');
});
