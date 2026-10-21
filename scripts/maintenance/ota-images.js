#!/usr/bin/env node
'use strict';
/**
 * P2932 — OTA image audit and on-demand fetch for Homey Device Updates.
 *
 * Homey >= 13.2 installs Zigbee firmware itself from the files listed in each
 * driver's firmwareUpdates (driver.compose.json or driver.firmware.compose.json),
 * stored in drivers/<id>/assets/firmware/. Per the Homey SDK page "Zigbee
 * Firmware Updates", those files are stored apart from the app at upload and
 * only downloaded by Homey when an update is installed, so the app cannot
 * fetch them at runtime itself: they must be present when the app is built.
 *
 * This tool makes them reproducible from the public index so the binaries do
 * not have to live in git:
 *   --audit (default)  every listed file: present? sha256 integrity? OTA header
 *                      (0x0BEEF11E magic, manufacturerCode, imageType, fileVersion)
 *                      matches the manifest? same image in the Koenkk index with
 *                      the same version/code/type and a manufacturerName that
 *                      covers ours? Also lists bins no manifest references.
 *   --fetch            download missing files from the index URL, verify the
 *                      index sha512, the manifest integrity and the header, then
 *                      write them. Nothing is written when a check fails.
 *   --index <file>     use a local copy of Koenkk/zigbee-OTA index.json (offline).
 *   --json             machine-readable output.
 * Exit code 1 when an error is found. Never deletes anything.
 *
 * Sources: Koenkk/zigbee-OTA index.json (https://github.com/Koenkk/zigbee-OTA),
 * ZCL spec ch. 11 OTA header layout, Homey SDK zigbee-firmware-updates page.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const INDEX_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json';
const args = process.argv.slice(2);
const has = (k) => args.includes(`--${k}`);
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };

function readOtaHeader(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 56) return null;
  if (buf.readUInt32LE(0) !== 0x0BEEF11E) return null;
  return { manufacturerCode: buf.readUInt16LE(10), imageType: buf.readUInt16LE(12), fileVersion: buf.readUInt32LE(14), totalSize: buf.readUInt32LE(52) };
}

function digest(buf, integrity) {
  const [algo, hex] = String(integrity || '').split(':');
  if (!algo || !hex) return { ok: false, why: 'no integrity' };
  try { return { ok: crypto.createHash(algo).update(buf).digest('hex') === hex.toLowerCase(), why: algo }; } catch { return { ok: false, why: `unsupported ${algo}` }; }
}

function collectManifests(root = ROOT) {
  const out = [];
  const ddir = path.join(root, 'drivers');
  for (const d of fs.readdirSync(ddir)) {
    const candidates = ['driver.firmware.compose.json', 'driver.compose.json'];
    for (const c of candidates) {
      const f = path.join(ddir, d, c);
      if (!fs.existsSync(f)) continue;
      let j; try { j = JSON.parse(fs.readFileSync(f)); } catch { continue; }
      const fw = c === 'driver.compose.json' ? j.firmwareUpdates : j;
      if (!fw || !Array.isArray(fw.updates)) continue;
      for (const u of fw.updates) for (const file of u.files || []) out.push({ driver: d, manifest: path.relative(root, f), device: u.device || {}, file, wake: !!fw.wakeInstruction });
    }
  }
  return out;
}

function indexEntryFor(index, name) {
  return (index || []).find((e) => (e.url && e.url.endsWith(`/${name}`)) || e.fileName === name) || null;
}

/** Checks one manifest file entry against a buffer and/or an index entry. Pure. */
function checkEntry(entry, buf, idx) {
  const errors = [], notes = [];
  const f = entry.file;
  if (buf) {
    if (f.size != null && buf.length !== f.size) errors.push(`size ${buf.length} != manifest ${f.size}`);
    const dg = digest(buf, f.integrity);
    if (!dg.ok) errors.push(`integrity mismatch (${dg.why})`);
    const h = readOtaHeader(buf);
    if (!h) errors.push('no OTA header (magic 0x0BEEF11E)');
    else for (const k of ['manufacturerCode', 'imageType', 'fileVersion']) if (h[k] !== f[k]) errors.push(`header ${k} ${h[k]} != manifest ${f[k]}`);
  }
  if (idx) {
    for (const k of ['manufacturerCode', 'imageType', 'fileVersion']) if (idx[k] != null && idx[k] !== f[k]) errors.push(`index ${k} ${idx[k]} != manifest ${f[k]}`);
    const idxMfr = [].concat(idx.manufacturerName || []);
    const ours = [].concat(entry.device.manufacturerName || []);
    if (idxMfr.length) {
      const lower = new Set(idxMfr.map((m) => m.toLowerCase()));
      const outside = ours.filter((m) => !lower.has(String(m).toLowerCase()));
      if (outside.length) errors.push(`manufacturerName outside the index target: ${outside.join(', ')}`);
      const exact = new Set(idxMfr);
      const caseOnly = ours.filter((m) => !exact.has(m) && lower.has(String(m).toLowerCase()));
      if (caseOnly.length && !ours.some((m) => exact.has(m))) notes.push(`only non-canonical case listed (${caseOnly.join(', ')}); add the index spelling`);
    }
    if (idx.modelId && entry.device.productId && ![].concat(entry.device.productId).includes(idx.modelId)) errors.push(`index modelId ${idx.modelId} not in productId`);
  } else notes.push('not found in the Koenkk index');
  return { errors, notes };
}

