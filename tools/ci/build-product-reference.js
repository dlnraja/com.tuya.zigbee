#!/usr/bin/env node
'use strict';
/**
 * build-product-reference.js (v9.0.375)
 * Builds data/product-reference.json: the merged product database used for
 * battery-type-aware curves, energy estimation and device identification.
 *
 * Sources (all LOCAL, free — no API, no cost):
 *   - data/blakadder/devices.json        (vendor, model, title, category, page)
 *   - data/mfs_db.json                   (driver routing, modelIds)
 *   - drivers/<id>/driver.compose.json   (energy.batteries, class)
 *   - data/community-sync/all-enriched.json (deviceType, capabilities)
 *   - data/energy-consumption-reference.json (nominal/standby W, typical battery)
 *
 * Image URLs are CANDIDATES (public CDN patterns, never fetched at build):
 *   - zigbee.blakadder.com device page
 *   - zigbee2mqtt.io images
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const load = (p, fb) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return fb; } };

const blakadder = load('data/blakadder/devices.json', []);
const mfsDb = load('data/mfs_db.json', {});
const enriched = load('data/community-sync/all-enriched.json', []);
const energyRef = load('data/energy-consumption-reference.json', { drivers: {}, classes: {} });

// Sortie précédente : sert de fallback pour PRÉSERVER l'enrichissement
// (vendor/model/title/productPage/imageCandidates/variants) quand une source
// locale est absente — ex. data/blakadder/devices.json n'est pas tracké en git
// et manque donc sur les runners CI (régression housekeeping 2026-08-03).
const prevRef = load('data/product-reference.json', { reference: {} }).reference || {};
// Champs d'enrichissement préservés ; le routage (driverId, modelIds, batteries,
// energy, deviceClass) est toujours recalculé à frais.
const ENRICHED_FIELDS = ['vendor', 'model', 'title', 'category', 'description', 'productPage', 'imageCandidates', 'capabilities'];
const isEmpty = (v) => v == null || (Array.isArray(v) && v.length === 0);
// Index insensible à la casse (les clés de l'ancien fichier peuvent différer)
const prevByLc = new Map();
for (const [k, v] of Object.entries(prevRef)) {prevByLc.set(String(k).toLowerCase(), v);}

// Index blakadder par empreinte zigbee
const byMfr = new Map();
const blakArr = Array.isArray(blakadder) ? blakadder : Object.values(blakadder);
for (const dev of blakArr) {
  for (const zm of dev.zigbeeModels || []) {
    if (String(zm).startsWith('_')) {
      byMfr.set(String(zm).toLowerCase(), dev);
    }
  }
}

// Index enrichi par mfr
const enrichedByMfr = new Map();
const enrArr = Array.isArray(enriched) ? enriched : (enriched.devices || []);
for (const e of enrArr) {
  if (e.mfr) {enrichedByMfr.set(String(e.mfr).toLowerCase(), e);}
}

// Batteries + classe par driver (compose)
const driverInfo = new Map();
for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
  const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
  if (!fs.existsSync(p)) {continue;}
  try {
    const c = JSON.parse(fs.readFileSync(p, 'utf8'));
    driverInfo.set(d, {
      class: c.class || null,
      batteries: c.energy?.batteries || [],
      name: c.name?.en || d,
    });
  } catch { /* ignore */ }
}

// Rassemble toutes les empreintes connues (mfs_db + blakadder + drivers)
const allMfrs = new Set([...Object.keys(mfsDb), ...byMfr.keys()]);
for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
  const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
  if (!fs.existsSync(p)) {continue;}
  try {
    for (const m of (JSON.parse(fs.readFileSync(p, 'utf8')).zigbee?.manufacturerName || [])) {
      allMfrs.add(m);
    }
  } catch { /* ignore */ }
}

// Index mfr → driver depuis les composes (fallback quand mfs_db est incomplet)
const composeClaims = new Map(); // mfrLower -> Set<driverId>
for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
  const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
  if (!fs.existsSync(p)) {continue;}
  try {
    for (const m of (JSON.parse(fs.readFileSync(p, 'utf8')).zigbee?.manufacturerName || [])) {
      const lc = String(m).toLowerCase();
      if (!composeClaims.has(lc)) {composeClaims.set(lc, new Set());}
      composeClaims.get(lc).add(d);
    }
  } catch { /* ignore */ }
}

