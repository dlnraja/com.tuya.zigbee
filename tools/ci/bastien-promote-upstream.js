'use strict';

/**
 * bastien-promote-upstream.js (P2606 / P2607)
 *
 * Autonomous one-way promote: bastien-home → master → (BOTH reliability) stable-v5.
 * NEVER copies App ID / version / store identity.
 * NEVER wholesale-syncs master/stable → bastien.
 *
 * Usage:
 *   node tools/ci/bastien-promote-upstream.js
 *   node tools/ci/bastien-promote-upstream.js --apply
 *   node tools/ci/bastien-promote-upstream.js --apply --commit
 *   node tools/ci/bastien-promote-upstream.js --apply --commit --stable
 *
 * Contre quoi: reverse sync, identity overwrite, compose shrink (P2520).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const COMMIT = process.argv.includes('--commit');
const STABLE = process.argv.includes('--stable');
const SSOT = path.join(ROOT, 'config/architecture/bastien-house-ssot.json');
const OUT = path.join(ROOT, 'reports/bastien-promote-latest.json');

const BASTIEN_REF = process.env.BASTIEN_REF || 'origin/bastien-home';
const STABLE_ROOT = process.env.STABLE_ROOT || '';
const MAX_AUTO_FILES = Number(process.env.BASTIEN_PROMOTE_MAX || 48);

const FORBIDDEN_PATHS = [
  '.homeycompose/app.json',
  'app.json',
  'package.json',
  '.homeychangelog.json',
  'HOUSE_README.md',
];

const FORBIDDEN_PREFIXES = [
  '.github/workflows/bastien-publish.yml', // Bastien-only publish stays private track
];

/** BOTH reliability lib prefixes — safe to checkout from Bastien when changed there. */
const BOTH_LIB_RE = /^lib\/(tuya|zigbee|io|utils|devices|mixins|helpers|managers|battery|flow)\//i;

const PROMOTE_GLOBS = [
  'drivers/**/driver.compose.json',
  'drivers/**/device.js',
  'data/user-misattribution-registry.json',
  'lib/**/*.js',
  'test/critical/p*.test.js',
];

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      cwd: opts.cwd || ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    }).trim();
  } catch (e) {
    if (opts.throw) throw e;
    return ((e.stdout || '') + (e.stderr || '')).trim();
  }
}

function loadSsot() {
  if (!fs.existsSync(SSOT)) throw new Error(`Missing ${SSOT}`);
  return JSON.parse(fs.readFileSync(SSOT, 'utf8'));
}

function ensureBastienRef() {
  sh('git fetch origin bastien-home:bastien-home 2>/dev/null || git fetch origin bastien-home || true');
  const has = sh(`git rev-parse --verify ${BASTIEN_REF} 2>/dev/null || git rev-parse --verify bastien-home 2>/dev/null`);
  if (!has) throw new Error('bastien-home ref not available — fetch origin bastien-home first');
  return has.includes('origin/') ? BASTIEN_REF : (sh('git rev-parse --verify origin/bastien-home 2>/dev/null') ? 'origin/bastien-home' : 'bastien-home');
}

/**
 * Files Bastien changed since diverging from master (correct promote direction).
 * WHY(P2607): old `bastien-home...HEAD` listed master-only changes — inverted.
 */
function listBastienChangedFiles(ref) {
  const raw = sh(`git log --name-only --pretty=format: HEAD..${ref}`);
  const set = new Set();
  for (const line of raw.split(/\r?\n/)) {
    const f = line.trim();
    if (f) set.add(f.replace(/\\/g, '/'));
  }
  // Also include uncommitted-equivalent: content differs even if log empty
  const diff = sh(`git diff --name-only HEAD ${ref}`);
  for (const line of diff.split(/\r?\n/)) {
    const f = line.trim();
    if (f) set.add(f.replace(/\\/g, '/'));
  }
  return [...set].sort();
}

function showAt(ref, rel) {
  try {
    return sh(`git show ${ref}:${rel}`, { throw: true });
  } catch {
    return null;
  }
}

function isForbidden(rel) {
  if (FORBIDDEN_PATHS.includes(rel)) return true;
  if (FORBIDDEN_PREFIXES.some((p) => rel === p || rel.startsWith(p))) return true;
  if (/^config\/architecture\/bastien-house-ssot\.json$/.test(rel)) return true;
  // Never promote Bastien-only identity / private inventory dumps
  if (/^reports\/bastien/i.test(rel)) return true;
  return false;
}

