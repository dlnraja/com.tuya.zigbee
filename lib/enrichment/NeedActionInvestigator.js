'use strict';

/**
 * NeedActionInvestigator — auto-investigate forum need-action without waiting for user reply.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { lookup } = require('../pairing/UserMisattributionRegistry');
const DeviceFingerprintDB = require('../DeviceFingerprintDB');
const {
  loadManifest,
  getLayer,
  loadJson,
  resolve,
  coupleKey,
  coupleStr,
  getMergeLimits,
  userHasCouple,
  canAddAutoDevice,
  pruneCatalogBloat,
} = require('./EnrichmentRegistry');
const {
  resolveUnknownCouple,
  resolveSymptomOnly,
  loadHeuristicModel,
} = require('./HeuristicUnknownResolver');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function loadInvestigationModel() {
  return loadJson(resolve('config/enrichment/models/investigation-model.json')) || {};
}

function loadDriverComposeIndex() {
  const byMfr = new Map();
  const dir = resolve('drivers');
  for (const id of fs.readdirSync(dir)) {
    const fp = path.join(dir, id, 'driver.compose.json');
    if (!fs.existsSync(fp)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(fp));
      const mfrs = c.zigbee?.manufacturerName || [];
      const pids = c.zigbee?.productId || [];
      for (const m of mfrs) {
        const ml = norm(m);
        if (!byMfr.has(ml)) byMfr.set(ml, []);
        byMfr.get(ml).push({ driver: id, pids: [...pids] });
      }
    } catch { /* skip */ }
  }
  return byMfr;
}

function loadTruthIndex() {
  const truth = getLayer('deviceTruth') || { drivers: {} };
  const map = new Map();
  for (const [driverId, row] of Object.entries(truth.drivers || {})) {
    for (const lock of row.locks || []) {
      if (lock.mfr && lock.productId) {
        map.set(coupleKey(lock.mfr, lock.productId), { driver: driverId, lock });
      }
    }
  }
  return map;
}

function globDiagExcerpts() {
  const out = [];
  const reportsDir = resolve('reports');
  if (!fs.existsSync(reportsDir)) return out;
  for (const dir of fs.readdirSync(reportsDir)) {
    const full = path.join(reportsDir, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    for (const f of fs.readdirSync(full)) {
      if (/^diag-.+-excerpt\.txt$/i.test(f)) {
        out.push({ path: path.join(full, f), logId: f.match(/diag-([a-f0-9]{8})/i)?.[1] });
      }
    }
  }
  return out;
}

function loadInboxByUser() {
  const fp = resolve('reports/community-inbox.md');
  if (!fs.existsSync(fp)) return new Map();
  const map = new Map();
  for (const line of fs.readFileSync(fp, 'utf8').split('\n')) {
    const m = line.match(/\*\*([^*]+)\*\*/);
    if (m) {
      const u = m[1].trim();
      if (!map.has(u)) map.set(u, []);
      map.get(u).push(line.replace(/^-\s*/, '').trim());
    }
  }
  return map;
}

function resolveCoupleCandidates(mfr, model, context) {
  const candidates = [];
  const seen = new Set();
  const add = (pid, source, driver, confidence) => {
    const k = `${norm(mfr)}|${norm(pid)}`;
    if (!pid || seen.has(k)) return;
    seen.add(k);
    candidates.push({ mfr, pid, source, driver, confidence });
  };

  for (const pid of model.pidCandidates || []) {
    const reg = lookup(mfr, pid);
    if (reg?.canonicalDriver) add(pid, 'misattribution-registry', reg.canonicalDriver, 95);
    const fp = DeviceFingerprintDB.lookup(mfr, pid);
    if (fp?.driver) add(pid, 'device-fingerprint-db', fp.driver, 90);
    const truth = context.truthIndex.get(coupleKey(mfr, pid));
    if (truth) add(pid, 'device-truth', truth.driver, 92);
  }

  const composeHits = context.composeIndex.get(norm(mfr)) || [];
  for (const hit of composeHits) {
    for (const pid of hit.pids) add(pid, 'driver-compose', hit.driver, 85);
  }

  for (const post of context.postsByUser.get(norm(context.username)) || []) {
    for (const c of post.couples || []) {
      if (norm(c.mfr) === norm(mfr) && c.pid) {
        add(c.pid, 'same-user-forum-history', c.canonicalDriver, 88);
      }
    }
  }

  for (const ex of context.diagExcerpts) {
    const text = ex.text || '';
    if (!text.includes(mfr) && !text.toLowerCase().includes(norm(mfr))) continue;
    const pidRe = new RegExp(`${mfr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]{0,80}(TS[0-9A-Z]{4,})`, 'gi');
    let pm;
    while ((pm = pidRe.exec(text))) add(pm[1], 'diag-excerpt', null, 80);
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates;
}

function fetchBlakadderHint(mfr) {
  return new Promise((resolvePromise) => {
    const url = `https://zigbee.blakadder.com/search.html?q=${encodeURIComponent(mfr)}`;
    https.get(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        const pids = [...new Set((d.match(/TS[0-9A-Z]{4,}/g) || []))].slice(0, 6);
        resolvePromise({ url, pids, ok: res.statusCode === 200 });
      });
    }).on('error', () => resolvePromise({ url, pids: [], ok: false }));
  });
}

