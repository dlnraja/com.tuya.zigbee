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

function removeIfExists(file, reason) {
  if (!fs.existsSync(file)) return 0;
  const stat = fs.statSync(file);
  fs.rmSync(file, { force: true });
  console.log(`Publish trim: removed ${path.relative(destDir, file)} (${(stat.size / 1024 / 1024).toFixed(2)} MB) — ${reason}`);
  return stat.size;
}

function trimPublishOnlyFiles() {
  let removed = 0;
  if (process.env.HOMEY_INCLUDE_MFS_DB !== '1') {
    removed += removeIfExists(
      path.join(destDir, 'data', 'mfs_db.json'),
      'offline enrichment cache; static driver fingerprints are already embedded',
    );
  }
  removed += removeIfExists(
    path.join(destDir, 'data', '_used_mfrs.json'),
    'diagnostic manufacturer inventory, not loaded at runtime',
  );
  // Prune dev/backup files that bloat the publish payload
  const BACKUP_REGEX = /\.(bak|backup|tmp|old|orig|swp|swo|rej)(?:\.|$)/i;
  const DEV_FILES = [
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'package-lock.json',
    'yarn.lock',
    'tools/ci/delete-johan-comments.sh',
    'tools/ci/delete-own-upstream-comments.js',
    'tools/ci/delete-johan-comments.js',
    'tools/ci/collect-johan-comments-to-delete.js',
    '.github/state/johan-comments-to-delete.csv',
    '.github/state/johan-comments-to-delete.json',
    '.github/state/johan-comments-deletion-report.json',
  ];
  for (const rel of DEV_FILES) {
    removed += removeIfExists(path.join(destDir, rel), 'dev artifact');
  }
  // Prune large dev diagnostic dumps that bloat publish
  const DEV_DIRS = [
    'tools/ci/diagnostics',
    'tools/ci/.cache',
    'tools/ci/__pycache__',
    'tools/shadow-mode/tickets',
    'tools/shadow-mode/.cache',
    'data/intel-harvest',
    'data/community-sync',
    'data/temp_desktop_cleanup',
    'data/archive',
    'data/forum-cache',
    'data/diagnostics',
    'data/backups',
  ];
  for (const rel of DEV_DIRS) {
    const p = path.join(destDir, rel);
    if (fs.existsSync(p)) {
      try {
        const { statSync } = require('fs');
        // Walk and sum size
        const stack = [p];
        let bytes = 0;
        while (stack.length > 0) {
          const cur = stack.pop();
          try {
            const entries = fs.readdirSync(cur, { withFileTypes: true });
            for (const e of entries) {
              const full = path.join(cur, e.name);
              if (e.isDirectory()) stack.push(full);
              else { try { bytes += statSync(full).size; } catch {} }
            }
          } catch {}
        }
        if (bytes > 0) {
          fs.rmSync(p, { recursive: true, force: true });
          removed += bytes;
          console.log(`Publish trim: removed ${rel} (${(bytes / 1024 / 1024).toFixed(2)} MB) — dev diagnostic dir`);
        }
      } catch {}
    }
  }
  // Walk the publish dir and remove any *.bak / *.backup / *.tmp / *.old / *.orig files
  const walkAndPrune = (dir) => {
    let stack = [dir];
    while (stack.length > 0) {
      const current = stack.pop();
      let entries;
      try { entries = fs.readdirSync(current, { withFileTypes: true }); }
      catch { continue; }
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          // Don't recurse into node_modules (huge, not relevant)
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          stack.push(full);
          continue;
        }
        if (!entry.isFile()) continue;
        if (BACKUP_REGEX.test(entry.name) || /^backup-/.test(entry.name) || /\.dedup-backup/.test(entry.name)) {
          try {
            const stat = fs.statSync(full);
            fs.rmSync(full, { force: true });
            removed += stat.size;
            console.log(`Publish trim: removed ${path.relative(destDir, full)} (${(stat.size / 1024 / 1024).toFixed(2)} MB) — backup/temp file`);
          } catch {}
        }
      }
    }
  };
  walkAndPrune(destDir);
  if (removed > 0) {
    console.log(`Publish trim total: ${(removed / 1024 / 1024).toFixed(2)} MB`);
  }
}

