#!/usr/bin/env node
'use strict';

/**
 * P3356: ratchet on the packed upload archive. Athom builds #3708-#3710 failed in processing
 * (socket hang up / bare AggregateError) right after uploading a 31.7 MB tar of 3853 files.
 * This measures the exact tar stream the Homey CLI uploads (node_modules/homey/lib/App.js
 * _getPackStream: tar-fs pack, dereference, every entry incl. dotfiles and directory headers,
 * only "/.git/" paths skipped) and fails when the file count or the tar bytes exceed
 * config/upload-archive-ceiling.json.
 *
 *   node scripts/ci/upload-archive-ceiling.cjs <dir>            final upload dir (with node_modules)
 *   node scripts/ci/upload-archive-ceiling.cjs <dir> --app-only  app part only (no node_modules), for
 *                                                                Platform Budget before npm ci
 * Exit 1 on a breach or a missing dir. Lower the ceiling when the archive shrinks; raise it only
 * with a reviewed reason in the policy's "history".
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const POLICY = path.join(ROOT, 'config', 'upload-archive-ceiling.json');
const BLOCK = 512;

function policy(file = POLICY) {
  const p = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const k of ['maxFiles', 'maxTarBytes']) {
    if (!Number.isInteger(p[k]) || p[k] <= 0) throw new Error(`${k} missing`);
    if (!p.appOnly || !Number.isInteger(p.appOnly[k]) || p.appOnly[k] <= 0) throw new Error(`appOnly.${k} missing`);
  }
  return p;
}

const pad = (n) => Math.ceil(n / BLOCK) * BLOCK;

// ustar header 512 B; names that do not fit ustar name/prefix get a PAX header (512 + padded record).
function headerBytes(name) {
  if (Buffer.byteLength(name) <= 100) return BLOCK;
  const i = name.lastIndexOf('/', 155);
  if (i > 0 && Buffer.byteLength(name.slice(0, i)) <= 155 && Buffer.byteLength(name.slice(i + 1)) <= 100) return BLOCK;
  const rec = ` path=${name}\n`;
  let len = Buffer.byteLength(rec) + 2;
  len += String(len).length - 2 + String(len + String(len).length).length - String(len).length;
  return BLOCK + pad(len) + BLOCK;
}

function measureArchive(dir, { appOnly = false } = {}) {
  let files = 0, tarBytes = 2 * BLOCK, payloadBytes = 0;
  (function walk(abs, rel) {
    const name = rel || '.';
    if (rel && (`/${rel}/`).includes('/.git/')) return;
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      tarBytes += headerBytes(rel ? `${rel}/` : name);
      for (const e of fs.readdirSync(abs).sort()) {
        if (appOnly && !rel && e === 'node_modules') continue;
        walk(path.join(abs, e), rel ? `${rel}/${e}` : e);
      }
    } else if (st.isFile()) {
      files++;
      payloadBytes += st.size;
      tarBytes += headerBytes(name) + pad(st.size);
    }
  })(path.resolve(dir), '');
  return { files, tarBytes, payloadBytes, mb: +(tarBytes / 1048576).toFixed(2) };
}

// Exact measure with the CLI's own tar-fs (resolved through the homey package); null when unavailable.
function measureArchiveExact(dir) {
  let tar;
  try { tar = require(require.resolve('tar-fs', { paths: [path.dirname(require.resolve('homey', { paths: [ROOT] }))] })); } catch (_) { return Promise.resolve(null); }
  return new Promise((resolve, reject) => {
    let files = 0, tarBytes = 0;
    tar.pack(path.resolve(dir), {
      dereference: true,
      map(h) { if (h.type === 'file') files++; },
      ignore(name) { return name.startsWith('.') || name.includes('/.git/'); },
    }).on('data', (c) => { tarBytes += c.length; }).on('end', () => resolve({ files, tarBytes })).on('error', reject);
  });
}

function check(m, pol = policy()) {
  const over = [];
  if (m.files > pol.maxFiles) over.push(`${m.files} files > ceiling ${pol.maxFiles}`);
  if (m.tarBytes > pol.maxTarBytes) over.push(`${m.tarBytes} tar bytes > ceiling ${pol.maxTarBytes}`);
  return { ok: over.length === 0, over };
}

function main() {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith('--'));
  const appOnly = args.includes('--app-only');
  if (!dir || !fs.existsSync(path.join(dir, 'app.json'))) {
    console.error(`::error::[upload-archive-ceiling] no upload package at ${dir || '(no path)'} (app.json missing)`);
    process.exit(1);
  }
  const pol = policy();
  const ceil = appOnly ? pol.appOnly : pol;
  const m = measureArchive(dir, { appOnly });
  const r = check(m, ceil);
  console.log(`[upload-archive-ceiling]${appOnly ? ' app part' : ''} ${m.files} files (ceiling ${ceil.maxFiles}), tar ${m.mb} MB = ${m.tarBytes} B (ceiling ${ceil.maxTarBytes})`);
  if (!r.ok) {
    console.error(`::error::[upload-archive-ceiling] upload archive grew past the P3356 ratchet: ${r.over.join('; ')}. Drop unused files (scripts/maintenance/lossless-shrink-payload.cjs) or justify a raise in config/upload-archive-ceiling.json.`);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { policy, measureArchive, measureArchiveExact, check, headerBytes };
