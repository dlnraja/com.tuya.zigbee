#!/usr/bin/env node
'use strict';

/**
 * Wait until the current app.json version is a usable Athom draft/test build.
 * Fail-closed on processing_failed (P139) — do not bump/republish here.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const APP = process.env.APP_ID || 'com.dlnraja.tuya.zigbee';
const MAX_MS = Number(process.env.HOMEY_DRAFT_WAIT_MS || 240000);
const STEP_MS = Number(process.env.HOMEY_DRAFT_POLL_MS || 20000);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function versionOf() {
  // WHY(P2355): promote job checks out pre-bump SHA while Homey build may have
  // uploaded N+1 in the publish job — honor explicit expected version from CI.
  const fromEnv = String(
    process.env.HOMEY_EXPECTED_VERSION
      || process.env.HOMEY_APP_VERSION
      || process.env.EXPECTED_APP_VERSION
      || '',
  ).replace(/^v/i, '').trim();
  if (fromEnv) return fromEnv;
  try {
    return String(JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).version || '')
      .replace(/^v/i, '');
  } catch {
    return '';
  }
}

async function main() {
  const expected = versionOf();
  if (!process.env.HOMEY_PAT) {
    console.log('wait-draft: no HOMEY_PAT — sleeping 180s');
    await sleep(180000);
    return;
  }
  if (!expected) {
    console.log('wait-draft: no app.json version — sleeping 180s');
    await sleep(180000);
    return;
  }

  let getBuilds;
  let createClient;
  try {
    ({ createClient, getBuilds } = require('./homey-apps-api-client'));
  } catch (err) {
    console.log(`wait-draft: API client missing (${err.message}) — sleeping 180s`);
    await sleep(180000);
    return;
  }

  const started = Date.now();
  let client;
  try {
    client = await createClient({ log: console.log });
  } catch (err) {
    console.log(`wait-draft: client failed (${err.message}) — sleeping 180s`);
    await sleep(180000);
    return;
  }

  while (Date.now() - started < MAX_MS) {
    const list = await getBuilds(client, APP, { limit: 20 }).catch((e) => {
      console.log(`wait-draft: list failed (${e.message})`);
      return [];
    });
    const builds = (Array.isArray(list) ? list : []).map((b) => ({
      id: b.id,
      version: String(b.version || '').replace(/^v/i, ''),
      state: String(b.state || b.channel || '').toLowerCase(),
    }));
    const mine = builds.filter((b) => b.version === expected);
    const failed = mine.find((b) => /fail|error|revoked/.test(b.state));
    if (failed) {
      console.error(`wait-draft: v${expected} is ${failed.state} (#${failed.id}) — P139 fail-closed`);
      process.exit(1);
    }
    const ready = mine.find((b) => b.state === 'draft' || b.state === 'test' || b.state === '');
    if (ready) {
      console.log(`wait-draft: v${expected} ready as ${ready.state || 'draft'} #${ready.id}`);
      return;
    }
    const latest = builds[0];
    console.log(`wait-draft: v${expected} not ready yet (latest ${latest ? `${latest.version} ${latest.state}` : 'none'})`);
    await sleep(STEP_MS);
  }

  console.log(`wait-draft: timed out after ${MAX_MS}ms — continue to promote/verify`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
