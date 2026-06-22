'use strict';
// Inspect what tar-fs actually packs from .homeybuild, replicating the
// homey CLI's _getPackStream ignore rules EXACTLY (App.js:1505-1542).
//
// Why this exists: a NUL/CON/PRN/... inside .homeybuild hangs the pack
// and produces a 0-byte / corrupt archive = Athom "processing_failed".
// This script reproduces the official pack to (a) confirm the archive
// is well-formed and sized, (b) fail loudly if a reserved-name file or
// a missing app.json would break it.
const tar = require('C:/Users/HP/AppData/Roaming/npm/node_modules/homey/node_modules/tar-fs');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');
const { pipeline } = require('stream');

// Windows reserved device names — REJECT from pack, fail if any present.
const RESERVED_BASENAMES = new Set([
  'NUL', 'CON', 'PRN', 'AUX',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

function isReservedName(name) {
  if (!name) return false;
  const base = String(name).split('/').pop().split('.')[0].toUpperCase();
  return RESERVED_BASENAMES.has(base);
}

const appPath = path.join(__dirname, '..', '.homeybuild');
console.log('Packing (tar-fs, same rules as homey CLI _getPackStream):', appPath);

if (!fs.existsSync(appPath)) {
  console.error('FATAL: .homeybuild does not exist. Run `homey app build` first.');
  process.exit(2);
}

const files = [];
let rejectedReserved = 0;
let totalSize = 0;

const outPath = path.join(os.tmpdir(), 'inspect-pack.tar.gz');

const pack = tar.pack(appPath, {
  dereference: true,
  map(header) {
    // tar-fs gives us each header before it is written. Capture it.
    if (header.type === 'file' || header.type === 'directory') {
      files.push({ name: header.name, type: header.type, size: header.size });
    }
    return header;
  },
  ignore(name) {
    // Same rules as homey CLI App.js _getPackStream.
    if (name.startsWith('.')) return true;
    if (name.includes('/.git/')) return true;
    // EXTRA guard: reject Windows reserved-name entries that would hang tar.
    if (isReservedName(name)) {
      rejectedReserved++;
      console.error(`[GUARD] Ignored reserved-name entry from pack: ${name}`);
      return true;
    }
    return false;
  },
}).on('data', (chunk) => { totalSize += chunk.length; });

pack.on('error', (e) => {
  console.error('PACK ERROR:', e.message);
  process.exit(2);
});

pipeline(
  pack,
  zlib.createGzip(),
  fs.createWriteStream(outPath),
  (err) => {
    if (err) {
      console.error('PIPELINE ERROR:', err.message);
      process.exit(2);
    }
    console.log('=== Pack complete ===');
    console.log('Total entries:', files.length);
    if (rejectedReserved > 0) {
      console.log(`Reserved-name entries rejected by guard: ${rejectedReserved}`);
    }

    const appJson = files.find((f) => f.name === 'app.json' || f.name.endsWith('/app.json'));
    console.log('app.json entry:', appJson ? `${appJson.name} (${appJson.size} bytes)` : 'NOT FOUND !!!');

    console.log('First 30 entries:');
    files.slice(0, 30).forEach((f) => console.log(`  ${f.type.padEnd(10)} ${f.name} ${f.size || ''}`));

    const dotEntries = files.filter((f) => f.name.startsWith('.') || f.name.includes('/.'));
    console.log('Dotfile entries that slipped through:', dotEntries.length);

    const reservedEntries = files.filter((f) => isReservedName(f.name));
    if (reservedEntries.length > 0) {
      console.error(`FATAL: ${reservedEntries.length} reserved-name entries made it into the pack:`);
      reservedEntries.forEach((f) => console.error(`  - ${f.name}`));
      console.error('This archive would hang tar / cause Athom processing_failed.');
      process.exit(2);
    }

    if (!appJson) {
      console.error('FATAL: app.json not found in pack — build is invalid.');
      process.exit(2);
    }

    // Verify the written archive is non-empty and well-sized.
    try {
      const stats = fs.statSync(outPath);
      const sizeMB = stats.size / (1024 * 1024);
      console.log(`Archive on disk: ${outPath}`);
      console.log(`Archive size: ${sizeMB.toFixed(2)} MB (Athom limit ~30MB, target <20MB)`);
      console.log(`Streamed (compressed) bytes: ${totalSize}`);
      if (stats.size === 0) {
        console.error('FATAL: archive is 0 bytes — pack produced nothing (possible hang).');
        process.exit(2);
      }
      if (sizeMB > 30) {
        console.error('FATAL: archive exceeds Athom hard limit (~30MB) — would cause processing_failed.');
        process.exit(2);
      }
      console.log('OK: archive is well-formed.');
    } catch (statErr) {
      console.error('FATAL: could not stat archive:', statErr.message);
      process.exit(2);
    }
  },
);