function isPromotable(rel) {
  if (isForbidden(rel)) return false;
  if (/^drivers\//.test(rel) && /\.(js|json)$/.test(rel)) return true;
  if (rel === 'data/user-misattribution-registry.json') return true;
  if (rel === 'config/architecture/publish-sacred-keep-couples.json') return true;
  if (/^lib\//.test(rel) && /\.js$/.test(rel)) return true;
  if (/^test\/critical\/p\d+.*\.test\.js$/.test(rel)) return true;
  if (/^docs\/knowledge\//.test(rel)) return true;
  if (/^config\/architecture\/(sacred-couple|identity-fields|complementary-variant)/.test(rel)) return true;
  return false;
}

/**
 * AUTO_SAFE = can apply without human (complementary / Contre quoi / BOTH reliability).
 */
function classifyAutoSafe(rel) {
  if (!isPromotable(rel)) return false;
  if (/^drivers\/.+\/driver\.compose\.json$/.test(rel)) return true;
  if (rel === 'data/user-misattribution-registry.json') return true;
  if (rel === 'config/architecture/publish-sacred-keep-couples.json') return true;
  if (/^test\/critical\/p\d+.*\.test\.js$/.test(rel)) return true;
  if (/^docs\/knowledge\//.test(rel)) return true;
  if (BOTH_LIB_RE.test(rel)) return true;
  // New driver device.js only (master missing) — not overwrite existing device.js
  if (/^drivers\/.+\/device\.js$/.test(rel) && !fs.existsSync(path.join(ROOT, rel))) return true;
  return false;
}

function isBothReliability(rel) {
  if (/^drivers\/.+\/driver\.compose\.json$/.test(rel)) return true;
  if (rel === 'data/user-misattribution-registry.json') return true;
  if (rel === 'config/architecture/publish-sacred-keep-couples.json') return true;
  if (/^test\/critical\/p\d+.*\.test\.js$/.test(rel)) return true;
  if (BOTH_LIB_RE.test(rel)) return true;
  return false;
}

function mergeComposeComplementary(masterObj, bastienObj) {
  const {
    appendExactIdentityForms,
    unionCapabilities,
    appendSettingsById,
    wouldDegradeCompose,
  } = require('../../lib/enrichment/ComplementaryMerge.js');

  const after = JSON.parse(JSON.stringify(masterObj || {}));
  const b = bastienObj || {};
  after.zigbee = after.zigbee && typeof after.zigbee === 'object' ? after.zigbee : {};
  const bz = b.zigbee && typeof b.zigbee === 'object' ? b.zigbee : {};

  if (bz.manufacturerName) {
    after.zigbee.manufacturerName = appendExactIdentityForms(
      after.zigbee.manufacturerName,
      bz.manufacturerName,
    );
  }
  if (bz.productId) {
    after.zigbee.productId = appendExactIdentityForms(after.zigbee.productId, bz.productId);
  }
  // Clusters: union numeric ids — never drop master's
  if (Array.isArray(bz.endpoints?.[1]?.clusters) || Array.isArray(bz.endpoints?.['1']?.clusters)) {
    after.zigbee.endpoints = after.zigbee.endpoints || {};
    const epKey = after.zigbee.endpoints['1'] ? '1' : (after.zigbee.endpoints[1] ? 1 : '1');
    after.zigbee.endpoints[epKey] = after.zigbee.endpoints[epKey] || {};
    const cur = after.zigbee.endpoints[epKey].clusters || [];
    const inc = (bz.endpoints?.['1'] || bz.endpoints?.[1] || {}).clusters || [];
    const seen = new Set(cur.map(Number));
    const out = cur.slice();
    for (const c of inc) {
      const n = Number(c);
      if (!seen.has(n)) {
        seen.add(n);
        out.push(c);
      }
    }
    after.zigbee.endpoints[epKey].clusters = out;
  }

  if (b.capabilities) {
    after.capabilities = unionCapabilities(after.capabilities, b.capabilities);
  }
  if (b.settings) {
    after.settings = appendSettingsById(after.settings, b.settings);
  }

  if (wouldDegradeCompose(masterObj, after)) {
    throw new Error('compose merge would degrade — refusing');
  }
  return after;
}

function mergeRegistryCases(masterObj, bastienObj) {
  const out = JSON.parse(JSON.stringify(masterObj || { version: 1, cases: [] }));
  const cases = Array.isArray(out.cases) ? out.cases : [];
  const byId = new Map(cases.map((c) => [String(c.id || ''), c]));
  for (const c of Array.isArray(bastienObj?.cases) ? bastienObj.cases : []) {
    if (!c || !c.id) continue;
    if (!byId.has(String(c.id))) {
      cases.push(JSON.parse(JSON.stringify(c)));
      byId.set(String(c.id), c);
    }
  }
  out.cases = cases;
  return out;
}

function mergeSacredKeep(masterObj, bastienObj) {
  const out = JSON.parse(JSON.stringify(masterObj || { couples: [] }));
  const couples = Array.isArray(out.couples) ? out.couples : [];
  const key = (c) => `${String(c.mfr || '').toLowerCase()}|${String(c.pid || '')}|${String(c.driverId || '')}`;
  const seen = new Set(couples.map(key));
  for (const c of Array.isArray(bastienObj?.couples) ? bastienObj.couples : []) {
    if (!c || !c.mfr || !c.pid || !c.driverId) continue;
    const k = key(c);
    if (seen.has(k)) continue;
    seen.add(k);
    couples.push(JSON.parse(JSON.stringify(c)));
  }
  out.couples = couples;
  return out;
}

function applyOne(rel, bastienBody, rootDir = ROOT) {
  const abs = path.join(rootDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });

  if (/driver\.compose\.json$/.test(rel)) {
    let bastienObj;
    try {
      bastienObj = JSON.parse(bastienBody);
    } catch {
      return { ok: false, reason: 'bastien_compose_invalid_json' };
    }
    if (!fs.existsSync(abs)) {
      fs.writeFileSync(abs, `${JSON.stringify(bastienObj, null, 2)}\n`);
      return { ok: true, mode: 'create_compose' };
    }
    const masterObj = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const merged = mergeComposeComplementary(masterObj, bastienObj);
    fs.writeFileSync(abs, `${JSON.stringify(merged, null, 2)}\n`);
    return { ok: true, mode: 'merge_compose' };
  }

  if (rel === 'data/user-misattribution-registry.json') {
    const bastienObj = JSON.parse(bastienBody);
    if (!fs.existsSync(abs)) {
      fs.writeFileSync(abs, `${JSON.stringify(bastienObj, null, 2)}\n`);
      return { ok: true, mode: 'create_registry' };
    }
    const masterObj = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const merged = mergeRegistryCases(masterObj, bastienObj);
    fs.writeFileSync(abs, `${JSON.stringify(merged, null, 2)}\n`);
    return { ok: true, mode: 'merge_registry' };
  }

  if (rel === 'config/architecture/publish-sacred-keep-couples.json') {
    const bastienObj = JSON.parse(bastienBody);
    if (!fs.existsSync(abs)) {
      fs.writeFileSync(abs, `${JSON.stringify(bastienObj, null, 2)}\n`);
      return { ok: true, mode: 'create_sacred_keep' };
    }
    const masterObj = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const merged = mergeSacredKeep(masterObj, bastienObj);
    fs.writeFileSync(abs, `${JSON.stringify(merged, null, 2)}\n`);
    return { ok: true, mode: 'merge_sacred_keep' };
  }

  // Tests / docs / BOTH lib / new device.js — take Bastien bytes
  fs.writeFileSync(abs, bastienBody.endsWith('\n') ? bastienBody : `${bastienBody}\n`);
  return { ok: true, mode: 'checkout_bastien' };
}

function commitIfNeeded(rootDir, message, files) {
  if (!files.length) return false;
  sh('git config user.name "github-actions[bot]"', { cwd: rootDir });
  sh('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"', { cwd: rootDir });
  for (const f of files) {
    sh(`git add -- "${f}"`, { cwd: rootDir });
  }
  const staged = sh('git diff --cached --name-only', { cwd: rootDir });
  if (!staged) return false;
  // Avoid identity files if somehow staged
  for (const bad of FORBIDDEN_PATHS) {
    if (staged.split(/\n/).includes(bad)) {
      sh(`git reset HEAD -- "${bad}"`, { cwd: rootDir });
    }
  }
  const still = sh('git diff --cached --name-only', { cwd: rootDir });
  if (!still) return false;
  try {
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const ssot = loadSsot();
  if (ssot.enrichment?.direction !== 'bastien_to_public_only') {
    throw new Error('SSOT enrichment.direction must be bastien_to_public_only');
  }

  const ref = ensureBastienRef();
  const allChanged = listBastienChangedFiles(ref);
  const candidates = allChanged.filter(isPromotable);
  const blocked = allChanged.filter(isForbidden);
  const autoSafe = candidates.filter(classifyAutoSafe).slice(0, MAX_AUTO_FILES);
  const manual = candidates.filter((f) => !classifyAutoSafe(f));

  const applied = [];
  const skipped = [];
  const errors = [];

  if (APPLY) {
    for (const rel of autoSafe) {
      const body = showAt(ref, rel);
      if (body == null) {
        skipped.push({ rel, reason: 'missing_on_bastien' });
        continue;
      }
      try {
        const res = applyOne(rel, body, ROOT);
        if (res.ok) applied.push({ rel, ...res, both: isBothReliability(rel) });
        else skipped.push({ rel, reason: res.reason || 'apply_failed' });
      } catch (e) {
        errors.push({ rel, error: String(e.message || e) });
      }
    }
  }

  let committed = false;
  if (APPLY && COMMIT && applied.length) {
    committed = commitIfNeeded(
      ROOT,
      'chore(P2607): autonomous Bastien→master promote [skip ci]',
      applied.map((a) => a.rel),
    );
    if (committed) {
      sh('git pull --rebase origin master || true');
      try {
        execSync('git push origin HEAD:master', { cwd: ROOT, stdio: 'inherit', env: process.env });
      } catch (e) {
        errors.push({ rel: '_push_master', error: String(e.message || e) });
      }
    }
  }

  const stableApplied = [];
  if (APPLY && STABLE && applied.some((a) => a.both)) {
    const stableDir = STABLE_ROOT && fs.existsSync(STABLE_ROOT)
      ? STABLE_ROOT
      : null;
    if (!stableDir) {
      skipped.push({
        rel: '_stable',
        reason: 'STABLE_ROOT unset — set env to Documents/homey/stable or CI checkout path',
      });
    } else {
      // Ensure stable is on stable-v5
      sh('git fetch origin stable-v5 || true', { cwd: stableDir });
      sh('git checkout stable-v5 || git checkout -B stable-v5 origin/stable-v5 || true', { cwd: stableDir });
      sh('git pull --rebase origin stable-v5 || true', { cwd: stableDir });
      for (const a of applied.filter((x) => x.both)) {
        const body = showAt(ref, a.rel);
        if (body == null) continue;
        try {
          const res = applyOne(a.rel, body, stableDir);
          if (res.ok) stableApplied.push({ rel: a.rel, ...res });
        } catch (e) {
          errors.push({ rel: `stable:${a.rel}`, error: String(e.message || e) });
        }
      }
      if (COMMIT && stableApplied.length) {
        const ok = commitIfNeeded(
          stableDir,
          'chore(P2607): Bastien BOTH reliability → stable [skip ci]',
          stableApplied.map((a) => a.rel),
        );
        if (ok) {
          try {
            execSync('git push origin HEAD:stable-v5', {
              cwd: stableDir,
              stdio: 'inherit',
              env: process.env,
            });
          } catch (e) {
            errors.push({ rel: '_push_stable', error: String(e.message || e) });
          }
        }
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? (COMMIT ? 'APPLY_COMMIT' : 'APPLY') : 'DRY-RUN',
    direction: 'bastien_home → master (surgical) → stable BOTH',
    neverReverseWholesale: true,
    autonomous: true,
    bastienRef: ref,
    appIdBastien: ssot.appId,
    forbiddenTouched: blocked,
    candidates,
    candidateCount: candidates.length,
    autoSafe,
    autoSafeCount: autoSafe.length,
    manualReview: manual,
    manualReviewCount: manual.length,
    applied,
    appliedCount: applied.length,
    stableApplied,
    stableAppliedCount: stableApplied.length,
    skipped,
    errors,
    committed,
    note: APPLY
      ? 'AUTO_SAFE complementary merges + BOTH lib/tests applied. Identity never copied. Manual-review left for humans.'
      : 'Dry-run — no working-tree writes except this report.',
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

  console.log('=== bastien-promote-upstream P2607 (autonomous) ===');
  console.log('Mode:', report.mode);
  console.log('Bastien ref:', ref);
  console.log('Candidates:', report.candidateCount, '| AUTO_SAFE:', report.autoSafeCount, '| manual:', report.manualReviewCount);
  console.log('Applied:', report.appliedCount, '| Stable BOTH:', report.stableAppliedCount, '| Committed:', committed);
  for (const a of applied.slice(0, 30)) console.log('  +', a.mode, a.rel);
  if (applied.length > 30) console.log(`  … +${applied.length - 30} more`);
  for (const e of errors.slice(0, 10)) console.log('  !', e.rel, e.error);
  console.log('Report:', OUT);
}

module.exports = {
  isPromotable,
  isForbidden,
  classifyAutoSafe,
  isBothReliability,
  mergeComposeComplementary,
  mergeRegistryCases,
  mergeSacredKeep,
  listBastienChangedFiles,
  FORBIDDEN_PATHS,
  PROMOTE_GLOBS,
  BOTH_LIB_RE,
};

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}
