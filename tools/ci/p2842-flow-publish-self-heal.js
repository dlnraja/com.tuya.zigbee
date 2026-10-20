#!/usr/bin/env node
'use strict';

/**
 * P2842 — Free deterministic self-heal (forfait / AI_ALLOW_PAID=false / no paid AI)
 *
 * Automates Contre quoi from P2839–P2841:
 * - hollow flow get*Card vs driver.flow.compose
 * - backups/ payload bloat (.homeyignore + tracked files)
 * - publish-size-gate
 * - zo0cfekv+TS0601 exact couple on wall_switch_3gang_1way
 * - phantom SONOFF on bulb_rgbw
 *
 * Usage:
 *   node tools/ci/p2842-flow-publish-self-heal.js           # check (exit 1 on issues)
 *   node tools/ci/p2842-flow-publish-self-heal.js --apply   # safe auto-fixes + report
 *   node tools/ci/p2842-flow-publish-self-heal.js --json
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { mergeZigbeeIdentity } = require('../../lib/enrichment/ComplementaryMerge');

const ROOT = path.resolve(__dirname, '../..');
const APPLY = process.argv.includes('--apply');
const JSON_MODE = process.argv.includes('--json');
const DRIVERS = path.join(ROOT, 'drivers');

const report = {
  id: 'P2842',
  when: new Date().toISOString(),
  apply: APPLY,
  issues: [],
  fixed: [],
  hollow: [],
  ok: true,
};

function note(kind, msg, extra) {
  const row = { kind, msg, ...(extra || {}) };
  if (kind === 'fixed') report.fixed.push(row);
  else if (kind === 'fail') {
    report.issues.push(row);
    report.ok = false;
  }
  // kind === 'ok' → silent success (logged only in summary counts via issues length of fails)
}

function hollowFor(driverId) {
  const df = path.join(DRIVERS, driverId, 'driver.js');
  const ff = path.join(DRIVERS, driverId, 'driver.flow.compose.json');
  if (!fs.existsSync(df) || !fs.existsSync(ff)) return [];
  const code = fs.readFileSync(df, 'utf8');
  const flow = JSON.parse(fs.readFileSync(ff, 'utf8'));
  const defined = new Set([
    ...(flow.actions || []).map((a) => a.id),
    ...(flow.triggers || []).map((t) => t.id),
    ...(flow.conditions || []).map((c) => c.id),
  ]);
  const hollow = [];
  const re = /get(Action|Trigger|Condition)Card\(['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(code))) {
    if (!defined.has(m[2])) hollow.push(m[2]);
  }
  return hollow;
}

function ensureHomeyignoreBackups() {
  const ignPath = path.join(ROOT, '.homeyignore');
  let text = fs.existsSync(ignPath) ? fs.readFileSync(ignPath, 'utf8') : '';
  if (/^backups\s*$/m.test(text)) {
    note('ok', '.homeyignore already lists backups');
    return;
  }
  if (!APPLY) {
    note('fail', '.homeyignore missing backups line (P2840)');
    return;
  }
  const block =
    '\n# WHY(P2842/P2840): root backups/ dumps must never ship (Athom hang)\nbackups\n';
  if (!text.endsWith('\n')) text += '\n';
  fs.writeFileSync(ignPath, `${text}${block}`);
  note('fixed', 'Added backups to .homeyignore');
}

function checkTrackedBackups() {
  const r = spawnSync('git', ['ls-files', 'backups'], { cwd: ROOT, encoding: 'utf8' });
  const tracked = (r.stdout || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!tracked.length) {
    note('ok', 'No backups/ tracked in git');
    return;
  }
  if (!APPLY) {
    note('fail', `Tracked backups/ inflate Homey payload`, { tracked });
    return;
  }
  const rm = spawnSync('git', ['rm', '-r', '--ignore-unmatch', 'backups'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (rm.status === 0) note('fixed', 'git rm backups/', { tracked });
  else note('fail', 'Could not git rm backups/', { stderr: rm.stderr, tracked });
}

function scanHollowFleet() {
  const bad = [];
  for (const d of fs.readdirSync(DRIVERS)) {
    const h = hollowFor(d);
    if (h.length) bad.push({ driver: d, hollow: h });
  }
  report.hollow = bad;
  if (bad.length) {
    note('fail', `Hollow flow cards: ${bad.length} driver(s)`, {
      sample: bad.slice(0, 8),
    });
  } else {
    note('ok', 'Fleet hollow get*Card scan clean');
  }
}

function healZo0cfekvTs0601() {
  const composePath = path.join(DRIVERS, 'wall_switch_3gang_1way', 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  const c = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  const mfr = c.zigbee?.manufacturerName || [];
  const pid = c.zigbee?.productId || [];
  const hasMfr = mfr.some((x) => /zo0cfekv/i.test(String(x)));
  const hasPid = pid.some((x) => String(x).toUpperCase() === 'TS0601');
  if (!hasMfr) {
    note('ok', 'zo0cfekv not on wall_switch_3gang_1way — skip');
    return;
  }
  if (hasPid) {
    note('ok', 'zo0cfekv+TS0601 exact couple present');
    return;
  }
  if (!APPLY) {
    note('fail', 'zo0cfekv present but productId missing TS0601 (P2841/P151)');
    return;
  }
  c.zigbee = mergeZigbeeIdentity(c.zigbee, { productId: ['TS0601', 'ts0601'] });
  fs.writeFileSync(composePath, `${JSON.stringify(c, null, 2)}\n`);
  note('fixed', 'Union TS0601 onto wall_switch_3gang_1way for zo0cfekv');
}

function healPhantomSonoffOnBulb() {
  const composePath = path.join(DRIVERS, 'bulb_rgbw', 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  const c = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  const before = (c.zigbee?.manufacturerName || []).length;
  const next = (c.zigbee?.manufacturerName || []).filter(
    (x) => !/^sonoff$/i.test(String(x).trim()),
  );
  if (next.length === before) {
    note('ok', 'bulb_rgbw has no phantom SONOFF mfr');
    return;
  }
  if (!APPLY) {
    note('fail', 'bulb_rgbw still lists SONOFF (belongs on water_valve_garden / ZBMINI)', {
      removed: before - next.length,
    });
    return;
  }
  c.zigbee.manufacturerName = next;
  fs.writeFileSync(composePath, `${JSON.stringify(c, null, 2)}\n`);
  note('fixed', `Stripped SONOFF from bulb_rgbw (${before}→${next.length})`);
}

function purgeHomeybuildBackups() {
  // WHY(P2842c): `homey app validate` can materialize .homeybuild/backups from
  // local dumps; that is build junk, never source. Always purge before size gate.
  const bak = path.join(ROOT, '.homeybuild', 'backups');
  if (!fs.existsSync(bak)) return;
  try {
    fs.rmSync(bak, { recursive: true, force: true });
    note('fixed', 'Purged .homeybuild/backups (validate artifact)');
  } catch (e) {
    note('fail', `Could not purge .homeybuild/backups: ${e.message}`);
  }
}

function projectUploadBytes(file) {
  const os = require('os');
  const tmp = path.join(os.tmpdir(), `p2842-projection-${process.pid}.json`);
  const quiet = console.log;
  try {
    fs.copyFileSync(file, tmp);
    console.log = () => {};
    require(path.join(ROOT, 'scripts/maintenance/sanitize-manifest.cjs')).sanitizeManifestFile(tmp);
    require(path.join(ROOT, 'scripts/maintenance/compact-zigbee-identifiers.cjs')).compactManifestFile(tmp);
    require(path.join(ROOT, 'scripts/maintenance/strip-redundant-title-formatted.cjs')).stripFile(tmp);
    return Buffer.byteLength(JSON.stringify(JSON.parse(fs.readFileSync(tmp, 'utf8'))));
  } catch {
    return null;
  } finally {
    console.log = quiet;
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

function rootAppJsonCompactOk() {
  const f = path.join(ROOT, 'app.json');
  if (!fs.existsSync(f)) {
    note('fail', 'root app.json missing');
    return false;
  }
  try {
    const compact = Buffer.byteLength(JSON.stringify(JSON.parse(fs.readFileSync(f, 'utf8'))));
    const mb = compact / (1024 * 1024);
    if (mb > 4) {
      // WHY(P2912): after `homey app build` the root app.json carries every driver
      // Flow card (4.75 MB); the upload is the prepare-publish projection
      // (sanitize + Zigbee compact + titleFormatted strip). Judge that, like
      // scripts/ci/publish-size-gate.cjs (P2830h), instead of false-failing validate.yml.
      const projected = projectUploadBytes(f);
      if (projected === null || projected / (1024 * 1024) > 4) {
        note('fail', `root app.json compact ${mb.toFixed(2)} MB > 4.00 MB` + (projected === null ? ' (projection failed)' : `; projected upload ${(projected / 1048576).toFixed(2)} MB`));
        return false;
      }
      note('ok', `root app.json raw ${mb.toFixed(2)} MB (built, not uploaded); projected upload ${(projected / 1048576).toFixed(2)} MB`);
      return true;
    }
    note('ok', `root app.json compact ${mb.toFixed(2)} MB`);
    return true;
  } catch (e) {
    note('fail', `root app.json parse: ${e.message}`);
    return false;
  }
}

function runPublishSizeGate() {
  const gate = path.join(ROOT, 'scripts/ci/publish-size-gate.cjs');
  if (!fs.existsSync(gate)) {
    note('fail', 'publish-size-gate.cjs missing');
    return;
  }
  // WHY(P2842b): unified-ci / syntax-check may run before `homey app build` — no
  // .homeybuild yet. Skip hard size there; Auto-Publish still runs full gate post-build.
  const buildDir = path.join(ROOT, '.homeybuild');
  if (!fs.existsSync(buildDir)) {
    rootAppJsonCompactOk();
    note('ok', 'publish-size-gate skipped (no .homeybuild yet — pre-build CI)');
    return;
  }
  purgeHomeybuildBackups();
  // WHY(P2842e): `homey app validate` materializes a fat .homeybuild/app.json (~4.7 MB)
  // before prepare-publish. Hard size belongs post-prepare / Auto-Publish — not mid-CI.
  const prepared = path.join(require('os').tmpdir(), 'homey-publish-temp');
  if (!fs.existsSync(prepared)) {
    rootAppJsonCompactOk();
    note('ok', 'publish-size-gate soft-skip (pre-prepare validate build — Auto-Publish hard-checks later)');
    return;
  }
  const r = spawnSync(process.execPath, [gate, '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env },
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.error) {
    note('fail', `publish-size-gate spawn error: ${r.error.message}`);
    return;
  }
  let parsed = null;
  try {
    parsed = JSON.parse((r.stdout || '').trim() || 'null');
  } catch {
    /* fall through to status */
  }
  if (r.status !== 0) {
    const errs = parsed && Array.isArray(parsed.errors) ? parsed.errors : [];
    const detail = errs.length
      ? errs.slice(0, 5).join(' | ')
      : `${r.stdout || ''}\n${r.stderr || ''}`.slice(-800);
    console.error(`[P2842] publish-size-gate stderr/out:\n${detail}`);
    note('fail', 'publish-size-gate failed', { errors: errs, status: r.status });
  } else {
    note('ok', 'publish-size-gate PASS');
  }
}

