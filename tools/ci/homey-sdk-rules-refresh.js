#!/usr/bin/env node
'use strict';
/**
 * P2964 — Refresh the data snapshot used by tools/ci/homey-sdk-rules.js.
 *
 * Reads an athombv/node-homey-lib checkout (public, MIT) and extracts only
 * *facts* (lists of allowed ids, minimum compatibilities, image sizes, setting
 * prefixes). No code is copied: the checker implements the rules itself.
 *
 * Usage:
 *   node tools/ci/homey-sdk-rules-refresh.js --lib=/path/to/node-homey-lib [--write] [--report=out.md]
 * Exit 0 always; prints a diff summary (added / removed / changed facts).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_PATH = path.join(__dirname, 'homey-sdk-rules.data.json');
const HASH_PATH = path.join(__dirname, 'homey-sdk-sources.hash.json');
// Official pages watched for changes (content hash only; nothing is stored or copied).
const WATCH = [
  'https://apps.developer.homey.app/the-basics/app/manifest.md',
  'https://apps.developer.homey.app/the-basics/flow.md',
  'https://apps.developer.homey.app/the-basics/flow/arguments.md',
  'https://apps.developer.homey.app/the-basics/devices/capabilities.md',
  'https://apps.developer.homey.app/the-basics/devices/settings.md',
  'https://apps.developer.homey.app/the-basics/devices/energy.md',
  'https://apps.developer.homey.app/the-basics/devices/pairing.md',
  'https://apps.developer.homey.app/the-basics/app/internationalization.md',
  'https://apps.developer.homey.app/the-basics/app/permissions.md',
  'https://apps.developer.homey.app/wireless/zigbee.md',
  'https://apps.developer.homey.app/app-store/assets.md',
  'https://apps.developer.homey.app/app-store/guidelines.md',
  'https://apps.developer.homey.app/app-store/publishing.md',
  'https://apps.developer.homey.app/app-store/updates.md',
  'https://apps.developer.homey.app/guides/homey-cloud.md',
  'https://apps.developer.homey.app/upgrade-guides/upgrading-to-sdk-v3.md',
  'https://raw.githubusercontent.com/athombv/node-homey/master/CHANGELOG.md',
  'https://homey.app/en-us/changelog/homey-pro/',
  'https://community.homey.app/c/developers/22',
];

async function watchDocs(fetchImpl = globalThis.fetch) {
  const crypto = require('crypto');
  const prev = fs.existsSync(HASH_PATH) ? JSON.parse(fs.readFileSync(HASH_PATH, 'utf8')) : {};
  const next = {};
  const changes = [];
  for (const url of WATCH) {
    try {
      const res = await fetchImpl(url, { headers: { 'user-agent': 'homey-sdk-rules-refresh' } });
      if (!res.ok) { next[url] = prev[url] || null; changes.push(`? ${url} HTTP ${res.status}`); continue; }
      const body = (await res.text()).replace(/\s+/g, ' ');
      next[url] = crypto.createHash('sha256').update(body).digest('hex').slice(0, 16);
      if (prev[url] && prev[url] !== next[url]) changes.push(`~ ${url}`);
      if (!prev[url]) changes.push(`+ ${url}`);
    } catch (e) { next[url] = prev[url] || null; changes.push(`? ${url} ${e.message}`); }
  }
  return { next, changes };
}

function arg(name, def) {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  if (a) return a.slice(name.length + 3);
  return process.argv.includes(`--${name}`) ? true : def;
}

function extract(libDir) {
  const lib = require(path.resolve(libDir, 'index.js'));
  const src = fs.readFileSync(path.join(libDir, 'lib/App/index.js'), 'utf8');
  const classes = {};
  for (const [id, c] of Object.entries(lib.Device.getClasses())) classes[id] = c.minCompatibility || null;
  const capabilities = {};
  for (const [id, c] of Object.entries(lib.Device.getCapabilities())) capabilities[id] = c.minCompatibility || null;
  const prefixBlock = (src.match(/RESERVED_SETTING_PREFIXES = new Set\(\[([\s\S]*?)\]\)/) || [])[1] || '';
  const reservedSettingPrefixes = [...prefixBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const schema = lib.App.getJSONSchema();
  const defs = schema.definitions || {};
  const enumOf = (node) => (node && node.properties && node.properties.type && node.properties.type.enum) || [];
  const settingTypes = [...new Set((defs.driverSettings.items.oneOf || []).flatMap(enumOf))].sort();
  const flowArgTypes = [...new Set((defs.flowCard.properties.args.items.anyOf || []).flatMap(enumOf))].sort();
  const tokenTypes = (defs.flowCard.properties.tokens.items.properties.type.enum || []).slice().sort();
  let commit = null; let commitDate = null;
  try {
    commit = execSync('git rev-parse --short HEAD', { cwd: libDir }).toString().trim();
    commitDate = execSync('git log -1 --format=%cs', { cwd: libDir }).toString().trim();
  } catch (_) { /* not a git checkout */ }
  const pkg = JSON.parse(fs.readFileSync(path.join(libDir, 'package.json'), 'utf8'));
  return {
    _source: 'https://github.com/athombv/node-homey-lib',
    _homeyLibVersion: pkg.version,
    _commit: commit,
    _commitDate: commitDate,
    categories: lib.App.getCategories().slice().sort(),
    locales: lib.App.getLocales().slice().sort(),
    permissions: Object.keys(lib.App.getPermissions()).sort(),
    batteries: lib.Energy.getBatteries().slice().sort(),
    classes,
    capabilities,
    reservedSettingPrefixes,
    settingTypes,
    flowArgTypes,
    tokenTypes,
  };
}

