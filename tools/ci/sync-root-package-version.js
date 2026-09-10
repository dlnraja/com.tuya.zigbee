'use strict';

/**
 * P2454 — Root-only package version sync + package-lock integrity.
 * WHY: naive replace of every "version" in package-lock corrupted deps
 * (cosmiconfig@9.0.861 → npm ETARGET → Auto-Publish / e2e dead).
 */

const fs = require('fs');
const path = require('path');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function appVersion(cwd = process.cwd()) {
  const appPath = path.join(cwd, 'app.json');
  if (!fs.existsSync(appPath)) throw new Error('app.json missing');
  return String(readJson(appPath).version || '');
}

/**
 * Sync only root package.json + package-lock root (+ optional .homeycompose).
 * Never mutate node_modules/* entries.
 */
function syncRootPackageVersion(version, cwd = process.cwd()) {
  const v = String(version || '').trim();
  if (!/^\d+\.\d+\.\d+/.test(v)) throw new Error(`Invalid version: ${v}`);

  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = readJson(pkgPath);
    pkg.version = v;
    writeJson(pkgPath, pkg);
  }

  const lockPath = path.join(cwd, 'package-lock.json');
  if (fs.existsSync(lockPath)) {
    const lock = readJson(lockPath);
    lock.version = v;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = v;
    }
    writeJson(lockPath, lock);
  }

  const composePath = path.join(cwd, '.homeycompose', 'app.json');
  if (fs.existsSync(composePath)) {
    const compose = readJson(composePath);
    compose.version = v;
    writeJson(composePath, compose);
  }

  assertPackageLockIntegrity(cwd);
  return v;
}

/**
 * Fail if any nested lock entry was stamped with the Homey app version
 * (classic cosmiconfig@9.0.x corruption).
 */
function assertPackageLockIntegrity(cwd = process.cwd()) {
  const lockPath = path.join(cwd, 'package-lock.json');
  if (!fs.existsSync(lockPath)) return { ok: true, skipped: true };

  const lock = readJson(lockPath);
  const appVer = appVersion(cwd);
  const bad = [];

  if (lock.packages) {
    for (const [key, meta] of Object.entries(lock.packages)) {
      if (!key || key === '') continue;
      if (!meta || typeof meta !== 'object') continue;
      if (String(meta.version || '') === appVer) {
        bad.push(`${key}@${meta.version}`);
      }
    }
  }

  if (lock.dependencies && typeof lock.dependencies === 'object') {
    for (const [name, meta] of Object.entries(lock.dependencies)) {
      if (meta && String(meta.version || '') === appVer) {
        bad.push(`dependencies.${name}@${meta.version}`);
      }
    }
  }

  if (bad.length) {
    const msg = [
      'package-lock integrity FAIL (P2454): nested deps stamped with Homey app version',
      `appVersion=${appVer}`,
      ...bad.slice(0, 20).map((b) => `  - ${b}`),
      bad.length > 20 ? `  … +${bad.length - 20} more` : '',
      'Fix: restore package-lock; sync ONLY root version via tools/ci/sync-root-package-version.js',
    ].filter(Boolean).join('\n');
    const err = new Error(msg);
    err.code = 'P2454_LOCK_CORRUPT';
    throw err;
  }

  return { ok: true, appVer };
}

if (require.main === module) {
  const cmd = process.argv[2] || 'assert';
  try {
    if (cmd === 'sync') {
      const v = process.argv[3] || appVersion();
      console.log('Synced root manifests to', syncRootPackageVersion(v));
    } else if (cmd === 'assert' || cmd === 'check') {
      const r = assertPackageLockIntegrity();
      console.log('package-lock integrity OK', r.appVer || '(no lock)');
    } else {
      throw new Error(`Unknown command ${cmd} (use sync|assert)`);
    }
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}

module.exports = {
  syncRootPackageVersion,
  assertPackageLockIntegrity,
  appVersion,
};
