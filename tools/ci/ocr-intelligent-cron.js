'use strict';

/**
 * P2592 — Intelligent Alibaba Open Code Review (forfait / free)
 *
 * WHY:
 * - Gratuit: `ocr delegate preview` only (no OCR LLM / no paid tokens)
 * - Intelligent: skip when recent commits do not touch reviewable paths
 * - Regular: called from cron + soft hooks in resilience / enrich / quality
 *
 * Contre quoi: cron spam on mfs_db/app.json-only commits; paid LLM under forfait
 *
 * Env:
 *   OCR_FROM / OCR_TO — git range (default HEAD~40..HEAD)
 *   OCR_FORCE=1 — run even if no interesting paths
 *   OCR_STRICT=1 — non-zero exit on OCR CLI failure
 *   OCR_INSTALL=1 — attempt `npm install -g @alibaba-group/open-code-review`
 */

const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const INTERESTING = /^(drivers\/|lib\/|\.github\/workflows\/|tools\/ci\/|\.opencodereview\/)/;
const EXCLUDE = /(^app\.json$|^data\/mfs_db\.json|^reports\/|node_modules\/|\.homeybuild\/)/;

function sh(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

function ocrBin() {
  return process.platform === 'win32' ? 'ocr.cmd' : 'ocr';
}

function ensureOcr() {
  const which = spawnSync(ocrBin(), ['--help'], { shell: true, stdio: 'ignore' });
  if (which.status === 0) return true;
  if (process.env.OCR_INSTALL === '1' || process.env.CI === 'true') {
    console.log('[OCR] installing @alibaba-group/open-code-review (global, free CLI)…');
    const r = spawnSync('npm', ['install', '-g', '@alibaba-group/open-code-review'], {
      shell: true,
      stdio: 'inherit',
      cwd: ROOT,
    });
    return r.status === 0;
  }
  console.log('[OCR] CLI missing — skip (install: npm i -g @alibaba-group/open-code-review)');
  return false;
}

function changedFiles(fromRef, toRef) {
  const out = sh(`git diff --name-only ${fromRef}...${toRef}`);
  return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function main() {
  const fromRef = process.env.OCR_FROM || 'HEAD~40';
  const toRef = process.env.OCR_TO || 'HEAD';
  const force = process.env.OCR_FORCE === '1';
  const strict = process.env.OCR_STRICT === '1';

  const files = changedFiles(fromRef, toRef);
  const interesting = files.filter((f) => INTERESTING.test(f.replace(/\\/g, '/')) && !EXCLUDE.test(f.replace(/\\/g, '/')));

  const day = new Date().toISOString().slice(0, 10);
  const outDir = path.join(ROOT, 'reports', `ocr-intelligent-${day}`);
  fs.mkdirSync(outDir, { recursive: true });

  const summary = {
    when: new Date().toISOString(),
    from: fromRef,
    to: toRef,
    changed: files.length,
    interesting: interesting.length,
    interestingSample: interesting.slice(0, 40),
    skipped: false,
    reviewable_count: null,
    excluded_count: null,
    ok: true,
  };

  if (!force && interesting.length === 0) {
    summary.skipped = true;
    summary.reason = 'no interesting path changes in range (drivers/lib/workflows/tools/ci/.opencodereview)';
    fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`[OCR] skip — ${summary.reason}`);
    appendStepSummary(`### OCR intelligent\nSkipped — no reviewable path changes (${fromRef}…${toRef}).\n`);
    process.exit(0);
  }

  if (!ensureOcr()) {
    summary.ok = !strict;
    summary.reason = 'ocr CLI unavailable';
    fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    process.exit(strict ? 1 : 0);
  }

  const rule = path.join(ROOT, '.opencodereview', 'rule.json');
  const previewPath = path.join(outDir, 'delegate-preview.json');
  const args = [
    'delegate', 'preview',
    '--from', fromRef,
    '--to', toRef,
    '--format', 'json',
    '--rule', rule,
  ];
  console.log(`[OCR] ${ocrBin()} ${args.join(' ')}`);
  const r = spawnSync(ocrBin(), args, {
    shell: true,
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  const raw = (r.stdout || '').trim() || (r.stderr || '').trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      fs.writeFileSync(previewPath, `${JSON.stringify(parsed, null, 2)}\n`);
      summary.reviewable_count = parsed.reviewable_count ?? parsed.reviewable?.length ?? null;
      summary.excluded_count = parsed.excluded_count ?? parsed.excluded?.length ?? null;
    } catch (_e) {
      fs.writeFileSync(previewPath, `${raw}\n`);
      summary.parseError = true;
    }
  }

  summary.exitStatus = r.status;
  summary.ok = r.status === 0 || !strict;
  fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  console.log(
    `[OCR] interesting=${interesting.length} reviewable=${summary.reviewable_count} excluded=${summary.excluded_count} status=${r.status}`,
  );
  appendStepSummary(
    `### OCR intelligent (free delegate)\n`
    + `- range: \`${fromRef}…${toRef}\`\n`
    + `- interesting paths: **${interesting.length}**\n`
    + `- reviewable: **${summary.reviewable_count ?? '?'}** · excluded: **${summary.excluded_count ?? '?'}**\n`
    + `- artifact: \`reports/ocr-intelligent-${day}/\`\n`
    + `- LLM: **off** (forfait)\n`,
  );

  process.exit(strict && r.status !== 0 ? (r.status || 1) : 0);
}

function appendStepSummary(md) {
  const p = process.env.GITHUB_STEP_SUMMARY;
  if (!p) return;
  try { fs.appendFileSync(p, `${md}\n`); } catch (_e) { /* soft */ }
}

main();
