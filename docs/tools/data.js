'use strict';
// Shared data helpers for the README and docs-site generators.
// Everything here is derived from app.json (the built SSOT manifest); nothing is hand-typed.

const REPO = 'dlnraja/com.tuya.zigbee';
const REPO_URL = 'https://github.com/' + REPO;
const PAGES_URL = 'https://dlnraja.github.io/com.tuya.zigbee/docs/';
const ISSUES_URL = REPO_URL + '/issues';
const NEW_ISSUE_URL = REPO_URL + '/issues/new/choose';
const FORUM_URL = 'https://community.homey.app/t/140352';

const BRANCHES = {
  master: {
    branch: 'master', appId: 'com.dlnraja.tuya.zigbee', live: false, title: 'Universal Tuya',
    role: 'Main app: newest drivers and features. Ships to the Test channel first, then Live.',
  },
  'stable-v5': {
    branch: 'stable-v5', appId: 'com.dlnraja.tuya.zigbee.stable', live: false, title: 'Tuya Unified (Stable)',
    role: 'Reliability line: receives fixes from master after a soak period; fewer moving parts.',
  },
  'bastien-home': {
    branch: 'bastien-home', appId: 'com.dlnraja.tuya.zigbee.bastien', live: false, title: 'Zigbee Bastien',
    role: 'Dedicated build for one community installation; gets master fixes after they are proven.',
  },
};

function branchFromAppId(id) {
  const s = String(id || '');
  if (s.endsWith('.stable')) return 'stable-v5';
  if (s.endsWith('.bastien')) return 'bastien-home';
  return 'master';
}

// Live channel: none of the three apps has a Live build yet (apps-api.athom.com liveVersion = null,
// checked 2026-10-21; homey.app/a/<id>/ returns 404). Flip `live: true` in BRANCHES once Athom
// approves a Live release; until then only the Test link is shown.
function installLinks(appId) {
  const meta = BRANCHES[branchFromAppId(appId)] || {};
  return {
    live: meta.live ? 'https://homey.app/a/' + appId + '/' : null,
    test: 'https://homey.app/a/' + appId + '/test/',
  };
}

function uniqCi(list) {
  const seen = new Map();
  for (const v of list || []) {
    const s = String(v).trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (!seen.has(k)) seen.set(k, s);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

function pickName(n) {
  if (!n) return '';
  if (typeof n === 'string') return n;
  return n.en || Object.values(n)[0] || '';
}

/** Turn an app.json object into a flat, sorted driver list. */
function collectDevices(app, branch) {
  const b = branch || branchFromAppId(app && app.id);
  return ((app && app.drivers) || []).map(d => {
    const zb = d.zigbee || {};
    const conn = Array.isArray(d.connectivity) ? d.connectivity : (d.connectivity ? [d.connectivity] : []);
    const mfrs = uniqCi(zb.manufacturerName);
    const pids = uniqCi(zb.productId);
    return {
      id: d.id,
      name: pickName(d.name),
      class: d.class || '',
      protocol: zb.manufacturerName || zb.productId ? 'zigbee' : (conn.includes('lan') || /wifi/i.test(d.id) ? 'wifi' : (conn[0] || 'other')),
      capabilities: (d.capabilities || []).slice().sort(),
      mfrs,
      pids,
      source: REPO_URL + '/blob/' + b + '/drivers/' + d.id + '/driver.compose.json',
    };
  }).sort((a, x) => a.id.localeCompare(x.id));
}

function stats(devices) {
  const mfr = new Set(); const pid = new Set(); const caps = new Set(); const classes = {};
  let zigbee = 0; let wifi = 0;
  for (const d of devices) {
    d.mfrs.forEach(m => mfr.add(m.toLowerCase()));
    d.pids.forEach(p => pid.add(p.toLowerCase()));
    d.capabilities.forEach(c => caps.add(c));
    classes[d.class] = (classes[d.class] || 0) + 1;
    if (d.protocol === 'zigbee') zigbee++; else if (d.protocol === 'wifi') wifi++;
  }
  return { drivers: devices.length, zigbee, wifi, other: devices.length - zigbee - wifi, manufacturers: mfr.size, productIds: pid.size, capabilities: caps.size, classes };
}

/** Remove personal data from free text before it is published. */
function scrub(text) {
  return String(text)
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email removed]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[id removed]')
    .replace(/\b(?:192\.168|10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/g, '[lan ip removed]')
    .replace(/\+\d{2}[\s.]?\d(?:[\s.]?\d{2}){4}\b/g, '[phone removed]')
    .replace(/\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/gi, '[mac removed]')
    .replace(/\b(local_?key|localKey|access_?token|client_?secret)(\s*[:=]\s*)["']?[^\s"',]{6,}/gi, '$1$2[secret removed]');
}

function fmt(n) { return Number(n).toLocaleString('en-US'); }

module.exports = { REPO, REPO_URL, PAGES_URL, ISSUES_URL, NEW_ISSUE_URL, FORUM_URL, BRANCHES, branchFromAppId, installLinks, uniqCi, collectDevices, stats, scrub, fmt, pickName };
