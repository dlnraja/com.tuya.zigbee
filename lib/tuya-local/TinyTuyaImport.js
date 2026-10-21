'use strict';
/**
 * P2930 — Import local keys from a tinytuya wizard export (devices.json / snapshot.json,
 * jasonacox/tinytuya, MIT) or a tuya-cli / localtuya style list. Pure parsing, no network.
 * Fields kept: id, key, ip, version, name, product_id, category, cid (node_id) and parent.
 * Entries without a 16-char local key are kept as "needs key" so the user sees them.
 */
function pick(o, ...names) { for (const n of names) {if (o && o[n] !== undefined && o[n] !== null && o[n] !== '') {return o[n];}} return undefined; }

function normalizeEntry(e) {
  if (!e || typeof e !== 'object') {return null;}
  const id = pick(e, 'id', 'devId', 'gwId', 'device_id', 'uuid');
  if (!id || typeof id !== 'string') {return null;}
  const key = pick(e, 'key', 'local_key', 'localKey');
  const ver = pick(e, 'version', 'ver', 'protocol_version');
  const out = {
    id: id.trim(),
    key: typeof key === 'string' && key.length === 16 ? key : null,
    ip: typeof pick(e, 'ip') === 'string' && pick(e, 'ip') !== '0.0.0.0' ? e.ip : null,
    version: ver ? String(ver) : null,
    name: pick(e, 'name') || null,
    productId: pick(e, 'product_id', 'productKey', 'productId') || null,
    category: pick(e, 'category') || null,
    cid: pick(e, 'node_id', 'cid') || null,
    parent: pick(e, 'parent', 'parent_id', 'gateway_id') || null,
  };
  out.subDevice = Boolean(out.cid && out.parent);
  out.needsKey = !out.key && !out.subDevice;
  return out;
}

function parseImport(text) {
  let data = text;
  if (typeof text === 'string' || Buffer.isBuffer(text)) {
    try { data = JSON.parse(String(text)); } catch (_e) { return { devices: [], error: 'invalid_json' }; }
  }
  const list = Array.isArray(data) ? data : Array.isArray(data && data.devices) ? data.devices : Array.isArray(data && data.result) ? data.result : [];
  const seen = new Set(); const devices = [];
  for (const raw of list.slice(0, 1000)) {
    const d = normalizeEntry(raw);
    if (!d || seen.has(d.id)) {continue;}
    seen.add(d.id); devices.push(d);
  }
  // Sub-devices inherit the gateway key/ip/version (they talk through the parent's socket).
  const byId = new Map(devices.map((d) => [d.id, d]));
  for (const d of devices) {
    if (!d.subDevice) {continue;}
    const gw = byId.get(d.parent);
    if (gw) {d.gateway = { id: gw.id, key: gw.key, ip: gw.ip, version: gw.version };}
  }
  return { devices, error: null };
}

module.exports = { parseImport, normalizeEntry };