function isNeedAction(post, model, actionModel) {
  const exclude = new Set(actionModel?.needActionExclude || ['silent-monitor']);
  if (exclude.has(post.recommendedAction)) return false;
  if (post.recommendedAction === 'user-update-repair') return false;
  return (model.needActionActions || []).includes(post.recommendedAction)
    || post.couples?.some((c) => ['MISSING_PID', 'WRONG_DRIVER_PRESENT', 'NOT_IN_CATALOG', 'COLLISION'].includes(c.verdict));
}

function investigatePost(post, context, model, actionModel) {
  const inbox = context.inboxByUser.get(post.username) || [];
  const catalogUser = context.catalog?.users?.[post.username];
  const findings = {
    topicId: post.topicId,
    postNumber: post.postNumber,
    username: post.username,
    action: post.recommendedAction,
    issues: post.issues,
    dualApp: post.dualApp?.track,
    inboxSnippets: inbox.slice(0, 3),
    catalogDevices: catalogUser?.devices?.length || 0,
    coupleInvestigations: [],
    autoResolution: null,
    userAction: null,
    waitForUser: false,
  };

  const fixRefs = [];
  const resilienceDomains = new Set();
  const routeMap = model?.resilienceDomainRouting || {};
  for (const issue of post.issues || []) {
    const im = context.issueModel?.issues?.[issue];
    if (im?.fixRefs) fixRefs.push(...im.fixRefs);
    const key = String(issue || '').toLowerCase();
    for (const [symptom, domainId] of Object.entries(routeMap)) {
      if (key.includes(String(symptom).toLowerCase())) resilienceDomains.add(domainId);
    }
  }
  findings.fixRefs = [...new Set(fixRefs)];
  if (resilienceDomains.size) findings.resilienceDomains = [...resilienceDomains];

  if (post.recommendedAction === 'code-fix-stable-candidate') {
    findings.autoResolution = 'fixShipped';
    findings.userAction = 'Update Universal Tuya Test to latest soak; re-pair if driver changed';
    findings.waitForUser = false;
  }

  for (const c of post.couples || []) {
    const inv = {
      mfr: c.mfr,
      pid: c.pid,
      verdict: c.verdict,
      canonicalDriver: c.canonicalDriver,
      candidates: [],
      resolved: null,
    };

    if (c.verdict === 'MISSING_PID' && c.mfr) {
      inv.candidates = resolveCoupleCandidates(c.mfr, model, {
        ...context,
        username: post.username,
      });
      const ranked = resolveUnknownCouple({
        mfr: c.mfr,
        candidates: inv.candidates,
        postText: post.snippet || post.text || post.raw || '',
        issues: post.issues || [],
        context,
        model: context.heuristicModel,
      });
      inv.candidates = ranked.candidates;
      inv.tier = ranked.tier;
      inv.protocolHint = ranked.protocolHint;
      findings.waitForUser = false;

      if (ranked.preferred) {
        inv.resolved = ranked.preferred;
        findings.autoResolution = ranked.preferred.confidence >= 92 ? 'resolvedRegistry' : 'resolvedHeuristic';
        findings.userAction = ranked.userGuidance;
      } else if (ranked.softHypothesis) {
        inv.softHypothesis = ranked.softHypothesis;
        findings.autoResolution = 'softHypothesis';
        findings.userAction = ranked.userGuidance;
      } else if (inv.candidates.length > 1) {
        findings.autoResolution = 'ambiguousMultiPid';
        findings.userAction = ranked.userGuidance
          || `Multiple pid candidates for ${c.mfr} — prefer ${inv.candidates[0].pid} (${inv.candidates[0].source})`;
      } else {
        findings.autoResolution = 'stillMissing';
        findings.userAction = ranked.userGuidance
          || 'Observe RX / send interview — never invent pid from tile name';
      }
    } else if (['LOCKED_OK', 'ROUTED_OK', 'SINGLE_DRIVER'].includes(c.verdict)) {
      inv.resolved = { mfr: c.mfr, pid: c.pid, driver: c.canonicalDriver, source: 'processor', confidence: 100 };
      findings.autoResolution = 'fixShipped';
      findings.userAction = actionModel?.verdictActions?.[c.verdict]?.userAction;
    } else if (c.verdict === 'WRONG_DRIVER_PRESENT' || c.verdict === 'MISSING_IN_COMPOSE') {
      findings.userAction = `Remove device, update Test, re-pair as ${c.canonicalDriver || 'canonical driver'}`;
      findings.autoResolution = 'lock-sacred-couple';
    }

    findings.coupleInvestigations.push(inv);
  }

  if (!post.couples?.length) {
    const symptom = resolveSymptomOnly({
      issues: post.issues || [],
      catalogUser,
      issueModel: context.issueModel,
      model: context.heuristicModel,
    });
    findings.symptomOnly = true;
    findings.likelyDrivers = symptom.likelyDrivers;
    findings.catalogTiles = catalogUser?.devices?.map((d) => d.tile) || [];
    findings.userAction = findings.userAction
      || catalogUser?.devices?.[0]?.userAction
      || symptom.userGuidance;
    findings.autoResolution = findings.autoResolution || (findings.fixRefs?.length ? 'fixShipped' : 'softHypothesis');
  }

  return findings;
}

