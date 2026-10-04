#!/usr/bin/env node
'use strict';
// Stable publish versioning (2026-10-04). Homey rejects a re-upload of an existing version
// ("already been published"), so every stable publish needs a fresh patch version.
//   node stable-version-bump.js bump [--publish-dir DIR]  -> patch+1 everywhere (repo, optional publish dir)
//   node stable-version-bump.js set <version>             -> write <version> into the repo manifests
// The app id is never touched. app.json keeps its on-disk format (minified stays minified).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function readJson(f) { return JSON.parse(fs.readFileSync(f, 'utf8')); }
function writeLikeOriginal(f, obj) {
  const raw = fs.readFileSync(f, 'utf8');
  const pretty = /\n\s+"/.test(raw);
  fs.writeFileSync(f, (pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj)) + (raw.endsWith('\n') ? '\n' : ''));
}
function nextPatch(v) {
  const m = String(v || '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) { throw new Error(`invalid version ${v}`); }
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}
function cmp(a, b) {
  const pa = a.split('.').map(Number); const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if (pa[i] !== pb[i]) { return pa[i] - pb[i]; } }
  return 0;
}
function setVersion(dir, v, { manifestsOnly = false } = {}) {
  const files = manifestsOnly ? ['app.json', 'package.json'] : ['.homeycompose/app.json', 'app.json', 'package.json'];
  for (const rel of files) {
    const f = path.join(dir, rel);
    if (!fs.existsSync(f)) { continue; }
    const j = readJson(f);
    if (rel.endsWith('app.json') && j.id && !/\.stable$/.test(j.id) && dir === ROOT) {
      throw new Error(`refusing to touch non-stable app id ${j.id}`);
    }
    j.version = v;
    writeLikeOriginal(f, j);
  }
  const lock = path.join(dir, 'package-lock.json');
  if (fs.existsSync(lock)) {
    const j = readJson(lock);
    j.version = v;
    if (j.packages && j.packages['']) { j.packages[''].version = v; }
    writeLikeOriginal(lock, j);
  }
  const cl = path.join(dir, '.homeychangelog.json');
  if (fs.existsSync(cl)) {
    const j = readJson(cl);
    if (!j[v] || !String(j[v].en || '').trim()) {
      j[v] = { en: process.env.HOMEY_CHANGELOG || 'Device compatibility and reliability improvements.' };
      writeLikeOriginal(cl, j);
    }
  }
}
function currentVersion() {
  const vs = ['.homeycompose/app.json', 'app.json', 'package.json']
    .map((r) => path.join(ROOT, r)).filter((f) => fs.existsSync(f)).map((f) => readJson(f).version).filter(Boolean);
  return vs.sort(cmp).pop();
}

module.exports = { nextPatch, cmp, setVersion, currentVersion };

if (require.main === module) {
  const [cmd, arg, arg2] = process.argv.slice(2);
  let v;
  if (cmd === 'bump') {
    v = nextPatch(currentVersion());
    setVersion(ROOT, v);
    const pd = arg === '--publish-dir' ? arg2 : null;
    if (pd) { setVersion(pd, v, { manifestsOnly: true }); }
    console.log(`stable version -> ${v}${pd ? ` (publish dir ${pd})` : ''}`);
  } else if (cmd === 'set' && arg) {
    v = arg;
    setVersion(ROOT, v);
    console.log(`stable version set ${v}`);
  } else {
    console.error('usage: bump [--publish-dir DIR] | set <version>');
    process.exit(2);
  }
  if (process.env.GITHUB_OUTPUT) { fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${v}\n`); }
}
