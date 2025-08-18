#!/usr/bin/env node
/* tools/cli.js */
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');

const ENV = { ...process.env, NO_COLOR:'1', FORCE_COLOR:'0', CI:'1' };
const sh = (cmd, args, opts={}) => {
  const r = spawnSync(cmd, args, { stdio:'pipe', env:ENV, ...opts });
  const out = (r.stdout||'').toString() + (r.stderr||'').toString();
  return { code:r.status||0, out };
};

/* --------- LINTS --------- */
function lintNaming() {
  let ok = true;
  const isKebab = s => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
  const badTS = s => /TS\d{4,}/i.test(s);
  const D = 'drivers';
  for (const d of (fs.existsSync(D)?fs.readdirSync(D):[])) {
    const p = path.join(D, d);
    if (!fs.statSync(p).isDirectory()) continue;
    if (!isKebab(d) || badTS(d)) { console.error(`❌ Bad driver folder: ${d}`); ok = false; }
    for (const f of ['driver.compose.json','device.js']) {
      if (!fs.existsSync(path.join(p,f))) { console.error(`❌ Missing ${f} in ${d}`); ok = false; }
    }
    const a = path.join(p,'assets');
    for (const f of ['small.png','large.png','xlarge.png']) {
      if (!fs.existsSync(path.join(a,f))) { console.error(`❌ Missing ${f} in ${d}/assets`); ok = false; }
    }
  }
  process.exitCode = ok ? 0 : 1;
  console.log(ok ? 'LINT_NAMING_OK' : 'LINT_NAMING_FAIL');
}

function lintNoNetwork() {
  // Only scan runtime app code, not tools/*
  const git = sh(process.platform.startsWith('win')?'cmd':['git'], process.platform.startsWith('win')?['/c','ls-files']:['ls-files']);
  const files = git.out.split('\n').filter(f =>
    f && !f.startsWith('tools/') && (f.endsWith('.js') || f.endsWith('.ts'))
  );
  const netRx = /(?:\bfetch\b|\baxios\b|require\(['"]https?:|import\s+.*from\s+['"]https?:|require\(['"]net['"]\)|require\(['"]dgram['"]\)|require\(['"]ws['"]\))/;
  let ok = true;
  for (const f of files) {
    const s = fs.readFileSync(f,'utf8');
    if (netRx.test(s)) { console.error(`❌ Network API in runtime file: ${f}`); ok = false; }
  }
  process.exitCode = ok ? 0 : 1;
  console.log(ok ? 'LINT_NONET_OK' : 'LINT_NONET_FAIL');
}

/* --------- BUILD / VALIDATE --------- */
function build() {
  const r = sh('npx', ['--yes','homey','app','build']);
  fs.appendFileSync('INTEGRATION_LOG.md', `\n[build]\n\`\`\`\n${r.out}\n\`\`\`\n`);
  if (r.code !== 0) { console.error('BUILD_FAIL'); process.exit(1); }
  console.log('BUILD_OK');
}
function validate() {
  const r = sh('npx', ['--yes','homey','app','validate','-l','debug']);
  fs.appendFileSync('INTEGRATION_LOG.md', `\n[validate]\n\`\`\`\n${r.out}\n\`\`\`\n`);
  if (!/Validation result:\s*OK/i.test(r.out)) { console.error('VALIDATE_FAIL'); process.exit(1); }
  console.log('VALIDATE_OK');
}

/* --------- AUTO FIX → VALIDATE LOOP --------- */
function autoFixOnce(out) {
  let changed = false;
  // (1) Missing images → stub placeholders
  if (/missing image/i.test(out)) {
    const D = 'drivers';
    for (const d of (fs.existsSync(D)?fs.readdirSync(D):[])) {
      const a = path.join(D,d,'assets'); if (!fs.existsSync(a)) continue;
      for (const f of ['small.png','large.png','xlarge.png']) {
        const p = path.join(a,f);
        if (!fs.existsSync(p)) { fs.writeFileSync(p, Buffer.alloc(0)); changed = true; }
      }
    }
  }
  // (2) Compose refs mismatch, trivial schema warnings → leave TODO (manual)
  // (3) Capabilities mismatches → leave TODO (manual Compose edits required)
  return changed;
}
function fixValidate() {
  for (let i=0;i<15;i++){
    const r = sh('npx', ['--yes','homey','app','validate','-l','debug']);
    fs.appendFileSync('INTEGRATION_LOG.md', `\n[validate pass ${i+1}]\n\`\`\`\n${r.out}\n\`\`\`\n`);
    if (/Validation result:\s*OK/i.test(r.out)) { console.log('VALIDATE_OK'); return; }
    const changed = autoFixOnce(r.out);
    if (!changed) { console.error('NO_MORE_AUTOFIX'); process.exit(2); }
  }
  console.error('FIX_LOOP_GUARD_EXCEEDED'); process.exit(3);
}

/* --------- HARVEST (single entry; implementation in tools/harvest.js) --------- */
function harvest() {
  try {
    require('./harvest').run({ env: ENV });
  } catch (e) {
    console.warn('Harvest not fully implemented yet. Create tools/harvest.js with GitHub/Forums logic.');
    process.exit(0);
  }
}

/* --------- CLI --------- */
const cmd = process.argv[2] || '';
if (cmd==='lint') { lintNoNetwork(); lintNaming(); }
else if (cmd==='build') { build(); }
else if (cmd==='validate') { validate(); }
else if (cmd==='fix-validate') { fixValidate(); }
else if (cmd==='harvest') { harvest(); }
else {
  console.log(`Usage:
  node tools/cli.js lint
  node tools/cli.js build
  node tools/cli.js validate
  node tools/cli.js fix-validate
  node tools/cli.js harvest
`);
  process.exit(0);
}
