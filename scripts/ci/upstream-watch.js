#!/usr/bin/env node
'use strict';
// P3097 (t645u): free, low-frequency watch of Homey SDK / athombv / Z2M / ZHA changes.
// Public APIs only (npm registry, GitHub REST with GITHUB_TOKEN), one request per source, ETag cache,
// stop on 403/429. Writes .github/state/upstream-watch.json and a markdown digest; never posts outside the repo.
// The Homey forum is watched by forum-poll.yml (read-only, rate-limited) and is not hit here.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE = path.join(ROOT, '.github', 'state', 'upstream-watch.json');
const SOURCES = [
  { id: 'npm:homey', url: 'https://registry.npmjs.org/homey/latest', pick: (j) => j.version },
  { id: 'npm:homey-zigbeedriver', url: 'https://registry.npmjs.org/homey-zigbeedriver/latest', pick: (j) => j.version },
  { id: 'npm:zigbee-clusters', url: 'https://registry.npmjs.org/zigbee-clusters/latest', pick: (j) => j.version },
  { id: 'npm:zigbee-herdsman-converters', url: 'https://registry.npmjs.org/zigbee-herdsman-converters/latest', pick: (j) => j.version },
  { id: 'gh:athombv/node-homey-zigbeedriver', url: 'https://api.github.com/repos/athombv/node-homey-zigbeedriver/commits?per_page=1', pick: (j) => j[0] && j[0].sha.slice(0, 10) },
  { id: 'gh:athombv/homey-apps-sdk-issues', url: 'https://api.github.com/repos/athombv/homey-apps-sdk-issues/commits?per_page=1', pick: (j) => j[0] && j[0].sha.slice(0, 10) },
  { id: 'gh:athombv/node-zigbee-clusters', url: 'https://api.github.com/repos/athombv/node-zigbee-clusters/commits?per_page=1', pick: (j) => j[0] && j[0].sha.slice(0, 10) },
  { id: 'gh:zigpy/zha-device-handlers', url: 'https://api.github.com/repos/zigpy/zha-device-handlers/releases/latest', pick: (j) => j.tag_name },
  { id: 'gh:Koenkk/zigbee-herdsman-converters', url: 'https://api.github.com/repos/Koenkk/zigbee-herdsman-converters/releases/latest', pick: (j) => j.tag_name },
];
// Deterministic, safe adaptations only produce notes here; gate changes still go through a reviewed commit.
const NOTE = {
  'npm:homey': 'Check homey CLI changelog for new `homey app validate` rules → mirror in a gate.',
  'npm:homey-zigbeedriver': 'Run the zigbeedriver contract tests against the new version before bumping.',
};

function diff(prev, cur) {
  return Object.keys(cur).filter((k) => cur[k].value && prev[k] && prev[k].value && prev[k].value !== cur[k].value)
    .map((k) => ({ id: k, from: prev[k].value, to: cur[k].value, note: NOTE[k] || 'note only' }));
}

async function main() {
  const prev = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
  const cur = {};
  for (const s of SOURCES) {
    const h = { 'User-Agent': 'com.tuya.zigbee-upstream-watch', Accept: 'application/json' };
    if (s.url.includes('api.github.com') && process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    if (prev[s.id] && prev[s.id].etag) h['If-None-Match'] = prev[s.id].etag;
    try {
      const r = await fetch(s.url, { headers: h });
      if (r.status === 304) { cur[s.id] = prev[s.id]; continue; }
      if (r.status === 403 || r.status === 429) { console.log(`rate-limited at ${s.id}, stopping`); Object.assign(cur, prev, cur); break; }
      if (!r.ok) { cur[s.id] = prev[s.id] || {}; continue; }
      cur[s.id] = { value: s.pick(await r.json()), etag: r.headers.get('etag') || undefined, seen: new Date().toISOString().slice(0, 10) };
    } catch { cur[s.id] = prev[s.id] || {}; }
    await new Promise((res) => setTimeout(res, 1500));
  }
  const changes = diff(prev, cur);
  fs.writeFileSync(STATE, JSON.stringify(cur, null, 2) + '\n');
  const md = changes.length
    ? `Upstream changes since last check:\n\n${changes.map((c) => `- **${c.id}**: ${c.from} → ${c.to}. ${c.note}`).join('\n')}\n`
    : '';
  fs.writeFileSync(path.join(ROOT, 'upstream-digest.md'), md);
  console.log(md || 'no upstream change');
}

if (require.main === module) main();
module.exports = { diff, SOURCES };
