#!/usr/bin/env node
'use strict';

/**
 * cross-ref-mfs.js — v9.0.265 (P64.7)
 *
 * Regular practice helper: cross-reference an MFS (manufacturer + product
 * ID + optional device name) against ALL known sources. Use this
 * whenever investigating a new MFS issue from forum, GitHub, or
 * diagnostic email — at the START of every investigation, before
 * applying any fix.
 *
 * **IMPORTANT — Sacred Couple (mfr+pid) is NOT unique**:
 *   - A single MFR can have multiple PIDs
 *   - A single (mfr+pid) combo can map to multiple device names per source
 *   - The Z2M/Hubitat/deconz/Homey platforms each assign different names
 *   - ALWAYS investigate by (mfr + pid + device_name) combo, not just mfr
 *
 * Usage:
 *   node tools/ci/cross-ref-mfs.js --mfr _TZE200_ka8l86iu --pid TS0601
 *   node tools/ci/cross-ref-mfs.js --mfr HOBEIAN --pid ZG-222Z
 *   node tools/ci/cross-ref-mfs.js --mfr _TZE200_ka8l86iu --pid TS0601 --name "ZG-204ZK"
 *   node tools/ci/cross-ref-mfs.js --name "ZG-204ZK"   # show all (mfr,pid) for this name
 *   node tools/ci/cross-ref-mfs.js --family "ZG-204"    # show all related ZG-204* devices
 *   node tools/ci/cross-ref-mfs.js --auto               # last 5 from diagnostics
 *
 * Cross-references (8 sources):
 *   1. mfs_db (top-level + sacredCouples)
 *   2. Drivers (manufacturerName list in driver.compose.json)
 *   3. Tuya fingerprints (lib/tuya/fingerprints.json)
 *   4. Z2M cache (data/z2m_cache.json + herdsman-converters)
 *   5. Diagnostics emails
 *   6. Forum topic 140352
 *   7. GitHub issues/PRs
 *   8. Hubitat community (Google search)
 *
 * Output: a comprehensive report with all (mfr, pid, name) combos and
 * any contradictions between sources.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const MFS_DB = path.join(ROOT, 'data', 'mfs_db.json');
const TUYA_FP = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const STATE_DIR = path.join(ROOT, '.github', 'state');
const Z2M_CACHE = path.join(ROOT, 'data', 'z2m_cache.json');

const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--mfr') opts.mfr = args[++i];
  else if (args[i] === '--pid') opts.pid = args[++i];
  else if (args[i] === '--name') opts.name = args[++i];
  else if (args[i] === '--family') opts.family = args[++i];
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

function loadZ2MCache() {
  if (!fs.existsSync(Z2M_CACHE)) return null;
  return JSON.parse(fs.readFileSync(Z2M_CACHE, 'utf8'));
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

// Look up all (mfr, pid) combos for a given device name across all sources
function lookupByName(name) {
  const results = new Set();
  const nameLower = name.toLowerCase();
  // Search Z2M cache (also strip parenthetical text like "Z2M renames ZP → ZK")
  const z2m = loadZ2MCache();
  if (z2m) {
    for (const [key, val] of Object.entries(z2m)) {
      if (key.startsWith('_') || typeof val !== 'object') continue;
      // Recurse into all nested objects (the cache is 2-level deep)
      const visit = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        // If this object has z2m_model and manufacturerName, treat it as a leaf
        if (obj.z2m_model && obj.manufacturerName) {
          const z2mModelName = String(obj.z2m_model).split(' ')[0].toLowerCase();
          if (z2mModelName === nameLower || z2mModelName.includes(nameLower) || nameLower.includes(z2mModelName)) {
            for (const mfr of (obj.manufacturerName || [])) {
              for (const pid of (obj.modelId ? [obj.modelId] : [])) {
                results.add(`${mfr}|${pid}`);
              }
            }
          }
        }
        if (obj.model && obj.fingerprint) {
          for (const f of (obj.fingerprint || [])) {
            if (f.modelID && String(obj.model).toLowerCase().includes(nameLower) && f.manufacturerName) {
              results.add(`${f.manufacturerName}|${f.modelID}`);
            }
          }
        }
        // Recurse into sub-objects
        for (const sub of Object.values(obj)) {
          if (sub && typeof sub === 'object' && !Array.isArray(sub)) {
            visit(sub);
          }
        }
      };
      visit(val);
    }
  }
  // Search mfs_db
  const db = loadMfsDb();
  if (db) {
    for (const [k, v] of Object.entries(db.sacredCouples || {})) {
      const pnames = v.productNames || (v.productName ? [v.productName] : []);
      if (pnames.some(n => n && n.toLowerCase().includes(nameLower))) {
        results.add(k);
      }
    }
  }
  return [...results];
}

// Look up all known device names for a given (mfr, pid)
function lookupNamesForMfrPid(mfr, pid) {
  const names = new Set();
  // Z2M cache
  const z2m = loadZ2MCache();
  if (z2m) {
    for (const [key, val] of Object.entries(z2m)) {
      if (key.startsWith('_') || typeof val !== 'object') continue;
      const visit = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj.manufacturerName && obj.modelId) {
          const mfrs = (obj.manufacturerName || []).map(x => x.toLowerCase());
          const pids = obj.modelId ? [obj.modelId.toLowerCase()] : [];
          if (mfrs.includes(mfr.toLowerCase()) && pids.includes(pid.toLowerCase())) {
            if (obj.z2m_model) names.add(`${obj.z2m_model} (z2m, family=${key})`);
            if (obj.description) names.add(`"${obj.description}"`);
          }
        }
        for (const sub of Object.values(obj)) {
          if (sub && typeof sub === 'object' && !Array.isArray(sub)) visit(sub);
        }
      };
      visit(val);
    }
  }
  // mfs_db
  const db = loadMfsDb();
  if (db) {
    const sc = db.sacredCouples || {};
    const k = `${mfr.toLowerCase()}|${pid.toLowerCase()}`;
    const v = sc[k];
    if (v) {
      const pnames = v.productNames || (v.productName ? [v.productName] : []);
      pnames.forEach(n => names.add(`${n} (mfs_db)`));
    }
  }
  return [...names];
}

async function investigate(mfr, pid, name) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`MFS Cross-Reference: ${mfr || '?'} / ${pid || '?'} ${name ? `[${name}]` : ''}`);
  console.log('='.repeat(70));

  // 0. Device name variants for this (mfr, pid) combo
  if (mfr && pid) {
    const names = lookupNamesForMfrPid(mfr, pid);
    console.log('\n0. Device names for this (mfr+pid):');
    if (names.length === 0) console.log('   NONE in cache');
    else names.forEach(n => console.log('   - ' + n));
  }

  // 1. mfs_db
  const db = loadMfsDb();
  if (db) {
    const sc = db.sacredCouples || {};
    let top = null;
    if (mfr) {
      top = db[mfr];
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
    }
    const sacred = (mfr && pid) ? sc[`${mfr.toLowerCase()}|${pid.toLowerCase()}`] : null;
    console.log('\n1. mfs_db:');
    if (mfr) console.log('   top-level:', top ? `${top.driverId} (${top.source || '?'})` : 'NOT FOUND');
    if (mfr && pid) console.log('   sacredCouples:', sacred ? `${sacred.driver} (conf ${sacred.confidence}, sources: ${sacred.sources?.join(',')})` : 'NOT FOUND');
    if (!mfr) console.log('   (no --mfr provided, skipping)');
  }

  // 2. Drivers
  if (mfr) {
    const driverList = checkDriverList(mfr);
    console.log('\n2. Drivers with this MFR in manufacturerName:');
    if (driverList.length === 0) console.log('   NONE');
    else driverList.forEach(d => console.log('   - ' + d.driver + ' (' + d.mfrs + ' total mfrs)'));
  } else {
    console.log('\n2. Drivers: (no --mfr provided)');
  }

  // 3. Fingerprints
  const fp = loadFingerprints();
  if (fp && mfr) {
    const fpMatch = Object.keys(fp).filter(k => k.toLowerCase() === mfr.toLowerCase());
    console.log('\n3. Tuya fingerprints:');
    if (fpMatch.length === 0) {
      console.log('   NOT FOUND');
    } else {
      fpMatch.forEach(k => console.log('   - ' + k + ' -> ' + JSON.stringify(fp[k])));
    }
  } else {
    console.log('\n3. Tuya fingerprints: (no --mfr provided)');
  }

  // 4. Diagnostics
  if (mfr) {
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
  } else {
    console.log('\n4. Diagnostics emails: (no --mfr provided)');
  }

  // 5. Forum
  if (mfr) {
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
  } else {
    console.log('\n5. Forum topic 140352: (no --mfr provided)');
  }

  // 6. Z2M cache (combos)
  if (mfr && pid) {
    const z2m = loadZ2MCache();
    if (z2m) {
      console.log('\n6. Z2M (data/z2m_cache.json):');
      let found = false;
      for (const [key, val] of Object.entries(z2m)) {
        if (key.startsWith('_') || typeof val !== 'object') continue;
        const visit = (obj, parentKey) => {
          if (!obj || typeof obj !== 'object') return;
          if (obj.manufacturerName && obj.modelId) {
            const mfrs = (obj.manufacturerName || []).map(x => x.toLowerCase());
            const pids = obj.modelId ? [obj.modelId.toLowerCase()] : [];
            if (mfrs.includes(mfr.toLowerCase()) && pids.includes(pid.toLowerCase())) {
              found = true;
              console.log(`   - [${parentKey || key}] ${obj.z2m_model || '?'} (${obj.vendor || '?'}): ${obj.description || '?'}`);
              if (obj.z2m_link) console.log(`     ${obj.z2m_link}`);
              if (obj.note) console.log(`     NOTE: ${obj.note}`);
            }
          }
          for (const sub of Object.values(obj)) {
            if (sub && typeof sub === 'object' && !Array.isArray(sub)) visit(sub, parentKey);
          }
        };
        visit(val, key);
      }
      if (!found) console.log('   NOT FOUND in z2m_cache');
    }
  }

  // 7. Hubitat / external
  console.log('\n7. External references:');
  if (mfr) {
    console.log('   z2m:           https://www.zigbee2mqtt.io/supported-devices/?q=' + encodeURIComponent(mfr));
    console.log('   deconz:        https://github.com/dresden-elektronik/deconz-rest-plugin/issues?q=' + encodeURIComponent(mfr));
    console.log('   Homey forum:   https://www.google.com/search?q=site%3Acommunity.homey.app+' + encodeURIComponent(mfr));
  } else if (name) {
    console.log('   z2m:           https://www.zigbee2mqtt.io/supported-devices/?q=' + encodeURIComponent(name));
    console.log('   deconz:        https://github.com/dresden-elektronik/deconz-rest-plugin/issues?q=' + encodeURIComponent(name));
    console.log('   Hubitat:       https://community.hubitat.com/search?q=' + encodeURIComponent(name));
  }
  console.log('');
}

async function investigateByName(name) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Device name: ${name}`);
  console.log('='.repeat(70));

  // Find all (mfr, pid) combos for this name
  const combos = lookupByName(name);
  console.log('\nFound (mfr, pid) combos:');
  if (combos.length === 0) {
    console.log('   NONE in cache');
    return;
  }
  combos.forEach(c => console.log('   - ' + c));

  // Investigate each combo
  for (const combo of combos) {
    const [mfr, pid] = combo.split('|');
    await investigate(mfr, pid, name);
  }
}

async function investigateFamily(family) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Device family: ${family}`);
  console.log('='.repeat(70));

  const z2m = loadZ2MCache();
  if (!z2m) {
    console.log('Z2M cache not found');
    return;
  }

  // Find family block
  const familyKey = Object.keys(z2m).find(k => k.includes(family) || k.toLowerCase().includes(family.toLowerCase()));
  if (!familyKey) {
    console.log('No family block found in z2m cache');
    return;
  }
  const block = z2m[familyKey];
  console.log(`\nFound family block: ${familyKey}`);
  console.log('Variants in this family:');
  for (const [modelName, info] of Object.entries(block)) {
    console.log(`\n--- ${modelName} ---`);
    console.log(`  Vendor: ${info.vendor || '?'}`);
    console.log(`  Description: ${info.description || '?'}`);
    if (info.manufacturerName) {
      console.log(`  MFRs: ${info.manufacturerName.join(', ')}`);
    }
    if (info.modelId) {
      console.log(`  PIDs: ${info.modelId}`);
    }
    if (info.z2m_model) {
      console.log(`  Z2M model: ${info.z2m_model}`);
    }
    if (info.z2m_link) {
      console.log(`  Z2M link: ${info.z2m_link}`);
    }
    if (info.note) {
      console.log(`  NOTE: ${info.note}`);
    }
  }
}

async function main() {
  if (opts.family) {
    await investigateFamily(opts.family);
    return;
  }

  if (opts.name && !opts.mfr) {
    await investigateByName(opts.name);
    return;
  }

  if (opts.auto) {
    const candidates = [
      path.join(STATE_DIR, 'diagnostics-report.json'),
      path.join(ROOT, '.github', 'state', 'gmail-2026-07-15-FRESH', '.github', 'state', 'diagnostics-report.json'),
      path.join(process.env.TEMP || '', 'gmail-fresh', '.github', 'state', 'diagnostics-report.json'),
      path.join(process.env.TEMP || '', 'gmail-fresh-2026-07-15', 'sanitized-diagnostics-report', '.github', 'state', 'diagnostics-report.json'),
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

  if (!opts.mfr && !opts.name) {
    console.log('Usage:');
    console.log('  --mfr <mfr> [--pid <pid>] [--name <name>]    # investigate one MFS');
    console.log('  --name <device_name>                        # all (mfr,pid) for a name');
    console.log('  --family <family_prefix>                     # e.g. --family "ZG-204"');
    console.log('  --auto                                       # last 5 from diagnostics');
    return;
  }

  await investigate(opts.mfr, opts.pid || '', opts.name || '');
}

main().catch(e => { console.error(e); process.exit(1); });
