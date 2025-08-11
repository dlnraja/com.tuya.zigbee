'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync, spawn } = require('child_process');

function which(cmd) {
  const paths = (process.env.PATH || '').split(path.delimiter);
  for (const p of paths) {
    const full = path.join(p, cmd);
    if (fs.existsSync(full)) return full;
    if (process.platform === 'win32' && fs.existsSync(full + '.exe')) return full + '.exe';
  }
  return null;
}

function find7z() {
  if (process.platform === 'win32') {
    const candidates = [
      'C:/Program Files/7-Zip/7z.exe',
      'C:/Program Files (x86)/7-Zip/7z.exe'
    ];
    for (const c of candidates) if (fs.existsSync(c)) return c;
  }
  const inPath = which('7z') || which('7zz');
  return inPath;
}

function try7zExtract(zip, outDir) {
  const seven = find7z();
  if (!seven) return { ok: false, method: '7z', error: '7z not found' };
  const args = ['x', '-y', `-o${outDir}`, zip];
  const r = spawnSync(seven, args, { stdio: 'pipe' });
  if (r.status === 0) return { ok: true, method: '7z' };
  return { ok: false, method: '7z', error: r.stderr?.toString() || '7z failed' };
}

function try7zExtractAsync(zip, outDir, timeoutMs = 180000) {
  return new Promise((resolve) => {
    const seven = find7z();
    if (!seven) return resolve({ ok: false, method: '7z', error: '7z not found' });
    const args = ['x', '-y', `-o${outDir}`, zip];
    const child = spawn(seven, args, { stdio: 'ignore' });
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) {}
      resolve({ ok: false, method: '7z', error: `timeout ${timeoutMs}ms` });
    }, timeoutMs);
    child.on('error', (err) => resolve({ ok: false, method: '7z', error: String(err) }));
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ ok: true, method: '7z' });
      else resolve({ ok: false, method: '7z', error: `exit ${code}` });
    });
  });
}

function tryExtractZipModule(zip, outDir) {
  try {
    const ez = require('extract-zip');
    ez.sync ? ez.sync(zip, { dir: outDir }) : null; // no-op if async only
    // If only async available, run via child node
    if (!ez.sync) {
      const r = spawnSync(process.execPath, ['-e', `require('extract-zip')('${zip.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', { dir: '${outDir.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}' }).then(()=>process.exit(0)).catch(()=>process.exit(2))`], { stdio: 'ignore' });
      if (r.status !== 0) throw new Error('extract-zip child failed');
    }
    return { ok: true, method: 'extract-zip' };
  } catch (e) {
    // try async inline
    try {
      const ez = require('extract-zip');
      const r = spawnSync(process.execPath, ['-e', `require('extract-zip')('${zip.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', { dir: '${outDir.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}' }).then(()=>process.exit(0)).catch(()=>process.exit(2))`], { stdio: 'ignore' });
      if (r.status === 0) return { ok: true, method: 'extract-zip' };
    } catch (_) {}
  }
  return { ok: false, method: 'extract-zip', error: 'extract-zip not available' };
}

function tryExtractZipModuleAsync(zip, outDir, timeoutMs = 180000) {
  return new Promise(async (resolve) => {
    try {
      const ez = require('extract-zip');
      const timeout = new Promise((r) => setTimeout(() => r('TIMEOUT'), timeoutMs));
      const result = await Promise.race([ez(zip, { dir: outDir }), timeout]);
      if (result === 'TIMEOUT') return resolve({ ok: false, method: 'extract-zip', error: `timeout ${timeoutMs}ms` });
      return resolve({ ok: true, method: 'extract-zip' });
    } catch (e) {
      resolve({ ok: false, method: 'extract-zip', error: String(e) });
    }
  });
}

function tryPowershellExpand(zip, outDir) {
  if (process.platform !== 'win32') return { ok: false, method: 'Expand-Archive', error: 'non-windows' };
  const cmd = `Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${outDir.replace(/'/g, "''")}' -Force`;
  const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', cmd], { stdio: 'pipe' });
  if (r.status === 0) return { ok: true, method: 'Expand-Archive' };
  return { ok: false, method: 'Expand-Archive', error: r.stderr?.toString() || 'Expand-Archive failed' };
}

function tryPowershellExpandAsync(zip, outDir, timeoutMs = 180000) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve({ ok: false, method: 'Expand-Archive', error: 'non-windows' });
    const cmd = `Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${outDir.replace(/'/g, "''")}' -Force`;
    const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', cmd], { stdio: 'ignore' });
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) {}
      resolve({ ok: false, method: 'Expand-Archive', error: `timeout ${timeoutMs}ms` });
    }, timeoutMs);
    child.on('error', (err) => resolve({ ok: false, method: 'Expand-Archive', error: String(err) }));
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve(code === 0 ? { ok: true, method: 'Expand-Archive' } : { ok: false, method: 'Expand-Archive', error: `exit ${code}` });
    });
  });
}

function tryUnzip(zip, outDir) {
  const r = spawnSync('unzip', ['-o', zip, '-d', outDir], { stdio: 'pipe' });
  if (r.status === 0) return { ok: true, method: 'unzip' };
  return { ok: false, method: 'unzip', error: r.stderr?.toString() || 'unzip failed' };
}

function tryUnzipAsync(zip, outDir, timeoutMs = 180000) {
  return new Promise((resolve) => {
    const child = spawn('unzip', ['-o', zip, '-d', outDir], { stdio: 'ignore' });
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) {}
      resolve({ ok: false, method: 'unzip', error: `timeout ${timeoutMs}ms` });
    }, timeoutMs);
    child.on('error', (err) => resolve({ ok: false, method: 'unzip', error: String(err) }));
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve(code === 0 ? { ok: true, method: 'unzip' } : { ok: false, method: 'unzip', error: `exit ${code}` });
    });
  });
}

function extractZipPrefer7z(zip, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  // 1) 7z
  let res = try7zExtract(zip, outDir);
  if (res.ok) return res;
  // 2) extract-zip
  res = tryExtractZipModule(zip, outDir);
  if (res.ok) return res;
  // 3) Expand-Archive (Windows)
  res = tryPowershellExpand(zip, outDir);
  if (res.ok) return res;
  // 4) unzip
  res = tryUnzip(zip, outDir);
  return res;
}

module.exports = { extractZipPrefer7z, find7z };

async function extractZipPrefer7zAsync(zip, outDir, timeoutMs = 180000) {
  fs.mkdirSync(outDir, { recursive: true });
  let res = await try7zExtractAsync(zip, outDir, timeoutMs);
  if (res.ok) return res;
  res = await tryExtractZipModuleAsync(zip, outDir, timeoutMs);
  if (res.ok) return res;
  res = await tryPowershellExpandAsync(zip, outDir, timeoutMs);
  if (res.ok) return res;
  res = await tryUnzipAsync(zip, outDir, timeoutMs);
  return res;
}

module.exports.extractZipPrefer7zAsync = extractZipPrefer7zAsync;
