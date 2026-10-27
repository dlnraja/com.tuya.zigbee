#!/usr/bin/env node
'use strict';
/**
 * P2964 — Homey SDK v3 rules checker (data-driven).
 *
 * Every rule below is written in our own words from the official sources listed
 * in docs/knowledge/HOMEY_SDK_RULES.md (Homey Apps SDK docs, athombv/node-homey-lib
 * validator, homey CLI changelog). Facts (allowed classes, capabilities, locales…)
 * come from tools/ci/homey-sdk-rules.data.json, refreshed weekly by
 * tools/ci/homey-sdk-rules-refresh.js.
 *
 * level:   the Athom validation level where the rule starts to apply
 *          ('debug' ⊂ 'publish' ⊂ 'verified'), or 'project' for rules we add
 *          from our own Athom history.
 * enforce: 'block'  -> exit code 1 (Athom refuses at publish)
 *          'report' -> listed, never fails the gate (verified-only / advisory)
 *
 * Usage:
 *   node tools/ci/homey-sdk-rules.js                # auto: .homeybuild/app.json if present, else compose mode
 *   node tools/ci/homey-sdk-rules.js --app=path/app.json --root=.
 *   node tools/ci/homey-sdk-rules.js --compose      # root app.json + every drivers/<id>/driver.flow.compose.json
 *   options: --json  --doc (print markdown rule table)  --report-only (never exit 1)
 * Kill switch: HOMEY_SDK_RULES_DISABLED=1
 */
const fs = require('fs');
const path = require('path');

const DATA = require('./homey-sdk-rules.data.json');

const SRC = {
  lib: `https://github.com/athombv/node-homey-lib/blob/${DATA._commit || 'master'}/lib/App/index.js`,
  libCommits: 'https://github.com/athombv/node-homey-lib/commits/master',
  schema: `https://github.com/athombv/node-homey-lib/blob/${DATA._commit || 'master'}/assets/app/schema.json`,
  manifest: 'https://apps.developer.homey.app/the-basics/app/manifest',
  flow: 'https://apps.developer.homey.app/the-basics/flow',
  flowArgs: 'https://apps.developer.homey.app/the-basics/flow/arguments',
  caps: 'https://apps.developer.homey.app/the-basics/devices/capabilities',
  settings: 'https://apps.developer.homey.app/the-basics/devices/settings',
  energy: 'https://apps.developer.homey.app/the-basics/devices/energy',
  images: 'https://apps.developer.homey.app/app-store/assets',
  guidelines: 'https://apps.developer.homey.app/app-store/guidelines',
  updates: 'https://apps.developer.homey.app/app-store/updates',
  i18n: 'https://apps.developer.homey.app/the-basics/app/internationalization',
  zigbee: 'https://apps.developer.homey.app/wireless/zigbee',
  cloud: 'https://apps.developer.homey.app/guides/homey-cloud',
  perms: 'https://apps.developer.homey.app/the-basics/app/permissions',
  cli: 'https://github.com/athombv/node-homey/commits/master',
};

// ── small helpers (no dependencies) ────────────────────────────────────────
function verParts(v) {
  const m = String(v || '').match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}
function verLt(a, b) {
  const A = verParts(a); const B = verParts(b);
  if (!A || !B) return false;
  for (let i = 0; i < 3; i++) if (A[i] !== B[i]) return A[i] < B[i];
  return false;
}
function brightness(hex) {
  const m = String(hex || '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16); const g = parseInt(h.slice(2, 4), 16); const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}
function imageInfo(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(65536);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    const b = buf.subarray(0, n);
    if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
      return { type: 'png', width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    }
    if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const marker = b[i + 1];
        const len = b.readUInt16BE(i + 2);
        if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
          return { type: 'jpg', height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
        }
        i += 2 + len;
      }
      return { type: 'jpg', width: null, height: null };
    }
    return { type: 'unknown' };
  } catch (_) {
    return null;
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch (_) { /* ignore */ }
  }
}
const IMAGE_SIZES = {
  app: { small: [250, 175], large: [500, 350], xlarge: [1000, 700] },
  driver: { small: [75, 75], large: [500, 500], xlarge: [1000, 1000] },
};
const asArr = (x) => (Array.isArray(x) ? x : []);
const allCards = (app) => {
  const out = [];
  for (const type of ['triggers', 'conditions', 'actions']) {
    asArr(app.flow && app.flow[type]).forEach((card, i) => out.push({ type, card, i }));
  }
  return out;
};
function filteredArgs(card) {
  const args = asArr(card.args);
  const first = args.find((a) => {
    if (!a || a.type !== 'device' || typeof a.filter !== 'string') return false;
    const q = new URLSearchParams(a.filter);
    return q.has('driver_id') || q.has('driverId');
  });
  const list = args.filter((a) => a !== first).map((a) => a && a.name);
  if (card.droptoken && list.length) list.push('droptoken');
  return list;
}
function titleFormattedProblems(tf, names) {
  const probs = [];
  const seen = Object.fromEntries(names.map((n) => [n, 0]));
  const matches = String(tf).match(/\[\[(.*?)\]\]/g);
  if (!matches) return [`no [[arg]] at all (expected ${names.map((n) => `[[${n}]]`).join(', ')})`];
  for (const m of matches) {
    const n = m.slice(2, -2);
    if (!(n in seen)) probs.push(`unknown [[${n}]]`);
    else if (++seen[n] > 1) probs.push(`duplicate [[${n}]]`);
  }
  for (const [n, c] of Object.entries(seen)) if (c === 0) probs.push(`missing [[${n}]]`);
  return probs;
}
function walkSettings(list, fn, parent) {
  for (const s of asArr(list)) {
    fn(s, parent);
    if (s && s.type === 'group') walkSettings(s.children, fn, s);
  }
}
const appMin = (app) => (verParts(app.compatibility) ? verParts(app.compatibility).join('.') : '0.0.0');

