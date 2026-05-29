#!/usr/bin/env node
'use strict';
/**
 * force-publish-safe.js — Force publish to Homey App Store without AggregateError
 * 
 * Pipeline:
 *  1. Pre-clean: fix empty manufacturerName (root cause of AggregateError)
 *  2. Compact app.json (prevent Athom 5MB rejection)
 *  3. Remove .homeycompose (prevent re-inflation by compose plugin)
 *  4. Validate critical files at root (README.txt etc.)
 *  5. Run homey app validate --level publish
 *  6. Publish via homey CLI
 * 
 * Usage: node scripts/publish/force-publish-safe.js [--dry-run]
 */
const fs   = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT   = process.cwd();
const DRY    = process.argv.includes('--dry-run');
const BRANCH = process.argv.includes('--branch') ? process.argv[process.argv.indexOf('--branch') + 1] : null;

// ─── Logger ──────────────────────────────────────────────────────────────────
const log  = (msg, ...a) => console.log(`  ${msg}`, ...a);
const ok   = (msg, ...a) => console.log(`  ✅ ${msg}`, ...a);
const err  = (msg, ...a) => { console.error(`  ❌ ${msg}`, ...a); process.exit(1); };
const warn = (msg, ...a) => console.warn(`  ⚠️  ${msg}`, ...a);
const step = (n, msg)    => console.log(`\n[STEP ${n}] ${msg}`);
const box  = (msg)       => { console.log('\n' + '═'.repeat(60)); console.log('  ' + msg); console.log('═'.repeat(60)); };

function run(cmd, opts = {}) {
  const res = spawnSync(cmd, { shell: true, encoding: 'utf8', cwd: ROOT, ...opts });
  return { stdout: (res.stdout || '').trim(), stderr: (res.stderr || '').trim(), code: res.status || 0 };
}

// ─── STEP 1: Pre-clean — fix empty/null manufacturerName ─────────────────────
function step1_preclean() {
  step(1, 'PRE-CLEAN: Fix empty manufacturerName (AggregateError root cause)');
  
  const appPath = path.join(ROOT, 'app.json');
  const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
  let fixed = 0, warned = 0;

  for (const d of app.drivers) {
    if (!d.zigbee) continue;
    
    // Case A: manufacturerName is null/undefined → set to []
    if (!d.zigbee.manufacturerName) {
      d.zigbee.manufacturerName = [];
      fixed++;
      continue;
    }
    
    // Case B: manufacturerName is not an array → wrap it
    if (!Array.isArray(d.zigbee.manufacturerName)) {
      d.zigbee.manufacturerName = [d.zigbee.manufacturerName].filter(Boolean);
      fixed++;
      continue;
    }
    
    // Case C: array contains empty strings, null, or whitespace
    const before = d.zigbee.manufacturerName.length;
    d.zigbee.manufacturerName = d.zigbee.manufacturerName.filter(n => n && typeof n === 'string' && n.trim() !== '');
    if (d.zigbee.manufacturerName.length !== before) {
      fixed++;
      warn(`Removed ${before - d.zigbee.manufacturerName.length} empty entries from ${d.id}`);
    }
  }

  // Also fix driver.compose.json files in drivers/ directory
  const driversDir = path.join(ROOT, 'drivers');
  let srcFixed = 0;
  if (fs.existsSync(driversDir)) {
    for (const dname of fs.readdirSync(driversDir)) {
      const fp = path.join(driversDir, dname, 'driver.compose.json');
      if (!fs.existsSync(fp)) continue;
      try {
        const comp = JSON.parse(fs.readFileSync(fp, 'utf8'));
        let changed = false;
        if (comp.zigbee) {
          if (!comp.zigbee.manufacturerName) { comp.zigbee.manufacturerName = []; changed = true; }
          else if (!Array.isArray(comp.zigbee.manufacturerName)) { comp.zigbee.manufacturerName = [comp.zigbee.manufacturerName].filter(Boolean); changed = true; }
          else {
            const before = comp.zigbee.manufacturerName.length;
            comp.zigbee.manufacturerName = comp.zigbee.manufacturerName.filter(n => n && typeof n === 'string' && n.trim() !== '');
            if (comp.zigbee.manufacturerName.length !== before) changed = true;
          }
        }
        if (changed) { fs.writeFileSync(fp, JSON.stringify(comp, null, 2) + '\n', 'utf8'); srcFixed++; }
      } catch { /* skip corrupt files */ }
    }
  }

  ok(`Pre-clean done: ${fixed} app.json drivers fixed, ${srcFixed} driver.compose.json fixed`);
  
  // Final check — must be ZERO empty entries
  const final = app.drivers.filter(d => {
    if (!d.zigbee) return false;
    const names = d.zigbee.manufacturerName;
    if (!Array.isArray(names)) return true;
    return names.some(n => !n || n.trim() === '');
  });
  if (final.length > 0) err(`Still ${final.length} drivers with invalid manufacturerName!`);
  ok('AggregateError check: 0 empty manufacturerNames');
  
  return app;
}

// ─── STEP 2: Compact app.json ─────────────────────────────────────────────────
function step2_compact(app) {
  step(2, 'COMPACT app.json (prevent Athom 5MB rejection)');
  
  const compact = JSON.stringify(app); // No indentation = ~40% smaller
  const mb = (Buffer.byteLength(compact, 'utf8') / 1024 / 1024).toFixed(2);
  
  if (parseFloat(mb) > 5.0) err(`app.json compact size ${mb}MB > 5MB Athom limit!`);
  if (parseFloat(mb) > 4.0) warn(`app.json ${mb}MB approaching 5MB limit`);
  
  if (!DRY) fs.writeFileSync(path.join(ROOT, 'app.json'), compact, 'utf8');
  ok(`app.json compacted: ${mb}MB (< 5MB ✓) | ${app.drivers.length} drivers`);
}

