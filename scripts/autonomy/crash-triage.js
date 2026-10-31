#!/usr/bin/env node
'use strict';
// P3097 (t654u): crash triage. Reads the sanitized diagnostics artifact (any JSON), extracts crash-like
// records, groups them by a normalized signature, ranks impact = occurrences × distinct users, and maps
// known safe fix patterns. Output: crash-triage.json + one markdown body per signature (no quoting of
// user text beyond the normalized first error line). Never executes or evaluates the content.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { clean } = require('./sanitize');

const SAFE_PATTERNS = [
  { id: 'try-catch-guard', re: /ENOENT|uv_resident_set_memory|memoryUsage|Cannot read propert(y|ies) of (undefined|null)|is not a function/i, fix: 'wrap the call in a try/catch guard with a safe fallback' },
  { id: 'bounded-cache', re: /heap out of memory|JavaScript heap|Allocation failed|RangeError: Invalid string length|JSON\.(parse|stringify)/i, fix: 'bound the cache / skip large JSON work when the heap is high' },
  { id: 'invalid-flow-card-id', re: /invalid_flow_card_id|Invalid Flow Card ID|flow card .* not found/i, fix: 'declare or rename the flow card id in compose' },
];

function normalize(msg) {
  return clean(msg, 400).split('\n')[0]
    .replace(/_T[ZE][A-Z0-9]*_[a-z0-9]{8}/g, '<mfr>').replace(/0x[0-9a-f]+/gi, '<hex>')
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '<uuid>').replace(/\d+/g, '<n>').replace(/\s+/g, ' ').trim().slice(0, 200);
}

function records(node, out = [], depth = 0) {
  if (depth > 8 || node == null) return out;
  if (Array.isArray(node)) { node.slice(0, 5000).forEach((n) => records(n, out, depth + 1)); return out; }
  if (typeof node === 'object') {
    const msg = node.error || node.message || node.stack || node.crash || node.reason;
    if (typeof msg === 'string' && msg.length > 3) {
      out.push({ msg, user: String(node.homeyId || node.user || node.uuid || node.cloudId || node.from || 'unknown').slice(0, 80), app: String(node.app || node.appId || '').slice(0, 60), version: String(node.version || node.appVersion || '').slice(0, 30) });
    }
    Object.values(node).forEach((v) => { if (v && typeof v === 'object') records(v, out, depth + 1); });
  }
  return out;
}

function triage(recs) {
  const g = new Map();
  for (const r of recs) {
    const sig = normalize(r.msg); if (!sig) continue;
    const e = g.get(sig) || { signature: sig, id: crypto.createHash('sha1').update(sig).digest('hex').slice(0, 10), count: 0, users: new Set(), versions: new Set(), apps: new Set() };
    e.count++; e.users.add(r.user); if (r.version) e.versions.add(r.version); if (r.app) e.apps.add(r.app);
    g.set(sig, e);
  }
  return [...g.values()].map((e) => {
    const p = SAFE_PATTERNS.find((x) => x.re.test(e.signature));
    return { id: e.id, signature: e.signature, count: e.count, users: e.users.size, impact: e.count * e.users.size, versions: [...e.versions].sort(), apps: [...e.apps].sort(), safePattern: p ? p.id : null, proposal: p ? p.fix : 'needs review' };
  }).sort((a, b) => b.impact - a.impact);
}

if (require.main === module) {
  const files = process.argv.slice(2);
  const recs = [];
  for (const f of files) { try { if (fs.statSync(f).size < 20e6) records(JSON.parse(fs.readFileSync(f, 'utf8')), recs); } catch { /* not JSON */ } }
  const res = triage(recs).slice(0, 30);
  fs.writeFileSync('crash-triage.json', JSON.stringify(res, null, 2) + '\n');
  console.log(`signatures ${res.length} from ${recs.length} records`);
}
module.exports = { normalize, records, triage, SAFE_PATTERNS };
