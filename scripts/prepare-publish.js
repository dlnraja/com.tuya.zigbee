'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const srcDir = path.join(__dirname, '..', '.homeybuild');
const destDir = path.join(os.tmpdir(), 'homey-publish-temp');

// Windows reserved device names — these CANNOT be packed into a tar
// archive: tar-stream hangs and Athom returns "processing_failed".
// fs.unlinkSync / fs.renameSync fail on them with EPERM; only the
// \\?\ extended-length prefix (handled in kill-stray-nulls.cjs) works.
const RESERVED_BASENAMES = new Set([
  'NUL', 'CON', 'PRN', 'AUX',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

function isReservedName(filename) {
  if (!filename) return false;
  const base = String(filename).split('.')[0].toUpperCase();
  return RESERVED_BASENAMES.has(base);
}

// Best-effort sanitization of the source tree before copy. Runs the
// dedicated kill-stray-nulls helper which uses \\?\ to delete reserved
// files that vanilla fs cannot remove.
function sanitizeSourceTree() {
  try {
    const { killStrayNulls } = require(path.join(__dirname, 'maintenance', 'kill-stray-nulls.cjs'));
    const root = path.join(__dirname, '..');
    const res = killStrayNulls(root, { force: true, verbose: false, dirs: ['.homeybuild'] });
    if (res.failed.length > 0) {
      console.error('FATAL: reserved-name files remain in .homeybuild and could not be auto-removed:');
      res.failed.forEach(p => console.error('  - ' + p));
      console.error('Run manually:  node scripts/maintenance/kill-stray-nulls.cjs --force --dir .homeybuild');
      process.exit(2);
    }
    if (res.deleted > 0) {
      console.log(`Sanitized ${res.deleted} reserved-name file(s) from .homeybuild before copy.`);
    }
  } catch (e) {
    // kill-stray-nulls.cjs is a guard, not a hard dependency. If it is
    // missing we still rely on the filter below to skip reserved names.
    console.warn('Warning: kill-stray-nulls helper unavailable, relying on copy filter only:', e.message);
  }
}

console.log(`Copying built files from ${srcDir} to ${destDir}...`);

if (!fs.existsSync(srcDir)) {
  console.error(`Error: Source directory ${srcDir} does not exist. Run npm run build first.`);
  process.exit(1);
}

// 1) Sanitize: delete any reserved-name files from .homeybuild.
sanitizeSourceTree();

// 2) Copy with a filter that REJECTS reserved-name entries — a belt-
//    and-suspenders guard in case sanitization missed something (e.g.
//    a NUL created between sanitize and copy, or a non-Windows run that
//    still ends up packaging a reserved name for a Windows-built tar).
let skippedReserved = 0;
const filter = (src, dest) => {
  const name = path.basename(src);
  if (isReservedName(name)) {
    skippedReserved++;
    console.error(`REJECTED reserved-name entry from pack: ${src}`);
    return false;
  }
  return true;
};

try {
  // Empty or create destination directory
  fs.emptyDirSync(destDir);
  console.log(`Cleared destination directory: ${destDir}`);

  // Copy everything except reserved-name entries
  fs.copySync(srcDir, destDir, { filter });
  console.log('Successfully copied all files.');

  if (skippedReserved > 0) {
    console.error(`FATAL: ${skippedReserved} reserved-name file(s) were rejected during copy.`);
    console.error('The source tree is contaminated. Run: node scripts/maintenance/kill-stray-nulls.cjs --force');
    process.exit(2);
  }

  // 3) Validate mandatory manifest files exist in destination.
  const mustExist = ['app.json', 'package.json'];
  for (const f of mustExist) {
    const p = path.join(destDir, f);
    if (!fs.existsSync(p)) {
      console.error(`FATAL: ${f} not found in destination directory after copy.`);
      console.error('The build is incomplete — Homey would reject it.');
      process.exit(1);
    }
  }
  console.log('Mandatory manifests present: app.json, package.json');

  // 4) Validate app.json size (Athom rejects > 4MB — hard fail, not warning).
  //    Compact whitespace first — the raw file may be prettified.
  const destAppJson = path.join(destDir, 'app.json');
  try {
    const raw = JSON.parse(fs.readFileSync(destAppJson));
    const compact = JSON.stringify(raw);
    if (compact.length < fs.statSync(destAppJson).size) {
      fs.writeFileSync(destAppJson, compact);
      console.log(`Compacted app.json: ${(fs.statSync(destAppJson).size/1024/1024).toFixed(2)} MB (was ${(compact.length > 0 ? 'whitespace' : 'already compact')})`);
    }
  } catch (e) {
    console.warn('Warning: could not compact app.json:', e.message);
  }
  const stats = fs.statSync(destAppJson);
  const sizeMB = stats.size / (1024 * 1024);
  console.log(`Target app.json size: ${sizeMB.toFixed(2)} MB`);
  if (sizeMB > 4) {
    console.error('FATAL: app.json is larger than 4MB. Athom servers will reject this build.');
    console.error('Compact driver definitions / fingerprints before publishing.');
    process.exit(1);
  }
  console.log('Success: app.json is under the 4MB Athom limit.');

  // 4b) Permanent sdk:3 guard — Athom API REQUIRES this field.
  //     Auto-fix tooling has deleted it 4+ times (commits 160e58b83, b3311caa2, 5449d20f4, etc.)
  try {
    const manifest = JSON.parse(fs.readFileSync(destAppJson));
    if (manifest.sdk !== 3) {
      manifest.sdk = 3;
      fs.writeFileSync(destAppJson, JSON.stringify(manifest));
      console.log('[GUARD] Restored sdk:3 field in app.json (was missing or wrong)');
    } else {
      console.log('[GUARD] sdk:3 field present ✓');
    }
  } catch (e) {
    console.warn('Warning: could not verify sdk field:', e.message);
  }

  // 5) Sanitize drivers: strip empty manufacturerName arrays.
  // An empty manufacturerName:[] on a zigbee driver triggers an AggregateError
  // during Athom's Zigbee init on the build server → processing_failed.
  // The good build #2469 had ZERO such drivers; the build process itself
  // regresses and re-injects empty arrays (~25-44 of them), so we strip them
  // here as a deterministic post-build step instead of blocking the publish.
  try {
    const manifest = JSON.parse(fs.readFileSync(destAppJson, 'utf8'));
    let stripped = 0;
    for (const d of (manifest.drivers || [])) {
      if (d.zigbee && Array.isArray(d.zigbee.manufacturerName) && d.zigbee.manufacturerName.length === 0) {
        delete d.zigbee.manufacturerName;
        stripped++;
      }
    }
    if (stripped > 0) {
      fs.writeFileSync(destAppJson, JSON.stringify(manifest, null, 2));
      console.log(`Sanitized: stripped ${stripped} empty manufacturerName[] array(s) from app.json.`);
    } else {
      console.log(`OK: 0 empty-manufacturerName drivers across ${(manifest.drivers || []).length} drivers.`);
    }
  } catch (valErr) {
    console.error('FATAL: could not sanitize driver manufacturerName:', valErr.message);
    process.exit(1);
  }

} catch (err) {
  console.error('Error during copy:', err.message);
  process.exit(1);
}
