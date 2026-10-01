'use strict';

/**
 * P2773 — generic "Set a device setting" Flow action (app-level card
 * `device_set_setting`). Lets Flows change common device settings
 * (sensitivity, delays, thresholds, …) without opening the device page.
 *
 * - Only editable manifest settings are offered (number / checkbox / dropdown / text);
 *   read-only labels and internal identity fields are never writable.
 * - The value is coerced to the setting type (and clamped for numbers).
 * - After setSettings() the device's onSettings() is invoked with the changed key,
 *   because Homey does not call onSettings for programmatic changes; this is what
 *   actually pushes the new value to the physical device.
 * Lead: docs/automation/leads-other-apps.md "Settings as flow cards".
 */

const EDITABLE_TYPES = new Set(['number', 'checkbox', 'dropdown', 'text', 'textarea']);
const BLOCKED_KEY = /^(zb_|energy_value_|device_id$|local_key$|ip$|protocol_version$)/i;

function flattenSettings(list, out = []) {
  for (const s of Array.isArray(list) ? list : []) {
    if (!s || typeof s !== 'object') {continue;}
    if (s.type === 'group' && Array.isArray(s.children)) { flattenSettings(s.children, out); continue; }
    if (s.id && EDITABLE_TYPES.has(s.type)) {out.push(s);}
  }
  return out;
}

function editableSettings(device) {
  let manifest = [];
  try { manifest = device?.driver?.manifest?.settings || []; } catch (_e) { manifest = []; }
  return flattenSettings(manifest).filter((s) => !BLOCKED_KEY.test(s.id));
}

function labelOf(s) {
  const l = s.label;
  if (!l) {return s.id;}
  return typeof l === 'string' ? l : l.en || Object.values(l)[0] || s.id;
}

function autocomplete(device, query = '') {
  const q = String(query || '').toLowerCase();
  return editableSettings(device)
    .map((s) => ({ name: labelOf(s), description: s.id, id: s.id }))
    .filter((r) => !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q))
    .slice(0, 50);
}

/** Coerce a text value to the setting type. Throws on invalid input. */
function coerce(setting, raw) {
  const str = String(raw ?? '').trim();
  switch (setting.type) {
  case 'checkbox': {
    if (/^(true|1|on|yes|oui|ja)$/i.test(str)) {return true;}
    if (/^(false|0|off|no|non|nee|nein)$/i.test(str)) {return false;}
    throw new Error(`"${str}" is not a boolean (use true/false)`);
  }
  case 'number': {
    const n = Number(str.replace(',', '.'));
    if (!Number.isFinite(n)) {throw new Error(`"${str}" is not a number`);}
    let v = n;
    const min = setting.min ?? setting.attr?.min;
    const max = setting.max ?? setting.attr?.max;
    if (typeof min === 'number') {v = Math.max(min, v);}
    if (typeof max === 'number') {v = Math.min(max, v);}
    return v;
  }
  case 'dropdown': {
    const vals = (setting.values || []).map((x) => x && x.id).filter((x) => x !== undefined);
    const hit = vals.find((id) => String(id).toLowerCase() === str.toLowerCase());
    if (hit === undefined) {throw new Error(`"${str}" is not one of: ${vals.join(', ')}`);}
    return hit;
  }
  default:
    return str;
  }
}

async function apply(device, settingId, rawValue) {
  if (!device || typeof device.setSettings !== 'function') {throw new Error('Device not available');}
  const id = typeof settingId === 'object' && settingId ? settingId.id : settingId;
  const setting = editableSettings(device).find((s) => s.id === id);
  if (!setting) {throw new Error(`Setting "${id}" is not editable on this device`);}
  const value = coerce(setting, rawValue);
  const oldSettings = { ...device.getSettings?.() || {} };
  if (oldSettings[id] === value) {return { changed: false, value };}
  await device.setSettings({ [id]: value });
  if (typeof device.onSettings === 'function') {
    const newSettings = { ...oldSettings, [id]: value };
    await device.onSettings({ oldSettings, newSettings, changedKeys: [id] });
  }
  return { changed: true, value };
}

module.exports = { editableSettings, autocomplete, coerce, apply, flattenSettings };
