'use strict';
// P3065 flow uplift (t569u): Flow coverage of CUSTOM capabilities per driver.
// Homey generates system cards for system capabilities (and their sub-capabilities), so those are
// never duplicated here. App-defined capabilities (.homeycompose/capabilities) get no automatic
// card; each driver using one needs: a trigger (getable), a condition (boolean/enum) and an action
// (setable). A DEDICATED card counts when it is declared on the driver, or app-level with no device
// filter or a `capabilities=<cap>` / `driver_id=<driver>` filter, and its id/title names the capability.
// The GENERIC P3065 cards (capability_value_delta / capability_value_is / capability_value_set, no
// device filter, capability autocomplete) cover every capability; `missing` = covered by neither.
// Read-only. Usage: node scripts/diag/flow-capability-completeness.js [--list]
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const GENERIC = { triggers: 'capability_value_delta', conditions: 'capability_value_is', actions: 'capability_value_set' };
const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

function systemCaps(root) {
  const dir = path.join(root, 'node_modules', 'homey-lib', 'assets', 'capability', 'capabilities');
  return new Set(fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)));
}

function keywords(cap, def) {
  const k = new Set([cap, cap.replace(/_/g, ' ')]);
  const bare = cap.replace(/^(measure|alarm|meter|tuya|target)_/, '');
  k.add(bare); k.add(bare.replace(/_/g, ' '));
  const t = def && def.title && (def.title.en || def.title);
  if (typeof t === 'string' && t.length > 2) {k.add(t.toLowerCase());}
  return [...k].map((s) => s.toLowerCase());
}

function names(card, kw) {
  const t = card.title && typeof card.title === 'object' ? card.title.en : card.title;
  const hay = `${card.id} ${String(t || '').toLowerCase()} ${String(card.id).replace(/_/g, ' ')}`.toLowerCase();
  return kw.some((w) => hay.includes(w));
}

function filterParts(card) {
  const f = [];
  for (const a of card.args || []) {if (a.type === 'device' && a.filter) {f.push(String(a.filter));}}
  return f.join('&');
}
function filterHasCap(filter, cap) {
  return filter.split(/[&,|]/).some((p) => p.replace(/^capabilities=/, '').split('.')[0] === cap && /capabilities=/.test(filter));
}
function filterHasDriver(filter, d) {
  const m = filter.match(/driver_id=([^&]+)/);
  return !!m && (m[1] === '*' || m[1].split('|').includes(d));
}

function audit(root = ROOT) {
  const sys = systemCaps(root);
  const capDir = path.join(root, '.homeycompose', 'capabilities');
  const defs = {};
  for (const f of fs.readdirSync(capDir)) {if (f.endsWith('.json')) {defs[f.slice(0, -5)] = rd(path.join(capDir, f));}}
  const app = { triggers: [], conditions: [], actions: [] };
  for (const kind of Object.keys(app)) {
    const dir = path.join(root, '.homeycompose', 'flow', kind);
    if (!fs.existsSync(dir)) {continue;}
    for (const f of fs.readdirSync(dir)) {if (f.endsWith('.json')) {
      const c = rd(path.join(dir, f)); c.id = c.id || f.slice(0, -5); app[kind].push(c);
    }}
  }
  const rows = [];
  for (const d of fs.readdirSync(path.join(root, 'drivers')).sort()) {
    const dc = path.join(root, 'drivers', d, 'driver.compose.json');
    if (!fs.existsSync(dc)) {continue;}
    const caps = rd(dc).capabilities || [];
    const ff = path.join(root, 'drivers', d, 'driver.flow.compose.json');
    const df = fs.existsSync(ff) ? rd(ff) : {};
    for (const cap of [...new Set(caps.map((c) => c.split('.')[0]))]) {
      if (sys.has(cap)) {continue;} // Homey system cards exist — do not duplicate
      const def = defs[cap] || {};
      const kw = keywords(cap, def);
      const need = [];
      if (def.getable !== false) {need.push('triggers');}
      if (def.type === 'boolean' || def.type === 'enum') {need.push('conditions');}
      if (def.setable) {need.push('actions');}
      for (const kind of need) {
        const own = (df[kind] || []).some((c) => names(c, kw));
        const shared = app[kind].some((c) => {
          const f = filterParts(c);
          return (!f || filterHasCap(f, cap) || filterHasDriver(f, d)) && names(c, kw);
        });
        const generic = !!GENERIC[kind] && app[kind].some((c) => c.id === GENERIC[kind] && !filterParts(c));
        rows.push({ driver: d, cap, kind, dedicated: own || shared, generic, covered: own || shared || generic, type: def.type || '?', defined: !!defs[cap] });
      }
    }
  }
  const missing = rows.filter((r) => !r.covered);
  const genericOnly = rows.filter((r) => !r.dedicated);
  return { rows, missing, genericOnly };
}

module.exports = { audit };
if (require.main === module) {
  const r = audit();
  console.log({ checked: r.rows.length, missing: r.missing.length, genericOnly: r.genericOnly.length });
  if (process.argv.includes('--list')) {for (const m of process.argv.includes('--generic') ? r.genericOnly : r.missing) {console.log(`${m.cap}\t${m.kind}\t${m.type}\t${m.driver}${m.defined ? '' : '\t(UNDEFINED cap)'}`);}}
}
