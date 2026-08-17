#!/usr/bin/env node
'use strict';

/**
 * contributor-repo-dump.js — READ-ONLY intel from sibling Homey Zigbee repos.
 *
 * Does NOT copy driver trees. Extracts cluster IDs, manufacturer names, and
 * reliability keywords (jitter, retry, boot-burst, 0x000A) into gitignored state
 * so scrapers/workflows can cross-ref without merging foreign code.
 *
 * Usage:
 *   node tools/ci/contributor-repo-dump.js
 *   node tools/ci/contributor-repo-dump.js --repo=gpmachado/com.gpm.homesuite
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, '.github', 'state', 'contributor-dump');
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

const DEFAULT_REPOS = [
  'gpmachado/com.gpm.homesuite',
  'gpmachado/Homey.Sonoff.Zigbee',
  'JohanBendz/com.tuya.zigbee',
];

const args = process.argv.slice(2);
const only = (() => {
  const a = args.find((x) => x.startsWith('--repo='));
  return a ? [a.split('=')[1]] : DEFAULT_REPOS;
})();

const { parseClusterMentions } = require('../../lib/zigbee/ZclClusterLexicon');
const { extractForumSignals } = require('./forum-signal-extract');

function gh(apiPath) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'universal-tuya-contributor-dump',
      Accept: 'application/vnd.github+json',
    };
    if (TOKEN) {headers.Authorization = `Bearer ${TOKEN}`;}
    https.get(`https://api.github.com${apiPath}`, { headers }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        } else {
          reject(new Error(`HTTP ${res.statusCode} ${apiPath}`));
        }
      });
    }).on('error', reject);
  });
}

function rawGet(repo, ref, filePath) {
  return new Promise((resolve, reject) => {
    const url = `https://raw.githubusercontent.com/${repo}/${ref}/${filePath}`;
    https.get(url, { headers: { 'User-Agent': 'universal-tuya-contributor-dump' } }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (res.statusCode === 200) {resolve(body);}
        else {resolve('');}
      });
    }).on('error', reject);
  });
}

async function dumpRepo(repo) {
  const meta = await gh(`/repos/${repo}`).catch((e) => ({ error: e.message }));
  if (meta.error) {return { repo, error: meta.error };}
  const ref = meta.default_branch || 'master';
  const tree = await gh(`/repos/${repo}/git/trees/${ref}?recursive=1`).catch(() => ({ tree: [] }));
  const files = (tree.tree || []).map((t) => t.path).filter((p) => /\.(js|json|md)$/.test(p));

  const interesting = files.filter((p) => /lib\/|constants|cluster|retry|jitter|availability|TimeCluster|Power/i.test(p));
  const samplePaths = interesting.slice(0, 18);
  const clusters = new Map();
  const mfrs = new Set();
  const keywords = new Set();
  const KW = /\b(jitter|retry|boot-burst|rejoin|cross-link|endpoint|0x000A|0x0001|power.?restore|unavailable)\b/gi;

  for (const fp of samplePaths) {
    // eslint-disable-next-line no-await-in-loop
    const body = await rawGet(repo, ref, fp);
    if (!body) {continue;}
    for (const c of parseClusterMentions(body)) {
      clusters.set(c.id, c);
    }
    const sig = extractForumSignals(body);
    for (const m of sig.mfrs) {mfrs.add(m);}
    const hits = body.match(KW) || [];
    for (const h of hits) {keywords.add(h.toLowerCase());}
  }

  const forks = await gh(`/repos/${repo}/forks?per_page=20`).catch(() => []);
  return {
    repo,
    description: meta.description,
    default_branch: ref,
    pushed_at: meta.pushed_at,
    license: meta.license?.spdx_id || null,
    file_count: files.length,
    clusters: [...clusters.values()],
    manufacturers: [...mfrs].slice(0, 80),
    keywords: [...keywords].sort(),
    forks: (Array.isArray(forks) ? forks : []).map((f) => ({
      full_name: f.full_name,
      pushed_at: f.pushed_at,
      default_branch: f.default_branch,
    })),
  };
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {fs.mkdirSync(OUT_DIR, { recursive: true });}
  const report = {
    generatedAt: new Date().toISOString(),
    policy: 'READ-ONLY intel — never copy foreign driver trees into this app',
    repos: [],
  };
  for (const repo of only) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const row = await dumpRepo(repo);
      report.repos.push(row);
      console.log(`ok ${repo} clusters=${(row.clusters || []).length} forks=${(row.forks || []).length}`);
    } catch (err) {
      report.repos.push({ repo, error: err.message });
      console.log(`FAIL ${repo}: ${err.message}`);
    }
  }
  const out = path.join(OUT_DIR, 'intel.json');
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
