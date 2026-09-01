'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const dir = path.join(ROOT, '.github', 'state', 'homey-app-diag');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sanitized.json'));
const rows = [];

for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (!j.via && !j.version && !j.createdAt) continue;
  const stack = String(j.stack || j.rawStack || (j.json && j.json.stack) || '');
  const msg = String(j.userMessage || j.comments || j.message || '');
  const couples = [];
  const re = /manufacturerName["']?\s*[:=]\s*["']([^"']+)["'][\s\S]{0,120}?productId["']?\s*[:=]\s*["']([^"']+)/gi;
  let m;
  while ((m = re.exec(stack))) couples.push(`${m[1]}+${m[2]}`);
  // zb settings style
  const re2 = /zb_manufacturer_name["']?\s*[:=]\s*["']([^"']+)["'][\s\S]{0,120}?zb_model_id["']?\s*[:=]\s*["']([^"']+)/gi;
  while ((m = re2.exec(stack))) couples.push(`${m[1]}+${m[2]}`);
  const mfrs = [...new Set(stack.match(/_TZ[A-Z0-9]+_[a-z0-9]+/gi) || [])];
  const pids = [...new Set(stack.match(/\bTS[0-9A-Z]{3,5}\b/g) || [])];
  const drivers = [...new Set((stack.match(/drivers\/([a-z0-9_]+)/gi) || []).map((x) => x.replace(/drivers\//i, '')))];
  const err = (stack.match(/(TypeError|Error|Invalid Driver ID|RangeError|ReferenceError|Cannot read)[^\n]{0,140}/) || [])[0] || '';
  rows.push({
    uuid: f.replace('.sanitized.json', ''),
    via: j.via,
    version: j.version,
    buildId: j.buildId,
    createdAt: j.createdAt,
    homey: j.homeyVersion,
    msg: msg.slice(0, 160),
    err: String(err).slice(0, 180),
    couples: [...new Set(couples)].slice(0, 8),
    mfrs: mfrs.slice(0, 10),
    pids: pids.slice(0, 10),
    drivers: drivers.slice(0, 10),
    keys: Object.keys(j),
  });
}

rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
console.log(JSON.stringify({ portalLike: rows.length, rows }, null, 2));
