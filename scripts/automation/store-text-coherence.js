#!/usr/bin/env node
'use strict';
/**
 * P3363 - store-text coherence: app descriptions, driver names, flow-card titles.
 *
 * Deterministic, id-preserving. Titles and names may change; published driver, flow-card
 * and capability ids and zigbee couples never do.
 *
 *   node scripts/automation/store-text-coherence.js [--root DIR] [--check|--fix] [--report FILE]
 */
const fs = require('fs');
const path = require('path');

const NAME_LOCALES = ['en', 'fr', 'nl', 'de', 'it', 'sv', 'no', 'es', 'da'];

let NAME_FALLBACKS = null;
function nameFallbacks() {
  if (NAME_FALLBACKS) return NAME_FALLBACKS;
  NAME_FALLBACKS = {};
  const p = path.join(__dirname, '..', '..', 'config', 'architecture', 'store-text-names-ssot.json');
  if (!fs.existsSync(p)) return NAME_FALLBACKS;
  try { NAME_FALLBACKS = (readJson(p).names) || {}; } catch (_e) { NAME_FALLBACKS = {}; }
  return NAME_FALLBACKS;
}


const ACCENT_WORDS = [
  // [unaccented whole word, accented Latin-1 replacement]
  ['privee', 'priv\u00E9e'],
  ['prive', 'priv\u00E9'],
  ['fiabilite', 'fiabilit\u00E9'],
  ['humidite', 'humidit\u00E9'],
  ['electricite', 'electricit\u00E9'.replace('electricit', '\u00E9lectricit')],
  ['eclairage', '\u00E9clairage'],
  ['eclairages', '\u00E9clairages'],
  ['eclairement', '\u00E9clairement'],
  ['controleur', 'contr\u00F4leur'],
  ['Controleur', 'Contr\u00F4leur'],
  ['controle', 'contr\u00F4le'],
  ['Controle', 'Contr\u00F4le'],
  ['reglage', 'r\u00E9glage'],
  ['reglages', 'r\u00E9glages'],
  ['deja', 'd\u00E9j\u00E0'],
  ['fenetre', 'fen\u00EAtre'],
  ['fenetres', 'fen\u00EAtres'],
  ['memes', 'm\u00EAmes'],
  ['meme', 'm\u00EAme'],
  ['qualite', 'qualit\u00E9'],
  ['securite', 's\u00E9curit\u00E9'],
  ['generale', 'g\u00E9n\u00E9rale'],
  ['elevee', '\u00E9lev\u00E9e'],
  ['eleve', '\u00E9lev\u00E9'],
  ['depot', 'd\u00E9p\u00F4t'],
  ['relache', 'rel\u00E2ch\u00E9'],
  ['Relache', 'Rel\u00E2ch\u00E9'],
];
// Fix electricite replacement: I mixed it. Use explicit escape.
ACCENT_WORDS[4][1] = '\u00E9lectricit\u00E9';

const ACCENT_FIX_RE = new RegExp('\\b(' + ACCENT_WORDS.map((p) => p[0]).join('|') + ')\\b', 'g');
const ACCENT_MAP = Object.fromEntries(ACCENT_WORDS);

function accentText(s) {
  return String(s || '')
    .replace(/jamais linverse/g, 'jamais l\'inverse')
    .replace(/jamais l inverse/g, 'jamais l\'inverse')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2026/g, '...')
    .replace(ACCENT_FIX_RE, (w) => ACCENT_MAP[w] || w);
}

// English leftover words that should not appear in a French title/name.
const EN_IN_FR = /\b(Physical|without|metering|Monitor|Dimmer|Leak|Smart Plug|Wall Dimmer|Water Leak|Energy Monitor|Button on|Button off|Released|Pressed|Brightness|Temperature changed|Humidity changed)\b/;
// French-only tokens that should not appear alone in an English title.
const FR_IN_EN = /\b(chang\u00E9e?|allum\u00E9e?|\u00E9teinte?|appuy\u00E9|batterie|capteur|interrupteur|t\u00E9l\u00E9commande|luminosit\u00E9|sc\u00E8ne|voie)\b/i;