function writeReport() {
  const day = new Date().toISOString().slice(0, 10);
  const dir = path.join(ROOT, 'reports', `flow-publish-heal-${day}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'summary.json'), `${JSON.stringify(report, null, 2)}\n`);
  const md = [
    `# P2842 flow/publish self-heal (${day})`,
    '',
    `- apply: ${APPLY}`,
    `- ok: ${report.ok}`,
    `- issues: ${report.issues.length}`,
    `- fixed: ${report.fixed.length}`,
    `- hollow drivers: ${report.hollow.length}`,
    '',
    '## Issues',
    ...report.issues.map((i) => `- **${i.kind}**: ${i.msg}`),
    '',
    '## Fixed',
    ...(report.fixed.length
      ? report.fixed.map((i) => `- ${i.msg}`)
      : ['- (none)']),
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'REPORT.md'), `${md}\n`);
  return dir;
}

function main() {
  ensureHomeyignoreBackups();
  checkTrackedBackups();
  scanHollowFleet();
  healZo0cfekvTs0601();
  healPhantomSonoffOnBulb();
  runPublishSizeGate();
  const dir = writeReport();
  if (JSON_MODE) {
    console.log(JSON.stringify({ ...report, reportDir: dir }, null, 2));
  } else {
    console.log(`[P2842] apply=${APPLY} ok=${report.ok} issues=${report.issues.length} fixed=${report.fixed.length} hollow=${report.hollow.length}`);
    console.log(`[P2842] report: ${path.relative(ROOT, dir)}`);
    for (const i of report.issues.filter((x) => x.kind === 'fail')) {
      console.error(`  FAIL: ${i.msg}`);
    }
    for (const f of report.fixed) console.log(`  FIXED: ${f.msg}`);
  }
  process.exit(report.ok ? 0 : 1);
}

main();
