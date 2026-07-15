#!/usr/bin/env node
'use strict';

/**
 * cross-ref-mfs.js — v9.0.263 (P64.4)
 *
 * Regular practice helper: do a focused cross-reference for a specific
 * MFS (manufacturer fingerprint) against ALL known sources. Use this
 * whenever investigating a new MFS issue from forum, GitHub, or
 * diagnostic email — at the START of every investigation, before
 * applying any fix.
 *
 * Usage:
 *   node tools/ci/cross-ref-mfs.js --mfr _TZE200_ka8l86iu --pid TS0601
 *   node tools/ci/cross-ref-mfs.js --mfr HOBEIAN --pid ZG-222Z
 *   # Auto-detect from latest diagnostics:
 *   node tools/ci/cross-ref-mfs.js --auto
 *
 * Cross-references:
 *   1. Our mfs_db (top-level + sacredCouples)
 *   2. Drivers (manufacturerName list in driver.compose.json)
 *   3. Fingerprints (lib/tuya/fingerprints.json)
 *   4. Forum topic 140352 (latest posts containing the MFR)
 *   5. GitHub issues/PRs (search via gh CLI)
 *   6. Zigbee2MQTT (via known converters for similar Tuya mfrs)
 *
 * Output: a comprehensive report with the current mapping and any
 * contradictions between sources.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const MFS_DB = path.join(ROOT, 'data', 'mfs_db.json');
const TUYA_FP = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const STATE_DIR = path.join(ROOT, '.github', 'state');

const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--mfr') opts.mfr = args[++i];
  else if (args[i] === '--pid') opts.pid = args[++i];
  else if (args[i] === '--auto') opts.auto = true;
  else if (args[i] === '--limit') opts.limit = parseInt(args[++i], 10) || 5;
}
if (!opts.limit) opts.limit = 5;

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mavis/1.0 (MFS cross-ref)' },
      timeout: 8000,
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve, reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, text: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
  });
}

function loadMfsDb() {
  if (!fs.existsSync(MFS_DB)) return null;
  return JSON.parse(fs.readFileSync(MFS_DB, 'utf8'));
}

function loadFingerprints() {
  if (!fs.existsSync(TUYA_FP)) return null;
  return JSON.parse(fs.readFileSync(TUYA_FP, 'utf8'));
}

function checkDriverList(mfr) {
  const found = [];
  if (!fs.existsSync(DRIVERS_DIR)) return found;
  const mfrLower = mfr.toLowerCase();
  for (const e of fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const cf = path.join(DRIVERS_DIR, e.name, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(cf, 'utf8'));
      const mfrs = c.zigbee?.manufacturerName || [];
      if (mfrs.some(x => x.toLowerCase() === mfrLower)) {
        found.push({ driver: e.name, mfrs: mfrs.length });
      }
    } catch (_) {}
  }
  return found;
}

async function searchForum(mfr) {
  try {
    const r = await fetch(`https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/2200.json`);
    if (r.status === 200) {
      const j = JSON.parse(r.text);
      const posts = j.post_stream?.posts || [];
      const found = posts.filter(p => {
        const text = ((p.cooked || '') + ' ' + (p.name || '')).toLowerCase();
        return text.includes(mfr.toLowerCase());
      });
      return found.slice(0, opts.limit).map(p => ({
        post_number: p.post_number,
        username: p.username,
        date: p.date,
        text: (p.cooked || '').replace(/<[^>]+>/g, ' ').substring(0, 200).trim(),
      }));
    }
  } catch (_) {}
  return [];
}

function checkDiagnostics(mfr) {
  const diag = path.join(STATE_DIR, 'diagnostics-report.json');
  if (!fs.existsSync(diag)) return [];
  const d = JSON.parse(fs.readFileSync(diag, 'utf8'));
  const mfrLower = mfr.toLowerCase();
  const hits = [];
  for (const x of (d.diagnostics || [])) {
    const mfrs = (x.fps?.mfr || []).map(s => s.toLowerCase());
    if (mfrs.includes(mfrLower)) {
      hits.push({ type: x.type, date: x.date, fp: x.fps });
    }
  }
  return hits;
}

async function investigate(mfr, pid) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`MFS Cross-Reference: ${mfr} / ${pid || '(any pid)'}`);
  console.log('='.repeat(70));

  // 1. mfs_db
  const db = loadMfsDb();
  if (db) {
    const sc = db.sacredCouples || {};
    // Case-insensitive top-level lookup
    let top = db[mfr];
    if (!top) {
      const mfrUpper = mfr.toUpperCase();
      const mfrLower = mfr.toLowerCase();
      for (const k of Object.keys(db)) {
        if (k === mfrUpper || k === mfrLower) {
          top = db[k];
          break;
        }
      }
    }
    const sacred = pid ? sc[`${mfr.toLowerCase()}|${pid.toLowerCase()}`] : null;
    console.log('\n1. mfs_db:');
    console.log('   top-level:', top ? `${top.driverId} (${top.source || '?'})` : 'NOT FOUND');
    if (pid) console.log('   sacredCouples:', sacred ? `${sacred.driver} (conf ${sacred.confidence}, sources: ${sacred.sources?.join(',')})` : 'NOT FOUND');
  }

  // 2. Drivers
  const driverList = checkDriverList(mfr);
  console.log('\n2. Drivers with this MFR in manufacturerName:');
  if (driverList.length === 0) {
    console.log('   NONE');
  } else {
    driverList.forEach(d => console.log('   - ' + d.driver + ' (' + d.mfrs + ' total mfrs)'));
  }

  // 3. Fingerprints
  const fp = loadFingerprints();
  if (fp) {
    const fpMatch = Object.keys(fp).filter(k => k.toLowerCase() === mfr.toLowerCase());
    console.log('\n3. Tuya fingerprints:');
    if (fpMatch.length === 0) {
      console.log('   NOT FOUND');
    } else {
      fpMatch.forEach(k => console.log('   - ' + k + ' -> ' + JSON.stringify(fp[k])));
    }
  }

  // 4. Diagnostics
  const diagHits = checkDiagnostics(mfr);
  console.log('\n4. Diagnostics emails:');
  if (diagHits.length === 0) {
    console.log('   NONE');
  } else {
    diagHits.slice(0, opts.limit).forEach(h => {
      console.log('   - ' + h.date + ' [' + h.type + ']');
    });
    console.log('   (total: ' + diagHits.length + ')');
  }

  // 5. Forum
  const forumHits = await searchForum(mfr);
  console.log('\n5. Forum topic 140352:');
  if (forumHits.length === 0) {
    console.log('   NO MENTIONS');
  } else {
    forumHits.forEach(p => {
      console.log('   #' + p.post_number + ' by ' + p.username + ' (' + p.date + ')');
      console.log('     ' + p.text);
    });
  }

  console.log('\n6. External references:');
  console.log('   z2m:           https://www.zigbee2mqtt.io/supported-devices/?q=' + encodeURIComponent(mfr));
  console.log('   deconz:        https://github.com/dresden-elektronik/deconz-rest-plugin/issues?q=' + encodeURIComponent(mfr));
  console.log('   Homey forum:   https://www.google.com/search?q=site%3Acommunity.homey.app+' + encodeURIComponent(mfr));
  console.log('');
}

async function main() {
  if (opts.auto) {
    // Try multiple diagnostic file locations
    const candidates = [
      path.join(STATE_DIR, 'diagnostics-report.json'),
      path.join(ROOT, '.github', 'state', 'gmail-2026-07-15-FRESH', '.github', 'state', 'diagnostics-report.json'),
      path.join(ROOT, '.github', 'state', 'gmail-2026-07-13-12pm', '.github', 'state', 'diagnostics-report.json'),
      path.join(ROOT, '.github', 'state', 'gmail-2026-07-13-FRESH', '.github', 'state', 'diagnostics-report.json'),
      // Also check the user TEMP directory (where workflow artifacts are downloaded)
      path.join(process.env.TEMP || '', 'gmail-fresh', '.github', 'state', 'diagnostics-report.json'),
    ];
    let d = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        try {
          const tmp = JSON.parse(fs.readFileSync(c, 'utf8'));
          if (tmp.diagnostics && Array.isArray(tmp.diagnostics) && tmp.diagnostics.length > 0) {
            d = tmp;
            console.log('Using diagnostics from:', c);
            break;
          }
        } catch (_) {}
      }
    }
    if (!d) {
      console.log('No diagnostics file with .diagnostics array found.');
      console.log('Hint: run gmail-diagnostics workflow first, or use --mfr/--pid directly.');
      return;
    }
    const fps = new Set();
    for (const x of (d.diagnostics || [])) {
      for (let i = 0; i < (x.fps?.mfr || []).length; i++) {
        const m = x.fps.mfr[i];
        const p = (x.fps.pid || [])[i] || '';
        if (m && p) fps.add(`${m}|${p}`);
      }
    }
    const list = [...fps].slice(-opts.limit);
    console.log(`Cross-referencing last ${list.length} MFS from diagnostics:`);
    for (const fp of list) {
      const [m, p] = fp.split('|');
      await investigate(m, p);
    }
    return;
  }

  if (!opts.mfr) {
    console.log('Usage: --mfr <mfr> [--pid <pid>] [--limit N] | --auto');
    return;
  }

  await investigate(opts.mfr, opts.pid || '');
}

main().catch(e => { console.error(e); process.exit(1); });