const DRIVER_NAME_REMAP = {
  button_wireless_4_ts0041: {
    en: '4-button wireless remote (TS0041)',
    fr: 'Contr\u00F4leur sans fil 4 boutons (TS0041)',
    nl: 'Draadloze 4-knops afstandsbediening (TS0041)',
    de: 'Drahtlose 4-Tasten-Fernbedienung (TS0041)',
  },
  smart_knob: {
    en: 'Smart rotary knob (TS004F)',
    fr: 'Bouton rotatif intelligent (TS004F)',
    nl: 'Slimme draaiknop (TS004F)',
    de: 'Intelligenter Drehknopf (TS004F)',
  },
  smart_knob_rotary: {
    en: 'Smart rotary knob / scene switch',
    fr: 'Bouton rotatif et interrupteur de sc\u00E8nes',
    nl: 'Slimme draaiknop / sceneschakelaar',
    de: 'Intelligenter Drehknopf / Szenenschalter',
  },
  plug_energy_monitor: {
    en: 'Energy-monitoring plug',
    fr: 'Prise avec suivi d\'\u00E9nergie',
    nl: 'Stekker met energiestand',
    de: 'Steckdose mit Energiemessung',
  },
  plug: {
    en: 'Smart plug (no metering)',
    fr: 'Prise connect\u00E9e sans mesure',
    nl: 'Slimme stekker (zonder meting)',
    de: 'Intelligente Steckdose (ohne Messung)',
  },
  wall_dimmer_tuya: {
    en: 'Wall dimmer',
    fr: 'Variateur mural',
    nl: 'Muurdimmer',
    de: 'Wanddimmer',
  },
  water_leak_sensor: {
    en: 'Water leak sensor',
    fr: 'Capteur de fuite d\'eau',
    nl: 'Waterlek-sensor',
    de: 'Wasserlecksensor',
  },
  water_leak_sensor_tuya: {
    en: 'Water leak sensor (Tuya)',
    fr: 'Capteur de fuite d\'eau (Tuya)',
    nl: 'Waterlek-sensor (Tuya)',
    de: 'Wasserlecksensor (Tuya)',
  },
  air_purifier_contact: { en: 'Air purifier (contact)', fr: 'Purificateur d\'air (contact)' },
  air_purifier_dimmer: { en: 'Air purifier dimmer', fr: 'Variateur de purificateur d\'air' },
  air_quality_comprehensive: { en: 'Comprehensive air monitor', fr: 'Moniteur d\'air complet' },
  bulb_dimmable: { en: 'Dimmable smart bulb', fr: 'Ampoule connect\u00E9e variable' },
  bulb_rgb: { en: 'RGB smart bulb', fr: 'Ampoule connect\u00E9e RVB' },
  bulb_white: { en: 'White smart bulb', fr: 'Ampoule connect\u00E9e blanche' },
  button_emergency_sos: { en: 'SOS emergency button', fr: 'Bouton d\'urgence SOS' },
  door_controller: { en: 'Door controller', fr: 'Contr\u00F4leur de porte' },
  gas_sensor: { en: 'Gas sensor (TS0601)', fr: 'Capteur de gaz (TS0601)' },
  gas_sensor_switch: { en: 'Gas sensor switch', fr: 'Interrupteur de capteur de gaz' },
  lock_smart: { en: 'Smart lock', fr: 'Serrure connect\u00E9e' },
  module_mini_switch: { en: 'Mini switch', fr: 'Mini-interrupteur' },
  remote_button_wireless_fingerbot: { en: 'Wireless Fingerbot button', fr: 'Bouton Fingerbot sans fil' },
  shutter_roller_controller: { en: 'Roller shutter controller', fr: 'Contr\u00F4leur de volet roulant' },
  smoke_detector_advanced: { en: 'Advanced smoke detector', fr: 'D\u00E9tecteur de fum\u00E9e avanc\u00E9' },
  switch_wall: { en: 'Wall switch', fr: 'Interrupteur mural' },
  switch_wall_5gang: { en: '5-gang wall switch', fr: 'Interrupteur mural 5 voies' },
  switch_wireless: { en: 'Wireless switch', fr: 'Interrupteur sans fil' },
  water_valve_smart: { en: 'Smart water valve', fr: 'Vanne d\'eau intelligente' },
  dimmer_air_purifier: { en: 'Dimmer for an air purifier', fr: 'Variateur pour purificateur d\'air' },
  dimmer_bulb_dimmable: { en: 'Dimmable bulb dimmer', fr: 'Variateur d\'ampoule' },
  dimmer_wall_1gang: { en: '1-gang wall dimmer', fr: 'Variateur mural 1 voie' },
  dimmer_wall_plug: { en: 'Wall-plug dimmer', fr: 'Variateur sur prise murale' },
  climate_sensor_dimmer: { en: 'Climate sensor dimmer', fr: 'Variateur de capteur climatique' },
  contact_sensor_dimmer: { en: 'Contact sensor dimmer', fr: 'Variateur de capteur de contact' },
  contact_sensor_plug: { en: 'Contact sensor plug', fr: 'Prise de capteur de contact' },
  sensor_contact_plug: { en: 'Contact sensor on a plug', fr: 'Capteur de contact sur prise' },
  sensor_contact_climate: { en: 'Contact and climate sensor', fr: 'Capteur de contact et climat' },
  sensor_lcdtemphumidsensor_temphumidsensor: {
    en: 'LCD temperature and humidity sensor',
    fr: 'Capteur LCD de temp\u00E9rature et d\'humidit\u00E9',
  },
};