const reference = {};
let withBlak = 0, withBatteries = 0, withEnergy = 0;
for (const mfr of allMfrs) {
  const lc = String(mfr).toLowerCase();
  if (!/^_t[zy][a-z0-9]{4,}_/i.test(lc) && !lc.startsWith('_ty')) {continue;}

  const entry = mfsDb[mfr] || mfsDb[lc] || {};
  // driverId : mfs_db prioritaire ; sinon le seul driver qui revendique le mfr
  let driverId = entry.driverId || null;
  if (!driverId) {
    const claims = composeClaims.get(lc);
    if (claims && claims.size === 1) {driverId = [...claims][0];}
  }
  const blak = byMfr.get(lc) || null;
  const enr = enrichedByMfr.get(lc) || null;
  const drv = driverId ? driverInfo.get(driverId) : null;

  const batteries = drv?.batteries?.length
    ? drv.batteries
    : (energyRef.drivers?.[driverId]?.batteryTypical ? [energyRef.drivers[driverId].batteryTypical] : []);

  const slug = blak?.slug || null;
  const model = blak?.model || null;
  reference[mfr] = {
    driverId,
    modelIds: entry.modelIds || (entry.pid ? [entry.pid] : []) || null,
    vendor: blak?.vendor || null,
    model,
    title: blak?.title || null,
    category: blak?.category || enr?.deviceType || null,
    description: enr?.description || blak?.title || null,
    productPage: blak?.url ? `https://zigbee.blakadder.com${blak.url}` : null,
    imageCandidates: [
      slug ? `https://zigbee.blakadder.com/assets/images/devices/${slug.replace(/-html$/, '')}.jpg` : null,
      model ? `https://www.zigbee2mqtt.io/images/devices/${model}.jpg` : null,
    ].filter(Boolean),
    batteries,
    batteryTypical: batteries[0] || energyRef.drivers?.[driverId]?.batteryTypical || null,
    energy: energyRef.drivers?.[driverId]
      ? { nominalW: energyRef.drivers[driverId].nominalW ?? null, standbyW: energyRef.drivers[driverId].standbyW ?? null }
      : (energyRef.classes?.[drv?.class] || null),
    deviceClass: drv?.class || null,
    capabilities: enr?.capabilities || null,
    source: entry.source || (blak ? 'blakadder' : null),
  };
  // Préserve l'enrichissement existant quand la régénération ne peut pas le
  // reproduire (source blakadder absente ou empreinte absente du crawl).
  const prev = prevByLc.get(lc) || null;
  if (prev) {
    for (const f of ENRICHED_FIELDS) {
      if (isEmpty(reference[mfr][f]) && !isEmpty(prev[f])) {reference[mfr][f] = prev[f];}
    }
  }
  if (blak) {withBlak++;}
  if (batteries.length) {withBatteries++;}
  if (reference[mfr].energy) {withEnergy++;}
}

// Variantes : regroupe les empreintes pointant vers le même produit blakadder
const variantGroups = {};
for (const [mfr, info] of Object.entries(reference)) {
  const key = info.productPage || `${info.vendor}|${info.model}`;
  if (!key || key === '|') {continue;}
  variantGroups[key] = variantGroups[key] || [];
  variantGroups[key].push(mfr);
}
for (const group of Object.values(variantGroups)) {
  if (group.length < 2 || group.length > 60) {continue;} // cap: évite l'explosion O(n²)
  for (const mfr of group) {
    reference[mfr].variants = group.filter(m => m !== mfr).slice(0, 60);
  }
}

const OUT = path.join(ROOT, 'data', 'product-reference.json');
fs.writeFileSync(OUT, JSON.stringify({
  generated: new Date().toISOString(),
  count: Object.keys(reference).length,
  reference,
}, null, 1));
console.log(`[product-reference] ${Object.keys(reference).length} empreintes | blakadder: ${withBlak} | batteries: ${withBatteries} | énergie: ${withEnergy} | groupes de variants: ${Object.values(variantGroups).filter(g => g.length > 1).length}`);
