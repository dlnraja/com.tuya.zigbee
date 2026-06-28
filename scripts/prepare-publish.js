'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { sanitizeManifestFile } = require('./maintenance/sanitize-manifest.cjs');
const {
  compactManifestFile,
  isSyntheticManufacturer,
} = require('./maintenance/compact-zigbee-identifiers.cjs');

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

function dirStats(dir) {
  let bytes = 0;
  let files = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else {
        const stat = fs.statSync(full);
        bytes += stat.size;
        files++;
      }
    }
  }
  return { bytes, files };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
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
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`Cleared destination directory: ${destDir}`);

  // Copy everything except reserved-name entries
  fs.cpSync(srcDir, destDir, { recursive: true, filter });
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

  // 4) Refuse stale build output before any upload. A previous local
  // .homeybuild can otherwise publish an older version than source app.json.
  try {
    const sourceApp = readJson(path.join(__dirname, '..', 'app.json'));
    const targetApp = readJson(path.join(destDir, 'app.json'));
    const targetPackage = readJson(path.join(destDir, 'package.json'));
    if (sourceApp.version !== targetApp.version || sourceApp.version !== targetPackage.version) {
      console.error(`FATAL: stale build version mismatch (source=${sourceApp.version}, build=${targetApp.version}, package=${targetPackage.version}).`);
      console.error('Run: npm run build && npm run prepare-publish');
      process.exit(1);
    }
    console.log(`Build version guard: source/build/package all v${sourceApp.version}`);
  } catch (e) {
    console.error('FATAL: could not verify build version consistency:', e.message);
    process.exit(1);
  }

  // 5) Validate app.json size (Athom rejects > 4MB — hard fail, not warning).
  //    Compact whitespace first — the raw file may be prettified.
  const destAppJson = path.join(destDir, 'app.json');
  try {
    const failures = sanitizeManifestFile(destAppJson);
    if (failures > 0) {
      console.error('FATAL: manifest sanitizer failed for publish app.json.');
      process.exit(1);
    }
  } catch (e) {
    console.error('FATAL: manifest sanitizer crashed:', e.message);
    process.exit(1);
  }
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

  // 5a) Compact publish-only Zigbee identifier matrices.
  // Athom's build server expands manufacturerName x productId. The source app
  // intentionally carries broad support matrices, but the publish payload must
  // stay small enough for the App Store processor.
  try {
    const compact = compactManifestFile(destAppJson);
    if (compact.overTotalLimit) {
      console.error(`FATAL: publish manifest still has ${compact.afterTotal} Zigbee identifier combinations after compaction.`);
      console.error(`Limit: ${compact.maxTotalCombos}. Lower HOMEY_ZIGBEE_MAX_DRIVER_COMBOS or split broad drivers.`);
      process.exit(1);
    }
    console.log(`Zigbee identifier matrix: ${compact.beforeTotal} -> ${compact.afterTotal} combinations across ${(compact.changes || []).length} compacted driver(s), ${compact.pruned || 0} pruned synthetic driver(s).`);
    if (compact.filteredSyntheticManufacturers > 0) {
      console.log(`  - removed ${compact.filteredSyntheticManufacturers} synthetic manufacturer identifier(s) from publish manifest`);
    }
    if (compact.pruned > 0) {
      for (const p of compact.prunedDrivers.slice(0, 12)) {
        console.log(`  - pruned ${p.id}: ${p.reason} (mfr ${p.manufacturers}, product ${p.products})`);
      }
      if (compact.prunedDrivers.length > 12) {
        console.log(`  - ... ${compact.prunedDrivers.length - 12} more synthetic driver(s) pruned`);
      }
    }
    if (compact.changed > 0) {
      for (const c of compact.changes.slice(0, 12)) {
        console.log(`  - ${c.id}: ${c.before} -> ${c.after} combos (mfr ${c.manufacturers}, product ${c.products})`);
      }
      if (compact.changes.length > 12) {
        console.log(`  - ... ${compact.changes.length - 12} more driver(s) compacted`);
      }
    }

    const publishManifest = readJson(destAppJson);
    const syntheticLeft = [];
    for (const d of publishManifest.drivers || []) {
      const names = Array.isArray(d.zigbee && d.zigbee.manufacturerName)
        ? d.zigbee.manufacturerName
        : [];
      const badNames = names.filter(isSyntheticManufacturer);
      if (badNames.length > 0) {
        syntheticLeft.push({ id: d.id, count: badNames.length, samples: badNames.slice(0, 3) });
      }
    }
    if (syntheticLeft.length > 0) {
      console.error(`FATAL: publish manifest still contains synthetic Zigbee manufacturer identifiers in ${syntheticLeft.length} driver(s).`);
      for (const item of syntheticLeft.slice(0, 12)) {
        console.error(`  - ${item.id}: ${item.samples.join(', ')}${item.count > item.samples.length ? ` (+${item.count - item.samples.length})` : ''}`);
      }
      if (syntheticLeft.length > 12) {
        console.error(`  - ... ${syntheticLeft.length - 12} more driver(s)`);
      }
      console.error('These placeholders bloat the publish manifest and must be pruned before upload.');
      process.exit(1);
    }
    console.log('OK: no synthetic Zigbee manufacturer identifiers in publish manifest.');
  } catch (e) {
    console.error('FATAL: Zigbee identifier compaction failed:', e.message);
    process.exit(1);
  }

  // 5b) Archive budget guard. Homey may accept the upload but later mark the
  // draft as processing_failed when the packed app is too heavy. Fail before
  // publishing so CI points at the real root cause.
  const publishStats = dirStats(destDir);
  const publishMB = publishStats.bytes / (1024 * 1024);
  const maxPublishMB = Number(process.env.HOMEY_PUBLISH_MAX_UNCOMPRESSED_MB || 32);
  console.log(`Publish directory size: ${publishMB.toFixed(2)} MB across ${publishStats.files} files (limit ${maxPublishMB.toFixed(2)} MB).`);
  if (publishMB > maxPublishMB) {
    console.error(`FATAL: publish directory is ${publishMB.toFixed(2)} MB, above the ${maxPublishMB.toFixed(2)} MB safety limit.`);
    console.error('Run: npm run build && node scripts/maintenance/optimize-build-images.cjs && npm run prepare-publish');
    process.exit(1);
  }
  try {
    const { spawnSync } = require('child_process');
    const gate = spawnSync(process.execPath, [path.join(__dirname, 'ci', 'publish-size-gate.cjs')], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: false,
    });
    if (gate.status !== 0) {
      console.error('FATAL: publish payload size gate failed.');
      process.exit(gate.status || 1);
    }
  } catch (e) {
    console.error('FATAL: publish payload size gate crashed:', e.message);
    process.exit(1);
  }

  // 5c) Permanent sdk:3 guard — Athom API REQUIRES this field.
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

  // 5) Sanitize drivers: strip empty manufacturerName AND productId arrays.
  // An empty manufacturerName:[] or productId:[] on a zigbee driver triggers
  // an AggregateError during Athom's Zigbee init on the build server → processing_failed.
  try {
    const manifest = JSON.parse(fs.readFileSync(destAppJson, 'utf8'));
    let stripped = 0;
    for (const d of (manifest.drivers || [])) {
      if (d.zigbee) {
        if (Array.isArray(d.zigbee.manufacturerName) && d.zigbee.manufacturerName.length === 0) {
          delete d.zigbee.manufacturerName;
          stripped++;
        }
        if (Array.isArray(d.zigbee.productId) && d.zigbee.productId.length === 0) {
          delete d.zigbee.productId;
          stripped++;
        }
      }
    }
    if (stripped > 0) {
      fs.writeFileSync(destAppJson, JSON.stringify(manifest));
      console.log(`Sanitized: stripped ${stripped} empty array(s) from app.json.`);
    } else {
      console.log(`OK: 0 empty arrays across ${(manifest.drivers || []).length} drivers.`);
    }
  } catch (valErr) {
    console.error('FATAL: could not sanitize driver arrays:', valErr.message);
    process.exit(1);
  }

} catch (err) {
  console.error('Error during copy:', err.message);
  process.exit(1);
}
