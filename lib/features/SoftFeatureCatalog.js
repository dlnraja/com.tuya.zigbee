'use strict';

/**
 * SoftFeatureCatalog (P2567) — loads 200 unbranded smart-feature vectors.
 * MASTER_ONLY. Branding-free IDs/titles only.
 */

const fs = require('fs');
const path = require('path');

const SSOT = path.join(__dirname, '..', '..', 'config', 'architecture', 'world-smart-features-200-ssot.json');

let _cache = null;

function load() {
  if (_cache) return _cache;
  const raw = fs.readFileSync(SSOT);
  _cache = JSON.parse(raw);
  return _cache;
}

function all() {
  return load().vectors || [];
}

function byId(id) {
  return all().find((v) => v.id === id) || null;
}

function byFamily(family) {
  return all().filter((v) => v.family === family);
}

function count() {
  return all().length;
}

function search(q) {
  const s = String(q || '').toLowerCase();
  if (!s) return all().slice(0, 50);
  return all().filter((v) => {
    const blob = `${v.id} ${v.role} ${v.uiName?.en || ''} ${v.family}`.toLowerCase();
    return blob.includes(s);
  });
}

function snapshot() {
  const list = all();
  const byStatus = {};
  const byFamily = {};
  const byRecipeType = {};
  for (const v of list) {
    byStatus[v.status] = (byStatus[v.status] || 0) + 1;
    byFamily[v.family] = (byFamily[v.family] || 0) + 1;
    const t = v.recipe?.type || 'none';
    byRecipeType[t] = (byRecipeType[t] || 0) + 1;
  }
  return { count: list.length, byStatus, byFamily, byRecipeType };
}

function clearCache() {
  _cache = null;
}

function recipeTypes() {
  return [...new Set(all().map((v) => v.recipe?.type).filter(Boolean))].sort();
}

module.exports = {
  load,
  all,
  byId,
  byFamily,
  count,
  search,
  snapshot,
  clearCache,
  recipeTypes,
  SSOT_PATH: SSOT,
};
