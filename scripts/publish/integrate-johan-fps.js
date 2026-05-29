#!/usr/bin/env node
'use strict';
/**
 * integrate-johan-fps.js — Integrates fingerprints from Johan Bendz open PRs
 * into our driver.compose.json files.
 * 
 * Fetches all open PRs from JohanBendz/com.tuya.zigbee, extracts new FPs from
 * driver.compose.json patches, and adds them to matching local drivers.
 */
const fs    = require('fs');
const path  = require('path');
const https = require('https');

const ROOT       = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const DRY        = process.argv.includes('--dry-run');
const TOKEN      = process.env.GH_PAT || process.env.GITHUB_TOKEN;

function get(url) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    let d = '';
    const opts = {
      hostname: u.hostname, path: u.pathname + u.search,
      headers: {
        'Authorization': TOKEN ? `Bearer ${TOKEN}` : '',
        'User-Agent': 'tuya-fp-integrator',
        'Accept': 'application/vnd.github+json'
      }
    };
    https.get(opts, r => {
      r.on('data', x => d += x);
      r.on('end', () => { try { res(JSON.parse(d)); } catch { res(d); } });
    }).on('error', rej);
  });
}

// Extract Tuya FPs from patch text
function extractFromPatch(patch) {
  if (!patch) return { mfr: [], pid: [] };
  // Only look at ADDED lines (+)
  const added = patch.split('\n').filter(l => l.startsWith('+')).join('\n');
  const mfr = [...new Set((added.match(/_TZ[A-Za-z0-9]{2,4}_[A-Za-z0-9]{6,}/g) || []))];
  const pid = [...new Set((added.match(/\bTS[0-9A-Fa-f]{4}[A-Z]?\b/g) || []))];
  return { mfr, pid };
}

