#!/usr/bin/env node
'use strict';

/**
 * intelligent-source-diff.js (P2376)
 *
 * Git-diff-style orchestrator for external enrichment sources.
 * - Cache-first: ETag smart-fetch + scanner-cache TTL + GHA restore
 * - Only crawl sources that are missing, stale, or project fingerprint changed
 * - Optional sources soft-fail — never block the whole pipeline
 * - Writes manifest to .github/state/intelligent-source-manifest.json
 *
 * Usage:
 *   node tools/ci/intelligent-source-diff.js              # plan only
 *   node tools/ci/intelligent-source-diff.js --apply      # run stale crawls (soft fail)
 *   node tools/ci/intelligent-source-diff.js --json
 *   node tools/ci/intelligent-source-diff.js --force=z2m  # force one source
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { globSync } = require('glob');

const ROOT = path.resolve(__dirname, '../..');
const REGISTRY_PATH = path.join(ROOT, 'config/enrichment/source-registry.json');
const DATE = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.join(ROOT, 'reports', `source-diff-${DATE}`);
const APPLY = process.argv.includes('--apply');
const JSON_MODE = process.argv.includes('--json');
const FORCE = (() => {
  const a = process.argv.find((x) => x.startsWith('--force='));
  return a ? a.split('=')[1].split(',') : [];
})();

function readJson(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
}

function fileAgeHours(fp) {
  if (!fs.existsSync(fp)) return Infinity;
  try {
    const m = fs.statSync(fp).mtimeMs;
    return (Date.now() - m) / (3600 * 1000);
  } catch {
    return Infinity;
  }
}

function fileHash(fp) {
  if (!fs.existsSync(fp)) return null;
  try {
    const buf = fs.readFileSync(fp);
    return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
  } catch {
    return null;
  }
}

function hashExists(relPaths) {
  for (const rel of relPaths) {
    const fp = path.join(ROOT, rel.replace(/\//g, path.sep));
    if (fs.existsSync(fp)) {
      const h = fileHash(fp);
      if (h) return h;
    }
  }
  return null;
}

function anyStateFresh(source, manifestEntry) {
  const ttl = source.ttlHours || 24;
  for (const rel of source.stateFiles || []) {
    const fp = path.join(ROOT, rel);
    const age = fileAgeHours(fp);
    if (age <= ttl) {
      const h = fileHash(fp);
      if (h && manifestEntry?.hashes?.[rel] === h) {
        return { fresh: true, file: rel, ageHours: Math.round(age * 10) / 10, hash: h };
      }
      if (age <= ttl) {
        return { fresh: true, file: rel, ageHours: Math.round(age * 10) / 10, hash: h };
      }
    }
  }
  return { fresh: false };
}

function secretsAvailable(source) {
  const needed = source.secrets || [];
  if (!needed.length) return { ok: true, missing: [] };
  const missing = needed.filter((s) => !process.env[s]);
  return { ok: missing.length === 0, missing };
}

function projectFingerprint() {
  const files = globSync('drivers/*/driver.compose.json', { cwd: ROOT, nodir: true });
  const couples = [];
  for (const rel of files.sort()) {
    try {
      const j = readJson(path.join(ROOT, rel));
      const mfrs = [].concat(j?.zigbee?.manufacturerName || []).filter(Boolean);
      const pids = [].concat(j?.zigbee?.productId || []).filter(Boolean);
      for (const m of mfrs) {
        for (const p of pids) {
          couples.push(`${String(m).toLowerCase()}|${String(p).toLowerCase()}`);
        }
      }
    } catch { /* skip */ }
  }
  couples.sort();
  return crypto.createHash('sha256').update(couples.join('\n')).digest('hex').slice(0, 16);
}

function planSource(source, manifest) {
  const entry = manifest?.sources?.[source.id] || {};
  const forced = FORCE.includes(source.id);
  const sec = secretsAvailable(source);
  const freshCheck = anyStateFresh(source, entry);

  if (source.localOnly) {
    const stale = forced || !freshCheck.fresh;
    return {
      id: source.id,
      action: stale ? 'run-local' : 'skip-fresh',
      reason: stale ? 'local script stale or forced' : 'local cache fresh',
      optional: source.optional,
      blockPipeline: false,
      secrets: sec,
    };
  }

  if (!sec.ok && (source.secrets || []).length) {
    return {
      id: source.id,
      action: 'skip-unavailable',
      reason: `secrets missing: ${sec.missing.join(', ')}`,
      optional: source.optional !== false,
      blockPipeline: source.blockPipeline === true,
      secrets: sec,
      useStaleCache: freshCheck.fresh || hashExists(source.stateFiles) !== null,
    };
  }

  if (!forced && freshCheck.fresh) {
    return {
      id: source.id,
      action: 'skip-fresh',
      reason: `cache fresh (${freshCheck.file}, ${freshCheck.ageHours}h)`,
      optional: source.optional,
      blockPipeline: false,
      secrets: sec,
      hash: freshCheck.hash,
    };
  }

  const hasAnyState = (source.stateFiles || []).some((rel) => fs.existsSync(path.join(ROOT, rel)));
  return {
    id: source.id,
    action: forced ? 'crawl-forced' : (hasAnyState ? 'crawl-stale' : 'crawl-missing'),
    reason: forced ? 'forced' : (hasAnyState ? 'TTL expired or hash drift' : 'no state file'),
    optional: source.optional !== false,
    blockPipeline: source.blockPipeline === true,
    secrets: sec,
  };
}