// ─── STEP 3: Remove .homeycompose (prevent re-inflation) ─────────────────────
function step3_remove_compose() {
  step(3, 'REMOVE .homeycompose (prevents compose plugin re-inflating app.json)');
  const hc = path.join(ROOT, '.homeycompose');
  if (fs.existsSync(hc)) {
    if (!DRY) fs.rmSync(hc, { recursive: true, force: true });
    ok('.homeycompose removed');
  } else {
    ok('.homeycompose not present (already clean)');
  }
}

// ─── STEP 4: Critical root file validation ────────────────────────────────────
function step4_validate_files() {
  step(4, 'CRITICAL ROOT FILES check (files that must NEVER be ignored or missing)');
  
  // Files that MUST exist at root for Athom validation
  const REQUIRED = [
    { path: 'README.txt',         minBytes: 100,   desc: 'Athom Store description (EN) — REQUIRED by Athom' },
    { path: 'app.json',           minBytes: 10000, desc: 'App manifest' },
    { path: 'app.js',             minBytes: 1000,  desc: 'App entry point' },
    { path: 'package.json',       minBytes: 200,   desc: 'NPM manifest' },
    { path: '.homeyignore',       minBytes: 10,    desc: 'Homey publish ignore rules' },
    { path: '.homeyplugins.json', minBytes: 10,    desc: 'Homey plugins config' },
    { path: 'assets/icon.svg',    minBytes: 100,   desc: 'App icon' },
  ];
  
  let hasError = false;
  for (const req of REQUIRED) {
    const fp = path.join(ROOT, req.path);
    if (!fs.existsSync(fp)) { err(`MISSING: ${req.path} — ${req.desc}`); hasError = true; continue; }
    const sz = fs.statSync(fp).size;
    if (sz < req.minBytes) { err(`EMPTY: ${req.path} — ${sz} bytes (min: ${req.minBytes})`); hasError = true; continue; }
    ok(`${req.path} — ${sz}B`);
  }
  
  // Verify .homeyignore does NOT ignore critical files
  const hi = fs.readFileSync(path.join(ROOT, '.homeyignore'), 'utf8');
  const hiLines = hi.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const NEVER_IGNORE = ['README.txt', 'app.json', 'app.js', 'package.json', 'assets/', 'assets/icon.svg'];
  for (const f of NEVER_IGNORE) {
    if (hiLines.some(l => l === f || l === '/' + f || l === './' + f)) {
      err(`.homeyignore is ignoring critical file: ${f} — REMOVE THIS LINE!`);
    }
  }
  ok('.homeyignore does not ignore critical files');
  
  // README.txt must not be in .gitignore or .homeyignore
  const gi = fs.existsSync('.gitignore') ? fs.readFileSync('.gitignore', 'utf8') : '';
  if (/^README\.txt$/m.test(gi)) warn('.gitignore has README.txt — verify !README.txt exception exists');
  
  if (!hasError) ok('All critical root files validated');
}

// ─── STEP 5: Homey app validate ──────────────────────────────────────────────
function step5_validate() {
  step(5, 'HOMEY APP VALIDATE --level publish');
  if (DRY) { warn('Dry run — skipping validation'); return; }
  
  const res = run('npx homey app validate --level publish 2>&1');
  const output = res.stdout + '\n' + res.stderr;
  
  // Check for validation errors
  if (output.includes('Error') && !output.includes('0 errors')) {
    log('Validator output:');
    output.split('\n').slice(-30).forEach(l => log(' ', l));
    err('Homey validation failed — see output above');
  }
  ok('Homey validator passed');
}

// ─── STEP 6: Publish ─────────────────────────────────────────────────────────
function step6_publish() {
  step(6, DRY ? 'PUBLISH (DRY RUN — skipped)' : 'PUBLISH to Homey App Store');
  if (DRY) { warn('Dry run — publish skipped'); return; }
  
  // Check for HOMEY_PAT
  const pat = process.env.HOMEY_PAT || process.env.HOMEY_TOKEN;
  if (!pat) {
    warn('HOMEY_PAT not set — publish skipped. Set HOMEY_PAT env var to publish.');
    log('  To publish manually: npx homey app publish');
    return;
  }
  
  // Set token in env and publish
  const env = { ...process.env, HOMEY_PAT: pat };
  const res = run('npx homey app publish', { env });
  const output = res.stdout + '\n' + res.stderr;
  
  if (res.code !== 0 || output.includes('Error') || output.includes('failed')) {
    log('Publish output:', output.substring(0, 2000));
    err(`Publish failed (exit ${res.code})`);
  }
  ok('Published to Homey App Store ✅');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function main() {
  box(`FORCE-PUBLISH-SAFE v1.0${DRY ? ' [DRY RUN]' : ''}`);
  log(`Branch: ${BRANCH || (run('git rev-parse --abbrev-ref HEAD').stdout) || 'unknown'}`);
  log(`Version: ${JSON.parse(fs.readFileSync(path.join(ROOT,'app.json'),'utf8')).version}`);
  
  const app = step1_preclean();
  step2_compact(app);
  step3_remove_compose();
  step4_validate_files();
  step5_validate();
  step6_publish();
  
  box('✅ FORCE-PUBLISH-SAFE COMPLETE — No AggregateError!');
}

main();