async function runInvestigation(options = {}) {
  const reg = loadManifest();
  const model = loadInvestigationModel();
  const actionModel = reg.actionModel;
  const issueModel = reg.issueModel;

  const processor = loadJson(reg.statePath('forumProcessor'));
  if (!processor?.posts?.length) {
    return { ok: false, error: 'missing actionable-processor-report.json' };
  }

  const catalog = loadJson(reg.layers.userImpact.path) || { users: {} };
  const limits = getMergeLimits(reg.manifest);
  const pruned = pruneCatalogBloat(catalog, limits);
  if (pruned && !options.dryRun) {
    fs.writeFileSync(reg.layers.userImpact.path, `${JSON.stringify(catalog, null, 2)}\n`);
  }
  const composeIndex = loadDriverComposeIndex();
  const truthIndex = loadTruthIndex();
  const inboxByUser = loadInboxByUser();

  const postsByUser = new Map();
  for (const p of processor.posts) {
    const u = norm(p.username);
    if (!postsByUser.has(u)) postsByUser.set(u, []);
    postsByUser.get(u).push(p);
  }

  const diagExcerpts = globDiagExcerpts().map((ex) => ({
    ...ex,
    text: fs.readFileSync(ex.path, 'utf8'),
  }));

  const heuristicModel = loadHeuristicModel();
  const context = {
    catalog,
    composeIndex,
    truthIndex,
    inboxByUser,
    postsByUser,
    diagExcerpts,
    issueModel,
    heuristicModel,
  };

  const needPosts = processor.posts.filter((p) => isNeedAction(p, model, actionModel));
  const investigations = [];
  let webFetches = 0;

  for (const post of needPosts) {
    const finding = investigatePost(post, context, model, actionModel);

    if (model.sources?.web?.enabled && webFetches < (model.sources.web.maxFetches || 8)) {
      for (const inv of finding.coupleInvestigations) {
        if (inv.verdict === 'MISSING_PID' && inv.mfr && !inv.resolved && webFetches < 8) {
          // eslint-disable-next-line no-await-in-loop
          const hint = await fetchBlakadderHint(inv.mfr);
          webFetches += 1;
          for (const pid of hint.pids) {
            const regHit = lookup(inv.mfr, pid);
            if (regHit?.canonicalDriver) {
              inv.candidates.push({
                mfr: inv.mfr, pid, source: 'blakadder-web', driver: regHit.canonicalDriver, confidence: 75,
              });
            }
          }
          const rerank = resolveUnknownCouple({
            mfr: inv.mfr,
            candidates: inv.candidates,
            postText: finding.username || '',
            issues: finding.issues || [],
            context,
            model: heuristicModel,
          });
          inv.candidates = rerank.candidates;
          inv.tier = rerank.tier;
          if (rerank.preferred) {
            inv.resolved = rerank.preferred;
            finding.autoResolution = 'resolvedHeuristic';
            finding.userAction = rerank.userGuidance;
          } else if (rerank.softHypothesis) {
            inv.softHypothesis = rerank.softHypothesis;
            finding.autoResolution = 'softHypothesis';
            finding.userAction = rerank.userGuidance;
          }
        }
      }
    }

    investigations.push(finding);
  }

  const enrichedCatalog = JSON.parse(JSON.stringify(catalog));
  let catalogPatches = 0;

  if (!options.dryRun) {
    for (const inv of investigations) {
      if (!enrichedCatalog.users[inv.username]) {
        enrichedCatalog.users[inv.username] = {
          forumTopic: inv.topicId,
          posts: [inv.postNumber],
          diags: [],
          devices: [],
          _autoStub: true,
        };
      }
      const u = enrichedCatalog.users[inv.username];
      if (!u.posts.includes(inv.postNumber)) u.posts.push(inv.postNumber);

      const coupleCount = (inv.coupleInvestigations || []).filter((ci) => ci.resolved?.pid).length;
      const skipCouples = coupleCount > (limits.maxCouplesPerPost || 6);

      if (!skipCouples) {
        for (const ci of inv.coupleInvestigations) {
          // Soft hypotheses never write catalog stubs (heuristic-model catalogWrite=false)
          if (!ci.resolved?.pid || !ci.resolved?.mfr || ci.resolved.catalogWrite === false) continue;
          if (ci.softHypothesis && !ci.resolved) continue;
          if (!canAddAutoDevice(u, limits)) break;
          if (userHasCouple(u, ci.resolved.mfr, ci.resolved.pid)) continue;
          u.devices = u.devices || [];
          u.devices.push({
            tile: `Auto T${inv.topicId} #${inv.postNumber}`,
            driver: ci.resolved.driver || ci.canonicalDriver,
            couple: coupleStr(ci.resolved.mfr, ci.resolved.pid),
            symptoms: inv.issues,
            fixes: inv.fixRefs,
            userAction: inv.userAction,
            _autoStub: true,
            _source: ci.resolved.source,
            _tier: ci.tier || 'hardLock',
          });
          catalogPatches += 1;
        }
      }

      if (inv.symptomOnly && inv.userAction && !u.investigationNote) {
        u.investigationNote = inv.userAction;
        catalogPatches += 1;
      }
    }

    if (catalogPatches || pruned) {
      enrichedCatalog._meta = enrichedCatalog._meta || {};
      enrichedCatalog._meta.lastInvestigation = new Date().toISOString();
      fs.writeFileSync(reg.layers.userImpact.path, `${JSON.stringify(enrichedCatalog, null, 2)}\n`);
    }
  }

  return {
    ok: true,
    investigated: investigations.length,
    webFetches,
    catalogPatches,
    pruned,
    investigations,
    dryRun: !!options.dryRun,
  };
}

module.exports = { runInvestigation, isNeedAction, resolveCoupleCandidates };
