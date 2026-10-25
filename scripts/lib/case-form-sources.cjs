'use strict';
// WHY(P3041, 25/10/2026 Paris): tools/ci/ensure-case-variants.js mints an all-lowercase twin of every
// manufacturerName (P99/P2677) and the publish compaction keeps up to 2 case forms per manufacturer.
// Homey matches manufacturerName byte-exact, and no external source of the repo has ever seen an
// all-lowercase Tuya form (z2m herdsman cache, z2m coverage, KB couples, 176 interviews, diag reports:
// 0 each; measured on the 9.0.x master payload 25/10/2026). Each such twin costs |productId| combos for a
// string no real device sends. This module only decides which case forms are ARTIFACTS:
//   a form is an artifact iff (1) no source lists it byte-exact, (2) it is all-lowercase or all-uppercase,
//   (3) it is not padded (P2941 wire forms stay), and (4) the same driver keeps another form of the same
//   manufacturer that is either sourced or mixed-case (the canonical Tuya form, e.g. _TZE200_abcd1234).
// A group with no sourced and no mixed-case form is left untouched (we never guess which form is real).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (f, fb) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return fb; } };
const key = (v) => String(v).trim().toLowerCase();
const isPadded = (v) => typeof v === 'string' && v !== v.trim();
const isPureCase = (v) => typeof v === 'string' && /[a-z]/i.test(v) && (v === v.toLowerCase() || v === v.toUpperCase());

/** Exact manufacturer strings seen by an external source (never the composes, which hold the minted twins). */
function loadSourcedForms(root = ROOT) {
  const S = new Set();
  const add = (v) => { if (typeof v === 'string' && v.trim()) S.add(v); };
  for (const d of readJson(path.join(root, 'data', 'z2m_herdsman_cache.json'), { devices: [] }).devices || []) (d.mfrs || []).forEach(add);
  for (const r of readJson(path.join(root, 'data', 'kb', 'z2m-coverage.json'), { rows: [] }).rows || []) add(String(r.k || '').split('|')[0]);
  for (const k of Object.keys(readJson(path.join(root, 'data', 'kb', 'couples.json'), { couples: {} }).couples || {})) add(k.split('|')[0]);
  for (const r of readJson(path.join(root, 'data', 'diag-ids.json'), { reports: [] }).reports || []) (r.mfrs || []).forEach(add);
  for (const c of readJson(path.join(root, 'config', 'architecture', 'publish-sacred-keep-couples.json'), { couples: [] }).couples || []) add(c.mfr);
  const guard = readJson(path.join(root, 'lib', 'data', 'couple-guard.json'), { drivers: {} });
  for (const e of Object.values(guard.drivers || {})) Object.keys(e.mfrs || {}).forEach(add);
  const dir = path.join(root, 'docs', 'data', 'interviews');
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')); } catch (_) { files = []; }
  for (const f of files) { const j = readJson(path.join(dir, f), null); if (j) add(j.manufacturerName); }
  return S;
}

/** Split a manufacturerName list (one driver) into kept forms and artifact forms. Order is preserved. */
function splitArtifactForms(list, sourced) {
  const groups = new Map();
  for (const v of list || []) {
    if (typeof v !== 'string' || !v.trim()) continue;
    const k = key(v);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(v);
  }
  const artifacts = new Set();
  for (const forms of groups.values()) {
    if (forms.length < 2) continue;
    const anchor = (f) => sourced.has(f) || (!isPureCase(f) && !isPadded(f));
    for (const f of forms) {
      if (sourced.has(f) || isPadded(f) || !isPureCase(f)) continue;
      if (forms.some((g) => g !== f && anchor(g))) artifacts.add(f);
    }
  }
  return {
    kept: (list || []).filter((v) => !artifacts.has(v)),
    artifacts: (list || []).filter((v) => artifacts.has(v)),
  };
}

module.exports = { loadSourcedForms, splitArtifactForms, isPureCase, isPadded };