// ── rules ──────────────────────────────────────────────────────────────────
// check(ctx) returns an array of human-readable violation strings.
const RULES = [
  // Manifest
  { id: 'SDK-M01', area: 'manifest', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.lib, title: 'App id is a reverse-domain string: at least two dot-separated parts, only letters, digits, "_", "-" and ".".',
    check: ({ app }) => (typeof app.id === 'string' && app.id.split('.').length >= 2 && /^[a-zA-Z0-9_.-]+$/.test(app.id) ? [] : [`invalid id: ${app.id}`]) },
  { id: 'SDK-M02', area: 'manifest', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.manifest, title: 'version is plain semver x.y.z; pre-release suffixes (-rc.1, -beta) are refused.',
    check: ({ app }) => (/^\d+\.\d+\.\d+$/.test(String(app.version)) ? [] : [`invalid version: ${app.version}`]) },
  { id: 'SDK-M03', area: 'manifest', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.lib, title: 'compatibility is a semver range whose minimum is at least 5.0.0 for SDK 3 apps.',
    check: ({ app }) => (verParts(app.compatibility) && !verLt(app.compatibility, '5.0.0') ? [] : [`invalid compatibility: ${app.compatibility}`]) },
  { id: 'SDK-M04', area: 'manifest', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.manifest, title: 'sdk must be 3 (older SDKs cannot be published as new versions).',
    check: ({ app }) => (app.sdk === 3 ? [] : [`sdk is ${app.sdk}`]) },
  { id: 'SDK-M05', area: 'manifest', level: 'publish', enforce: 'block', since: 'SDK3', source: SRC.manifest, title: 'category is required at publish and every entry must be one of the App Store categories.',
    check: ({ app }) => {
      if (app.category === undefined) return ['category missing'];
      return [].concat(app.category).filter((c) => !DATA.categories.includes(c)).map((c) => `invalid category: ${c}`);
    } },
  { id: 'SDK-M06', area: 'manifest', level: 'publish', enforce: 'block', since: 'SDK3', source: SRC.lib, title: 'brandColor is required at publish and must be dark enough for white icons (perceived brightness <= 184).',
    check: ({ app }) => {
      if (!app.brandColor) return ['brandColor missing'];
      const b = brightness(app.brandColor);
      if (b === null) return [`brandColor not a hex colour: ${app.brandColor}`];
      return b > 184 ? [`brandColor ${app.brandColor} too bright (${b.toFixed(1)} > 184)`] : [];
    } },
  { id: 'SDK-M07', area: 'images', level: 'publish', enforce: 'block', since: 'SDK3', source: SRC.images, title: 'App images.small (250x175) and images.large (500x350) are required, .png/.jpg/.jpeg, exist with exact case, real image bytes, exact pixel size. xlarge (1000x700) is optional and checked by SDK-M16.',
    check: (ctx) => checkImages(ctx, ctx.app.images, 'app', 'app') },
  { id: 'SDK-M08', area: 'permissions', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.perms, title: 'permissions must be known Homey permissions or homey:app:<id>; homey:app:com.athom.homeyscript is forbidden.',
    check: ({ app }) => asArr(app.permissions).filter((p) => p === 'homey:app:com.athom.homeyscript' || (!String(p).startsWith('homey:app:') && !DATA.permissions.includes(p))).map((p) => `invalid/forbidden permission: ${p}`) },
  { id: 'SDK-M09', area: 'permissions', level: 'verified', enforce: 'report', since: 'SDK3', source: SRC.lib, title: 'homey:manager:speech-input is unsupported (refused for verified); homey:manager:api triggers a longer review.',
    check: ({ app }) => asArr(app.permissions).filter((p) => p === 'homey:manager:speech-input' || p === 'homey:manager:api').map((p) => `permission ${p} needs attention`) },
  { id: 'SDK-M10', area: 'platforms', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.cloud, title: 'platforms contains only "local" and/or "cloud"; platformLocalRequiredFeatures cannot be combined with cloud.',
    check: ({ app }) => {
      const v = asArr(app.platforms).filter((p) => p !== 'local' && p !== 'cloud').map((p) => `invalid platform: ${p}`);
      if (app.platformLocalRequiredFeatures && asArr(app.platforms).includes('cloud')) v.push('platformLocalRequiredFeatures with cloud');
      return v;
    } },
  { id: 'SDK-M11', area: 'platforms', level: 'verified', enforce: 'report', since: 'SDK3', source: SRC.lib, title: 'Verified apps must declare platforms and support (https:// or mailto:).',
    check: ({ app }) => [!app.platforms && 'platforms missing', !app.support && 'support missing'].filter(Boolean) },
  { id: 'SDK-M12', area: 'manifest', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.schema, title: 'name is an i18n object with an "en" entry; author.name is required.',
    check: ({ app }) => [!(app.name && typeof app.name.en === 'string' && app.name.en) && 'name.en missing', !(app.author && app.author.name) && 'author.name missing'].filter(Boolean) },
  { id: 'SDK-M13', area: 'translations', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.i18n, title: 'Every /locales/<code>.json file uses an allowed ISO 639-1 code and parses as JSON.',
    check: ({ root }) => {
      const dir = path.join(root, 'locales');
      if (!fs.existsSync(dir)) return [];
      const v = [];
      for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
        const code = f.slice(0, -5);
        if (!DATA.locales.includes(code)) v.push(`invalid locale file: locales/${f}`);
        try { JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { v.push(`malformed locales/${f}: ${e.message}`); }
      }
      return v;
    } },
  { id: 'SDK-M14', area: 'capabilities', level: 'debug', enforce: 'block', since: 'homey-lib 2026-05-21 (titleShort) / 2026-08-27 (uiState)', source: SRC.libCommits, title: 'NEW: capability titleShort needs compatibility >=13.2.1 and uiState needs >=13.5.0, both in app capabilities and driver capabilitiesOptions.',
    check: ({ app }) => {
      const v = [];
      const min = appMin(app);
      const test = (obj, where) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj.titleShort !== undefined && verLt(min, '13.2.1')) v.push(`${where}.titleShort needs >=13.2.1`);
        if (obj.uiState !== undefined && verLt(min, '13.5.0')) v.push(`${where}.uiState needs >=13.5.0`);
      };
      for (const [id, c] of Object.entries(app.capabilities || {})) test(c, `capabilities.${id}`);
      for (const d of asArr(app.drivers)) for (const [id, o] of Object.entries(d.capabilitiesOptions || {})) test(o, `drivers.${d.id}.capabilitiesOptions.${id}`);
      return v;
    } },
  { id: 'SDK-M15', area: 'manifest', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.lib, title: 'env.json (if shipped) holds only UPPERCASE keys with string values.',
    check: ({ root }) => {
      const f = path.join(root, 'env.json');
      if (!fs.existsSync(f)) return [];
      try {
        const env = JSON.parse(fs.readFileSync(f, 'utf8'));
        return Object.entries(env).flatMap(([k, val]) => [k !== k.toUpperCase() && `env key not uppercase: ${k}`, typeof val !== 'string' && `env value not string: ${k}`].filter(Boolean));
      } catch (e) { return [`malformed env.json: ${e.message}`]; }
    } },
  { id: 'SDK-C01', area: 'capabilities', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.caps, title: 'Custom capability ids must not contain "." (reserved for sub-capabilities such as onoff.button1).',
    check: ({ app }) => Object.keys(app.capabilities || {}).filter((id) => id.includes('.')).map((id) => `custom capability id with dot: ${id}`) },

  // Drivers
  { id: 'SDK-D01', area: 'drivers', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.lib, title: 'Each driver class is a known device class and its minimum compatibility is met by the app.',
    check: ({ app }) => asArr(app.drivers).flatMap((d) => {
      if (!(d.class in DATA.classes)) return [`drivers.${d.id} invalid class ${d.class}`];
      const min = DATA.classes[d.class];
      return min && verLt(appMin(app), min) ? [`drivers.${d.id} class ${d.class} needs >=${min}`] : [];
    }) },
  { id: 'SDK-D02', area: 'capabilities', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.caps, title: 'Each driver capability (before any ".suffix") is a system capability or defined by the app; system capabilities respect their minimum compatibility.',
    check: ({ app }) => asArr(app.drivers).flatMap((d) => asArr(d.capabilities).flatMap((c) => {
      const base = String(c).split('.')[0];
      const own = app.capabilities && app.capabilities[base];
      if (!(base in DATA.capabilities) && !own) return [`drivers.${d.id} unknown capability ${c}`];
      const min = DATA.capabilities[base];
      return !own && min && verLt(appMin(app), min) ? [`drivers.${d.id} capability ${base} needs >=${min}`] : [];
    })) },
  { id: 'SDK-D03', area: 'energy', level: 'publish', enforce: 'block', since: 'SDK3', source: SRC.energy, title: 'A driver using measure_battery or alarm_battery must declare energy.batteries (array) unless it is a homeBattery or electricCar.',
    check: ({ app }) => asArr(app.drivers).filter((d) => asArr(d.capabilities).some((c) => ['measure_battery', 'alarm_battery'].includes(String(c).split('.')[0])))
      .filter((d) => !(d.energy && (Array.isArray(d.energy.batteries) || d.energy.homeBattery || d.energy.electricCar)))
      .map((d) => `drivers.${d.id} battery capability without energy.batteries`) },
  { id: 'SDK-D04', area: 'energy', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.energy, title: 'energy.batteries entries must be known battery types (CR2032, AA, AAA, INTERNAL, OTHER…).',
    check: ({ app }) => asArr(app.drivers).flatMap((d) => asArr(d.energy && d.energy.batteries).filter((b) => !DATA.batteries.includes(b)).map((b) => `drivers.${d.id} invalid battery ${b}`)) },
  { id: 'SDK-D05', area: 'energy', level: 'debug', enforce: 'block', since: 'SDK3 energy v2', source: SRC.energy, title: 'energy.cumulativeImported/ExportedCapability and meterPowerImported/ExportedCapability may only point at meter_power or meter_power.<sub>.',
    check: ({ app }) => asArr(app.drivers).flatMap((d) => ['cumulativeImportedCapability', 'cumulativeExportedCapability', 'meterPowerImportedCapability', 'meterPowerExportedCapability']
      .filter((k) => d.energy && d.energy[k] !== undefined && !/^meter_power(\.|$)/.test(String(d.energy[k])))
      .map((k) => `drivers.${d.id} energy.${k}=${d.energy[k]} is not meter_power`)) },
  { id: 'SDK-D06', area: 'energy', level: 'project', enforce: 'report', since: 'SDK3', source: SRC.energy, title: 'energy.approximation values (usageOn/usageOff/usageConstant) should be non-negative numbers in W.',
    check: ({ app }) => asArr(app.drivers).flatMap((d) => Object.entries((d.energy && d.energy.approximation) || {})
      .filter(([, val]) => typeof val !== 'number' || val < 0).map(([k, val]) => `drivers.${d.id} energy.approximation.${k}=${val}`)) },
  { id: 'SDK-D07', area: 'images', level: 'publish', enforce: 'block', since: 'SDK3', source: SRC.images, title: 'Driver images.small (75x75) and images.large (500x500) are required at publish with exact size; xlarge is checked by SDK-D20.',
    check: (ctx) => asArr(ctx.app.drivers).flatMap((d) => checkImages(ctx, d.images, 'driver', `drivers.${d.id}`)) },
  { id: 'SDK-D08', area: 'drivers', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.lib, title: 'Every driver id has a matching /drivers/<id> folder (case-sensitive).',
    check: ({ app, root, mode }) => (mode === 'fixture' ? [] : asArr(app.drivers).filter((d) => !fs.existsSync(path.join(root, 'drivers', d.id))).map((d) => `drivers/${d.id} folder missing`)) },
  { id: 'SDK-D09', area: 'capabilities', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.lib, title: 'capabilitiesOptions.<cap> must be an object.',
    check: ({ app }) => asArr(app.drivers).flatMap((d) => Object.entries(d.capabilitiesOptions || {}).filter(([, o]) => !o || typeof o !== 'object' || Array.isArray(o)).map(([k]) => `drivers.${d.id}.capabilitiesOptions.${k} not an object`)) },
  { id: 'SDK-D10', area: 'capabilities', level: 'project', enforce: 'report', since: 'SDK3', source: SRC.caps, title: 'capabilitiesOptions keys should match a capability the driver actually lists (otherwise the option is dead).',
    check: ({ app }) => asArr(app.drivers).flatMap((d) => Object.keys(d.capabilitiesOptions || {}).filter((k) => !asArr(d.capabilities).includes(k)).map((k) => `drivers.${d.id}.capabilitiesOptions.${k} unused`)) },
  { id: 'SDK-D11', area: 'settings', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.settings, title: 'Driver setting ids are strings and setting types are one of the documented types (text, password, textarea, label, number, slider, radio, dropdown, checkbox, group).',
    check: ({ app }) => {
      const v = [];
      for (const d of asArr(app.drivers)) {
        walkSettings(d.settings, (s) => {
          if (!s) return;
          if (s.type !== 'group' && typeof s.id !== 'string') v.push(`drivers.${d.id} setting without string id`);
          if (!DATA.settingTypes.includes(s.type)) v.push(`drivers.${d.id} setting ${s.id} invalid type ${s.type}`);
        });
      }
      return v;
    } },
  { id: 'SDK-D12', area: 'settings', level: 'debug', enforce: 'report', since: 'SDK3', source: SRC.lib, title: 'Setting ids should not start with reserved prefixes (homey:, zw_, zb_, mtr_, energy_, zone_…) — Homey warns.',
    check: ({ app }) => {
      const v = [];
      for (const d of asArr(app.drivers)) walkSettings(d.settings, (s) => {
        if (s && typeof s.id === 'string') { const p = DATA.reservedSettingPrefixes.find((x) => s.id.startsWith(x)); if (p) v.push(`drivers.${d.id} setting ${s.id} uses reserved prefix ${p}`); }
      });
      return v;
    } },
  { id: 'SDK-D13', area: 'settings', level: 'project', enforce: 'report', since: 'SDK3', source: SRC.settings, title: 'Setting ids are unique inside one driver (a duplicate silently shadows the other).',
    check: ({ app }) => asArr(app.drivers).flatMap((d) => {
      const seen = new Set(); const v = [];
      walkSettings(d.settings, (s) => { if (s && s.type !== 'group' && typeof s.id === 'string') { if (seen.has(s.id)) v.push(`drivers.${d.id} duplicate setting ${s.id}`); seen.add(s.id); } });
      return v;
    }) },
  { id: 'SDK-D14', area: 'platforms', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.cloud, title: 'A driver may only list platforms the app lists; cloud drivers cannot use lan, matter or rf868 connectivity.',
    check: ({ app }) => asArr(app.drivers).flatMap((d) => {
      const v = []; const ap = asArr(app.platforms);
      for (const p of asArr(d.platforms)) if (ap.length && !ap.includes(p)) v.push(`drivers.${d.id} platform ${p} not in app.platforms`);
      if (asArr(d.platforms).includes('cloud') && asArr(d.connectivity).some((c) => ['lan', 'matter', 'rf868'].includes(c))) v.push(`drivers.${d.id} cloud + ${d.connectivity}`);
      return v;
    }) },
  { id: 'SDK-D15', area: 'platforms', level: 'verified', enforce: 'report', since: 'SDK3', source: SRC.lib, title: 'Verified apps need platforms and connectivity on every driver.',
    check: ({ app }) => asArr(app.drivers).flatMap((d) => [!d.platforms && `drivers.${d.id} platforms missing`, !d.connectivity && `drivers.${d.id} connectivity missing`].filter(Boolean)) },
  { id: 'SDK-D16', area: 'zigbee', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.zigbee, title: 'Zigbee fingerprint shape: manufacturerName and productId are a non-empty string or an array of non-empty strings (an empty array is reported by SDK-D21); endpoints is an object keyed by endpoint number with clusters/bindings as arrays of integers.',
    check: ({ app }) => asArr(app.drivers).filter((d) => d.zigbee).flatMap((d) => {
      const z = d.zigbee; const v = [];
      const okIds = (x) => (typeof x === 'string' ? x.length > 0 : Array.isArray(x) && x.every((s) => typeof s === 'string' && s.length > 0));
      if (!okIds(z.manufacturerName)) v.push(`drivers.${d.id} zigbee.manufacturerName malformed`);
      if (!okIds(z.productId)) v.push(`drivers.${d.id} zigbee.productId malformed`);
      if (z.endpoints !== undefined) {
        if (!z.endpoints || typeof z.endpoints !== 'object' || Array.isArray(z.endpoints)) v.push(`drivers.${d.id} zigbee.endpoints not an object`);
        else for (const [ep, def] of Object.entries(z.endpoints)) {
          if (!/^\d+$/.test(ep)) v.push(`drivers.${d.id} endpoint key ${ep} not numeric`);
          for (const k of ['clusters', 'bindings']) if (def && def[k] !== undefined && !(Array.isArray(def[k]) && def[k].every(Number.isInteger))) v.push(`drivers.${d.id} endpoints.${ep}.${k} not integer array`);
        }
      }
      return v;
    }) },
  { id: 'SDK-D17', area: 'zigbee', level: 'project', enforce: 'report', since: 'project P2941', source: SRC.zigbee, title: 'No duplicated manufacturerName inside one driver (case-insensitive), padded forms kept verbatim.',
    check: ({ app }) => asArr(app.drivers).filter((d) => d.zigbee && Array.isArray(d.zigbee.manufacturerName)).flatMap((d) => {
      const seen = new Set(); const v = [];
      for (const m of d.zigbee.manufacturerName) { if (seen.has(m)) v.push(`drivers.${d.id} duplicate mfr ${JSON.stringify(m)}`); seen.add(m); }
      return v;
    }) },
  { id: 'SDK-D18', area: 'drivers', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.lib, title: 'driver.discovery, when a string, must name an entry of app.discovery.',
    check: ({ app }) => asArr(app.drivers).filter((d) => typeof d.discovery === 'string' && !(app.discovery && app.discovery[d.discovery])).map((d) => `drivers.${d.id} unknown discovery ${d.discovery}`) },
  { id: 'SDK-D19', area: 'drivers', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.schema, title: 'Driver ids are unique and every driver has a name.en.',
    check: ({ app }) => {
      const seen = new Set(); const v = [];
      for (const d of asArr(app.drivers)) {
        if (seen.has(d.id)) v.push(`duplicate driver id ${d.id}`);
        seen.add(d.id);
        if (!(d.name && d.name.en)) v.push(`drivers.${d.id} name.en missing`);
      }
      return v;
    } },

  { id: 'SDK-M16', area: 'images', level: 'project', enforce: 'report', since: 'SDK3', source: SRC.images, title: 'Optional app images.xlarge (1000x700), when declared, should exist and have the exact size.',
    check: (ctx) => (ctx.app.images && ctx.app.images.xlarge ? checkImages({ ...ctx, withXlarge: true }, { small: ctx.app.images.small, large: ctx.app.images.large, xlarge: ctx.app.images.xlarge }, 'app', 'app').filter((x) => x.includes('.xlarge')) : []) },
  { id: 'SDK-D20', area: 'images', level: 'project', enforce: 'report', since: 'SDK3', source: SRC.images, title: 'Optional driver images.xlarge (1000x1000), when declared, should exist and have the exact size.',
    check: (ctx) => asArr(ctx.app.drivers).filter((d) => d.images && d.images.xlarge).flatMap((d) => checkImages({ ...ctx, withXlarge: true }, d.images, 'driver', `drivers.${d.id}`).filter((x) => x.includes('.xlarge'))) },
  { id: 'SDK-D21', area: 'zigbee', level: 'project', enforce: 'report', since: 'SDK3', source: SRC.zigbee, title: 'A Zigbee driver with an empty manufacturerName or productId list can never match a device during pairing.',
    check: ({ app }) => asArr(app.drivers).filter((d) => d.zigbee && ((Array.isArray(d.zigbee.manufacturerName) && !d.zigbee.manufacturerName.length) || (Array.isArray(d.zigbee.productId) && !d.zigbee.productId.length))).map((d) => `drivers.${d.id} empty fingerprint list`) },

  // Flow
  { id: 'SDK-F01', area: 'flow', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.lib, title: 'Flow card ids are unique per type (triggers / conditions / actions), driver cards included after compose.',
    check: ({ app }) => {
      const v = []; const seen = {};
      for (const { type, card } of allCards(app)) {
        const k = `${type}:${card.id}`;
        if (seen[k]) v.push(`duplicate flow.${type} id ${card.id}`);
        seen[k] = true;
      }
      return v;
    } },
  { id: 'SDK-F02', area: 'flow', level: 'debug', enforce: 'block', since: 'SDK3 titleFormatted', source: SRC.flow, title: 'titleFormatted (every language) references each argument exactly once as [[name]], no unknown names; the implicit first device argument of a driver card is excluded; droptoken counts as an argument.',
    check: ({ app }) => {
      const v = [];
      for (const { type, card } of allCards(app)) {
        const names = filteredArgs(card);
        if (!names.length || card.titleFormatted === undefined) continue;
        const entries = typeof card.titleFormatted === 'string' ? [['*', card.titleFormatted]] : Object.entries(card.titleFormatted || {});
        for (const [lang, tf] of entries) for (const p of titleFormattedProblems(tf, names)) v.push(`flow.${type}.${card.id} titleFormatted.${lang}: ${p}`);
      }
      return v;
    } },
  { id: 'SDK-F03', area: 'flow', level: 'project', enforce: 'block', since: 'project 2026-10-10 Athom refusal', source: SRC.flowArgs, title: 'An argument is referenced as [[arg]], never as {arg}, in titleFormatted (the {arg} form got master refused on 2026-10-10). Token names in braces are left alone.',
    check: ({ app }) => {
      const v = [];
      for (const { type, card } of allCards(app)) {
        for (const key of ['titleFormatted']) {
          const val = card[key];
          const entries = typeof val === 'string' ? [['*', val]] : Object.entries(val || {});
          const names = new Set(asArr(card.args).map((a) => a && a.name));
          for (const [lang, t] of entries) {
            for (const m of String(t).match(/\{([a-zA-Z_][\w]*)\}/g) || []) if (names.has(m.slice(1, -1))) v.push(`flow.${type}.${card.id} ${key}.${lang} uses ${m} instead of [[${m.slice(1, -1)}]]`);
          }
        }
      }
      return v;
    } },
  { id: 'SDK-F04', area: 'flow', level: 'verified', enforce: 'report', since: 'SDK3', source: SRC.lib, title: 'Cards with arguments need titleFormatted (warning now, required for verified).',
    check: ({ app }) => allCards(app).filter(({ card }) => filteredArgs(card).length && card.titleFormatted === undefined).map(({ type, card }) => `flow.${type}.${card.id} titleFormatted missing`) },
  { id: 'SDK-F05', area: 'flow', level: 'verified', enforce: 'report', since: 'SDK3', source: SRC.lib, title: 'Every non-implicit argument has a title (required for verified).',
    check: ({ app }) => allCards(app).flatMap(({ type, card }) => {
      const names = new Set(filteredArgs(card));
      return asArr(card.args).filter((a) => a && names.has(a.name) && a.title === undefined).map((a) => `flow.${type}.${card.id} arg ${a.name} without title`);
    }) },
  { id: 'SDK-F06', area: 'flow', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.flowArgs, title: 'Argument types are the documented ones (text, autocomplete, number, range, date, time, dropdown, checkbox, color, device, multiselect, code); names are unique per card.',
    check: ({ app }) => allCards(app).flatMap(({ type, card }) => {
      const v = []; const seen = new Set();
      for (const a of asArr(card.args)) {
        if (!a || !DATA.flowArgTypes.includes(a.type)) v.push(`flow.${type}.${card.id} arg ${a && a.name} invalid type ${a && a.type}`);
        if (a && seen.has(a.name)) v.push(`flow.${type}.${card.id} duplicate arg ${a.name}`);
        if (a) seen.add(a.name);
      }
      return v;
    }) },
  { id: 'SDK-F07', area: 'flow', level: 'debug', enforce: 'block', since: 'homey-lib (Homey 12.5.0)', source: SRC.lib, title: 'multiselect arguments need compatibility >=12.5.0.',
    check: ({ app }) => (verLt(appMin(app), '12.5.0') ? allCards(app).flatMap(({ type, card }) => asArr(card.args).filter((a) => a && a.type === 'multiselect').map((a) => `flow.${type}.${card.id} multiselect ${a.name} needs >=12.5.0`)) : []) },
  { id: 'SDK-F08', area: 'flow', level: 'debug', enforce: 'report', since: 'SDK3', source: SRC.lib, title: 'Tokens declare a type (boolean, number, string, image); missing type defaults to string and will become mandatory.',
    check: ({ app }) => allCards(app).flatMap(({ type, card }) => asArr(card.tokens).filter((t) => !t || !DATA.tokenTypes.includes(t.type)).map((t) => `flow.${type}.${card.id} token ${t && t.name} type ${t && t.type}`)) },
  { id: 'SDK-F09', area: 'flow', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.cloud, title: 'A card platforms list may only contain platforms the app supports.',
    check: ({ app }) => allCards(app).flatMap(({ type, card }) => (app.platforms ? asArr(card.platforms).filter((p) => !app.platforms.includes(p)).map((p) => `flow.${type}.${card.id} platform ${p}`) : [])) },
  { id: 'SDK-F10', area: 'flow', level: 'debug', enforce: 'block', since: 'SDK3', source: SRC.schema, title: 'Every card has a string id and a title with an "en" entry.',
    check: ({ app }) => allCards(app).filter(({ card }) => !(card && typeof card.id === 'string' && card.id && (typeof card.title === 'string' || (card.title && card.title.en)))).map(({ type, card, i }) => `flow.${type}[${i}] ${card && card.id} id/title.en missing`) },

  // Publishing / packaging
  { id: 'SDK-P01', area: 'publishing', level: 'publish', enforce: 'block', since: 'SDK3', source: SRC.updates, title: '.homeychangelog.json is valid JSON: keys are x.y.z versions, values are i18n objects with an "en" string.',
    check: ({ root }) => {
      const f = changelogPath(root);
      if (!fs.existsSync(f)) return [];
      let j;
      try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return [`.homeychangelog.json malformed: ${e.message}`]; }
      return Object.entries(j).flatMap(([k, val]) => [!/^\d+\.\d+\.\d+$/.test(k) && `changelog key ${k} not x.y.z`, !(val && typeof val.en === 'string') && `changelog ${k} missing en`].filter(Boolean));
    } },
  { id: 'SDK-P02', area: 'publishing', level: 'project', enforce: 'report', since: 'SDK3', source: SRC.updates, title: 'The changelog should have an entry for the current version (Athom shows it as "What\'s new").',
    check: ({ app, root }) => {
      const f = changelogPath(root);
      if (!fs.existsSync(f)) return ['.homeychangelog.json missing'];
      try { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return j[app.version] ? [] : [`no changelog entry for ${app.version}`]; } catch (_) { return []; }
    } },
  { id: 'SDK-P03', area: 'publishing', level: 'publish', enforce: 'block', since: 'SDK3', source: SRC.lib, title: 'node_modules inside the built app must contain no symbolic links (npm link leftovers).',
    check: ({ root, mode }) => {
      if (mode !== 'build') return [];
      const nm = path.join(root, 'node_modules');
      try { if (fs.lstatSync(nm).isSymbolicLink()) return ['node_modules itself is a symlink']; } catch (_) { return []; }
      return fs.readdirSync(nm).filter((f) => { try { return fs.lstatSync(path.join(nm, f)).isSymbolicLink(); } catch (_) { return true; } }).map((f) => `node_modules/${f} is a symlink`);
    } },
  { id: 'SDK-P04', area: 'publishing', level: 'project', enforce: 'report', since: 'project 2026-05-31', source: 'https://github.com/dlnraja/com.tuya.zigbee/commit/97846a87a437b0d0ec7ae63d3be07536632ebe2c', title: 'Unofficial: keep the compact app.json under 5 MB (Athom processing stalls on oversized manifests in our history). No official limit is documented.',
    check: ({ appPath }) => {
      try { const size = Buffer.byteLength(JSON.stringify(JSON.parse(fs.readFileSync(appPath, 'utf8')))); return size > 5 * 1024 * 1024 ? [`compact app.json ${size} bytes > 5 MB`] : []; } catch (_) { return []; }
    } },
  { id: 'SDK-P05', area: 'publishing', level: 'project', enforce: 'report', since: 'homey-lib 2026-09-29 (e3c951e, 8887eef)', source: SRC.libCommits, title: 'NEW: .homeyignore and .gitignore are evaluated independently and "**/" now matches zero directories — a negation (!x) in one file no longer re-includes files ignored by the other.',
    check: ({ root }) => {
      const v = [];
      for (const f of ['.homeyignore', '.gitignore']) {
        const p = path.join(root, f);
        if (!fs.existsSync(p)) continue;
        const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
        lines.filter((l) => l.startsWith('!')).forEach((l) => v.push(`${f}: negation "${l}" is now scoped to ${f} only`));
      }
      return v;
    } },
  { id: 'SDK-P06', area: 'publishing', level: 'verified', enforce: 'report', since: 'Guidelines 1.3', source: SRC.guidelines, title: 'README.txt is plain text, short, without URLs or a changelog.',
    check: ({ root }) => {
      const p = path.join(root, 'README.txt');
      if (!fs.existsSync(p)) return ['README.txt missing'];
      const t = fs.readFileSync(p, 'utf8');
      return [/https?:\/\//.test(t) && 'README.txt contains URLs', /^#{1,6}\s/m.test(t) && 'README.txt contains Markdown headers'].filter(Boolean);
    } },
];

