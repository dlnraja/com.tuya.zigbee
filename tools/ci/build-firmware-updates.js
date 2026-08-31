#!/usr/bin/env node
'use strict';
/**
 * build-firmware-updates.js (P92.70 / P194)
 * Generates Homey NATIVE Zigbee firmware updates (firmware v13.2.0+ feature):
 * for every OEM Tuya image in the Koenkk/zigbee-OTA index that matches one
 * of OUR curated fingerprints (mfs_db), download the image (SHA512-verified
 * against the index — same hardening as lib/ota), validate the OTA header
 * (magic 0x0BEEF11E — same as lib/ota), compute the sha256 integrity, ship
 * the file in drivers/<id>/assets/firmware/ and inject a `firmwareUpdates`
 * block into driver.compose.json (homey-lib ≥2.51).
 *
 * Homey resolves files[].name as a basename under assets/firmware/ — never
 * write bins to the driver root (that failed Homey Validate on wall_curtain_switch).
 *
 * Safety:
 *  - pvvx/community replacement firmwares are EXCLUDED (not OEM updates).
 *  - device.manufacturerName/productId are intersected with the driver's own
 *    zigbee lists (homey-lib requires them to be subsets).
 *  - productIds stay class-tight (image couple only). Never dump the whole
 *    driver productId list (brick risk: plug image + TS0041/TS130F).
 *  - Driver routing uses the misattribution registry + exclusive compose
 *    claim. mfs_db.driverId is a last resort and is refused on class mismatch
 *    (plug image on button_*, cover image off curtain/cover).
 *  - DRY-RUN by default; --apply to write.
 *
 * Usage: node tools/ci/build-firmware-updates.js [--apply]
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { lookup, isForbiddenPlacement } = require('../../lib/pairing/UserMisattributionRegistry');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const SSOT_PATH = path.join(ROOT, 'config', 'architecture', 'homey-device-updates.json');
const INDEX_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json';
const TUYA_MFR_CODES = new Set([4417, 4098]);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const BUTTON_DRIVERS = /^(button_|remote_|sos_|scene_switch)/;
const PLUG_IMAGE = /plug|breaker/i;
const COVER_IMAGE = /cover|curtain|win_cover/i;
const TRV_IMAGE = /uart_connect_sleep|trv|valve/i;

function loadSsot() {
  try {
    return JSON.parse(fs.readFileSync(SSOT_PATH, 'utf8'));
  } catch {
    return { wakeInstructions: {}, safety: {}, sources: {} };
  }
}

function changelogFor(fileVersion) {
  return {
    en: `OEM Zigbee firmware v${fileVersion} (Koenkk zigbee-OTA, SHA512-verified). Install via Homey Device Updates (Settings → Device Updates) on Homey ≥13.2 / Mobile ≥9.10.`,
    fr: `Firmware Zigbee OEM v${fileVersion} (Koenkk zigbee-OTA, SHA512 vérifié). Installez via Homey Device Updates (Réglages → Device Updates) — Homey ≥13.2 / Mobile ≥9.10.`,
  };
}

function ensureWakeInstruction(driverId, ssot) {
  const text = ssot.wakeInstructions?.[driverId];
  if (!text) return;
  const fwPath = path.join(ROOT, 'drivers', driverId, 'driver.firmware.compose.json');
  let fw = {};
  if (fs.existsSync(fwPath)) {
    try { fw = JSON.parse(fs.readFileSync(fwPath, 'utf8')); } catch { fw = {}; }
  }
  // Preserve existing updates in firmware.compose; only ensure wakeInstruction
  fw.wakeInstruction = text;
  if (!Array.isArray(fw.updates)) {
    // Keep updates in driver.compose.json firmwareUpdates when not already here
    delete fw.updates;
  }
  fs.writeFileSync(fwPath, `${JSON.stringify(fw, null, 2)}\n`);
}

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

function isWideDriver(id) {
  return /generic|hybrid|needs_device_assignment|_GENERIC_/i.test(id);
}

function classMismatch(driverId, fileName) {
  if (PLUG_IMAGE.test(fileName) && BUTTON_DRIVERS.test(driverId)) {return true;}
  if (COVER_IMAGE.test(fileName) && !/curtain|cover|shutter/.test(driverId)) {return true;}
  if (TRV_IMAGE.test(fileName) && !/radiator_valve|thermostatic|trv/.test(driverId)) {return true;}
  return false;
}

function classPids(fileName) {
  if (PLUG_IMAGE.test(fileName)) {return ['TS011F', 'TS0111', 'TS0121', 'TS0001'];}
  if (COVER_IMAGE.test(fileName)) {return ['TS130F'];}
  if (TRV_IMAGE.test(fileName)) {return ['TS0601'];}
  return [];
}

function loadDriverIndex() {
  const driversDir = path.join(ROOT, 'drivers');
  const index = [];
  for (const id of fs.readdirSync(driversDir)) {
    const composePath = path.join(driversDir, id, 'driver.compose.json');
    if (!fs.existsSync(composePath)) {continue;}
    let compose;
    try { compose = JSON.parse(fs.readFileSync(composePath, 'utf8')); } catch { continue; }
    index.push({
      id,
      composePath,
      compose,
      mfrs: new Set((compose.zigbee && compose.zigbee.manufacturerName || []).map(String)),
      pids: new Set((compose.zigbee && compose.zigbee.productId || []).map(String)),
    });
  }
  return index;
}

function resolveDriverForOta(mfr, fileName, entry, drivers) {
  const usable = (id) => {
    if (!id) {return false;}
    if (isForbiddenPlacement(mfr, id) || isWideDriver(id) || classMismatch(id, fileName)) {return false;}
    const d = drivers.find((x) => x.id === id);
    return !!(d && d.mfrs.has(mfr));
  };

  const rec = lookup(mfr);
  if (rec && usable(rec.canonicalDriver)) {return rec.canonicalDriver;}

  const claimants = drivers.filter((d) => d.mfrs.has(mfr) && usable(d.id)).map((d) => d.id);
  if (claimants.length === 1) {return claimants[0];}

  if (COVER_IMAGE.test(fileName)) {
    const hit = claimants.find((id) => /curtain|cover|shutter/.test(id));
    if (hit) {return hit;}
  }
  if (PLUG_IMAGE.test(fileName)) {
    const hit = claimants.find((id) => /plug|socket|switch_1gang|usb_dongle|din_rail/.test(id));
    if (hit) {return hit;}
  }
  if (TRV_IMAGE.test(fileName)) {
    const hit = claimants.find((id) => /radiator_valve|thermostatic/.test(id));
    if (hit) {return hit;}
  }
  if (usable(entry && entry.driverId)) {return entry.driverId;}
  return null;
}

function tightProductIds(entry, driverPids, fileName) {
  const hinted = classPids(fileName).filter((p) => driverPids.has(p));
  const fromEntry = (entry.modelIds || []).filter((p) => driverPids.has(p));
  if (hinted.length) {
    const overlap = fromEntry.filter((p) => hinted.includes(p));
    return overlap.length ? overlap : hinted;
  }
  return fromEntry;
}

async function main() {
  const ssot = loadSsot();
  const indexUrl = ssot.sources?.primary?.url || INDEX_URL;
  const index = JSON.parse(await get(indexUrl));
  const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8'));
  const dbLower = new Map(Object.keys(db).map((k) => [k.toLowerCase(), k]));
  const drivers = loadDriverIndex();

  const codes = new Set(
    Array.isArray(ssot.tuyaManufacturerCodes) && ssot.tuyaManufacturerCodes.length
      ? ssot.tuyaManufacturerCodes
      : [...TUYA_MFR_CODES],
  );

  const candidates = index.filter((img) => {
    if (!codes.has(img.manufacturerCode)) {return false;}
    if (img.fileVersion === 20459521) {return false;}
    if (!Array.isArray(img.manufacturerName) || !img.manufacturerName.length) {return false;}
    return img.manufacturerName.some((m) => dbLower.has(String(m).toLowerCase()));
  });

  console.log(`[firmware-updates] ${candidates.length} image(s) OEM Tuya correspondant à nos empreintes`);
  const report = {
    generated: new Date().toISOString(),
    apply: APPLY,
    patch: 'P2359',
    source: indexUrl,
    drivers: [],
    skipped: [],
  };

  for (const img of candidates) {
    const mfr = img.manufacturerName.find((m) => dbLower.has(String(m).toLowerCase()));
    const dbKey = dbLower.get(String(mfr).toLowerCase());
    const entry = db[dbKey] || {};
    const fileName = path.basename(new URL(img.url).pathname);
    const driverId = resolveDriverForOta(mfr, fileName, entry, drivers);
    if (!driverId) {
      report.skipped.push({ mfr, driverId: entry.driverId || null, reason: 'no safe driver route (registry/class)' });
      continue;
    }
    const driver = drivers.find((d) => d.id === driverId);
    const compose = driver.compose;
    const deviceMfrs = img.manufacturerName.filter((m) => driver.mfrs.has(String(m)));
    if (!deviceMfrs.length) {
      report.skipped.push({ mfr, driverId, reason: 'mfr absent du compose du driver' });
      continue;
    }
    const devicePids = tightProductIds(entry, driver.pids, fileName);
    if (!devicePids.length) {
      report.skipped.push({ mfr, driverId, reason: 'aucun productId class-tight compatible' });
      continue;
    }

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

    const entry2 = {
      driverId, mfrs: deviceMfrs, pids: devicePids, fileName,
      fileVersion: header.fileVersion, imageType: header.imageType,
      manufacturerCode: header.manufacturerCode, size: buf.length,
      url: img.url.slice(-70)
    };

    if (APPLY) {
      const fwDir = path.join(ROOT, 'drivers', driverId, 'assets', 'firmware');
      fs.mkdirSync(fwDir, { recursive: true });
      fs.writeFileSync(path.join(fwDir, fileName), buf);
      const staleRoot = path.join(ROOT, 'drivers', driverId, fileName);
      if (fs.existsSync(staleRoot)) {fs.unlinkSync(staleRoot);}

      compose.firmwareUpdates = compose.firmwareUpdates || { updates: [] };
      compose.firmwareUpdates.updates = (compose.firmwareUpdates.updates || [])
        .filter((u) => !(u.files || []).some((f) => f.imageType === header.imageType && f.manufacturerCode === header.manufacturerCode));
      compose.firmwareUpdates.updates.push({
        changelog: changelogFor(header.fileVersion),
        device: { manufacturerName: deviceMfrs, productId: devicePids },
        files: [{
          fileVersion: header.fileVersion,
          imageType: header.imageType,
          manufacturerCode: header.manufacturerCode,
          ...(img.minFileVersion ? { minFileVersion: img.minFileVersion } : {}),
          ...(img.maxFileVersion ? { maxFileVersion: img.maxFileVersion } : {}),
          ...(header.minimumHardwareVersion ? { minHardwareVersion: header.minimumHardwareVersion } : {}),
          ...(header.maximumHardwareVersion ? { maxHardwareVersion: header.maximumHardwareVersion } : {}),
          size: buf.length,
          name: fileName,
          integrity: `sha256:${sha256(buf)}`
        }]
      });
      fs.writeFileSync(driver.composePath, JSON.stringify(compose, null, 2) + '\n');
      ensureWakeInstruction(driverId, ssot);
      entry2.applied = true;
    }
    report.drivers.push(entry2);
    console.log(`  ✓ ${driverId}: ${deviceMfrs.join(',')} ← imageType ${header.imageType} v${header.fileVersion} (${(buf.length / 1024).toFixed(0)} Ko)`);
  }

  for (const s of report.skipped) {console.log(`  ✗ ${s.mfr} (${s.driverId}): ${s.reason}`);}
  const stateDir = path.join(ROOT, '.github', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, 'firmware-updates-report.json'), JSON.stringify(report, null, 1));
  console.log(`[firmware-updates] mode=${APPLY ? 'APPLY' : 'DRY-RUN'} | drivers: ${report.drivers.length} | skipped: ${report.skipped.length}`);
}

main().catch((err) => {console.error(err.message); process.exit(1);});
