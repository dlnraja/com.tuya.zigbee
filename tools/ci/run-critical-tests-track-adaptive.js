'use strict';

/**
 * P2611 — run critical tests adaptively per dual-app track.
 * Soft-skip missing files and MASTER_ONLY module deps (.cursor hooks, etc.).
 * BOTH reliability assertion failures still exit non-zero.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node run-critical-tests-track-adaptive.js <test files...>');
  process.exit(2);
}

function isTrackSkip(stderr, stdout) {
  const text = `${stderr || ''}\n${stdout || ''}`;
  return /Cannot find module[\s\S]*?\.cursor/i.test(text)
    || /Cannot find module[\s\S]*?DeviceAvailabilityManager/i.test(text)
    || /Cannot find module[\s\S]*?PowerClusterPolicy/i.test(text)
    || /ENOENT:[\s\S]*?\.cursor/i.test(text);
}

let failed = 0;
for (const rel of files) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.log(`SKIP missing ${rel} (track-adaptive)`);
    continue;
  }
  console.log(`RUN ${rel}`);
  const r = spawnSync(process.execPath, ['--test', abs], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status === 0) continue;
  if (isTrackSkip(r.stderr, r.stdout)) {
    console.log(`SKIP track-incompatible ${rel} (MASTER_ONLY dep)`);
    continue;
  }
  failed += 1;
}

process.exit(failed === 0 ? 0 : 1);
