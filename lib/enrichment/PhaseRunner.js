'use strict';

/**
 * PhaseRunner — manifest-driven silent enrichment pipeline.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { loadManifest, resolve, ROOT } = require('./EnrichmentRegistry');

function interpolate(str, ctx) {
  return String(str).replace(/\{\{(\w+)\}\}/g, (_, k) => (ctx[k] != null ? String(ctx[k]) : ''));
}

function globDiagExcerpts(max = 12) {
  const out = [];
  const reportsDir = path.join(ROOT, 'reports');
  if (!fs.existsSync(reportsDir)) return out;
  for (const dir of fs.readdirSync(reportsDir)) {
    const full = path.join(reportsDir, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    for (const f of fs.readdirSync(full)) {
      if (/^diag-.+-excerpt\.txt$/i.test(f)) out.push(path.join(full, f));
    }
  }
  return out.slice(0, max);
}

function shouldSkipStep(step, flags) {
  if (step.skipWhen === 'skipScan' && flags.skipScan) return true;
  if (step.skipWhen === 'noMedia' && !flags.withMedia) return true;
  if (step.skipWhen === 'noPm' && !flags.withPm) return true;
  if (step.requires && !fs.existsSync(resolve(step.requires))) return true;
  return false;
}

function buildArgs(step, ctx, flags) {
  let args = (step.args || []).map((a) => interpolate(a, ctx));
  if (step.whenApply?.flag && flags[step.whenApply.flag]) {
    args = [...(step.whenApply.extraArgs || []), ...args];
  }
  return args;
}

function runStep(step, ctx, flags, env) {
  if (shouldSkipStep(step, flags)) {
    return { ok: true, skipped: true, name: step.id };
  }

  if (step.dynamic === 'diagExcerpts') {
    const excerpts = globDiagExcerpts();
    if (!excerpts.length) return { ok: true, skipped: true, name: step.id, reason: 'no excerpts' };
    const results = [];
    for (const fp of excerpts) {
      const t0 = Date.now();
      const res = spawnSync(process.execPath, [resolve('tools/ci/analyze-diag-locally.js'), fp, '--json'], {
        cwd: ROOT, encoding: 'utf8', timeout: 60000, env,
      });
      results.push({ file: path.basename(fp), ok: res.status === 0, durationMs: Date.now() - t0 });
    }
    return { ok: true, name: step.id, dynamic: true, results };
  }

  const script = resolve(step.script);
  if (!fs.existsSync(script)) {
    return { ok: false, skipped: true, name: step.id, reason: 'missing script' };
  }

  const args = buildArgs(step, ctx, flags);
  const t0 = Date.now();
  const res = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: step.timeout || 300000,
    env,
  });
  const ok = res.status === 0 || (step.softFail && res.status === 2);
  const out = `${res.stdout || ''}${res.stderr || ''}`.trim();
  return {
    ok,
    hardOk: res.status === 0,
    exitCode: res.status,
    name: step.id,
    script: step.script,
    args,
    durationMs: Date.now() - t0,
    tail: out.slice(-500),
    hard: step.hard === true,
  };
}

function runPipeline(options = {}) {
  const reg = loadManifest();
  const flags = {
    skipScan: options.skipScan === true,
    withMedia: options.withMedia === true,
    withPm: options.withPm === true && (process.env.HOMEY_EMAIL || process.env.DISCOURSE_API_KEY),
    applyRoutes: options.applyRoutes === true,
  };

  const phaseName = options.phase || 'all';
  const pipeline = reg.phases.pipelines[phaseName] || reg.phases.pipelines.all;
  if (!pipeline) throw new Error(`Unknown pipeline phase: ${phaseName}`);

  const date = new Date().toISOString().slice(0, 10);
  const ctx = {
    maxPosts: options.maxPosts || reg.phases.defaults.maxPosts,
    topicId: options.topicId || reg.phases.defaults.topicId,
    reportDir: options.reportDir || reg.reportDir(date),
    date,
  };

  const env = {
    ...process.env,
    ...reg.phases.defaults.env,
    // P2219 SHADOW: force-read-only even if caller env tries to enable posting
    FORUM_AUTO_POST: '0',
    SHADOW_FORUM: '1',
    DISCOURSE_WRITE: '0',
    REPLY_TOPICS: '',
    SMART_FETCH_READER_FALLBACK: process.env.SMART_FETCH_READER_FALLBACK || '1',
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    phase: phaseName,
    ctx,
    flags,
    phases: [],
    ok: true,
  };

  const log = options.log || ((m) => console.log(`[silent-enrich] ${m}`));

  for (const blockId of pipeline) {
    const steps = reg.phases.blocks[blockId] || [];
    for (const step of steps) {
      log(`▶ ${step.id}`);
      const result = runStep(step, ctx, flags, env);
      summary.phases.push(result);
      if (result.hard && !result.ok) summary.ok = false;
      log(`${result.ok ? '✓' : '⚠'} ${step.id} (${((result.durationMs || 0) / 1000).toFixed(1)}s)`);
    }
  }

  return summary;
}

module.exports = { runPipeline, runStep, globDiagExcerpts };