// Built-in Homey capability trigger titles that custom cards must not copy.
const BUILTIN_FR = new Set([
  'Le niveau de la batterie a chang\u00E9',
  'La temp\u00E9rature a chang\u00E9',
  'L\'humidit\u00E9 a chang\u00E9',
  'La luminance a chang\u00E9',
  'La puissance a chang\u00E9',
  'L\'\u00E9nergie a chang\u00E9',
  'Le voltage a chang\u00E9',
  'Le courant \u00E9lectrique a chang\u00E9',
  'Le compteur \u00E9lectrique a chang\u00E9',
  'L\'intensit\u00E9 lumineuse a chang\u00E9',
  'L\'\u00E9tat a \u00E9t\u00E9 modifi\u00E9',
  'La position a chang\u00E9',
  'La position d\'inclinaison a chang\u00E9',
]);
const BUILTIN_EN = new Set([
  'The battery level changed',
  'The temperature changed',
  'The humidity changed',
  'The luminance changed',
  'The power changed',
  'The energy changed',
  'The voltage changed',
  'The electric current changed',
  'The power meter changed',
  'The brightness changed',
  'The state has been changed',
  'The position changed',
  'The tilt position changed',
]);

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n'); }

function walkDrivers(root) {
  const dir = path.join(root, 'drivers');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((id) => {
    try { return fs.statSync(path.join(dir, id)).isDirectory() && !id.startsWith('.'); } catch (_e) { return false; }
  }).sort();
}

function loadCompose(root, id) {
  const p = path.join(root, 'drivers', id, 'driver.compose.json');
  if (!fs.existsSync(p)) return { path: p, json: null };
  return { path: p, json: readJson(p) };
}

function loadFlow(root, id) {
  const p = path.join(root, 'drivers', id, 'driver.flow.compose.json');
  if (!fs.existsSync(p)) return { path: p, json: null };
  return { path: p, json: readJson(p) };
}

function productHint(compose) {
  const z = (compose && compose.zigbee) || {};
  const pids = [].concat(z.productId || []).filter(Boolean);
  const pref = pids.find((x) => /^TS\d+/i.test(String(x))) || pids[0];
  return pref ? String(pref) : '';
}

function applyNameRemap(id, names, compose) {
  const out = { ...(names || {}) };
  let changed = false;
  const src = DRIVER_NAME_REMAP[id];
  if (src) {
    for (const loc of Object.keys(src)) {
      if (out[loc] !== src[loc]) { out[loc] = src[loc]; changed = true; }
    }
  } else if (!out.fr && nameFallbacks()[id] && nameFallbacks()[id].fr) {
    out.fr = nameFallbacks()[id].fr;
    if (!out.en && nameFallbacks()[id].en) out.en = nameFallbacks()[id].en;
    changed = true;
  }
  if (out.fr) {
    const acc = accentText(out.fr);
    if (acc !== out.fr) { out.fr = acc; changed = true; }
  }
  return { names: out, changed };
}

function uniqueify(entries) {
  // entries: [{id, names}]
  const byLoc = {};
  for (const loc of ['en', 'fr']) {
    const map = {};
    for (const e of entries) {
      const n = (e.names && e.names[loc]) || '';
      if (!n) continue;
      (map[n] || (map[n] = [])).push(e);
    }
    byLoc[loc] = map;
  }
  const changes = [];
  for (const loc of ['en', 'fr']) {
    for (const [title, group] of Object.entries(byLoc[loc])) {
      if (group.length < 2) continue;
      for (const e of group) {
        const used = new Set(group.map((x) => x.names[loc]));
        const hint = (e.hint && group.filter((x) => x.hint === e.hint).length === 1)
          ? e.hint
          : e.id.replace(/_/g, ' ');
        const suffix = ' (' + hint + ')';
        if (title.includes(hint)) continue;
        const next = title + suffix;
        if (used.has(next)) continue;
        if (e.names[loc] === next) continue;
        e.names[loc] = next;
        e.changed = true;
        changes.push({ id: e.id, loc, from: title, to: next });
      }
    }
  }
  return changes;
}

