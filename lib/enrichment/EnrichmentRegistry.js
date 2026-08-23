'use strict';

/**
 * EnrichmentRegistry — single loader for config/enrichment manifest + layers.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST = path.join(ROOT, 'config', 'enrichment', 'manifest.json');

let _cache = null;

function resolve(rel) {
  return path.join(ROOT, rel);
}

function loadJson(fp) {
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp));
}

function loadManifest() {
  if (_cache) return _cache;
  const manifest = loadJson(MANIFEST);
  if (!manifest) throw new Error(`Missing enrichment manifest: ${MANIFEST}`);

  const phases = loadJson(resolve(manifest.phases));
  const actionModel = loadJson(resolve(manifest.models.action));
  const issueModel = loadJson(resolve(manifest.models.issue));

  const layers = {};
  for (const [key, spec] of Object.entries(manifest.layers || {})) {
    const fp = resolve(spec.path);
    const data = loadJson(fp);
    layers[key] = { spec, path: fp, data };
  }

  _cache = {
    root: ROOT,
    manifest,
    phases,
    actionModel,
    issueModel,
    layers,
    reportDir(date = new Date().toISOString().slice(0, 10)) {
      return resolve(manifest.outputs.reportDir.replace('{{date}}', date));
    },
    profilePagesDir() {
      return resolve(manifest.outputs.profilePages);
    },
    statePath(key) {
      return resolve(manifest.state[key] || '');
    },
  };
  return _cache;
}

function getLayer(name) {
  const reg = loadManifest();
  const layer = reg.layers[name];
  if (!layer?.data) return null;
  return layer.data;
}

function getFixCatalog() {
  const user = getLayer('userImpact');
  return user?.fixCatalog || {};
}

function coupleKey(mfr, pid) {
  return `${String(mfr || '').trim()}|${String(pid || '').trim().toUpperCase()}`;
}

function coupleStr(mfr, pid) {
  return `${String(mfr || '').trim()}+${String(pid || '').trim().toUpperCase()}`;
}

function getMergeLimits(manifest) {
  return manifest?.sources?.mergeRules?.limits || {
    maxCouplesPerPost: 6,
    maxAutoDevicesPerUser: 12,
    skipMegathreadFirstPost: true,
    megathreadTopics: [26439],
  };
}

function shouldSyncPostCouples(post, limits) {
  if (!post?.couples?.length) return false;
  if (post.couples.length > (limits.maxCouplesPerPost || 6)) return false;
  const topicId = Number(post.topicId);
  if (limits.skipMegathreadFirstPost
    && limits.megathreadTopics?.includes(topicId)
    && Number(post.postNumber) === 1) {
    return false;
  }
  return true;
}

function userHasCouple(user, mfr, pid) {
  const key = coupleKey(mfr, pid);
  return (user?.devices || []).some((d) => {
    if (!d.couple) return false;
    const [m, p] = String(d.couple).split('+');
    return coupleKey(m, p) === key;
  });
}

function countAutoDevices(user) {
  return (user?.devices || []).filter((d) => d._autoStub).length;
}

function canAddAutoDevice(user, limits) {
  return countAutoDevices(user) < (limits.maxAutoDevicesPerUser || 12);
}

/** Drop megathread bloat stubs (e.g. T26439 #1 with 20k extracted couples). */
function pruneCatalogBloat(catalog, limitsIn) {
  const limits = limitsIn || {};
  const max = limits.maxAutoDevicesPerUser || 12;
  let pruned = 0;
  for (const user of Object.values(catalog.users || {})) {
    if (!user.devices?.length) continue;
    const auto = user.devices.filter((d) => d._autoStub);
    const curated = user.devices.filter((d) => !d._autoStub);
    if (auto.length <= max) continue;
    const kept = [];
    const seen = new Set();
    for (const d of auto) {
      if (kept.length >= max) break;
      const [m, p] = String(d.couple || '').split('+');
      const key = m && p ? coupleKey(m, p) : d.tile;
      if (seen.has(key)) continue;
      seen.add(key);
      kept.push(d);
    }
    pruned += auto.length - kept.length;
    user.devices = [...curated, ...kept];
  }
  return pruned;
}

function invalidateCache() {
  _cache = null;
}

module.exports = {
  loadManifest,
  getLayer,
  getFixCatalog,
  coupleKey,
  coupleStr,
  getMergeLimits,
  shouldSyncPostCouples,
  userHasCouple,
  canAddAutoDevice,
  pruneCatalogBloat,
  resolve,
  loadJson,
  invalidateCache,
  ROOT,
};
