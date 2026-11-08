'use strict';
// The directory passed to `homey app publish --path` must already be the filtered
// payload. If that directory still contains `.homeycompose`, Homey Compose rebuilds
// app.json from every drivers/*/driver.compose.json and the hold filter is discarded.
// Driver folders must match the manifest, so a filtered app.json is not packed with
// the unfiltered driver tree (or the reverse).

const fs = require('fs');
const path = require('path');

function driverFolders(dir) {
  const folder = path.join(dir, 'drivers');
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder).filter((name) => {
    if (name.startsWith('.')) return false;
    try { return fs.statSync(path.join(folder, name)).isDirectory(); } catch { return false; }
  });
}

function problems(dir, { appId } = {}) {
  const out = [];
  const root = path.resolve(dir);
  if (fs.existsSync(path.join(root, '.homeycompose'))) {
    out.push(`${root} contains .homeycompose; homey preprocess would rebuild app.json from compose and drop the hold filter`);
  }
  const appPath = path.join(root, 'app.json');
  if (!fs.existsSync(appPath)) {
    out.push(`${root} has no app.json`);
    return out;
  }
  let app;
  try { app = JSON.parse(fs.readFileSync(appPath, 'utf8')); }
  catch (e) { out.push(`${root}/app.json is not JSON (${e.message})`); return out; }
  if (appId && app.id !== appId) out.push(`app id ${app.id} != ${appId}`);
  const ids = (app.drivers || []).map((d) => d && d.id).filter(Boolean);
  const idSet = new Set(ids);
  const dirs = driverFolders(root);
  const extra = dirs.filter((name) => !idSet.has(name));
  const missing = ids.filter((id) => !dirs.includes(id));
  if (extra.length) out.push(`driver folders not listed in app.json (${extra.length}): ${extra.slice(0, 6).join(', ')}`);
  if (missing.length) out.push(`app.json drivers with no folder (${missing.length}): ${missing.slice(0, 6).join(', ')}`);
  const buildPath = path.join(root, '.homeybuild', 'app.json');
  if (fs.existsSync(buildPath)) {
    try {
      const built = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
      if (built.id !== app.id) out.push(`.homeybuild/app.json id ${built.id} != ${app.id}`);
      const builtCount = (built.drivers || []).length;
      if (builtCount !== ids.length) out.push(`.homeybuild/app.json drivers ${builtCount} != app.json drivers ${ids.length}`);
    } catch (e) {
      out.push(`.homeybuild/app.json is not JSON (${e.message})`);
    }
  }
  return out;
}

function main(argv) {
  const dir = argv[0];
  const appId = argv[1];
  if (!dir) {
    console.error('usage: publish-dir-guard.cjs <publish-dir> [expected-app-id]');
    return 2;
  }
  const found = problems(dir, { appId });
  if (found.length) {
    console.error(`::error::publish dir ${dir} is not the filtered payload`);
    found.forEach((line) => console.error(`  ${line}`));
    return 1;
  }
  const app = JSON.parse(fs.readFileSync(path.join(path.resolve(dir), 'app.json'), 'utf8'));
  console.log(`[publish-dir] ${path.resolve(dir)} id=${app.id} version=${app.version} drivers=${(app.drivers || []).length} compose=absent`);
  return 0;
}

module.exports = { problems, driverFolders };
if (require.main === module) process.exit(main(process.argv.slice(2)));
