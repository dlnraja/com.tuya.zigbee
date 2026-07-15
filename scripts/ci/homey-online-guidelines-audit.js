#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const APP_JSON = path.join(ROOT, 'app.json');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JS = path.join(ROOT, 'app.js');
const API_JS = path.join(ROOT, 'api.js');
const FLOW_CARD_PATCH = 'lib/drivers/ZigBeeDriverFlowCardPatch';
const README_FILES = ['README.txt', 'README.nl.txt', 'README.de.txt', 'README.fr.txt'];

const DOC_SOURCES = [
  { name: 'Homey App Store Guidelines', url: 'https://apps.developer.homey.app/app-store/guidelines', freshness: 'official docs observed 2026-07-04; page refreshed recently (~3 weeks)' },
  { name: 'Homey App Manifest', url: 'https://apps.developer.homey.app/the-basics/app/manifest', freshness: 'official docs observed 2026-07-04; page refreshed recently (~1 month)' },
  { name: 'Homey App Permissions', url: 'https://apps.developer.homey.app/the-basics/app/permissions', freshness: 'official docs observed 2026-07-04; page refreshed recently (~5 months)' },
  { name: 'Homey Publishing', url: 'https://apps.developer.homey.app/app-store/publishing', freshness: 'official docs observed 2026-07-04; validate at publish level before submission' },
  { name: 'Homey Capabilities', url: 'https://apps.developer.homey.app/the-basics/devices/capabilities', freshness: 'official docs observed 2026-07-04; page refreshed recently (~3 months)' },
  { name: 'Homey Flow', url: 'https://apps.developer.homey.app/the-basics/flow', freshness: 'official docs observed 2026-07-04; page refreshed recently (~5 months)' },
  { name: 'Homey Zigbee', url: 'https://apps.developer.homey.app/wireless/zigbee', freshness: 'official docs observed 2026-07-04; page refreshed recently (~2 months)' },
  { name: 'Homey Compose', url: 'https://apps.developer.homey.app/advanced/homey-compose', freshness: 'official docs observed 2026-07-04; app.json is generated from compose files' },
  { name: 'Node.js 22 Upgrade Guide', url: 'https://apps.developer.homey.app/upgrade-guides/node-22', freshness: 'official docs observed 2026-07-04; Node 22 remains the CI runtime target' },
];

const OPEN_SOURCE_SAMPLES = [
  { repo: 'runely/calendar-homey', updated: '2026-06-20', signal: 'Node 22 engine, Flow-heavy manifest' },
  { repo: 'martijnpoppen/com.athom.flowchecker', updated: '2026-06-15', signal: 'Node 22 engine, Flow validation focus' },
  { repo: 'runely/jslogic-homey', updated: '2026-06-14', signal: 'Node 22 engine, advanced Flow actions' },
  { repo: 'basmilius/homey-flowbits', updated: '2026-06-21', signal: 'Recent Flow-oriented Homey app' },
  { repo: 'emilohman/homey-plejd', updated: '2026-05-08', signal: 'Device integration app, recent maintenance' },
];

const TOKEN_TYPES = new Set(['boolean', 'image', 'number', 'string', 'uri']);
const ALLOWED_APP_CATEGORIES = new Set(['lights', 'video', 'music', 'appliances', 'security', 'climate', 'tools', 'internet', 'localization', 'energy']);
const APP_IMAGE_SIZES = {
  small: [250, 175],
  large: [500, 350],
  xlarge: [1000, 700],
};
const ARG_TYPES = new Set([
  'autocomplete',
  'checkbox',
  'color',
  'device',
  'dropdown',
  'duration',
  'number',
  'range',
  'text',
]);

const REQUIRED_DRIVER_FILES = [
  'driver.compose.json',
  'driver.js',
  'device.js',
  path.join('assets', 'icon.svg'),
  path.join('assets', 'images', 'small.png'),
  path.join('assets', 'images', 'large.png'),
];

