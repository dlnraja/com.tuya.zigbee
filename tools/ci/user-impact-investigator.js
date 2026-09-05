#!/usr/bin/env node
'use strict';

/**
 * user-impact-investigator.js (P2213)
 *
 * Per-user device impact matrix from forum posts, diags, inbox, catalog.
 * Cross-ref drivers in diag stdout, sacred couples (when present), fix catalog.
 *
 * Usage:
 *   node tools/ci/user-impact-investigator.js
 *   node tools/ci/user-impact-investigator.js --user=Peter_van_Werkhoven
 *   node tools/ci/user-impact-investigator.js --all-users
 */

const fs = require('fs');
const path = require('path');
const { enrich } = require('../../lib/diagnostics/DiagContentEnricher');
const { loadManifest } = require('../../lib/enrichment/EnrichmentRegistry');

const ROOT = path.resolve(__dirname, '..', '..');
const PROCESSOR = path.join(ROOT, '.github', 'state', 'forum', 'actionable-processor-report.json');
const CATALOG = (() => {
  try {
    const reg = loadManifest();
    return reg.layers.userImpact.path;
  } catch {
    return path.join(ROOT, 'data', 'user-impact-catalog.json');
  }
})();
const INBOX = path.join(ROOT, 'reports', 'community-inbox.md');
const OUT_BASE = path.join(ROOT, 'reports', `forum-verify-${new Date().toISOString().slice(0, 10)}`, 'users');

const userArg = process.argv.find((a) => a.startsWith('--user='));
const ALL = process.argv.includes('--all-users') || !userArg;

function loadJson(fp) {
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function globDiagExcerpts() {
  const out = [];
  const reportsDir = path.join(ROOT, 'reports');
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

function parseDriversFromText(text) {
  const drivers = new Map();
  const re = /\[Driver:([a-z0-9_]+)\]\s*\[Device:([a-f0-9-]{36})\]/gi;
  let m;
  while ((m = re.exec(text))) {
    if (!drivers.has(m[1])) drivers.set(m[1], new Set());
    drivers.get(m[1]).add(m[2]);
  }
  return drivers;
}

function postsByUser(processor) {
  const map = new Map();
  for (const p of processor?.posts || []) {
    const u = p.username;
    if (!u) continue;
    if (!map.has(u)) map.set(u, []);
    map.get(u).push(p);
  }
  for (const [, arr] of map) {
    arr.sort((a, b) => (b.postNumber || 0) - (a.postNumber || 0));
  }
  return map;
}

function inboxSnippets(username) {
  if (!fs.existsSync(INBOX)) return [];
  const lines = fs.readFileSync(INBOX, 'utf8').split('\n');
  return lines.filter((l) => l.includes(`**${username}**`)).map((l) => l.replace(/^-\s*/, '').trim());
}

function renderUserMd(username, posts, catalogUser, diagDerived, inbox) {
  const lines = [
    `# User impact — ${username}`,
    '',
    `Generated: ${new Date().toISOString().slice(0, 19)} · silent enrichment only`,
    '',
    '## Forum posts (actionable)',
    '',
    '| Topic | Post | Date | Issues | Couples | Action |',
    '|-------|------|------|--------|---------|--------|',
  ];

  for (const p of posts.slice(0, 20)) {
    const couples = (p.couples || []).map((c) => `${c.mfr || '?'}${c.pid ? '+' + c.pid : ''}`).join('; ') || '—';
    lines.push(`| T${p.topicId} | #${p.postNumber} | ${(p.date || '').slice(0, 10)} | ${(p.issues || []).join(',') || '—'} | ${couples} | ${p.recommendedAction} |`);
  }

  if (catalogUser?.diags?.length) {
    lines.push('', '## Diagnostic lineage', '');
    lines.push('| Log ID | Date | App | Notes |');
    lines.push('|--------|------|-----|-------|');
    for (const d of catalogUser.diags) {
      lines.push(`| \`${d.logIdShort}\` | ${d.date} | ${d.appVersion} | ${d.notes} |`);
    }
  }

  if (catalogUser?.devices?.length) {
    lines.push('', '## Impacted devices (cross-source)', '');
    lines.push('| Tile / role | Driver | Device UUID | Couple | Symptoms | Fix shipped | User action |');
    lines.push('|-------------|--------|-------------|--------|----------|-------------|-------------|');
    for (const dev of catalogUser.devices) {
      lines.push(`| ${dev.tile} | ${dev.driver} | ${dev.deviceId ? dev.deviceId.slice(0, 8) + '…' : '—'} | ${dev.couple || '**ABSENT**'} | ${dev.symptoms.join('; ')} | ${(dev.fixes || []).join('; ')} | ${dev.userAction || '—'} |`);
    }
  }

  if (diagDerived.size) {
    lines.push('', '## Drivers seen in local diag excerpts', '');
    for (const [driver, ids] of diagDerived) {
      lines.push(`- **${driver}**: ${[...ids].map((id) => `\`${id.slice(0, 8)}…\``).join(', ')}`);
    }
  }

  if (inbox.length) {
    lines.push('', '## Inbox snippets', '');
    for (const s of inbox.slice(0, 8)) lines.push(`- ${s.slice(0, 200)}`);
  }

  if (catalogUser?.forbiddenInvent?.length) {
    lines.push('', '## Do not invent', '');
    for (const f of catalogUser.forbiddenInvent) lines.push(`- ${f}`);
  }

  lines.push('', '---', 'Regenerate: `npm run user:impact -- --user=' + username + '`', '');
  return `${lines.join('\n')}\n`;
}

function main() {
  const processor = loadJson(PROCESSOR);
  const catalog = loadJson(CATALOG) || { users: {} };
  const byUser = postsByUser(processor);

  if (!processor?.posts?.length) {
    console.warn('[user-impact] Run forum-actionable-processor first');
  }

  const excerpts = globDiagExcerpts();
  const diagByLogId = new Map();
  for (const ex of excerpts) {
    try {
      const text = fs.readFileSync(ex.path, 'utf8');
      const en = enrich(text);
      diagByLogId.set(ex.logId || en.logIdShort, parseDriversFromText(text));
    } catch { /* skip */ }
  }

  fs.mkdirSync(OUT_BASE, { recursive: true });
  const index = [];

  const targets = ALL
    ? [...byUser.keys()].sort()
    : [userArg.split('=')[1]];

  for (const username of targets) {
    const posts = byUser.get(username) || [];
    const catalogUser = catalog.users?.[username];
    const inbox = inboxSnippets(username);

    let diagDerived = new Map();
    if (catalogUser?.diags) {
      for (const d of catalogUser.diags) {
        const m = diagByLogId.get(d.logIdShort);
        if (m) {
          for (const [driver, ids] of m) {
            if (!diagDerived.has(driver)) diagDerived.set(driver, new Set());
            ids.forEach((id) => diagDerived.get(driver).add(id));
          }
        }
      }
    }

    const md = renderUserMd(username, posts, catalogUser, diagDerived, inbox);
    const safe = username.replace(/[^a-zA-Z0-9_-]/g, '_');
    const outFile = path.join(OUT_BASE, `${safe}.md`);
    fs.writeFileSync(outFile, md);
    index.push({ username, posts: posts.length, devices: catalogUser?.devices?.length || 0, file: outFile });
    console.log(`[user-impact] ${username}: ${posts.length} posts → ${outFile}`);
  }

  fs.writeFileSync(path.join(OUT_BASE, 'INDEX.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), users: index }, null, 2)}\n`);
  console.log('[user-impact] wrote', path.join(OUT_BASE, 'INDEX.json'));
}

main();
