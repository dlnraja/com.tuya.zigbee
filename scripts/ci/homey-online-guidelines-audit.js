#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const APP_JSON = path.join(ROOT, 'app.json');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const DOC_SOURCES = [
  { name: 'Homey App Store Guidelines', url: 'https://apps.developer.homey.app/app-store/guidelines', freshness: 'last updated 21 days ago on 2026-07-01' },
  { name: 'Homey Capabilities', url: 'https://apps.developer.homey.app/the-basics/devices/capabilities', freshness: 'last updated 3 months ago on 2026-07-01' },
  { name: 'Homey Flow', url: 'https://apps.developer.homey.app/the-basics/flow', freshness: 'last updated 5 months ago on 2026-07-01' },
  { name: 'Homey Flow Tokens', url: 'https://apps.developer.homey.app/the-basics/flow/tokens', freshness: 'last updated 3 months ago on 2026-07-01' },
  { name: 'Homey Zigbee', url: 'https://apps.developer.homey.app/wireless/zigbee', freshness: 'last updated 2 months ago on 2026-07-01' },
  { name: 'Homey Compose', url: 'https://apps.developer.homey.app/advanced/homey-compose', freshness: 'last updated 4 months ago on 2026-07-01' },
  { name: 'Node.js 22 Upgrade Guide', url: 'https://apps.developer.homey.app/upgrade-guides/node-22', freshness: 'last updated 7 months ago on 2026-07-01' },
];

const OPEN_SOURCE_SAMPLES = [
  { repo: 'runely/calendar-homey', updated: '2026-06-20', signal: 'Node 22 engine, Flow-heavy manifest' },
  { repo: 'martijnpoppen/com.athom.flowchecker', updated: '2026-06-15', signal: 'Node 22 engine, Flow validation focus' },
  { repo: 'runely/jslogic-homey', updated: '2026-06-14', signal: 'Node 22 engine, advanced Flow actions' },
  { repo: 'basmilius/homey-flowbits', updated: '2026-06-21', signal: 'Recent Flow-oriented Homey app' },
  { repo: 'emilohman/homey-plejd', updated: '2026-05-08', signal: 'Device integration app, recent maintenance' },
];

const TOKEN_TYPES = new Set(['boolean', 'image', 'number', 'string', 'uri']);
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
  if (semverMajor(engines.node) < 22) {
    pushError(report, 'NODE22_ENGINE_REQUIRED', 'package.json', 'Node.js 22 is the current Homey app runtime target in CI and docs', { node: engines.node });
  }
  if (semverMajor(engines.homey) < 12) {
    pushWarning(report, 'HOMEY_ENGINE_OLD', 'package.json', 'Homey engine should match the supported Homey Pro generation', { homey: engines.homey });
  }

  for (const field of ['id', 'name', 'description', 'category', 'images', 'platforms', 'author']) {
    if (app[field] === undefined || app[field] === null || app[field] === '') {
      pushError(report, 'APP_REQUIRED_FIELD', 'app.json', `Missing required app manifest field: ${field}`);
    }
  }
}

function auditDriver(driverId, driver, report) {
  const manifest = driver.compose || driver.app;
  const appDriver = driver.app || {};
  const compose = driver.compose || {};
  const caps = new Set([...(appDriver.capabilities || []), ...(compose.capabilities || [])]);

  if (!titleText(manifest.name)) pushError(report, 'DRIVER_NAME_REQUIRED', driverId, 'Driver needs a user-facing English name');
  if (!manifest.class && !appDriver.class) pushWarning(report, 'DRIVER_CLASS_MISSING', driverId, 'Driver has no class; Homey UI/device grouping may be weaker');
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
