'use strict';
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const CWD = process.cwd();
const TMP = path.join(CWD, '.tmp_tuya_zip_work');
const BAK = path.join(CWD, '.backup', 'zips');
const RX = /(tuya|com\.tuya).*\.zip$/i;

function drives() {
  const a = [];
  if (process.platform === 'win32') {
    for (const L of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
      const r = `${L}:\\`;
      try {
        if (fs.existsSync(r)) a.push(r);
      } catch {}
    }
  }
  return a;
}

function findZips(roots, limit = 3000) {
  const out = [];
  for (const root of roots) {
    try {
      if (!fs.existsSync(root)) continue;
      
      const st = [root];
      while (st.length) {
        const cur = st.pop();
        let s;
        try { s = fs.statSync(cur); } catch { continue; }
        
        if (s.isDirectory()) {
          for (const e of fs.readdirSync(cur)) {
            const p = path.join(cur, e);
            try {
              const ss = fs.statSync(p);
              if (ss.isDirectory()) {
                st.push(p);
              } else if (ss.isFile() && RX.test(p)) {
                out.push(p);
                if (out.length >= limit) return out;
              }
            } catch {}
          }
        }
      }
    } catch {}
  }
  return out;
}

async function extract(zip, out) {
  try {
    const ez = require('extract-zip');
    await ez(zip, { dir: out });
    return { ok: true, method: 'extract-zip' };
  } catch {}
  
  if (process.platform === 'win32') {
    const cmd = `Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${out.replace(/'/g, "''")}' -Force`;
    const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', cmd], { stdio: 'pipe' });
    
    if (r.status === 0) return { ok: true, method: 'Expand-Archive' };
    return { ok: false, method: 'Expand-Archive', error: r.stderr?.toString() || 'Expand-Archive failed' };
  }
  
  const r = spawnSync('unzip', ['-o', zip, '-d', out], { stdio: 'pipe' });
  if (r.status === 0) return { ok: true, method: 'unzip' };
  return { ok: false, method: 'unzip', error: r.stderr?.toString() || 'unzip failed' };
}

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  
  const home = os.homedir();
  const roots = [BAK, CWD, path.join(home, 'Desktop'), path.join(home, 'Downloads'), path.join(home, 'Documents'), ...drives()];
  
  const z = findZips(roots);
  const sum = { searched: roots, found: z.length, items: [], errors: [] };
  
  if (!z.length) {
    console.log('[ingest] no Tuya zips found');
    await fsp.writeFile(path.join(TMP, 'summary.json'), JSON.stringify(sum, null, 2));
    return;
  }
  
  for (const src of z) {
    const base = path.basename(src);
    const dst = path.join(TMP, base);
    const out = path.join(TMP, path.basename(base, '.zip'));
    
    try {
      if (!fs.existsSync(dst)) await fsp.copyFile(src, dst);
      fs.mkdirSync(out, { recursive: true });
      
      // seulement si pas déjà extrait (heuristique: présence d'un compose)
      const hasCompose = ['driver.compose.json', 'driver.json'].some(n => fs.existsSync(path.join(out, n)));
      
      if (!hasCompose || !fs.existsSync(out) || !fs.readdirSync(out).length) {
        const res = await extract(dst, out);
        sum.items.push({ src, copiedTo: dst, outDir: out, method: res.method, ok: res.ok });
        if (!res.ok) sum.errors.push({ src, error: res.error });
        console.log(`[ingest] ${base} -> ${res.method} (${res.ok ? 'OK' : 'FAIL'})`);
      } else {
        sum.items.push({ src, cached: true });
      }
    } catch (e) {
      sum.errors.push({ src, error: String(e) });
    }
  }
  
  await fsp.writeFile(path.join(TMP, 'summary.json'), JSON.stringify(sum, null, 2));
  console.log('[ingest] summary.json written (persistent)');
})().catch(e => {
  console.error('[ingest] fatal', e);
  process.exitCode = 1;
});
