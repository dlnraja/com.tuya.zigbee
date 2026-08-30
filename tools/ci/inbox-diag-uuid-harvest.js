#!/usr/bin/env node
'use strict';

/**
 * P2326 — Harvest Homey diag UUIDs from forum media + local reports, fetch via Athom.
 *
 * WHY: User reports (#532/#533) and forum screenshots often carry diag codes.
 * Fetching them in CI (SHADOW) unlocks version/driver truth without forum replies.
 *
 * Usage:
 *   node tools/ci/inbox-diag-uuid-harvest.js
 *   node tools/ci/inbox-diag-uuid-harvest.js --max=8 --fetch
 *
 * Env:
 *   HOMEY_PAT / athom-cli refresh — required for --fetch
 *   INBOX_DIAG_FETCH=1 — same as --fetch
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, '.github', 'state', 'inbox-diag-harvest');
const UUID_RE = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi;

function argFlag(name) {
  return process.argv.includes(name);
}

function argVal(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : fallback;
}

function collectFromJson(file, acc) {
  if (!fs.existsSync(file)) return;
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    for (const m of raw.matchAll(UUID_RE)) acc.add(m[1].toLowerCase());
    return;
  }
  const walk = (node, depth = 0) => {
    if (depth > 12 || node == null) return;
    if (typeof node === 'string') {
      for (const m of node.matchAll(UUID_RE)) acc.add(m[1].toLowerCase());
      return;
    }
    if (Array.isArray(node)) {
      for (const x of node) walk(x, depth + 1);
      return;
    }
    if (typeof node === 'object') {
      if (typeof node.diag === 'string' && UUID_RE.test(node.diag)) {
        acc.add(String(node.diag).toLowerCase());
      }
      for (const v of Object.values(node)) walk(v, depth + 1);
    }
  };
  walk(data);
}

function main() {
  const doFetch = argFlag('--fetch') || process.env.INBOX_DIAG_FETCH === '1';
  const maxFetch = Math.max(1, Math.min(20, Number(argVal('--max', '6')) || 6));
  const uuids = new Set();

  const sources = [
    path.join(ROOT, '.github', 'state', 'forum', 'forum-media-deep.json'),
    path.join(ROOT, '.github', 'state', 'forum', 'actionable-processor-report.json'),
    path.join(ROOT, '.github', 'state', 'forum', 'multi-silent-digest.json'),
    path.join(ROOT, '.github', 'state', 'diagnostics-report.json'),
    path.join(ROOT, 'reports', 'inbox-full-2026-08-30', 'GH_TRIAGE.json'),
    path.join(ROOT, 'reports', 'inbox-full-2026-08-30', 'issue-532-comments.json'),
    path.join(ROOT, 'reports', 'inbox-full-2026-08-30', 'issue-533-comments.json'),
  ];
  for (const s of sources) collectFromJson(s, uuids);

  // Prefer known user-report UUIDs first when present
  const priority = [
    'c137a5d7-30b5-425d-8744-2bf304e6c63d',
    '7a6f2ca1-28dc-4ddb-9748-805a79aa39b6',
    'a095345e-08a4-4d5e-b3b1-adbc30ff12a2',
    'ace66ff9-0a41-44e0-abf4-bf0850b689ae',
  ];
  const ordered = [
    ...priority.filter((u) => uuids.has(u)),
    ...[...uuids].filter((u) => !priority.includes(u)).sort(),
  ];

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    policy: 'SHADOW — never forum post; Athom fetch only',
    count: ordered.length,
    fetch: doFetch,
    maxFetch,
    uuids: ordered.slice(0, 40),
    results: [],
  };

  const fetchScript = path.join(ROOT, 'scripts', 'ci', 'fetch-homey-app-diag-by-uuid.js');
  if (doFetch && fs.existsSync(fetchScript)) {
    for (const uuid of ordered.slice(0, maxFetch)) {
      const r = spawnSync(process.execPath, [fetchScript, uuid], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 120_000,
        env: process.env,
      });
      const out = `${r.stdout || ''}\n${r.stderr || ''}`.slice(0, 2000);
      const found = /"found"\s*:\s*true/.test(out) || /FOUND in build/i.test(out);
      const version = (out.match(/v(\d+\.\d+\.\d+)/) || [])[1] || null;
      const build = (out.match(/build\s+(\d+)/i) || out.match(/"buildId"\s*:\s*(\d+)/) || [])[1] || null;
      report.results.push({
        uuid,
        found,
        version,
        build,
        exit: r.status,
        preview: out.split(/\r?\n/).filter(Boolean).slice(-8).join(' | ').slice(0, 400),
      });
    }
  } else if (doFetch) {
    report.results.push({ error: 'fetch-homey-app-diag-by-uuid.js missing' });
  }

  const outPath = path.join(OUT_DIR, 'latest.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    wrote: outPath,
    count: report.count,
    fetched: report.results.filter((x) => x.found).length,
    sample: report.uuids.slice(0, 8),
  }, null, 2));
}

main();