const CLASS_PRIMARY_CAPABILITY_RULES = {
  button: [/^button(?:\.|$)/, /^measure_battery$/, /^alarm_battery$/],
  curtain: [/^windowcoverings_/, /^onoff(?:[._]|$)/, /^dim(?:[._]|$)/],
  fan: [/^onoff(?:[._]|$)/, /^dim(?:[._]|$)/, /^fan_/],
  garagedoor: [/^garagedoor_/, /^onoff(?:[._]|$)/],
  heater: [/^onoff(?:[._]|$)/, /^target_temperature$/, /^thermostat_mode$/, /^measure_temperature$/],
  light: [/^onoff(?:[._]|$)/, /^dim(?:[._]|$)/, /^light_/],
  lock: [/^locked(?:[._]|$)/],
  remote: [/^button(?:\.|$)/],
  socket: [/^onoff(?:[._]|$)/, /^measure_power$/, /^meter_power$/],
  speaker: [/^onoff(?:[._]|$)/, /^volume_/],
  thermostat: [/^target_temperature$/, /^thermostat_mode$/, /^measure_temperature$/],
  vacuumcleaner: [/^vacuumcleaner_/],
  windowcoverings: [/^windowcoverings_/],
};

const BUTTON_FLOW_TRIGGERS = [
  'button_pressed',
  'button_double_press',
  'button_long_press',
  'button_release',
  'button_multi_press',
];

const EXTENDED_BUTTON_FLOW_TRIGGERS = [
  'button_triple_clicked',
  'remote_button_pressed',
  'virtual_button_pressed',
];

