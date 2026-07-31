#!/usr/bin/env node
'use strict';
/**
 * build-firmware-updates.js (P92.70)
 * Generates Homey NATIVE Zigbee firmware updates (firmware v13.2.0+ feature):
 * for every OEM Tuya image in the Koenkk/zigbee-OTA index that matches one
 * of OUR curated fingerprints (mfs_db), download the image (SHA512-verified
 * against the index — same hardening as lib/ota), validate the OTA header
 * (magic 0x0BEEF11E — same as lib/ota), compute the sha256 integrity, ship
 * the file in drivers/<id>/firmware/ and inject a `firmwareUpdates` block
 * into driver.compose.json (format validated by homey-lib ≥2.51:
 *   { updates: [{ changelog:{en}, device:{manufacturerName[],productId[]},
 *                 files:[{fileVersion,imageType,manufacturerCode,size,name,
 *                         integrity,minFileVersion,maxFileVersion,
 *                         minHardwareVersion,maxHardwareVersion}] }] })
 *
 * Safety:
 *  - pvvx/community replacement firmwares are EXCLUDED (not OEM updates).
 *  - device.manufacturerName/productId are intersected with the driver's own
 *    zigbee lists (homey-lib requires them to be subsets).
 *  - DRY-RUN by default; --apply to write.
 *
 * Usage: node tools/ci/build-firmware-updates.js [--apply]
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const INDEX_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json';
const TUYA_MFR_CODES = new Set([4417, 4098]);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function get(url, asBuffer = false, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {return reject(new Error('too many redirects'));}
    const req = https.get(url, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode)) {
        res.resume();
        return resolve(get(new URL(res.headers.location, url).toString(), asBuffer, redirects + 1));
      }
      if (res.statusCode !== 200) {return reject(new Error(`HTTP ${res.statusCode} for ${url}`));}
      const chunks = [];
      let received = 0;
      res.on('data', (c) => {
        received += c.length;
        if (received > MAX_IMAGE_BYTES) {req.destroy(new Error('image exceeds 2MB cap'));}
        chunks.push(c);
      });
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve(asBuffer ? buf : buf.toString('utf8'));
      });
    });
    req.setTimeout(60000, () => req.destroy(new Error('timeout 60s')));
    req.on('error', reject);
  });
}

function sha512(buf) {return crypto.createHash('sha512').update(buf).digest('hex');}
function sha256(buf) {return crypto.createHash('sha256').update(buf).digest('hex');}

function parseOtaHeader(buf) {
  // Zigbee OTA header (spec 07-5123): magic 0x0BEEF11E LE at offset 0
  if (buf.length < 56 || buf.readUInt32LE(0) !== 0x0BEEF11E) {return null;}
  return {
    headerVersion: buf.readUInt16LE(4),
    headerLength: buf.readUInt16LE(6),
    fieldControl: buf.readUInt16LE(8),
    manufacturerCode: buf.readUInt16LE(10),
    imageType: buf.readUInt16LE(12),
    fileVersion: buf.readUInt32LE(14),
    stackVersion: buf.readUInt16LE(18),
    totalImageSize: buf.readUInt32LE(52),
    minimumHardwareVersion: buf.readUInt16LE(24) || null,
    maximumHardwareVersion: buf.readUInt16LE(26) || null
  };
}

async function main() {
  const index = JSON.parse(await get(INDEX_URL));
  const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8'));
  const dbLower = new Map(Object.keys(db).map(k => [k.toLowerCase(), k]));

  // OEM Tuya images matching our curated fingerprints (pvvx excluded: their
  // fileVersion 20459521 = community replacement firmware, not OEM update)
  const candidates = index.filter(img => {
    if (!TUYA_MFR_CODES.has(img.manufacturerCode)) {return false;}
    if (img.fileVersion === 20459521) {return false;} // pvvx community firmware
    if (!Array.isArray(img.manufacturerName) || !img.manufacturerName.length) {return false;}
    return img.manufacturerName.some(m => dbLower.has(String(m).toLowerCase()));
  });

  console.log(`[firmware-updates] ${candidates.length} image(s) OEM Tuya correspondant à nos empreintes`);
  const report = { generated: new Date().toISOString(), apply: APPLY, drivers: [], skipped: [] };

  for (const img of candidates) {
    const mfr = img.manufacturerName.find(m => dbLower.has(String(m).toLowerCase()));
    const dbKey = dbLower.get(String(mfr).toLowerCase());
    const entry = db[dbKey];
    const driverId = entry.driverId;
    const composePath = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
    if (!fs.existsSync(composePath)) {
      report.skipped.push({ mfr, driverId, reason: 'driver.compose.json absent' });
      continue;
    }
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const driverMfrs = new Set((compose.zigbee?.manufacturerName || []).map(x => String(x)));
    const driverPids = new Set((compose.zigbee?.productId || []).map(x => String(x)));

    // device.manufacturerName: ONLY the exact mfr(s) of this image present in the driver
    const deviceMfrs = img.manufacturerName.filter(m => driverMfrs.has(String(m)));
    if (!deviceMfrs.length) {
      report.skipped.push({ mfr, driverId, reason: 'mfr absent du compose du driver' });
      continue;
    }
    // device.productId: modelIds of the curated entry ∩ driver pids (fallback: all driver pids)
    const modelIds = (entry.modelIds || []).filter(p => driverPids.has(p));
    const devicePids = modelIds.length ? modelIds : [...driverPids].slice(0, 5);
    if (!devicePids.length) {
      report.skipped.push({ mfr, driverId, reason: 'aucun productId compatible' });
      continue;
    }

    // Download + verify
    let buf;
    try {
      buf = await get(img.url, true);
    } catch (err) {
      report.skipped.push({ mfr, driverId, reason: `download: ${err.message}` });
      continue;
    }
    if (img.sha512 && sha512(buf) !== img.sha512) {
      report.skipped.push({ mfr, driverId, reason: 'SHA512 mismatch — image rejetée' });
      continue;
    }
    const header = parseOtaHeader(buf);
    if (!header) {
      report.skipped.push({ mfr, driverId, reason: 'header OTA invalide (magic)' });
      continue;
    }
    if (header.imageType !== img.imageType || header.manufacturerCode !== img.manufacturerCode) {
      report.skipped.push({ mfr, driverId, reason: `header/index mismatch (${header.imageType}/${header.manufacturerCode} vs ${img.imageType}/${img.manufacturerCode})` });
      continue;
    }

    const fileName = path.basename(new URL(img.url).pathname);
    const entry2 = {
      driverId, mfrs: deviceMfrs, pids: devicePids, fileName,
      fileVersion: header.fileVersion, imageType: header.imageType,
      manufacturerCode: header.manufacturerCode, size: buf.length,
      url: img.url.slice(-70)
    };

    if (APPLY) {
      // homey-lib 2.51: files[].name cannot include subdirectories —
      // the firmware file must sit in the DRIVER ROOT.
      const fwPath = path.join(ROOT, 'drivers', driverId, fileName);
      fs.writeFileSync(fwPath, buf);

      compose.firmwareUpdates = compose.firmwareUpdates || { updates: [] };
      // idempotent: replace any existing update for the same imageType
      compose.firmwareUpdates.updates = (compose.firmwareUpdates.updates || [])
        .filter(u => !(u.files || []).some(f => f.imageType === header.imageType && f.manufacturerCode === header.manufacturerCode));
      compose.firmwareUpdates.updates.push({
        changelog: { en: `OEM Tuya firmware v${header.fileVersion} (Koenkk zigbee-OTA, SHA512-verified)` },
        device: { manufacturerName: deviceMfrs, productId: devicePids },
        files: [{
          fileVersion: header.fileVersion,
          imageType: header.imageType,
          manufacturerCode: header.manufacturerCode,
          // homey-lib 2.51 schema: optional version/hardware bounds only when known
          ...(img.minFileVersion ? { minFileVersion: img.minFileVersion } : {}),
          ...(img.maxFileVersion ? { maxFileVersion: img.maxFileVersion } : {}),
          ...(header.minimumHardwareVersion ? { minHardwareVersion: header.minimumHardwareVersion } : {}),
          ...(header.maximumHardwareVersion ? { maxHardwareVersion: header.maximumHardwareVersion } : {}),
          size: buf.length,
          name: fileName, // homey-lib 2.51: basename only, no subdirectories
          integrity: `sha256:${sha256(buf)}` // schema: "<algo>:<hex>"
        }]
      });
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
      entry2.applied = true;
    }
    report.drivers.push(entry2);
    console.log(`  ✓ ${driverId}: ${deviceMfrs.join(',')} ← imageType ${header.imageType} v${header.fileVersion} (${(buf.length / 1024).toFixed(0)} Ko)`);
  }

  for (const s of report.skipped) {console.log(`  ✗ ${s.mfr} (${s.driverId}): ${s.reason}`);}
  fs.writeFileSync(path.join(ROOT, '.github', 'state', 'firmware-updates-report.json'), JSON.stringify(report, null, 1));
  console.log(`[firmware-updates] mode=${APPLY ? 'APPLY' : 'DRY-RUN'} | drivers: ${report.drivers.length} | skipped: ${report.skipped.length}`);
}

main().catch(err => {console.error(err.message); process.exit(1);});