function changelogPath(root) {
  const here = path.join(root, '.homeychangelog.json');
  if (fs.existsSync(here) || path.basename(root) !== '.homeybuild') return here;
  return path.join(path.dirname(root), '.homeychangelog.json');
}

function checkImages(ctx, images, kind, where) {
  if (!images) return [`${where} images missing`];
  const v = [];
  for (const size of ['small', 'large', 'xlarge']) {
    const rel = images[size];
    if (size === 'xlarge' && !ctx.withXlarge) continue;
    if (!rel) { if (size !== 'xlarge') v.push(`${where}.images.${size} missing`); continue; }
    if (!/\.(png|jpe?g)$/i.test(rel)) { v.push(`${where}.images.${size} bad extension ${rel}`); continue; }
    if (ctx.mode === 'fixture' && !ctx.imageProbe) continue;
    const file = path.join(ctx.root, rel.replace(/^\//, ''));
    const dir = path.dirname(file);
    if (!fs.existsSync(dir) || !fs.readdirSync(dir).includes(path.basename(file))) { v.push(`${where}.images.${size} not found (case-sensitive): ${rel}`); continue; }
    const info = (ctx.imageProbe || imageInfo)(file);
    if (!info || info.type === 'unknown') { v.push(`${where}.images.${size} not a real png/jpg: ${rel}`); continue; }
    const [w, h] = IMAGE_SIZES[kind][size];
    if (info.width !== w || info.height !== h) v.push(`${where}.images.${size} ${info.width}x${info.height}, needs ${w}x${h}: ${rel}`);
  }
  return v;
}

// ── loading ────────────────────────────────────────────────────────────────
function composeApp(root) {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  app.flow = app.flow || {};
  const drvDir = path.join(root, 'drivers');
  if (!fs.existsSync(drvDir)) return app;
  const known = new Set();
  for (const t of ['triggers', 'conditions', 'actions']) asArr(app.flow[t]).forEach((c) => known.add(`${t}:${c.id}`));
  for (const id of fs.readdirSync(drvDir).sort()) {
    const f = path.join(drvDir, id, 'driver.flow.compose.json');
    if (!fs.existsSync(f)) continue;
    let j;
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { continue; }
    for (const t of ['triggers', 'conditions', 'actions']) {
      for (const c of asArr(j[t])) {
        if (known.has(`${t}:${c.id}`)) continue; // root app.json may already carry the merged card
        const args = [{ type: 'device', name: 'device', filter: `driver_id=${id}` }, ...asArr(c.args)];
        (app.flow[t] = app.flow[t] || []).push({ ...c, args });
        known.add(`${t}:${c.id}`);
      }
    }
  }
  return app;
}

function run({ app, root = '.', mode = 'build', appPath, only, imageProbe } = {}) {
  const ctx = { app, root, mode, appPath, imageProbe };
  const results = [];
  for (const r of RULES) {
    if (only && !only.includes(r.id)) continue;
    let violations;
    try { violations = r.check(ctx) || []; } catch (e) { violations = [`rule crashed: ${e.message}`]; }
    results.push({ id: r.id, level: r.level, enforce: r.enforce, title: r.title, violations });
  }
  const blocking = results.filter((r) => r.enforce === 'block' && r.violations.length);
  return { results, blocking, ok: blocking.length === 0 };
}

function docTable() {
  const rows = RULES.map((r) => `| ${r.id} | ${r.area} | ${r.level} | ${r.enforce} | ${r.title.replace(/\|/g, '\\|')} | [source](${r.source}) · ${r.since} |`); // ok-own-text
  return ['| Rule | Area | Level | CI | Rule (our wording) | Source · since |', '|---|---|---|---|---|---|', ...rows].join('\n');
}

if (require.main === module) {
  if (process.env.HOMEY_SDK_RULES_DISABLED === '1') { console.log('homey-sdk-rules: disabled by HOMEY_SDK_RULES_DISABLED'); process.exit(0); }
  const argv = process.argv.slice(2);
  const get = (n) => { const a = argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : undefined; };
  if (argv.includes('--doc')) { console.log(docTable()); process.exit(0); }
  let root = path.resolve(get('root') || '.');
  let appPath = get('app');
  let mode = 'build';
  let app;
  if (!appPath && !argv.includes('--compose') && fs.existsSync(path.join(root, '.homeybuild', 'app.json'))) {
    root = path.join(root, '.homeybuild'); appPath = path.join(root, 'app.json');
  }
  if (appPath) { app = JSON.parse(fs.readFileSync(appPath, 'utf8')); if (!get('root')) root = path.dirname(path.resolve(appPath)); } else { mode = 'compose'; appPath = path.join(root, 'app.json'); app = composeApp(root); }
  const out = run({ app, root, mode, appPath });
  if (argv.includes('--json')) console.log(JSON.stringify({ mode, root, ...out }, null, 2));
  else {
    console.log(`homey-sdk-rules (${RULES.length} rules, homey-lib ${DATA._homeyLibVersion}@${DATA._commit}, mode=${mode})`);
    for (const r of out.results) {
      if (!r.violations.length) continue;
      console.log(`${r.enforce === 'block' ? '✖' : '•'} ${r.id} [${r.level}/${r.enforce}] ${r.violations.length} issue(s)`);
      r.violations.slice(0, 8).forEach((x) => console.log(`    - ${x}`));
      if (r.violations.length > 8) console.log(`    … ${r.violations.length - 8} more`);
    }
    console.log(out.ok ? '✓ no blocking violation' : `✖ ${out.blocking.length} blocking rule(s) violated`);
  }
  process.exit(out.ok || argv.includes('--report-only') ? 0 : 1);
}

module.exports = { RULES, run, composeApp, docTable, imageInfo, brightness, verLt, titleFormattedProblems, filteredArgs, DATA };