function patchTitleMap(map, patcher) {
  if (!map) return { map, changed: false };
  if (typeof map === 'string') {
    const n = patcher({ en: map }).en;
    return n !== map ? { map: n, changed: true } : { map, changed: false };
  }
  if (typeof map !== 'object') return { map, changed: false };
  const out = { ...map };
  let changed = false;
  const patched = patcher(out);
  for (const k of Object.keys(patched)) {
    if (out[k] !== patched[k]) { out[k] = patched[k]; changed = true; }
  }
  return { map: out, changed };
}

function titlePatcher(cardId, kind) {
  return function patch(titles) {
    const out = { ...titles };
    const fr = out.fr || '';
    const en = out.en || '';

    if (fr === 'Physical button on' || en === 'Physical button on' && (!fr || fr === en)) {
      out.fr = 'Bouton physique allum\u00E9';
      if (!out.en || out.en === 'Physical button on') out.en = 'Physical button on';
    }
    if (fr === 'Physical button off' || en === 'Physical button off' && (!fr || fr === en)) {
      out.fr = 'Bouton physique \u00E9teint';
    }

    const gangOn = /^(?:Physique gang |Physical gang )?(\d+) ON$/i.exec(fr)
      || /^Physique gang (\d+) ON$/i.exec(fr);
    if (/^Physique gang (\d+) ON$/i.test(fr) || /^Physical gang (\d+) ON$/i.test(fr)) {
      const n = (fr.match(/(\d+)/) || [])[1];
      if (n) out.fr = `Voie ${n} allum\u00E9e physiquement`;
    }
    if (/^Physique gang (\d+) OFF$/i.test(fr) || /^Physical gang (\d+) OFF$/i.test(fr)) {
      const n = (fr.match(/(\d+)/) || [])[1];
      if (n) out.fr = `Voie ${n} \u00E9teinte physiquement`;
    }
    if (fr === 'Physique ON' || fr === 'Physical ON') out.fr = 'Allum\u00E9 physiquement';
    if (fr === 'Physique OFF' || fr === 'Physical OFF') out.fr = '\u00C9teint physiquement';
    if (/^Gang (\d+) allum\u00E9$/.test(fr)) out.fr = fr.replace(/^Gang (\d+) allum\u00E9$/, 'Voie $1 allum\u00E9e');
    if (/^Gang (\d+) \u00E9teint$/.test(fr)) out.fr = fr.replace(/^Gang (\d+) \u00E9teint$/, 'Voie $1 \u00E9teinte');
    if (/^Gang (\d+) allum\u00E9e$/.test(fr)) out.fr = fr.replace(/^Gang /, 'Voie ');

    if (out.fr) {
      out.fr = out.fr.replace(/\bGang (\d+)\b/g, 'Voie $1');
      out.fr = accentText(out.fr);
    }

    // Custom cards that copy a built-in capability title get a distinct "report" wording.
    const looksBuiltinFr = BUILTIN_FR.has(out.fr);
    const looksBuiltinEn = BUILTIN_EN.has(out.en);
    const isCustomMeasure = /_measure_(battery|temperature|humidity|luminance|power|voltage|current)_changed$|_meter_power_changed$/.test(cardId)
      || /_(battery|temp|temperature|humidity|luminance|power)_changed$/.test(cardId);
    if ((looksBuiltinFr || looksBuiltinEn) && isCustomMeasure) {
      if (looksBuiltinEn || out.en) {
        out.en = (out.en || 'Value changed').replace(/^The /i, '').replace(/ changed$/i, ' changed (report)');
        if (!/report/.test(out.en)) out.en = `${out.en} (report)`;
      }
      if (looksBuiltinFr || out.fr) {
        const base = (out.fr || '').replace(/^La |^Le |^L'/, '').replace(/ a chang\u00E9$/, '');
        out.fr = base ? `${base.charAt(0).toUpperCase()}${base.slice(1)} chang\u00E9 (rapport)` : 'Valeur chang\u00E9e (rapport)';
      }
    }
    return out;
  };
}

function tokenHint(id, others) {
  const parts = String(id).split('_').filter((t) => t && !/^[0-9a-f]{4,}$/.test(t));
  const otherParts = others.flatMap((o) => String(o).split('_'));
  const uniq = parts.filter((t) => otherParts.filter((x) => x === t).length === 1);
  const use = (uniq.length ? uniq : parts.slice(-3)).filter((t) => !/^(the|and|a)$/i.test(t));
  return use.slice(-4).join(' ').replace(/\s+/g, ' ').trim();
}

function disambiguateFlowDuplicates(flow) {
  const changes = [];
  if (!flow || typeof flow !== 'object') return changes;
  for (const kind of ['triggers', 'conditions', 'actions']) {
    const arr = flow[kind];
    if (!Array.isArray(arr)) continue;
    for (const loc of ['en', 'fr']) {
      const seen = {};
      for (const card of arr) {
        if (!card || !card.id || !card.title) continue;
        const title = typeof card.title === 'object' ? card.title[loc] : (loc === 'en' ? card.title : '');
        if (!title) continue;
        (seen[title] || (seen[title] = [])).push(card);
      }
      for (const [title, cards] of Object.entries(seen)) {
        if (cards.length < 2) continue;
        const ranked = [...cards].sort((a, b) => {
          const hx = (id) => /__[0-9a-f]{4,}$/.test(id) ? 1 : 0;
          return hx(a.id) - hx(b.id) || a.id.length - b.id.length;
        });
        const used = new Set([title]);
        for (let i = 0; i < ranked.length; i++) {
          const card = ranked[i];
          if (typeof card.title !== 'object') continue;
          if (i === 0) continue; // keep the shortest/cleanest title
          const hint = tokenHint(card.id, ranked.filter((c) => c !== card).map((c) => c.id)) || String(i + 1);
          let next = title.includes(hint) ? title + ' (' + (i + 1) + ')' : title + ' (' + hint + ')';
          let n = 2;
          while (used.has(next)) { next = title + ' (' + hint + ' ' + n + ')'; n++; }
          used.add(next);
          const prev = card.title[loc];
          card.title[loc] = next;
          if (card.titleFormatted && typeof card.titleFormatted === 'object' && card.titleFormatted[loc] === prev) {
            card.titleFormatted[loc] = next;
          }
          changes.push({ id: card.id, loc, from: title, to: next });
        }
      }
    }
  }
  return changes;
}


function disambiguateCrossKind(flow) {
  const changes = [];
  if (!flow || typeof flow !== 'object') return changes;
  const cards = collectFlowCards(flow);
  for (const loc of ['en', 'fr']) {
    const seen = {};
    for (const { kind, card } of cards) {
      if (!card || !card.id || typeof card.title !== 'object') continue;
      const title = card.title[loc];
      if (!title) continue;
      (seen[title] || (seen[title] = [])).push({ kind, card });
    }
    for (const [title, group] of Object.entries(seen)) {
      if (group.length < 2) continue;
      const kinds = new Set(group.map((g) => g.kind));
      if (kinds.size < 2) continue;
      for (const g of group) {
        if (g.kind === 'triggers') continue;
        const tag = loc === 'fr' ? (g.kind === 'conditions' ? 'etat' : 'action') : (g.kind === 'conditions' ? 'state' : 'action');
        // "etat" without accent in source; write accented via escape in fr
        const label = loc === 'fr' ? (g.kind === 'conditions' ? 'état' : 'action') : tag;
        const next = title + ' (' + label + ')';
        const prev = g.card.title[loc];
        if (prev === next) continue;
        g.card.title[loc] = next;
        if (g.card.titleFormatted && typeof g.card.titleFormatted === 'object' && g.card.titleFormatted[loc] === prev) {
          g.card.titleFormatted[loc] = next;
        }
        changes.push({ id: g.card.id, loc, from: title, to: next });
      }
    }
  }
  return changes;
}

function collectFlowCards(flow) {
  const out = [];
  if (!flow || typeof flow !== 'object') return out;
  for (const kind of ['triggers', 'conditions', 'actions']) {
    for (const card of flow[kind] || []) {
      if (card && card.id) out.push({ kind, card });
    }
  }
  return out;
}

function descFiles(root) {
  const files = [];
  for (const rel of ['.homeycompose/app.json', 'README.txt', 'README.fr.txt', 'README.de.txt', 'README.nl.txt']) {
    const p = path.join(root, rel);
    if (fs.existsSync(p)) files.push({ rel, path: p });
  }
  return files;
}

function fixDescriptionJson(obj) {
  let changed = false;
  const desc = obj && obj.description;
  if (desc && typeof desc === 'object') {
    for (const loc of Object.keys(desc)) {
      if (typeof desc[loc] !== 'string') continue;
      const n = accentText(desc[loc]);
      if (n !== desc[loc]) { desc[loc] = n; changed = true; }
    }
  } else if (typeof desc === 'string') {
    const n = accentText(desc);
    if (n !== desc) { obj.description = n; changed = true; }
  }
  return changed;
}

function audit(root) {
  const findings = [];
  let renamedNames = 0;
  let dupNameGroups = 0;
  let missingFrNames = 0;
  let enInFrNames = 0;
  let accentHits = 0;
  let flowDupGroups = 0;
  let untranslated = 0;

  for (const f of descFiles(root)) {
    const raw = fs.readFileSync(f.path, 'utf8');
    if (f.rel.endsWith('.json')) {
      const j = JSON.parse(raw);
      const blob = JSON.stringify(j.description || '');
      if (/privee|fiabilite|linverse|prive\b/.test(blob)) {
        findings.push({ code: 'missing-accent', where: f.rel, sample: blob.slice(0, 180) });
        accentHits++;
      }
    } else if (/privee|fiabilite|linverse/.test(raw)) {
      findings.push({ code: 'missing-accent', where: f.rel });
      accentHits++;
    }
  }

  const nameEntries = [];
  for (const id of walkDrivers(root)) {
    const { json } = loadCompose(root, id);
    if (!json || !json.name) continue;
    const names = typeof json.name === 'object' ? json.name : { en: json.name };
    if (!names.fr) { missingFrNames++; findings.push({ code: 'missing-fr-name', id }); }
    if (names.fr && EN_IN_FR.test(names.fr)) { enInFrNames++; findings.push({ code: 'en-in-fr-name', id, fr: names.fr }); }
    if (names.en && FR_IN_EN.test(names.en)) findings.push({ code: 'fr-in-en-name', id, en: names.en });
    if (names.fr && names.fr !== accentText(names.fr)) { accentHits++; findings.push({ code: 'missing-accent', where: `drivers/${id}/name.fr` }); }
    nameEntries.push({ id, names, hint: productHint(json) });

    const flow = loadFlow(root, id).json;
    const cards = collectFlowCards(flow);
    for (const loc of ['en', 'fr']) {
      const seen = {};
      for (const { card } of cards) {
        const t = card.title && (typeof card.title === 'object' ? card.title[loc] : card.title);
        if (!t || typeof t !== 'string') continue;
        (seen[t] || (seen[t] = [])).push(card.id);
        if (loc === 'fr' && (t === 'Physical button on' || t === 'Physical button off' || /^Physique gang /.test(t) || /^Gang \d+ /.test(t))) {
          untranslated++;
          findings.push({ code: 'wrong-language-or-wording', id, card: card.id, title: t });
        }
        if (loc === 'fr' && t !== accentText(t)) {
          accentHits++;
          findings.push({ code: 'missing-accent', where: `${id}:${card.id}.fr` });
        }
        if (loc === 'fr' && EN_IN_FR.test(t)) {
          findings.push({ code: 'en-in-fr-title', id, card: card.id, title: t });
        }
      }
      for (const [title, ids] of Object.entries(seen)) {
        if (ids.length > 1) {
          flowDupGroups++;
          findings.push({ code: 'duplicate-title', id, loc, title, cards: ids });
        }
      }
    }
  }

  const byFr = {};
  const byEn = {};
  for (const e of nameEntries) {
    if (e.names.fr) (byFr[e.names.fr] || (byFr[e.names.fr] = [])).push(e.id);
    if (e.names.en) (byEn[e.names.en] || (byEn[e.names.en] = [])).push(e.id);
  }
  for (const [t, ids] of Object.entries(byFr)) if (ids.length > 1) {
    dupNameGroups++;
    findings.push({ code: 'duplicate-driver-name', loc: 'fr', title: t, ids });
  }
  for (const [t, ids] of Object.entries(byEn)) if (ids.length > 1) {
    dupNameGroups++;
    findings.push({ code: 'duplicate-driver-name', loc: 'en', title: t, ids });
  }

  return {
    findings,
    counts: {
      renamedNames, dupNameGroups, missingFrNames, enInFrNames, accentHits, flowDupGroups, untranslated,
      drivers: nameEntries.length, findingCount: findings.length,
    },
  };
}

function apply(root) {
  const changes = [];

  for (const f of descFiles(root)) {
    if (f.rel.endsWith('.json')) {
      const j = readJson(f.path);
      if (fixDescriptionJson(j)) {
        writeJson(f.path, j);
        changes.push({ file: f.rel, kind: 'description' });
      }
    } else {
      const raw = fs.readFileSync(f.path, 'utf8');
      const next = accentText(raw);
      if (next !== raw) {
        fs.writeFileSync(f.path, next);
        changes.push({ file: f.rel, kind: 'readme-accent' });
      }
    }
  }

  const nameEntries = [];
  for (const id of walkDrivers(root)) {
    const loaded = loadCompose(root, id);
    if (!loaded.json) continue;
    const names = typeof loaded.json.name === 'object' ? { ...loaded.json.name } : { en: loaded.json.name };
    const r = applyNameRemap(id, names, loaded.json);
    nameEntries.push({ id, path: loaded.path, json: loaded.json, names: r.names, changed: r.changed, hint: productHint(loaded.json) });
  }
  const uniq = uniqueify(nameEntries);
  for (const e of nameEntries) {
    if (!e.changed) continue;
    e.json.name = e.names;
    writeJson(e.path, e.json);
    changes.push({ file: `drivers/${e.id}/driver.compose.json`, kind: 'driver-name' });
  }

  let titleRenames = 0;
  for (const id of walkDrivers(root)) {
    const loaded = loadFlow(root, id);
    if (!loaded.json) continue;
    let fileChanged = false;
    for (const { card } of collectFlowCards(loaded.json)) {
      const patcher = titlePatcher(card.id);
      if (card.title) {
        const r = patchTitleMap(card.title, patcher);
        if (r.changed) { card.title = r.map; fileChanged = true; titleRenames++; }
      }
      if (card.titleFormatted) {
        const r = patchTitleMap(card.titleFormatted, patcher);
        if (r.changed) { card.titleFormatted = r.map; fileChanged = true; }
      }
    }
    const dups = disambiguateFlowDuplicates(loaded.json).concat(disambiguateCrossKind(loaded.json));
    if (dups.length) { fileChanged = true; titleRenames += dups.length; }
    if (fileChanged) {
      writeJson(loaded.path, loaded.json);
      changes.push({ file: `drivers/${id}/driver.flow.compose.json`, kind: 'flow-titles', titles: titleRenames });
    }
  }

  const appSync = syncAppJson(root);
  if (appSync.changed) changes.push({ file: 'app.json', kind: 'sync-names-titles' });
  return { changes, uniqueNameFixes: uniq, titleRenames, appSync };
}


const APP_JSON_BUILT_MAX = 7340032; // P2920: built manifest threshold (bytes)

function looksBuiltAppJson(raw, app) {
  if (typeof raw === 'string' && /^\s*\{\s*\n/.test(raw)) return true;
  if (typeof raw === 'string' && Buffer.byteLength(raw) > APP_JSON_BUILT_MAX) return true;
  const trig = ((app && app.flow) || {}).triggers || [];
  return trig.length > 400;
}

function readSourceAppJson(root) {
  const appPath = path.join(root, 'app.json');
  if (!fs.existsSync(appPath)) return null;
  const raw = fs.readFileSync(appPath, 'utf8');
  const app = JSON.parse(raw);
  if (!looksBuiltAppJson(raw, app)) return { appPath, app, raw, restored: false };
  let sourceRaw;
  try {
    const { execSync } = require('child_process');
    sourceRaw = execSync('git show HEAD:app.json', {
      cwd: root, maxBuffer: 20 * 1024 * 1024, encoding: 'utf8',
    });
  } catch (err) {
    throw new Error('P2920: app.json is a built manifest. Restore the compact source form (git checkout -- app.json) before syncing titles.');
  }
  const sourceApp = JSON.parse(sourceRaw);
  if (looksBuiltAppJson(sourceRaw, sourceApp)) {
    throw new Error('P2920: HEAD app.json also looks like a built manifest; cannot sync.');
  }
  return { appPath, app: sourceApp, raw: sourceRaw, restored: true };
}

function writeSourceAppJson(appPath, app) {
  const blob = JSON.stringify(app) + '\n';
  if (Buffer.byteLength(blob) > APP_JSON_BUILT_MAX) {
    throw new Error(`P2920: refusing to write app.json at ${Buffer.byteLength(blob)} bytes (built-manifest size)`);
  }
  fs.writeFileSync(appPath, blob);
  return Buffer.byteLength(blob);
}

function patchFlowTitles(targetFlow, srcFlow) {
  if (!targetFlow || !srcFlow) return false;
  const titles = {};
  for (const { kind, card } of collectFlowCards(srcFlow)) titles[`${kind}:${card.id}`] = card;
  let changed = false;
  for (const kind of ['triggers', 'conditions', 'actions']) {
    for (const card of targetFlow[kind] || []) {
      if (!card || !card.id) continue;
      const src = titles[`${kind}:${card.id}`];
      if (!src) continue;
      if (src.title && JSON.stringify(src.title) !== JSON.stringify(card.title)) {
        card.title = src.title;
        changed = true;
      }
      if (src.titleFormatted && JSON.stringify(src.titleFormatted) !== JSON.stringify(card.titleFormatted)) {
        card.titleFormatted = src.titleFormatted;
        changed = true;
      }
    }
  }
  return changed;
}

function syncAppJson(root) {
  const loaded = readSourceAppJson(root);
  if (!loaded) return { changed: false };
  const { appPath, app, restored } = loaded;
  let changed = restored;
  const composePath = path.join(root, '.homeycompose', 'app.json');
  if (fs.existsSync(composePath)) {
    const c = readJson(composePath);
    if (c.description && JSON.stringify(c.description) !== JSON.stringify(app.description)) {
      app.description = c.description;
      changed = true;
    }
  }
  const byId = new Map((app.drivers || []).map((d) => [d.id, d]));
  const appFlow = app.flow || null;
  for (const id of walkDrivers(root)) {
    const d = byId.get(id);
    if (!d) continue;
    const compose = loadCompose(root, id).json;
    if (compose && compose.name && JSON.stringify(compose.name) !== JSON.stringify(d.name)) {
      d.name = compose.name;
      changed = true;
    }
    const flow = loadFlow(root, id).json;
    if (!flow) continue;
    if (d.flow && patchFlowTitles(d.flow, flow)) changed = true;
    if (appFlow && patchFlowTitles(appFlow, flow)) changed = true;
  }
  if (changed) writeSourceAppJson(appPath, app);
  return { changed, restored: !!restored };
}

function check(root) {
  const a = audit(root);
  const fatalCodes = new Set([
    'duplicate-title', 'duplicate-driver-name', 'missing-accent',
    'wrong-language-or-wording', 'en-in-fr-name', 'en-in-fr-title', 'version-mismatch',
  ]);
  const fatal = a.findings.filter((f) => fatalCodes.has(f.code));
  return { ok: fatal.length === 0, fatal: fatal.length, ...a };
}

module.exports = {
  ACCENT_WORDS, DRIVER_NAME_REMAP, APP_JSON_BUILT_MAX, accentText, audit, apply, check,
  titlePatcher, disambiguateFlowDuplicates, uniqueify,
  looksBuiltAppJson, readSourceAppJson, writeSourceAppJson, syncAppJson,
};

if (require.main === module) {
  const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
  const root = path.resolve(arg('--root') || process.cwd());
  const report = arg('--report');
  const doFix = process.argv.includes('--fix');
  let result;
  if (doFix) {
    const applied = apply(root);
    const after = check(root);
    result = { applied, after };
    console.log(`store-text-coherence: files=${applied.changes.length} titleEdits=${applied.titleRenames} uniqueNames=${applied.uniqueNameFixes.length} remainingFatal=${after.fatal}`);
  } else {
    result = check(root);
    console.log(`store-text-coherence: findings=${result.findings.length} fatal=${result.fatal} dups=${result.counts.flowDupGroups} names=${result.counts.dupNameGroups} accents=${result.counts.accentHits}`);
    const shown = {};
    for (const f of result.findings) {
      shown[f.code] = (shown[f.code] || 0) + 1;
    }
    for (const [c, n] of Object.entries(shown)) console.log(`  ${c}: ${n}`);
  }
  if (report) fs.writeFileSync(report, JSON.stringify(result, null, 2) + '\n');
  process.exitCode = doFix ? 0 : (result.fatal ? 1 : 0);
}
