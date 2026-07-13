#!/usr/bin/env node
'use strict';

/**
 * Publish payload size gate.
 *
 * Homey/Athom failures often surface as dashboard "processing_failed" or a
 * generic AggregateError while the root cause is an oversized upload payload.
 * This check keeps the size rules in one place for pre-commit, pre-push and CI.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ARGS = new Set(process.argv.slice(2));
const JSON_MODE = ARGS.has('--json');
const STRICT = ARGS.has('--strict');
const CHECK_FINAL = ARGS.has('--final') || process.env.HOMEY_CHECK_FINAL_PUBLISH_DIR === '1';

const LIMITS = {
  appJsonMB: numberEnv('HOMEY_APP_JSON_MAX_MB', 4),
  publishUncompressedMB: numberEnv('HOMEY_PUBLISH_MAX_UNCOMPRESSED_MB', 34),
  publishSourceMB: numberEnv('HOMEY_PUBLISH_SOURCE_MAX_MB', 24),
  publishFinalMB: numberEnv('HOMEY_PUBLISH_FINAL_MAX_MB', 24),
  archiveWarnMB: numberEnv('HOMEY_ARCHIVE_WARN_MB', 7),
  archiveMaxMB: numberEnv('HOMEY_ARCHIVE_MAX_MB', 20),
};

const checks = [];
const errors = [];
const warnings = [];

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function toMB(bytes) {
  return bytes / 1024 / 1024;
}

function fmtMB(bytes) {
  return toMB(bytes).toFixed(2);
}

function addCheck(name, bytes, limitMB, status, detail) {
  checks.push({
    name,
    bytes,
    mb: Number(fmtMB(bytes)),
    limitMB,
    status,
    detail,
  });
}

function walkStats(dir, opts = {}) {
  const excludedExtensions = new Set(opts.excludedExtensions || []);
  const excludedDirs = new Set(opts.excludedDirs || []);
  const stack = [dir];
  let bytes = 0;
  let files = 0;
  const largest = [];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (excludedDirs.has(entry.name)) continue;
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (excludedExtensions.has(path.extname(entry.name))) continue;

      try {
        const stat = fs.statSync(full);
        bytes += stat.size;
        files++;
        largest.push({ path: path.relative(ROOT, full).replace(/\\/g, '/'), bytes: stat.size });
      } catch {
        // Ignore transient filesystem races during build.
      }
    }
  }

  largest.sort((a, b) => b.bytes - a.bytes);
  return { bytes, files, largest: largest.slice(0, 10) };
}

function checkJsonUnderLimit(label, file, limitMB) {
  if (!fs.existsSync(file)) {
    warnings.push(`${label}: missing, skipped (${path.relative(ROOT, file)})`);
    return;
  }
  const stat = fs.statSync(file);
  let bytes = stat.size;
  let detail = path.relative(ROOT, file);
  try {
    const compact = JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8')));
    bytes = Buffer.byteLength(compact);
    detail += ` compact; file=${fmtMB(stat.size)} MB`;
  } catch (e) {
    warnings.push(`${label}: could not compact JSON for measurement (${e.message})`);
  }
  const status = toMB(bytes) > limitMB ? 'fail' : 'pass';
  addCheck(label, bytes, limitMB, status, detail);
  if (status === 'fail') {
    errors.push(`${label} compact size is ${fmtMB(bytes)} MB, above ${limitMB.toFixed(2)} MB`);
  }
}

function checkDirUnderLimit(label, dir, limitMB, opts = {}) {
  if (!fs.existsSync(dir)) {
    const message = `${label}: missing, skipped (${dir})`;
    if (STRICT) errors.push(message);
    else warnings.push(message);
    return;
  }
  const stats = walkStats(dir, opts);
  const status = toMB(stats.bytes) > limitMB ? 'fail' : 'pass';
  addCheck(label, stats.bytes, limitMB, status, `${stats.files} files`);
  if (status === 'fail') {
    errors.push(`${label} is ${fmtMB(stats.bytes)} MB across ${stats.files} files, above ${limitMB.toFixed(2)} MB`);
    for (const file of stats.largest.slice(0, 5)) {
      warnings.push(`Large publish file: ${file.path} (${fmtMB(file.bytes)} MB)`);
    }
  }
}

function checkArchive(file) {
  if (!fs.existsSync(file)) return;
  const stat = fs.statSync(file);
  const mb = toMB(stat.size);
  let status = 'pass';
  if (mb > LIMITS.archiveMaxMB) status = 'fail';
  else if (mb > LIMITS.archiveWarnMB) status = 'warn';
  addCheck('Compressed archive', stat.size, LIMITS.archiveMaxMB, status, path.relative(ROOT, file));
  if (status === 'fail') {
    errors.push(`Compressed archive is ${fmtMB(stat.size)} MB, above hard upload limit ${LIMITS.archiveMaxMB.toFixed(2)} MB`);
  } else if (status === 'warn') {
    warnings.push(`Compressed archive is ${fmtMB(stat.size)} MB, above documented soft target ${LIMITS.archiveWarnMB.toFixed(2)} MB`);
  }
}

function main() {
  checkJsonUnderLimit('Root app.json', path.join(ROOT, 'app.json'), LIMITS.appJsonMB);
  checkJsonUnderLimit('Build app.json', path.join(ROOT, '.homeybuild', 'app.json'), LIMITS.appJsonMB);

  checkDirUnderLimit(
    'Build directory',
    path.join(ROOT, '.homeybuild'),
    LIMITS.publishUncompressedMB,
    { excludedExtensions: ['.gz'] },
  );

  checkDirUnderLimit(
    'Prepared publish directory (source)',
    path.join(os.tmpdir(), 'homey-publish-temp'),
    LIMITS.publishSourceMB,
    { excludedExtensions: ['.gz'], excludedDirs: ['.homeybuild', 'node_modules', '.git', '.cache'] },
  );

  if (CHECK_FINAL) {
    checkDirUnderLimit(
      'Final publish directory',
      path.join(os.tmpdir(), 'homey-publish-temp'),
      LIMITS.publishFinalMB,
      { excludedExtensions: ['.gz'], excludedDirs: ['.homeybuild', '.git', '.cache'] },
    );
  }

  const appId = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).id;
    } catch {
      return null;
    }
  })();
  if (appId) checkArchive(path.join(ROOT, '.homeybuild', `${appId}.tar.gz`));
  checkArchive(path.join(ROOT, '.homeybuild', 'app.tar.gz'));

  const ok = errors.length === 0;
  const report = {
    ok,
    timestamp: new Date().toISOString(),
    limits: LIMITS,
    checks,
    errors,
    warnings,
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('[publish-size-gate] Payload size report');
    for (const check of checks) {
      const marker = check.status === 'pass' ? 'OK' : check.status === 'warn' ? 'WARN' : 'FAIL';
      console.log(`[publish-size-gate] ${marker} ${check.name}: ${check.mb.toFixed(2)} MB / ${check.limitMB.toFixed(2)} MB (${check.detail})`);
    }
    for (const warning of warnings) {
      console.warn(`[publish-size-gate] WARN ${warning}`);
    }
    for (const error of errors) {
      console.error(`[publish-size-gate] FAIL ${error}`);
    }
    console.log(`[publish-size-gate] ${ok ? 'PASS' : 'FAIL'}`);
  }

  process.exit(ok ? 0 : 1);
}

main();