// Find best matching local driver by name
function findLocalDriver(driverName) {
  if (!fs.existsSync(DRIVERS_DIR)) return null;
  const exact = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  if (fs.existsSync(exact)) return exact;
  // Fuzzy: try common name variations
  const variants = [
    driverName.replace(/_\d+$/, ''),          // remove trailing _1, _2
    driverName.replace(/_sensor$/, ''),        // remove _sensor suffix
    driverName.replace(/_2$/, ''),
    driverName + '_2',
    driverName.replace('sensor', 'sensor_2'),
  ];
  for (const v of variants) {
    const p = path.join(DRIVERS_DIR, v, 'driver.compose.json');
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Add FPs to a driver.compose.json
function addFPsToDriver(composePath, newMfr, newPid) {
  try {
    const comp = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    if (!comp.zigbee) return { added: 0 };
    let added = 0;
    const mfrArr = comp.zigbee.manufacturerName || [];
    const pidArr = comp.zigbee.productId || [];
    
    for (const mfr of newMfr) {
      if (!mfrArr.includes(mfr)) { mfrArr.push(mfr); added++; }
    }
    for (const pid of newPid) {
      if (!pidArr.includes(pid)) { pidArr.push(pid); added++; }
    }
    
    if (added > 0 && !DRY) {
      comp.zigbee.manufacturerName = [...new Set(mfrArr)].sort();
      if (newPid.length > 0) comp.zigbee.productId = [...new Set(pidArr)].sort();
      fs.writeFileSync(composePath, JSON.stringify(comp, null, 2) + '\n', 'utf8');
    }
    return { added };
  } catch (e) {
    return { added: 0, error: e.message };
  }
}

async function main() {
  console.log(`📡 Fetching Johan Bendz open PRs...${DRY ? ' [DRY RUN]' : ''}`);
  
  const prs = await get('https://api.github.com/repos/JohanBendz/com.tuya.zigbee/pulls?state=open&per_page=30');
  if (!Array.isArray(prs)) { console.error('Failed to get PRs:', prs); process.exit(1); }
  console.log(`Found ${prs.length} open PRs\n`);
  
  const report = { processed: 0, totalAdded: 0, byDriver: [], skipped: [] };
  
  for (const pr of prs) {
    const files = await get(`https://api.github.com/repos/JohanBendz/com.tuya.zigbee/pulls/${pr.number}/files`);
    if (!Array.isArray(files)) continue;
    
    for (const f of files) {
      if (!f.filename || !f.filename.includes('driver.compose.json')) continue;
      
      const { mfr, pid } = extractFromPatch(f.patch);
      if (!mfr.length && !pid.length) continue;
      
      // Get driver name from path: drivers/<name>/driver.compose.json
      const parts = f.filename.split('/');
      const driverName = parts[1] || '';
      if (!driverName) continue;
      
      const localPath = findLocalDriver(driverName);
      if (!localPath) {
        report.skipped.push({ pr: pr.number, driver: driverName, mfr, pid, reason: 'No matching local driver' });
        continue;
      }
      
      const result = addFPsToDriver(localPath, mfr, pid);
      if (result.added > 0) {
        console.log(`  ✅ PR#${pr.number} → ${driverName}: +${result.added} FPs (${mfr.slice(0,2).join(',')})`);
        report.byDriver.push({ pr: pr.number, driver: driverName, driverPath: localPath, mfr, pid, added: result.added });
        report.totalAdded += result.added;
      } else {
        console.log(`  ℹ️  PR#${pr.number} → ${driverName}: all FPs already present`);
      }
      report.processed++;
    }
  }
  
  // Also check Johan's recently merged PRs (last 30 days) for FPs we missed
  console.log('\n📡 Checking recently merged Johan PRs (30 days)...');
  const merged = await get('https://api.github.com/repos/JohanBendz/com.tuya.zigbee/pulls?state=closed&per_page=50&sort=updated');
  if (Array.isArray(merged)) {
    const recent = merged.filter(p => p.merged_at && Date.now() - new Date(p.merged_at) < 30 * 24 * 3600 * 1000);
    console.log(`Found ${recent.length} merged PRs in last 30 days`);
    for (const pr of recent.slice(0, 20)) {
      const files = await get(`https://api.github.com/repos/JohanBendz/com.tuya.zigbee/pulls/${pr.number}/files`);
      if (!Array.isArray(files)) continue;
      for (const f of files) {
        if (!f.filename?.includes('driver.compose.json')) continue;
        const { mfr, pid } = extractFromPatch(f.patch);
        if (!mfr.length && !pid.length) continue;
        const driverName = f.filename.split('/')[1] || '';
        const localPath = findLocalDriver(driverName);
        if (!localPath) { report.skipped.push({ pr: pr.number, driver: driverName, mfr, pid, reason: 'merged/no-local-driver' }); continue; }
        const result = addFPsToDriver(localPath, mfr, pid);
        if (result.added > 0) {
          console.log(`  ✅ Merged PR#${pr.number} → ${driverName}: +${result.added} FPs`);
          report.byDriver.push({ pr: pr.number, driver: driverName, mfr, pid, added: result.added, merged: true });
          report.totalAdded += result.added;
        }
      }
    }
  }
  
  // Now rebuild app.json from all updated driver.compose.json files
  if (report.totalAdded > 0 && !DRY) {
    console.log('\n🔄 Rebuilding app.json from updated driver.compose.json files...');
    try {
      // Re-read all drivers and update app.json entries
      const appPath = path.join(ROOT, 'app.json');
      const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
      let appUpdated = 0;
      
      for (const entry of report.byDriver) {
        if (!fs.existsSync(entry.driverPath)) continue;
        const comp = JSON.parse(fs.readFileSync(entry.driverPath, 'utf8'));
        const appDriver = app.drivers.find(d => d.id === entry.driver);
        if (!appDriver || !appDriver.zigbee) continue;
        const merged = [...new Set([...(appDriver.zigbee.manufacturerName || []), ...(comp.zigbee?.manufacturerName || [])])].filter(Boolean).sort();
        if (JSON.stringify(merged) !== JSON.stringify(appDriver.zigbee.manufacturerName)) {
          appDriver.zigbee.manufacturerName = merged;
          appUpdated++;
        }
      }
      
      if (appUpdated > 0) {
        fs.writeFileSync(appPath, JSON.stringify(app), 'utf8'); // Write compact
        console.log(`  ✅ app.json updated: ${appUpdated} drivers synced`);
      }
    } catch (e) { console.error('  ⚠️  app.json rebuild error:', e.message); }
  }
  
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  INTEGRATION COMPLETE`);
  console.log(`  Files processed: ${report.processed}`);
  console.log(`  Total FPs added: ${report.totalAdded}${DRY ? ' (DRY RUN)' : ''}`);
  console.log(`  Drivers updated: ${report.byDriver.length}`);
  console.log(`  Skipped (no local driver): ${report.skipped.length}`);
  if (report.skipped.length > 0) {
    console.log('\n  Skipped (need new drivers):');
    report.skipped.slice(0, 10).forEach(s => console.log(`    PR#${s.pr} ${s.driver}: ${s.mfr.slice(0,2).join(',')}`));
  }
  console.log(`${'═'.repeat(55)}\n`);
  
  fs.mkdirSync(path.join(ROOT, '.github', 'state'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, '.github', 'state', 'johan-integration-report.json'), JSON.stringify(report, null, 2));
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
