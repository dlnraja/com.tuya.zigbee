'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const dir = path.join(ROOT, '.github', 'state', 'homey-app-diag');
const harvestPath = path.join(ROOT, '.github', 'state', 'portal-crash-harvest.json');

function extractFromText(text) {
  const t = String(text || '');
  const userMsg = (t.match(/User Message:\s*([\s\S]*?)\n\s*(?:stdout:|stderr:)/i) || [])[1] || '';
  const logId = (t.match(/Log ID:\s*([0-9a-f-]{36})/i) || [])[1] || null;
  const drivers = [...new Set((t.match(/\[Driver:([a-z0-9_]+)\]/gi) || []).map((x) => x.replace(/\[Driver:/i, '').replace(/\]/, '')))];
  const mfrs = [...new Set(t.match(/_TZ[A-Z0-9]+_[a-z0-9]+/gi) || [])];
  const pids = [...new Set(t.match(/\bTS[0-9A-Z]{3,5}\b/g) || [])];
  // only keep real productId-looking tokens when near a mfr mention in same user message
  const couples = [];
  const um = userMsg.replace(/\s+/g, ' ').trim();
  const coupleInMsg = um.match(/(_TZ[A-Z0-9]+_[a-z0-9]+)\s*\+\s*(TS[0-9A-Z]{3,5})/i)
    || um.match(/(TS[0-9A-Z]{3,5})\s*\+\s*(_TZ[A-Z0-9]+_[a-z0-9]+)/i);
  if (coupleInMsg) {
    if (coupleInMsg[1].startsWith('_TZ') || coupleInMsg[1].startsWith('_tz')) {
      couples.push(`${coupleInMsg[1]}+${coupleInMsg[2]}`);
    } else {
      couples.push(`${coupleInMsg[2]}+${coupleInMsg[1]}`);
    }
  }
  const invalidDriver = (t.match(/Invalid Driver ID:\s*([A-Za-z0-9_:-]+)/) || [])[1] || null;
  const err = (t.match(/(Error:|TypeError:|RangeError:)[^\n]{0,160}/) || [])[0] || '';
  return {
    logId,
    userMessage: um.slice(0, 200),
    drivers: drivers.slice(0, 12),
    mfrs: mfrs.slice(0, 12),
    pids: pids.slice(0, 12),
    couples,
    invalidDriver,
    errHead: String(err).slice(0, 180),
  };
}

const rows = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sanitized.json') || x.endsWith('.json'))) {
  if (f.includes('sanitized') === false && fs.existsSync(path.join(dir, f.replace(/\.json$/, '.sanitized.json')))) continue;
  const p = path.join(dir, f);
  let j;
  try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
  if (!(j.via || j.version || j.logSanitized || j.stack)) continue;
  const text = j.logSanitized || j.stack || j.rawStack || '';
  const ex = extractFromText(text);
  rows.push({
    file: path.relative(ROOT, p).replace(/\\/g, '/'),
    uuid: j.uuid || f.replace(/\.sanitized\.json$|\.json$/, ''),
    version: j.version || null,
    buildId: j.buildId || null,
    createdAt: j.createdAt || null,
    homey: j.homeyVersion || null,
    via: j.via || null,
    ...ex,
  });
}

// also parse harvest stackHeads (UUIDs may be redacted there)
let harvest = null;
if (fs.existsSync(harvestPath)) {
  harvest = JSON.parse(fs.readFileSync(harvestPath, 'utf8'));
  for (const c of harvest.crashes || []) {
    const ex = extractFromText(c.stackHead || '');
    rows.push({
      file: '.github/state/portal-crash-harvest.json',
      uuid: c.logId || null,
      version: c.version,
      buildId: c.buildId,
      createdAt: c.createdAt,
      homey: c.homeyVersion,
      via: 'portal-crash-harvest',
      ...ex,
      stackHead: c.stackHead,
    });
  }
}

rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
const cutoff = Date.parse('2026-08-25T00:00:00Z');
const recent = rows.filter((r) => Date.parse(r.createdAt || 0) >= cutoff);

const out = {
  generatedAt: new Date().toISOString(),
  totalParsed: rows.length,
  last7d: recent.length,
  recent,
};
fs.writeFileSync(path.join(__dirname, 'portal-diag-parsed.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify({ last7d: recent.length, sample: recent.slice(0, 25) }, null, 2));
