#!/usr/bin/env node
'use strict';
// WHY(P3025b): AggregateError hunt. The package sent to Athom must be EXACTLY the one that
// `homey app validate --level publish` accepted. This gate snapshots the publish dir right after
// the explicit validation and verifies it again immediately before every upload (CLI or
// direct-api fallback). Any byte change in between (late sanitize/compaction/prune) = hard fail.
//
//   snapshot <dir> <out.json>         hash validated .homeybuild/app.json + build tree + source tree
//   verify   <dir> <snap.json> --phase pre   source tree + manifest unchanged (blocking, exit 1)
//   verify   <dir> <snap.json> --phase post  CLI-rebuilt .homeybuild equals the validated one
//
// The build tree excludes .homeybuild/node_modules (validate does not copy production deps for
// Node apps; publish does — those come from the source tree, which is hashed) and *.tar.gz.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function walk(root, { exclude = () => false } = {}) {
  const out = [];
  const stack = [''];
  while (stack.length) {
    const rel = stack.pop();
    const abs = path.join(root, rel);
    let entries;
    try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch (_e) { continue; }
    for (const e of entries) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (exclude(r, e)) {continue;}
      const full = path.join(root, r);
      let st;
      try { st = fs.statSync(full); } catch (_e) { continue; }
      if (st.isDirectory()) {stack.push(r);}
      else if (st.isFile()) {out.push(r);}
    }
  }
  return out.sort();
}

function treeHash(root, opts) {
  const files = {};
  for (const r of walk(root, opts)) {files[r] = sha256(fs.readFileSync(path.join(root, r)));}
  const h = crypto.createHash('sha256');
  for (const r of Object.keys(files)) {h.update(`${r}\0${files[r]}\n`);}
  return { hash: h.digest('hex'), count: Object.keys(files).length, files };
}

const sourceExclude = (r) => r === '.homeybuild' || r.startsWith('.homeybuild/') || r === '.git' || r.startsWith('.git/');
const buildExclude = (r) => r === 'node_modules' || r.startsWith('node_modules/') || /\.tar\.gz$/.test(r);

function fileHash(p) {
  return fs.existsSync(p) ? sha256(fs.readFileSync(p)) : null;
}

function snapshot(dir) {
  const build = path.join(dir, '.homeybuild');
  const src = treeHash(dir, { exclude: sourceExclude });
  const bld = fs.existsSync(build) ? treeHash(build, { exclude: buildExclude }) : null;
  return {
    version: 1,
    appJson: fileHash(path.join(dir, 'app.json')),
    buildAppJson: fileHash(path.join(build, 'app.json')),
    source: { hash: src.hash, count: src.count, files: src.files },
    build: bld ? { hash: bld.hash, count: bld.count, files: bld.files } : null,
  };
}

function diffFiles(a = {}, b = {}, limit = 20) {
  const out = [];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of [...keys].sort()) {
    if (a[k] === b[k]) {continue;}
    if (!(k in b)) {out.push(`- removed ${k}`);}
    else if (!(k in a)) {out.push(`+ added   ${k}`);}
    else {out.push(`~ changed ${k}`);}
    if (out.length >= limit) { out.push('… (truncated)'); break; }
  }
  return out;
}

function verify(dir, snap, phase = 'pre') {
  const now = snapshot(dir);
  const problems = [];
  if (phase === 'pre') {
    if (now.appJson !== snap.appJson) {problems.push(`app.json sha256 ${snap.appJson} → ${now.appJson}`);}
    if (now.source.hash !== snap.source.hash) {
      problems.push(`source tree ${snap.source.hash.slice(0, 12)} (${snap.source.count}) → ${now.source.hash.slice(0, 12)} (${now.source.count})`);
      problems.push(...diffFiles(snap.source.files, now.source.files));
    }
  } else {
    if (!now.build) {problems.push('.homeybuild missing after publish');}
    else {
      if (now.buildAppJson !== snap.buildAppJson) {problems.push(`.homeybuild/app.json sha256 ${snap.buildAppJson} → ${now.buildAppJson}`);}
      if (!snap.build || now.build.hash !== snap.build.hash) {
        problems.push(`build tree ${snap.build ? snap.build.hash.slice(0, 12) : 'none'} → ${now.build.hash.slice(0, 12)} (${now.build.count})`);
        problems.push(...diffFiles(snap.build ? snap.build.files : {}, now.build.files));
      }
    }
  }
  return { ok: problems.length === 0, problems, now };
}

function main(argv) {
  const [cmd, dir, file] = argv;
  const phaseIdx = argv.indexOf('--phase');
  const phase = phaseIdx >= 0 ? argv[phaseIdx + 1] : 'pre';
  if (cmd === 'snapshot' && dir && file) {
    const s = snapshot(path.resolve(dir));
    if (!s.buildAppJson) {
      console.error('::error::publish-payload-identity: no validated .homeybuild/app.json — run homey app validate --level publish first');
      return 1;
    }
    fs.writeFileSync(file, JSON.stringify(s));
    console.log(`[payload-identity] validated app.json=${s.buildAppJson.slice(0, 16)} build=${s.build.hash.slice(0, 16)} (${s.build.count} files) source=${s.source.hash.slice(0, 16)} (${s.source.count} files)`);
    return 0;
  }
  if (cmd === 'verify' && dir && file) {
    let snap;
    try { snap = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
      console.error(`::error::publish-payload-identity: snapshot unreadable (${e.message}) — refusing to upload`);
      return 1;
    }
    const r = verify(path.resolve(dir), snap, phase);
    if (r.ok) {
      console.log(`[payload-identity] ${phase}: identical to the validated package (app.json=${(phase === 'pre' ? snap.appJson : snap.buildAppJson).slice(0, 16)})`);
      return 0;
    }
    console.error(`::error::publish-payload-identity ${phase}: payload differs from the one validated at level publish`);
    r.problems.forEach((p) => console.error(`  ${p}`));
    return 1;
  }
  console.error('usage: publish-payload-identity.cjs snapshot <dir> <out.json> | verify <dir> <snap.json> [--phase pre|post]');
  return 2;
}

module.exports = { snapshot, verify, treeHash, diffFiles };
if (require.main === module) {process.exit(main(process.argv.slice(2)));}
