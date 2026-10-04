'use strict';
/**
 * DP-mapping parsers for external sources (W10). They read source TEXT and return only facts:
 * couples (manufacturerName + productId), DP ids with the source's attribute name and converter
 * hint, model/vendor/description. No code is copied; the output is data we re-express ourselves
 * in proposals. Each parser is tolerant: unknown shapes yield empty results, never throw.
 *
 *  - z2m:       zigbee-herdsman-converters definitions (tuya.fingerprint(...) / fingerprint arrays,
 *               tuyaDatapoints [[dp, "name", converter], ...])
 *  - zha:       zha-device-handlers Tuya quirks (v2 TuyaQuirkBuilder(...).applies_to(...) with dp_id=,
 *               v1 dp_to_attribute { N: DPToAttributeMapping(..., "attr") } + MODELS_INFO)
 *  - tuyaLocal: tuya-local device YAML (dps: - id / name / type)
 */
// Long form first (R16 exception: verified _TZE28C1000000_ / _TZE2841000000_ + 8 chars), then the usual short prefixes.
const MFR = /_TZE28C1000000_[a-z0-9]{8}|_TZE2841000000_[a-z0-9]{8}|_T[ZY][A-Z0-9]{1,4}_[a-z0-9]{8}|_TYZB0[0-9]_[a-z0-9]{8}|_TYST11_[a-z0-9]{8}/gi;
const uniq = (a) => [...new Set(a)];

function couplesFromList(pids, mfrs) {
  const out = [];
  for (const p of pids) {for (const m of mfrs) {out.push({ mfr: m, pid: p });}}
  return out;
}

function parseZ2M(text) {
  const src = String(text || '');
  const defs = [];
  // Split on definition starts: every `fingerprint:` begins a definition.
  const starts = [];
  const re = /fingerprint\s*:/g;
  let m;
  while (m = re.exec(src)) {starts.push(m.index);}
  for (let i = 0; i < starts.length; i++) {
    const chunk = src.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : src.length);
    const couples = [];
    for (const f of chunk.matchAll(/tuya\.fingerprint\(\s*["']([^"']+)["']\s*,\s*\[([^\]]*)\]/g)) {
      couples.push(...couplesFromList([f[1]], uniq(f[2].match(MFR) || [])));
    }
    for (const f of chunk.matchAll(/\{\s*modelID\s*:\s*["']([^"']+)["']\s*,\s*manufacturerName\s*:\s*["']([^"']+)["']/g)) {
      couples.push({ mfr: f[2], pid: f[1] });
    }
    if (!couples.length) {continue;}
    const dps = [];
    const block = chunk.match(/tuyaDatapoints\s*:\s*\[([\s\S]*?)\]\s*,?\s*\n\s*\}/);
    if (block) {
      const flat = block[1].replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ');
      for (const d of flat.matchAll(/\[\s*(\d{1,3})\s*,\s*(?:["']([^"']+)["']|null)\s*,\s*([A-Za-z_$][\w$.]*)?/g)) {
        dps.push({ dp: Number(d[1]), name: d[2] || null, converter: d[3] || null });
      }
    }
    const pick = (k) => (chunk.match(new RegExp(`${k}\\s*:\\s*["']([^"']+)["']`)) || [])[1] || null;
    defs.push({ couples, dps, model: pick('model'), vendor: pick('vendor'), description: pick('description') });
  }
  return defs;
}

function parseZHA(text) {
  const src = String(text || '');
  const defs = [];
  // v2 builder blocks: from TuyaQuirkBuilder( to .add_to_registry(
  for (const b of src.matchAll(/TuyaQuirkBuilder\(([\s\S]*?)\.add_to_registry\(/g)) {
    const body = b[0];
    const couples = [];
    const head = body.match(/TuyaQuirkBuilder\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/);
    if (head) {couples.push({ mfr: head[1], pid: head[2] });}
    for (const a of body.matchAll(/\.applies_to\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g)) {couples.push({ mfr: a[1], pid: a[2] });}
    const dps = [];
    for (const d of body.matchAll(/\.(tuya_\w+)\(\s*(?:[\s\S]{0,200}?)dp_id\s*=\s*(\d{1,3})[\s\S]{0,300}?(?:attribute_name|name)\s*=\s*["']([^"']+)["']/g)) {
      dps.push({ dp: Number(d[2]), name: d[3], converter: d[1] });
    }
    if (couples.length) {defs.push({ couples, dps, model: null, vendor: null, description: null });}
  }
  // v1: MODELS_INFO + dp_to_attribute
  if (/MODELS_INFO/.test(src)) {
    const couples = [];
    for (const mi of src.matchAll(/\(\s*["']([^"']+)["']\s*,\s*["'](TS\w+)["']\s*\)/g)) {couples.push({ mfr: mi[1], pid: mi[2] });}
    const dps = [];
    for (const d of src.matchAll(/(\d{1,3})\s*:\s*DPToAttributeMapping\(\s*[\w.]+\s*,\s*["']([^"']+)["']/g)) {
      dps.push({ dp: Number(d[1]), name: d[2], converter: 'DPToAttributeMapping' });
    }
    if (couples.length) {defs.push({ couples, dps, model: null, vendor: null, description: null });}
  }
  return defs;
}

function parseTuyaLocal(text) {
  const src = String(text || '');
  const dps = [];
  for (const d of src.matchAll(/-\s*id:\s*(\d{1,3})\s*\n\s*(?:type:\s*(\w+)\s*\n\s*)?name:\s*([\w ]+)(?:\s*\n\s*type:\s*(\w+))?/g)) {
    dps.push({ dp: Number(d[1]), name: d[3].trim(), converter: d[2] || d[4] || null });
  }
  const name = (src.match(/^name:\s*(.+)$/m) || [])[1] || null;
  const couples = uniq(src.match(MFR) || []).map((mfr) => ({ mfr, pid: null }));
  return dps.length || couples.length ? [{ couples, dps, model: name, vendor: null, description: null }] : [];
}

function forCouple(defs, mfr) {
  const k = String(mfr).toLowerCase();
  return defs.filter((d) => d.couples.some((c) => String(c.mfr).toLowerCase() === k));
}

module.exports = { parseZ2M, parseZHA, parseTuyaLocal, forCouple };
