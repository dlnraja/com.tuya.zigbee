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

const MESSAGES = {
  not_available: { en: 'Device not available', fr: 'Appareil indisponible', nl: 'Apparaat niet beschikbaar', de: 'Gerät nicht verfügbar' },
  not_editable: { en: 'Setting "{id}" cannot be changed on this device', fr: 'Le réglage « {id} » ne peut pas être modifié sur cet appareil', nl: 'Instelling "{id}" kan op dit apparaat niet worden gewijzigd', de: 'Die Einstellung „{id}“ kann auf diesem Gerät nicht geändert werden' },
  not_boolean: { en: '"{v}" is not valid: use true or false', fr: '« {v} » n\'est pas valide : utilisez true ou false', nl: '"{v}" is ongeldig: gebruik true of false', de: '„{v}“ ist ungültig: true oder false verwenden' },
  not_number: { en: '"{v}" is not a number', fr: '« {v} » n\'est pas un nombre', nl: '"{v}" is geen getal', de: '„{v}“ ist keine Zahl' },
  out_of_range: { en: '{v} is outside the allowed range {min} to {max}', fr: '{v} est hors de la plage autorisée {min} à {max}', nl: '{v} valt buiten het toegestane bereik {min} tot {max}', de: '{v} liegt außerhalb des erlaubten Bereichs {min} bis {max}' },
  not_option: { en: '"{v}" is not one of: {list}', fr: '« {v} » ne fait pas partie de : {list}', nl: '"{v}" is niet een van: {list}', de: '„{v}“ ist keine der Optionen: {list}' },
};

/** Error carrying a message key + params so the Flow shows a localized text. */
class SettingError extends Error {
  constructor(code, params = {}, lang = 'en') {
    super(localize(code, params, lang));
    this.code = code;
    this.params = params;
  }
}

function localize(code, params = {}, lang = 'en') {
  const m = MESSAGES[code] || { en: code };
  let t = m[lang] || m.en;
  for (const [k, v] of Object.entries(params)) {t = t.split(`{${k}}`).join(String(v));}
  return t;
}

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
function coerce(setting, raw, lang = 'en') {
  const str = String(raw ?? '').trim();
  switch (setting.type) {
  case 'checkbox': {
    if (/^(true|1|on|yes|oui|ja)$/i.test(str)) {return true;}
    if (/^(false|0|off|no|non|nee|nein)$/i.test(str)) {return false;}
    throw new SettingError('not_boolean', { v: str }, lang);
  }
  case 'number': {
    const n = Number(str.replace(',', '.'));
    if (str === '' || !Number.isFinite(n)) {throw new SettingError('not_number', { v: str }, lang);}
    const min = setting.min ?? setting.attr?.min;
    const max = setting.max ?? setting.attr?.max;
    // P2774: out-of-range is an explicit error (no silent clamping)
    if ((typeof min === 'number' && n < min) || (typeof max === 'number' && n > max)) {
      throw new SettingError('out_of_range', { v: n, min: typeof min === 'number' ? min : '-∞', max: typeof max === 'number' ? max : '+∞' }, lang);
    }
    return n;
  }
  case 'dropdown': {
    const vals = (setting.values || []).map((x) => x && x.id).filter((x) => x !== undefined);
    const hit = vals.find((id) => String(id).toLowerCase() === str.toLowerCase());
    if (hit === undefined) {throw new SettingError('not_option', { v: str, list: vals.join(', ') }, lang);}
    return hit;
  }
  default:
    return str;
  }
}

async function apply(device, settingId, rawValue, lang = 'en') {
  if (!device || typeof device.setSettings !== 'function') {throw new SettingError('not_available', {}, lang);}
  const id = typeof settingId === 'object' && settingId ? settingId.id : settingId;
  const setting = editableSettings(device).find((s) => s.id === id);
  if (!setting) {throw new SettingError('not_editable', { id }, lang);}
  const value = coerce(setting, rawValue, lang);
  const oldSettings = { ...device.getSettings?.() || {} };
  if (oldSettings[id] === value) {return { changed: false, value };}
  await device.setSettings({ [id]: value });
  if (typeof device.onSettings === 'function') {
    const newSettings = { ...oldSettings, [id]: value };
    await device.onSettings({ oldSettings, newSettings, changedKeys: [id] });
  }
  return { changed: true, value };
}

module.exports = { editableSettings, autocomplete, coerce, apply, flattenSettings, localize, SettingError, MESSAGES };