function diff(oldD, newD) {
  const out = [];
  for (const key of Object.keys(newD)) {
    if (key.startsWith('_')) continue;
    const a = oldD[key]; const b = newD[key];
    if (Array.isArray(b)) {
      const A = new Set(a || []);
      const B = new Set(b);
      for (const x of B) if (!A.has(x)) out.push(`+ ${key}: ${x}`);
      for (const x of A) if (!B.has(x)) out.push(`- ${key}: ${x}`);
    } else if (b && typeof b === 'object') {
      const A = a || {};
      for (const k of Object.keys(b)) {
        if (!(k in A)) out.push(`+ ${key}.${k} (min ${b[k] || 'any'})`);
        else if (A[k] !== b[k]) out.push(`~ ${key}.${k}: ${A[k]} -> ${b[k]}`);
      }
      for (const k of Object.keys(A)) if (!(k in b)) out.push(`- ${key}.${k}`);
    }
  }
  return out;
}

if (require.main === module) {
  const libDir = arg('lib');
  if (!libDir && arg('watch-docs')) { watchDocs().then(({ changes }) => console.log(changes.join('\n'))); return; }
  if (!libDir) { console.error('usage: --lib=/path/to/node-homey-lib [--write] [--report=file]'); process.exit(2); }
  const next = extract(libDir);
  const prev = fs.existsSync(DATA_PATH) ? JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) : {};
  const changes = diff(prev, next);
  const header = `homey-lib ${prev._homeyLibVersion || '?'}@${prev._commit || '?'} -> ${next._homeyLibVersion}@${next._commit} (${next._commitDate})`;
  console.log(header);
  console.log(changes.length ? changes.join('\n') : 'no fact changes');
  const report = arg('report');
  if (report) fs.writeFileSync(report, `### node-homey-lib facts\n\n${header}\n\n\`\`\`diff\n${changes.join('\n') || 'no fact changes'}\n\`\`\`\n`);
  if (arg('write')) fs.writeFileSync(DATA_PATH, `${JSON.stringify(next, null, 2)}\n`);
  if (arg('watch-docs')) {
    watchDocs().then(({ next: hashes, changes: docChanges }) => {
      console.log(docChanges.length ? docChanges.join('\n') : 'no doc changes');
      if (report) fs.appendFileSync(report, `\n### Official pages (hash watch)\n\n${docChanges.map((c) => `- ${c}`).join('\n') || 'no change'}\n`);
      if (arg('write')) fs.writeFileSync(HASH_PATH, `${JSON.stringify(hashes, null, 2)}\n`);
    });
  }
}

module.exports = { extract, diff, watchDocs, WATCH };