function parseArgs(argv) {
  const args = { json: false, writeReport: null };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--json') args.json = true;
    if (arg === '--write-report') {
      const reportPath = argv[index + 1];
      if (reportPath && !reportPath.startsWith('--')) {
        args.writeReport = reportPath;
        index++;
      } else {
        args.writeReport = path.join('docs', 'reports', `HOMEY_ONLINE_GUIDELINES_REFERENCE_${new Date().toISOString().slice(0, 10)}.md`);
      }
    }
  }
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function semverMajor(value) {
  const match = String(value || '').match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function titleText(title) {
  if (typeof title === 'string') return title;
  if (title && typeof title.en === 'string') return title.en;
  return '';
}

function localizedEntries(value) {
  if (typeof value === 'string') return [['en', value]];
  if (value && typeof value === 'object') return Object.entries(value).filter(([, text]) => typeof text === 'string');
  return [];
}

function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function readPngSize(file) {
  if (!fs.existsSync(file)) return null;
  const data = fs.readFileSync(file);
  if (data.length < 24 || data.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

function hexLuminance(hex) {
  const match = String(hex || '').trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) return null;
  const parts = match[1].match(/.{2}/g).map(value => Number.parseInt(value, 16) / 255);
  const linear = parts.map(value => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function addIssue(report, type, code, scope, message, details) {
  report[type].push({ code, scope, message, details });
  report.summaryByCode[code] = (report.summaryByCode[code] || 0) + 1;
}

function pushError(report, code, scope, message, details) {
  addIssue(report, 'errors', code, scope, message, details);
}

function pushWarning(report, code, scope, message, details) {
  addIssue(report, 'warnings', code, scope, message, details);
}

function listDriverComposes() {
  if (!fs.existsSync(DRIVERS_DIR)) return [];
  return fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(DRIVERS_DIR, entry.name, 'driver.compose.json'))
    .filter(file => fs.existsSync(file));
}

function collectDrivers(app, report) {
  const drivers = new Map();
  for (const driver of app.drivers || []) {
    drivers.set(driver.id, { app: driver, compose: null });
  }

  for (const file of listDriverComposes()) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    let compose;
    try {
      compose = readJson(file);
    } catch (err) {
      pushError(report, 'COMPOSE_JSON_INVALID', rel, 'driver.compose.json is not valid JSON', err.message);
      continue;
    }
    const id = path.basename(path.dirname(file));
    if (!drivers.has(id)) drivers.set(id, { app: null, compose });
    else drivers.get(id).compose = compose;
  }
  return drivers;
}

function auditManifest(app, pkg, report) {
  if (app.sdk !== 3) pushError(report, 'SDK3_REQUIRED', 'app.json', 'app.json must contain "sdk": 3 for SDK v3 publishing', { sdk: app.sdk });
  if (app.sdkVersion !== undefined && app.sdkVersion !== 3) {
    pushError(report, 'SDK_VERSION_CONFLICT', 'app.json', 'sdkVersion is present but does not match SDK v3', { sdkVersion: app.sdkVersion });
  }
  if (app.sdkVersion === 3 && app.sdk === 3) {
    pushWarning(report, 'SDK_VERSION_LEGACY_ALIAS', 'app.json', 'sdkVersion is a legacy alias; sdk: 3 remains authoritative');
  }
  if (app.compatibility !== '>=12.2.0') {
    pushWarning(report, 'HOMEY_COMPATIBILITY_DRIFT', 'app.json', 'Compatibility should stay aligned with the tested Homey 12.2+ / Node 22 publication path', { compatibility: app.compatibility });
  }

  const engines = pkg.engines || {};
  // v9.0.253 (P62): Changed from < 22 to < 18 to match dlnraja's v8.5.7+
  // forum fix (post #2050) which downgraded engines.node to >=18 for
  // Homey Pro compatibility. Homey Pro 2023/2026/mini (firmware 12.2+)
  // uses Node 18 on initial release, Node 22 only on firmware 12.9.0-rc+.
  // >=18 covers all compatible Homey Pro devices.
  if (semverMajor(engines.node) < 18) {
    pushError(report, 'NODE18_ENGINE_REQUIRED', 'package.json', 'Node.js 18+ is the minimum Homey app runtime target (Homey Pro 2023+ compatibility)', { node: engines.node });
  }
  if (semverMajor(engines.homey) < 12) {
    pushWarning(report, 'HOMEY_ENGINE_OLD', 'package.json', 'Homey engine should match the supported Homey Pro generation', { homey: engines.homey });
  }

  for (const field of ['id', 'name', 'description', 'category', 'images', 'platforms', 'author']) {
    if (app[field] === undefined || app[field] === null || app[field] === '') {
      pushError(report, 'APP_REQUIRED_FIELD', 'app.json', `Missing required app manifest field: ${field}`);
    }
  }
  if (!ALLOWED_APP_CATEGORIES.has(app.category)) {
    pushError(report, 'APP_CATEGORY_INVALID', 'app.json', 'App category must be one of the current Homey App Store categories', { category: app.category });
  }
  if (!Array.isArray(app.platforms) || app.platforms.length === 0) {
    pushError(report, 'APP_PLATFORMS_REQUIRED', 'app.json', 'App manifest must declare supported Homey platforms');
  }
  if (app.platforms && app.platforms.includes('cloud') && (!app.support || !String(app.support).startsWith('https://'))) {
    pushWarning(report, 'CLOUD_SUPPORT_URL_RECOMMENDED', 'app.json', 'Verified/cloud apps need a support URL; keep local-only apps on platforms: ["local"] unless cloud is intentionally supported');
  }
  if (!Array.isArray(app.permissions)) {
    pushError(report, 'APP_PERMISSIONS_ARRAY_REQUIRED', 'app.json', 'permissions must be an array; leave it empty when the app needs no privileged Homey APIs');
  } else if (app.permissions.length > 0) {
    pushWarning(report, 'APP_PERMISSIONS_MINIMIZE', 'app.json', 'Homey docs recommend requesting only permissions the app actually needs; new permissions also affect automatic updates', { permissions: app.permissions });
  }
  if (app.brandColor !== undefined) {
    const luminance = hexLuminance(app.brandColor);
    if (luminance === null) pushError(report, 'APP_BRAND_COLOR_INVALID', 'app.json', 'brandColor must be a HEX color string');
    else if (luminance > 0.55) pushWarning(report, 'APP_BRAND_COLOR_TOO_BRIGHT', 'app.json', 'Homey Manifest docs say brandColor must not be very bright', { brandColor: app.brandColor, luminance: Number(luminance.toFixed(3)) });
  }
  const names = localizedEntries(app.name);
  for (const [lang, name] of names) {
    if (wordCount(name) > 4) pushWarning(report, 'APP_NAME_TOO_LONG', `app.json:name.${lang}`, 'Homey App Store guidelines recommend a short name of 4 words or less', { name });
    if (/\b(homey|athom)\b/i.test(name)) pushError(report, 'APP_NAME_RESERVED_WORD', `app.json:name.${lang}`, 'App names may not use Homey or Athom trademarks', { name });
    if (/\b(zigbee|z-wave|infrared|433\s*mhz|868\s*mhz)\b/i.test(name)) pushWarning(report, 'APP_NAME_PROTOCOL_WORD', `app.json:name.${lang}`, 'App Store guidelines discourage protocol names in app names', { name });
  }
  const englishName = titleText(app.name).toLowerCase();
  for (const [lang, description] of localizedEntries(app.description)) {
    const trimmed = description.trim();
    if (trimmed.length > 150) pushWarning(report, 'APP_DESCRIPTION_TOO_LONG', `app.json:description.${lang}`, 'Description should be a concise App Store one-liner', { length: trimmed.length });
    if (/https?:\/\//i.test(trimmed)) pushError(report, 'APP_DESCRIPTION_URL', `app.json:description.${lang}`, 'Description must not contain URLs');
    if (englishName && trimmed.toLowerCase().includes(englishName)) pushWarning(report, 'APP_DESCRIPTION_REPEATS_NAME', `app.json:description.${lang}`, 'Description should not repeat the app name; use a short value proposition instead', { description: trimmed });
    if (/^(adds support|integrates|control .+ with\b)/i.test(trimmed)) pushWarning(report, 'APP_DESCRIPTION_GENERIC_SUPPORT', `app.json:description.${lang}`, 'Avoid generic "adds support" or "integrates" phrasing in the App Store description', { description: trimmed });
  }
  for (const [key, expected] of Object.entries(APP_IMAGE_SIZES)) {
    const rel = app.images && app.images[key];
    if (!rel) {
      if (key !== 'xlarge') pushError(report, 'APP_IMAGE_REQUIRED', `app.json:images.${key}`, 'App Store requires small and large app images');
      continue;
    }
    const size = readPngSize(path.join(ROOT, String(rel).replace(/^\//, '')));
    if (!size) {
      pushError(report, 'APP_IMAGE_UNREADABLE', `app.json:images.${key}`, 'App image must be a readable PNG file', { image: rel });
      continue;
    }
    if (size.width !== expected[0] || size.height !== expected[1]) {
      pushError(report, 'APP_IMAGE_SIZE_INVALID', `app.json:images.${key}`, 'App Store app image has the wrong resolution', { image: rel, actual: `${size.width}x${size.height}`, expected: `${expected[0]}x${expected[1]}` });
    }
  }

  if (fs.existsSync(API_JS) && (!app.api || Object.keys(app.api).length === 0)) {
    pushError(report, 'APP_API_SECTION_REQUIRED', 'app.json', 'api.js exists, so app.json must declare a top-level api section for Homey ManagerApi');
  }
}

function auditReadmes(report) {
  for (const file of README_FILES) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) {
      if (file === 'README.txt') pushError(report, 'README_REQUIRED', file, 'Homey App Store requires README.txt');
      continue;
    }
    const text = fs.readFileSync(full, 'utf8').trim();
    const paragraphs = text.split(/\r?\n\s*\r?\n/).filter(Boolean);
    if (/https?:\/\/|www\./i.test(text)) pushError(report, 'README_URL_FORBIDDEN', file, 'Homey App Store guidelines do not allow URLs in readme.txt');
    if (/^\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s)/m.test(text) || /(```|__|\*\*)/.test(text)) {
      pushError(report, 'README_MARKDOWN_FORBIDDEN', file, 'Homey readme.txt is plain text; Markdown/list formatting is not rendered and is not allowed');
    }
    if (/\b(changelog|release notes|what'?s new|version\s+\d+\.\d+)/i.test(text)) {
      pushError(report, 'README_CHANGELOG_FORBIDDEN', file, 'Use .homeychangelog.json for changes; do not put a changelog in the readme');
    }
    if (paragraphs.length > 2 || text.length > 1200) {
      pushWarning(report, 'README_TOO_LONG', file, 'Homey App Store guidelines recommend one or two concise paragraphs', { paragraphs: paragraphs.length, length: text.length });
    }
  }
}

function auditDriver(driverId, driver, report) {
  const manifest = driver.compose || driver.app;
  const appDriver = driver.app || {};
  const compose = driver.compose || {};
  const caps = new Set([...(appDriver.capabilities || []), ...(compose.capabilities || [])]);
  const driverClass = manifest.class || appDriver.class;
  const driverDir = path.join(DRIVERS_DIR, driverId);
  const missingFiles = REQUIRED_DRIVER_FILES
    .filter(file => !fs.existsSync(path.join(driverDir, file)))
    .map(file => file.replace(/\\/g, '/'));

  if (!titleText(manifest.name)) pushError(report, 'DRIVER_NAME_REQUIRED', driverId, 'Driver needs a user-facing English name');
  if (missingFiles.length > 0) {
    pushError(report, 'DRIVER_UI_FILES_REQUIRED', driverId, 'Driver needs compose, runtime files, icon, and small/large images for complete Homey UI representation', { missingFiles });
  }
  if (!driverClass) pushWarning(report, 'DRIVER_CLASS_MISSING', driverId, 'Driver has no class; Homey UI/device grouping may be weaker');
  if (caps.size === 0) {
    pushError(report, 'DRIVER_CAPABILITIES_REQUIRED', driverId, 'Driver needs at least one capability so it has a visible/actionable Homey UI surface');
  }
  const primaryRules = CLASS_PRIMARY_CAPABILITY_RULES[driverClass];
  if (primaryRules && ![...caps].some(capability => primaryRules.some(rule => rule.test(capability)))) {
    pushError(report, 'DRIVER_PRIMARY_UI_CAPABILITY_REQUIRED', driverId, `Driver class "${driverClass}" needs a matching primary capability for Homey UI controls`, { capabilities: [...caps] });
  }
  if (caps.has('measure_battery') && caps.has('alarm_battery')) {
    pushError(report, 'BATTERY_CAPABILITY_CONFLICT', driverId, 'Do not expose measure_battery and alarm_battery on the same driver');
  }
  if (caps.has('measure_battery') && !manifest.energy && !appDriver.energy) {
    pushWarning(report, 'BATTERY_ENERGY_METADATA_MISSING', driverId, 'Battery drivers should declare energy.batteries when known, or document runtime estimation fallback');
  }
  if ((compose.zigbee || appDriver.zigbee) && (!manifest.zigbee && !appDriver.zigbee)) {
    pushError(report, 'ZIGBEE_CONFIG_MISSING', driverId, 'Zigbee driver needs a zigbee manifest section');
  }
}

function auditFlows(app, report) {
  const flow = app.flow || {};
  const triggerIds = new Set((flow.triggers || []).map(card => card.id));
  const hasButtonDrivers = (app.drivers || []).some(driver => {
    const capabilities = driver.capabilities || [];
    return driver.class === 'button' ||
      driver.class === 'remote' ||
      capabilities.some(capability => /^button(?:\.|$)/.test(capability));
  });
  if (hasButtonDrivers) {
    for (const id of BUTTON_FLOW_TRIGGERS) {
      if (!triggerIds.has(id)) {
        pushError(report, 'BUTTON_FLOW_TRIGGER_REQUIRED', `triggers.${id}`, 'Button/remote drivers need the core Homey Flow trigger set');
      }
    }
    for (const id of EXTENDED_BUTTON_FLOW_TRIGGERS) {
      if (!triggerIds.has(id)) {
        pushWarning(report, 'BUTTON_FLOW_TRIGGER_EXTENDED_MISSING', `triggers.${id}`, 'Extended button/remote/virtual Flow trigger is missing; compatibility is reduced for advanced button variants');
      }
    }
  }

  const seen = new Map();
  for (const group of ['triggers', 'conditions', 'actions']) {
    for (const card of flow[group] || []) {
      const scope = `${group}.${card.id || '<missing>'}`;
      if (!card.id) {
        pushError(report, 'FLOW_CARD_ID_REQUIRED', group, 'Flow card is missing an id');
        continue;
      }
      const duplicateKey = `${group}:${card.id}`;
      if (seen.has(duplicateKey)) pushError(report, 'FLOW_CARD_DUPLICATE_ID', scope, 'Duplicate Flow card id in the same group', { first: seen.get(duplicateKey) });
      seen.set(duplicateKey, scope);

      const title = titleText(card.title);
      if (!title) pushError(report, 'FLOW_TITLE_REQUIRED', scope, 'Flow card needs an English title');
      if (/^\s*(when|and|then)\b/i.test(title)) pushWarning(report, 'FLOW_TITLE_PREFIX', scope, 'Flow titles should be concise and not repeat the Flow column label', { title });
      if (/[()]/.test(title)) pushWarning(report, 'FLOW_TITLE_PARENS', scope, 'Flow titles should avoid parenthetical UI text when possible', { title });
      if (title.length > 72) pushWarning(report, 'FLOW_TITLE_LONG', scope, 'Flow title is long for mobile Flow UI', { title });

      const args = card.args || [];
      const tokens = card.tokens || [];
      const argNames = new Set();
      for (const arg of args) {
        const argScope = `${scope}.arg.${arg.name || '<missing>'}`;
        if (!arg.name) pushError(report, 'FLOW_ARG_NAME_REQUIRED', scope, 'Flow argument is missing a name');
        else if (argNames.has(arg.name)) pushError(report, 'FLOW_ARG_DUPLICATE_NAME', argScope, 'Duplicate Flow argument name');
        else argNames.add(arg.name);
        if (arg.type && !ARG_TYPES.has(arg.type)) pushWarning(report, 'FLOW_ARG_UNKNOWN_TYPE', argScope, 'Flow argument uses an uncommon type', { type: arg.type });
        if (arg.name === 'duration') pushError(report, 'FLOW_ARG_DURATION_RESERVED', argScope, 'Do not name custom Flow arguments "duration"; Homey reserves duration handling for capability actions');
        if (arg.type === 'device' && !arg.filter) pushWarning(report, 'FLOW_DEVICE_ARG_UNFILTERED', argScope, 'Device arguments should use a driver/capability filter where possible');
        if (arg.type === 'dropdown') {
          for (const value of arg.values || []) {
            if (value && value.title === undefined && value.label !== undefined) {
              pushWarning(report, 'FLOW_DROPDOWN_LABEL_ALIAS', argScope, 'Dropdown values should use title; label is a legacy/non-standard alias', { id: value.id });
            }
          }
        }
      }

      const tokenNames = new Set();
      for (const token of tokens) {
        const tokenScope = `${scope}.token.${token.name || '<missing>'}`;
        if (!token.name) pushError(report, 'FLOW_TOKEN_NAME_REQUIRED', scope, 'Flow token is missing a name');
        else if (tokenNames.has(token.name)) pushError(report, 'FLOW_TOKEN_DUPLICATE_NAME', tokenScope, 'Duplicate Flow token name on one card');
        else tokenNames.add(token.name);
        if (!TOKEN_TYPES.has(token.type)) pushError(report, 'FLOW_TOKEN_TYPE_INVALID', tokenScope, 'Flow token uses an unsupported type', { type: token.type });
      }
    }
  }
}

function listDriverJsFiles() {
  if (!fs.existsSync(DRIVERS_DIR)) return [];
  return fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(DRIVERS_DIR, entry.name, 'driver.js'))
    .filter(file => fs.existsSync(file));
}

function auditRuntimeCrashGates(report) {
  const appJs = fs.existsSync(APP_JS) ? fs.readFileSync(APP_JS, 'utf8') : '';
  const hasFlowCardPatch = appJs.includes(FLOW_CARD_PATCH) && fs.existsSync(path.join(ROOT, `${FLOW_CARD_PATCH}.js`));
  const flowCardDrivers = listDriverJsFiles()
    .filter(file => fs.readFileSync(file, 'utf8').includes('._getFlowCard('))
    .map(file => path.relative(ROOT, file).replace(/\\/g, '/'));

  if (flowCardDrivers.length > 0 && !hasFlowCardPatch) {
    pushError(
      report,
      'FLOW_CARD_PATCH_REQUIRED',
      'app.js',
      'Drivers call _getFlowCard; app.js must load ZigBeeDriverFlowCardPatch so direct ZigBeeDriver subclasses do not crash at runtime',
      { drivers: flowCardDrivers.slice(0, 25), total: flowCardDrivers.length }
    );
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Homey Online Guidelines Reference');
  lines.push('');
  lines.push(`Generated: ${report.generated}`);
  lines.push('');
  lines.push('## Official Docs Checked');
  lines.push('');
  for (const source of DOC_SOURCES) {
    lines.push(`- ${source.name}: ${source.url} (${source.freshness})`);
  }
  lines.push('');
  lines.push('## Open Source Homey Sample');
  lines.push('');
  for (const repo of OPEN_SOURCE_SAMPLES) {
    lines.push(`- ${repo.repo} (${repo.updated}): ${repo.signal}`);
  }
  lines.push('');
  lines.push('## Audit Summary');
  lines.push('');
  lines.push(`- Drivers checked: ${report.stats.drivers}`);
  lines.push(`- Flow cards checked: ${report.stats.flowCards}`);
  lines.push(`- Errors: ${report.errors.length}`);
  lines.push(`- Warnings: ${report.warnings.length}`);
  lines.push('');
  lines.push('## Rule Counts');
  lines.push('');
  const entries = Object.entries(report.summaryByCode).sort((a, b) => a[0].localeCompare(b[0]));
  if (!entries.length) lines.push('No issues found.');
  for (const [code, count] of entries) lines.push(`- ${code}: ${count}`);
  lines.push('');
  lines.push('## Error Sample');
  lines.push('');
  if (!report.errors.length) lines.push('No errors found.');
  for (const issue of report.errors.slice(0, 50)) lines.push(`- ${issue.code} [${issue.scope}]: ${issue.message}`);
  lines.push('');
  lines.push('## Warning Sample');
  lines.push('');
  if (!report.warnings.length) lines.push('No warnings found.');
  for (const issue of report.warnings.slice(0, 75)) lines.push(`- ${issue.code} [${issue.scope}]: ${issue.message}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = {
    generated: new Date().toISOString(),
    docs: DOC_SOURCES,
    openSourceSamples: OPEN_SOURCE_SAMPLES,
    stats: { drivers: 0, flowCards: 0 },
    errors: [],
    warnings: [],
    summaryByCode: {},
  };

  const app = readJson(APP_JSON);
  const pkg = readJson(PACKAGE_JSON);
  auditManifest(app, pkg, report);
  auditReadmes(report);
  auditRuntimeCrashGates(report);

  const drivers = collectDrivers(app, report);
  report.stats.drivers = drivers.size;
  for (const [driverId, driver] of drivers.entries()) auditDriver(driverId, driver, report);

  report.stats.flowCards = ['triggers', 'conditions', 'actions']
    .reduce((sum, group) => sum + ((app.flow && app.flow[group]) || []).length, 0);
  auditFlows(app, report);

  if (args.writeReport) {
    const target = path.resolve(ROOT, args.writeReport);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, renderMarkdown(report), 'utf8');
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Homey online guidelines audit: ${report.stats.drivers} drivers, ${report.stats.flowCards} flow cards, ${report.errors.length} errors, ${report.warnings.length} warnings`);
    for (const error of report.errors.slice(0, 25)) console.error(`ERROR [${error.code}] ${error.scope}: ${error.message}`);
    for (const warning of report.warnings.slice(0, 25)) console.warn(`WARN [${warning.code}] ${warning.scope}: ${warning.message}`);
  }

  process.exit(report.errors.length > 0 ? 1 : 0);
}

if (require.main === module) main();
