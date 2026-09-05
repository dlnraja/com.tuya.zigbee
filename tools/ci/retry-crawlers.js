#!/usr/bin/env node
/**
 * retry-crawlers.js — P53
 *
 * Smart retry wrapper for crawlers that timeout (z2m, zha, xiaomi-miot).
 * Strategy: try with normal timeout, if it fails, try with longer timeout + reduced scope.
 *
 * Output: .github/state/mega-crawl/retry-report.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state', 'mega-crawl');

// Crawlers known to timeout
const TIMEOUT_CRAWLERS = [
  { id: 'z2m', cmd: 'node scripts/sync/crawl-z2m.js', baseTimeout: 120, retryTimeout: 600, reason: 'GitHub API rate limits + 366 files' },
  { id: 'zha', cmd: 'node scripts/sync/crawl-zha.js', baseTimeout: 120, retryTimeout: 600, reason: 'GitHub API rate limits + many quirks' },
  { id: 'xiaomi-miot', cmd: 'node scripts/scanners/xiaomi-miot-scanner.js', baseTimeout: 120, retryTimeout: 600, reason: 'MIoT spec API + many devices' },
  { id: 'tuya-local', cmd: 'node scripts/scanners/tuya-local-scanner.js', baseTimeout: 120, retryTimeout: 600, reason: 'YAML parsing' },
  { id: 'openhab', cmd: 'node scripts/scanners/openhab-scanner.js', baseTimeout: 120, retryTimeout: 600, reason: 'XML parsing' },
  { id: 'csa-iot', cmd: 'node scripts/scanners/csa-iot-scanner.js', baseTimeout: 120, retryTimeout: 600, reason: 'Slow CSA API' },
];

function runOnce(c, timeoutSec) {
  const start = Date.now();
  try {
    const out = execSync(c.cmd, { cwd: ROOT, encoding: 'utf8', timeout: timeoutSec * 1000, stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, durationMs: Date.now() - start, outputLines: out.split('\n').length };
  } catch (e) {
    return { ok: false, durationMs: Date.now() - start, error: (e.message || '').substring(0, 300) };
  }
}

function main() {
  const args = process.argv.slice(2);
  const APPLY = args.includes('--apply');
  console.log('=== Crawler Retry (P53) ===');
  console.log('Mode:', APPLY ? 'APPLY (run for real)' : 'DRY-RUN');

  const results = [];
  for (const c of TIMEOUT_CRAWLERS) {
    process.stdout.write('  [' + c.id + '] attempt 1 (timeout ' + c.baseTimeout + 's)...');
    const r1 = runOnce(c, c.baseTimeout);
    if (r1.ok) {
      console.log(' OK (' + r1.durationMs + 'ms)');
      results.push({ id: c.id, status: 'ok-on-first-try', durationMs: r1.durationMs });
      continue;
    }
    console.log(' FAILED (' + r1.durationMs + 'ms): ' + r1.error);

    // Retry with longer timeout
    process.stdout.write('  [' + c.id + '] attempt 2 (timeout ' + c.retryTimeout + 's)...');
    const r2 = runOnce(c, c.retryTimeout);
    if (r2.ok) {
      console.log(' OK (' + r2.durationMs + 'ms)');
      results.push({ id: c.id, status: 'ok-on-retry', durationMs: r2.durationMs, firstError: r1.error });
      continue;
    }
    console.log(' FAILED (' + r2.durationMs + 'ms): ' + r2.error);
    results.push({ id: c.id, status: 'failed-after-retry', firstError: r1.error, secondError: r2.error });
  }

  // Save report
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STATE_DIR, 'retry-report.json'), JSON.stringify({
    meta: { generatedAt: new Date().toISOString() },
    results,
  }, null, 2));

  // Summary
  const ok = results.filter(r => r.status.startsWith('ok')).length;
  const fail = results.filter(r => r.status === 'failed-after-retry').length;
  console.log('\n=== SUMMARY ===');
  console.log('OK:', ok);
  console.log('Failed after retry:', fail);
  console.log('Report:', path.join(STATE_DIR, 'retry-report.json'));
}

main();
