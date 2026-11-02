'use strict';
// P3221: shared lookup for UUIDs that look like Homey diag codes but are not (e.g. a forum post id).
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const FILE = path.join(__dirname, '..', '..', 'data', 'diag', 'non-diag-ids.json');
let cache = null;

function sha16(uuid) {
  return crypto.createHash('sha256').update(String(uuid || '').toLowerCase()).digest('hex').slice(0, 16);
}

function load(file = FILE) {
  if (cache && cache.file === file) {return cache.map;}
  const map = new Map();
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const e of (j.entries || []).slice(0, 500)) {if (e && /^[0-9a-f]{16}$/.test(e.sha16)) {map.set(e.sha16, e);}}
  } catch { /* missing file = no exclusions */ }
  cache = { file, map };
  return map;
}

function nonDiagInfo(uuid, file) {
  return load(file).get(sha16(uuid)) || null;
}

module.exports = { sha16, nonDiagInfo, _reset: () => { cache = null; } };