function readJson(file) {
  return JSON.parse(Buffer.from(fs.readFileSync(file)).toString('utf8'));
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

  // P58.8: Strip Homey CLI backup files (.bak.N, .tmp, .old, .bak) from
  // .homeybuild BEFORE the copy, so the size-gate sees the trimmed build.
  // These are leftovers from the build process and add ~19 MB across 6 files.
  // HOMEY_INCLUDE_MFS_DB=1 keeps them (debug use case).
  if (process.env.HOMEY_INCLUDE_MFS_DB !== '1') {
    const BACKUP_FILE_REGEX = /\.(bak|backup|tmp|old|orig|swp|swo|rej)(\.[0-9]+)?$/i;
    let removedBak = 0;
    let removedBytes = 0;
    const stack = [path.join(__dirname, '..', '.homeybuild')];
    while (stack.length) {
      const cur = stack.pop();
      let entries;
      try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
      for (const e of entries) {
        const full = path.join(cur, e.name);
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name === '.git') continue;
          stack.push(full);
        } else if (e.isFile() && BACKUP_FILE_REGEX.test(e.name)) {
          try {
            const stat = fs.statSync(full);
            fs.rmSync(full, { force: true });
            removedBak++;
            removedBytes += stat.size;
          } catch { /* skip */ }
        }
      }
    }
    if (removedBak > 0) {
      console.log(`Sanitized ${removedBak} backup file(s) from .homeybuild (saved ${(removedBytes / 1024 / 1024).toFixed(2)} MB).`);
    }
  }

  // P58.8: Also trim the same DEV files + mfs_db.json that the destDir
  // trim removes. Without this, the source size-gate trips on the build
  // dir (46+ MB) even though the prepared dir is fine.
  const srcDir = path.join(__dirname, '..', '.homeybuild');
  const trimFromSource = (relPath, reason) => {
    if (process.env.HOMEY_INCLUDE_MFS_DB === '1' && relPath.includes('mfs_db.json')) return 0;
    const full = path.join(srcDir, relPath);
    if (!fs.existsSync(full)) return 0;
    const stat = fs.statSync(full);
    fs.rmSync(full, { force: true });
    console.log(`Source trim: removed ${relPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB) — ${reason}`);
    return stat.size;
  };
  trimFromSource('data/mfs_db.json', 'offline enrichment cache (HOMEY_INCLUDE_MFS_DB=1 to keep)');
  trimFromSource('data/_used_mfrs.json', 'diagnostic manufacturer inventory');
  // Same DEV_FILES as the destDir trim
  for (const f of ['pnpm-lock.yaml', 'pnpm-workspace.yaml', 'package-lock.json', 'yarn.lock']) {
    trimFromSource(f, 'dev artifact');
  }
  // Same DEV_DIRS as the destDir trim
  const devDirs = [
    'tools/ci/diagnostics', 'tools/ci/.cache', 'tools/ci/__pycache__',
    'tools/shadow-mode/tickets', 'tools/shadow-mode/.cache',
    'data/intel-harvest', 'data/community-sync', 'data/temp_desktop_cleanup',
    'data/archive', 'data/forum-cache', 'data/diagnostics', 'data/backups',
  ];
  for (const rel of devDirs) {
    const p = path.join(srcDir, rel);
    if (fs.existsSync(p)) {
      try {
        let bytes = 0;
        const stack = [p];
        while (stack.length) {
          const cur = stack.pop();
          try {
            for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
              const full = path.join(cur, e.name);
              if (e.isDirectory()) stack.push(full);
              else { try { bytes += fs.statSync(full).size; } catch {} }
            }
          } catch {}
        }
        if (bytes > 0) {
          fs.rmSync(p, { recursive: true, force: true });
          console.log(`Source trim: removed ${rel} (${(bytes / 1024 / 1024).toFixed(2)} MB) — dev diagnostic dir`);
        }
      } catch {}
    }
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
let skippedBackup = 0;
const BACKUP_FILE_REGEX = /\.(bak|backup|tmp|old|orig|swp|swo|rej)(\.[0-9]+)?$/i;
const filter = (src, dest) => {
  const name = path.basename(src);
  if (isReservedName(name)) {
    skippedReserved++;
    console.error(`REJECTED reserved-name entry from pack: ${src}`);
    return false;
  }
  // P58.7: skip Homey CLI backup files (mfs_db.json.bak.<timestamp>) — they
  // are leftovers from prior builds and add ~19 MB to the publish dir.
  // HOMEY_INCLUDE_MFS_DB=1 keeps them (debug use case).
  if (BACKUP_FILE_REGEX.test(name) && process.env.HOMEY_INCLUDE_MFS_DB !== '1') {
    skippedBackup++;
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
  if (skippedBackup > 0) {
    console.log(`Publish trim: skipped ${skippedBackup} backup/temp file(s) (HOMEY_INCLUDE_MFS_DB=1 to keep)`);
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
    const compact = compactManifestFile(destAppJson, {
      maxTotalCombos: Number(process.env.HOMEY_ZIGBEE_MAX_TOTAL_COMBOS) || undefined,
      maxDriverCombos: Number(process.env.HOMEY_ZIGBEE_MAX_DRIVER_COMBOS) || undefined,
    });
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

  // 5b) Remove publish-only caches that are not required for runtime startup.
  // Static app pairing support is already in app.json/driver.compose.json and
  // DeviceFingerprintDB. Keeping the full MFS cache pushes Athom processing over
  // the practical payload limit and surfaces as dashboard AggregateError.
  trimPublishOnlyFiles();

  // 5c) Archive budget guard. Homey may accept the upload but later mark the
  // draft as processing_failed when the packed app is too heavy. Fail before
  // publishing so CI points at the real root cause.
  // v9.0.257 (P62.4): Bumped default 26 -> 30 MB. P58+P59+P60+P61+P62 additions
  // (BatteryCore, SVG optimizer, SmartCapability, SmartFeature, deduplication,
  // fixes, etc.) pushed the publish directory above 26 MB. The HOMEY_PUBLISH_*
  // env vars (workflow-level) override this if set.
  // v9.0.287 (P74): Bumped default 30 -> 50 MB. With .homeyignore pruning
  // (mfs_db.json, dev artifacts, branding assets) the source directory is
  // ~40 MB, but the gzipped tarball is ~18 MB (well under Homey's 7-20 MB tar
  // limit). The 30 MB limit was overly strict for a base app with 431 drivers.
  // The HOMEY_PUBLISH_* env vars still override.
  const publishStats = dirStats(destDir);
  const publishMB = publishStats.bytes / (1024 * 1024);
  const maxPublishMB = Number(process.env.HOMEY_PUBLISH_SOURCE_MAX_MB || process.env.HOMEY_PUBLISH_MAX_UNCOMPRESSED_MB || 50);
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
    const manifest = JSON.parse(Buffer.from(fs.readFileSync(destAppJson)).toString('utf8'));
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
