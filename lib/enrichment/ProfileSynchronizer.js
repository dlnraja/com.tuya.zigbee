'use strict';

/**
 * ProfileSynchronizer — merge forum/diag signals into catalog stubs (never overwrite curated rows).
 */

const fs = require('fs');
const path = require('path');
const {
  loadManifest,
  getLayer,
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
} = require('./EnrichmentRegistry');

function upsertUser(catalog, username, patch) {
  if (!username) return false;
  if (!catalog.users[username]) {
    catalog.users[username] = {
      forumTopic: 140352,
      posts: [],
      diags: [],
      devices: [],
      _autoStub: true,
    };
  }
  const u = catalog.users[username];
  let changed = false;
  for (const n of patch.posts || []) {
    if (!u.posts.includes(n)) {
      u.posts.push(n);
      u.posts.sort((a, b) => a - b);
      changed = true;
    }
  }
  if (patch.dualApp && !u.dualApp) {
    u.dualApp = patch.dualApp;
    changed = true;
  }
  return changed;
}

function upsertCoupleStub(dpKnowledge, mfr, pid, meta) {
  if (!mfr || !pid) return false;
  const key = coupleKey(mfr, pid);
  if (dpKnowledge.couples[key]) return false;
  dpKnowledge.couples[key] = {
    caseId: `auto-${key.replace(/\|/g, '-').toLowerCase()}`,
    driver: meta.canonicalDriver || null,
    _autoStub: true,
    sources: meta.sources || [],
    dps: {},
    notes: meta.notes || 'Auto stub — requires Z2M/interview enrichment before TX',
  };
  return true;
}

function syncFromProcessor(processor, catalog, dpKnowledge, actionModel, limits) {
  const stats = { usersTouched: 0, coupleStubs: 0, postsMerged: 0, skippedMegathread: 0 };
  if (!processor?.posts?.length) return stats;

  for (const post of processor.posts) {
    const userChanged = upsertUser(catalog, post.username, {
      posts: [post.postNumber],
      dualApp: post.dualApp?.track,
    });
    if (userChanged) {
      stats.usersTouched += 1;
      stats.postsMerged += 1;
    }

    if (!shouldSyncPostCouples(post, limits)) {
      if ((post.couples || []).length > (limits.maxCouplesPerPost || 6)) stats.skippedMegathread += 1;
      continue;
    }

    for (const c of post.couples || []) {
      const verdictCfg = actionModel.verdictActions[c.verdict];
      if (verdictCfg?.autoSyncUserStub && c.mfr && c.pid && catalog.users[post.username]) {
        const u = catalog.users[post.username];
        if (!canAddAutoDevice(u, limits)) continue;
        if (userHasCouple(u, c.mfr, c.pid)) continue;
        u.devices = u.devices || [];
        u.devices.push({
          tile: `Forum T${post.topicId} #${post.postNumber}`,
          driver: c.canonicalDriver || c.deviceTruthDriver || null,
          couple: coupleStr(c.mfr, c.pid),
          symptoms: post.issues || [],
          fixes: [],
          userAction: verdictCfg.userAction,
          _autoStub: true,
        });
        stats.usersTouched += 1;
      }
      if (!verdictCfg?.autoSyncCoupleStub) continue;
      if (upsertCoupleStub(dpKnowledge, c.mfr, c.pid, {
        canonicalDriver: c.canonicalDriver || c.deviceTruthDriver,
        sources: [`forum-T${post.topicId}#${post.postNumber}`],
        notes: `Verdict ${c.verdict} @${post.username}`,
      })) {
        stats.coupleStubs += 1;
      }
    }
  }
  return stats;
}

function syncFromParse(parseReport, catalog) {
  const stats = { usersTouched: 0 };
  if (!parseReport?.analysis?.recentActionable) return stats;
  for (const row of parseReport.analysis.recentActionable) {
    if (upsertUser(catalog, row.username, { posts: [row.post_number] })) {
      stats.usersTouched += 1;
    }
  }
  return stats;
}

function runSync(options = {}) {
  const reg = loadManifest();
  const dryRun = options.dryRun === true;

  const catalogPath = reg.layers.userImpact.path;
  const dpPath = reg.layers.dpCouples.path;
  const catalog = loadJson(catalogPath) || { _meta: {}, users: {}, fixCatalog: {} };
  const dpKnowledge = loadJson(dpPath) || { _meta: {}, couples: {} };
  catalog.users = catalog.users || {};
  catalog.fixCatalog = catalog.fixCatalog || {};

  const limits = getMergeLimits(reg.manifest);
  const pruned = pruneCatalogBloat(catalog, limits);

  const processor = loadJson(reg.statePath('forumProcessor'));
  const parseReport = loadJson(reg.statePath('forumParse'));

  const stats = {
    pruned,
    processor: syncFromProcessor(processor, catalog, dpKnowledge, reg.actionModel, limits),
    parse: syncFromParse(parseReport, catalog),
  };

  catalog._meta.updated = new Date().toISOString().slice(0, 10);
  catalog._meta.lastSync = new Date().toISOString();
  dpKnowledge._meta = dpKnowledge._meta || {};
  dpKnowledge._meta.lastSync = new Date().toISOString();

  if (!dryRun) {
    fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
    fs.writeFileSync(dpPath, `${JSON.stringify(dpKnowledge, null, 2)}\n`);
    invalidateCache();
  }

  return { stats, catalogPath, dpPath, dryRun };
}

module.exports = { runSync, upsertUser, upsertCoupleStub };