function orphanBins(entries, root = ROOT) {
  const listed = new Set(entries.map((e) => `${e.driver}/${e.file.name}`));
  const out = [];
  const ddir = path.join(root, 'drivers');
  for (const d of fs.readdirSync(ddir)) {
    const fdir = path.join(ddir, d, 'assets', 'firmware');
    if (!fs.existsSync(fdir)) continue;
    for (const n of fs.readdirSync(fdir)) if (!listed.has(`${d}/${n}`)) out.push({ path: `drivers/${d}/assets/firmware/${n}`, bytes: fs.statSync(path.join(fdir, n)).size });
  }
  return out;
}

async function loadIndex() {
  const p = opt('index');
  if (p) return JSON.parse(fs.readFileSync(p));
  const res = await fetch(INDEX_URL);
  if (!res.ok) throw new Error(`index HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const index = await loadIndex();
  const entries = collectManifests();
  const report = [];
  let failed = false;
  for (const e of entries) {
    const local = path.join(ROOT, 'drivers', e.driver, 'assets', 'firmware', e.file.name);
    const idx = indexEntryFor(index, e.file.name);
    let buf = fs.existsSync(local) ? fs.readFileSync(local) : null;
    let fetched = false;
    if (!buf && has('fetch') && idx && idx.url) {
      const res = await fetch(idx.url);
      if (res.ok) {
        const b = Buffer.from(await res.arrayBuffer());
        const sha512ok = !idx.sha512 || crypto.createHash('sha512').update(b).digest('hex') === String(idx.sha512).toLowerCase();
        const r = checkEntry(e, b, idx);
        if (sha512ok && !r.errors.length) { fs.mkdirSync(path.dirname(local), { recursive: true }); fs.writeFileSync(local, b); buf = b; fetched = true; }
      }
    }
    const r = checkEntry(e, buf, idx);
    if (!buf) r.errors.push(has('fetch') ? 'missing and could not be fetched/verified' : 'missing (run with --fetch)');
    if (r.errors.length) failed = true;
    report.push({ driver: e.driver, file: e.file.name, fileVersion: e.file.fileVersion, wake: e.wake, fetched, ...r });
  }
  const orphans = orphanBins(entries);
  if (has('json')) console.log(JSON.stringify({ entries: report, orphans }, null, 2));
  else {
    for (const r of report) console.log(`${r.errors.length ? 'FAIL' : 'ok  '} ${r.driver} ${r.file} v${r.fileVersion}${r.fetched ? ' (fetched)' : ''}${r.errors.length ? ` :: ${r.errors.join('; ')}` : ''}${r.notes.length ? ` [${r.notes.join('; ')}]` : ''}`);
    for (const o of orphans) console.log(`orphan ${o.path} (${Math.round(o.bytes / 1024)} KB, no manifest entry)`);
  }
  process.exit(failed ? 1 : 0);
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(2); });
module.exports = { readOtaHeader, digest, collectManifests, indexEntryFor, checkEntry, orphanBins };
