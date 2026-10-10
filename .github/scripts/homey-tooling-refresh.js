#!/usr/bin/env node
'use strict';
/**
 * Weekly Homey tooling refresh (free, no AI). Reads npm "latest" for the homey CLI, homey-lib (validator),
 * homey-zigbeedriver and zigbee-clusters, records them in data/sources/homey-tooling.json, and:
 *  - CI tooling (safe to bump automatically): if the homey CLI needs a newer Node than the workflows use,
 *    raises `node-version` in .github/workflows/*.yml (only numeric majors, never lowers);
 *  - runtime libs (homey-zigbeedriver, zigbee-clusters): proposal only, never bumped (user decision:
 *    keep current Athom libs for firmware 12.2-12.8 compatibility).
 * Appends a dated summary to docs/knowledge/HOMEY_TOOLING_WATCH.md. Exit 0; prints "changed=true|false".
 * Usage: node .github/scripts/homey-tooling-refresh.js [--dry]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'data', 'sources', 'homey-tooling.json');
const DOC = path.join(ROOT, 'docs', 'knowledge', 'HOMEY_TOOLING_WATCH.md');
const WF = path.join(ROOT, '.github', 'workflows');
const PKGS = ['homey', 'homey-lib', 'homey-zigbeedriver', 'zigbee-clusters'];
const DRY = process.argv.includes('--dry');

const major = (range) => { const m = String(range || '').match(/(\d+)/); return m ? Number(m[1]) : 0; };

async function latest(name) {
  const r = await fetch(`https://registry.npmjs.org/${name}/latest`, { headers: { accept: 'application/json' } });
  if (!r.ok) { throw new Error(`${name}: HTTP ${r.status}`); }
  const j = await r.json();
  return { version: j.version, node: (j.engines && j.engines.node) || null };
}

function bumpNode(minMajor) {
  const changed = [];
  for (const f of fs.readdirSync(WF).filter((x) => /\.ya?ml$/.test(x))) {
    const p = path.join(WF, f);
    const src = fs.readFileSync(p, 'utf8');
    const out = src.replace(/(node-version:\s*['"]?)(\d+)(['"]?)/g, (all, a, v, b) => (Number(v) < minMajor ? `${a}${minMajor}${b}` : all));
    if (out !== src) { changed.push(f); if (!DRY) { fs.writeFileSync(p, out); } }
  }
  return changed;
}

(async () => {
  const prev = (() => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return { packages: {} }; } })();
  const now = { checkedAt: new Date().toISOString(), packages: {} };
  for (const n of PKGS) { try { now.packages[n] = await latest(n); } catch (e) { now.packages[n] = prev.packages[n] || { error: e.message }; } }
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const deps = { ...pkg.devDependencies, ...pkg.dependencies };
  const notes = [];
  for (const n of PKGS) {
    const a = prev.packages[n] && prev.packages[n].version; const b = now.packages[n].version;
    if (b && a !== b) { notes.push(`- ${n}: ${a || '(new)'} -> ${b} (engines.node ${now.packages[n].node || 'n/a'}; ours ${deps[n] || 'CLI via npx'})`); }
  }
  const cliNode = major(now.packages.homey && now.packages.homey.node);
  const bumped = cliNode ? bumpNode(cliNode) : [];
  if (bumped.length) { notes.push(`- CI: node-version raised to ${cliNode} (homey CLI requires node ${now.packages.homey.node}) in ${bumped.join(', ')}`); }
  for (const n of ['homey-zigbeedriver', 'zigbee-clusters']) {
    if (deps[n] && now.packages[n].version && !String(deps[n]).includes(now.packages[n].version)) {
      notes.push(`- Proposal only: ${n} ${deps[n]} -> ${now.packages[n].version} (runtime lib, kept on purpose; port useful fixes instead)`);
    }
  }
  const changed = notes.length > 0;
  if (changed && !DRY) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, `${JSON.stringify(now, null, 2)}\n`);
    const head = fs.existsSync(DOC) ? '' : '# Homey tooling watch\n\nWeekly, automatic (homey-tooling-refresh.js). Sources: npm registry (Athom B.V. packages).\n';
    fs.appendFileSync(DOC, `${head}\n## ${now.checkedAt.slice(0, 10)}\n${notes.join('\n')}\n`);
  }
  console.log(notes.join('\n') || 'no tooling change');
  console.log(`changed=${changed}`);
  if (process.env.GITHUB_OUTPUT) { fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`); }
})().catch((e) => { console.error(e.message); process.exit(0); });