function runCrawl(source) {
  const script = path.join(ROOT, source.crawlScript);
  if (!fs.existsSync(script)) {
    return { id: source.id, ok: false, skipped: true, reason: 'script missing' };
  }
  const args = [script, ...(source.crawlArgs || [])];
  const res = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: source.ttlHours > 48 ? 600000 : 360000,
    env: {
      ...process.env,
      FORUM_AUTO_POST: '0',
      SHADOW_FORUM: '1',
      AI_PLAN_MODE: process.env.AI_PLAN_MODE || 'forfait',
      AI_ALLOW_PAID: 'false',
      SMART_FETCH_READER_FALLBACK: process.env.SMART_FETCH_READER_FALLBACK || '1',
    },
  });
  const ok = res.status === 0;
  return {
    id: source.id,
    ok,
    exitCode: res.status,
    soft: source.optional !== false,
    tail: `${res.stdout || ''}${res.stderr || ''}`.trim().slice(-600),
  };
}

function updateManifest(registry, plan, results, projectFp) {
  const manifestPath = path.join(ROOT, registry.manifestPath || '.github/state/intelligent-source-manifest.json');
  const prev = readJson(manifestPath) || { sources: {} };
  const next = {
    updatedAt: new Date().toISOString(),
    projectFingerprint: projectFp,
    sources: { ...(prev.sources || {}) },
  };

  for (const p of plan) {
    const src = registry.sources.find((s) => s.id === p.id);
    if (!src) continue;
    const hashes = {};
    for (const rel of src.stateFiles || []) {
      const h = fileHash(path.join(ROOT, rel));
      if (h) hashes[rel] = h;
    }
    next.sources[p.id] = {
      lastPlan: p.action,
      lastReason: p.reason,
      lastRunAt: APPLY && results.find((r) => r.id === p.id && r.ok) ? new Date().toISOString() : (prev.sources?.[p.id]?.lastRunAt || null),
      hashes,
      optional: src.optional,
    };
  }

  writeJson(manifestPath, next);

  const latestDir = path.join(ROOT, 'reports/cross-ref-latest');
  fs.mkdirSync(latestDir, { recursive: true });
  return manifestPath;
}

function main() {
  const registry = readJson(REGISTRY_PATH);
  if (!registry) {
    console.error('Missing source registry:', REGISTRY_PATH);
    process.exit(APPLY ? 0 : 1);
  }

  const manifestPath = path.join(ROOT, registry.manifestPath || '.github/state/intelligent-source-manifest.json');
  const manifest = readJson(manifestPath) || {};
  const projectFp = projectFingerprint();
  const projectChanged = Boolean(manifest.projectFingerprint && manifest.projectFingerprint !== projectFp);

  const plan = registry.sources.map((s) => planSource(s, manifest));
  if (projectChanged) {
    const crossRef = plan.find((p) => p.id === 'cross-ref');
    if (crossRef && crossRef.action === 'skip-fresh') {
      crossRef.action = 'run-local';
      crossRef.reason = 'project fingerprint changed — cross-ref only';
    }
  }

  const toRun = plan.filter((p) => /^crawl-|^run-local/.test(p.action));
  const results = [];

  if (APPLY) {
    for (const p of toRun) {
      const src = registry.sources.find((s) => s.id === p.id);
      if (!src) continue;
      if (p.action === 'skip-unavailable') {
        results.push({ id: p.id, ok: true, skipped: true, reason: p.reason });
        continue;
      }
      const r = runCrawl(src);
      if (!r.ok && src.optional !== false) {
        r.ok = true;
        r.softFailed = true;
      }
      results.push(r);
    }
  }

  const manifestOut = updateManifest(registry, plan, results, projectFp);

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'plan',
    projectFingerprint: projectFp,
    projectChanged,
    plan: plan.map((p) => ({ id: p.id, action: p.action, reason: p.reason })),
    skipCount: plan.filter((p) => p.action.startsWith('skip')).length,
    crawlCount: toRun.length,
    applyResults: results,
    manifestPath: registry.manifestPath,
    blocked: plan.some((p) => p.blockPipeline && p.action === 'skip-unavailable'),
    ok: !plan.some((p) => p.blockPipeline && p.action === 'skip-unavailable'),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  writeJson(path.join(OUT_DIR, 'summary.json'), summary);
  fs.mkdirSync(path.join(ROOT, 'reports/flow-fleet-enrich-latest'), { recursive: true });

  if (JSON_MODE) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`[source-diff] mode=${summary.mode} project=${projectFp} changed=${projectChanged}`);
    console.log(`  skip=${summary.skipCount} crawl=${summary.crawlCount} blocked=${summary.blocked}`);
    for (const p of plan) {
      console.log(`  ${p.id}: ${p.action} — ${p.reason}`);
    }
    if (APPLY && results.length) {
      for (const r of results) {
        console.log(`  run ${r.id}: ${r.ok ? 'OK' : 'FAIL'}${r.softFailed ? ' (soft)' : ''}${r.skipped ? ' (skipped)' : ''}`);
      }
    }
    console.log(`  manifest → ${manifestOut}`);
  }

  process.exit(summary.ok ? 0 : 1);
}

main();
