'use strict';
const fs = require('fs'), fsp = require('fs/promises'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const { extractZipPrefer7z, extractZipPrefer7zAsync } = require('./utils/archiver');

const CWD = process.cwd();
const TMP = path.join(CWD, '.tmp_tuya_zip_work');
const BAK = path.join(CWD, '.backup', 'zips');
const MANIFEST = path.join(TMP, 'ingest-manifest.json');
const RX = /(tuya|com\.tuya).*\.zip$/i;

function drives() {
  const a = [];
  if (process.platform === 'win32') {
    for (const L of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
      const r = `${L}:\\`;
      try { if (fs.existsSync(r)) a.push(r); } catch (e) {}
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
        let s; try { s = fs.statSync(cur); } catch (e) { continue; }
        if (s.isDirectory()) {
          for (const e of fs.readdirSync(cur)) {
            const p = path.join(cur, e);
            try {
              const ss = fs.statSync(p);
              if (ss.isDirectory()) st.push(p);
              else if (ss.isFile() && RX.test(p)) {
                out.push(p);
                if (out.length >= limit) return out;
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {}
  }
  return out;
}

async function extract(zip, out) {
  // Utilise la version asynchrone pour permettre du parallélisme
  return await extractZipPrefer7zAsync(zip, out);
}

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (_) { manifest = {}; }
  const home = os.homedir();
  const roots = [BAK, CWD, path.join(home, 'Desktop'), path.join(home, 'Downloads'), path.join(home, 'Documents'), ...drives()];

  const z = findZips(roots);
  const sum = { searched: roots, found: z.length, items: [], errors: [] };

  if (!z.length) {
    console.log('[ingest] no Tuya zips found');
    await fsp.writeFile(path.join(TMP, 'summary.json'), JSON.stringify(sum, null, 2));
    return;
  }

  // Parallélisme contrôlé selon la puissance du PC
  const cpuCount = require('os').cpus()?.length || 2;
  const concurrency = Math.min(6, Math.max(2, cpuCount - 1)); // limite supérieure pour éviter surcharge
  const queue = z.slice();
  const workers = [];

  async function worker() {
    while (queue.length) {
      const src = queue.shift();
      const base = path.basename(src);
      const dst = path.join(TMP, base);
      const out = path.join(TMP, path.basename(base, '.zip'));
      try {
        let srcStat=null; try { srcStat = fs.statSync(src); } catch(_) {}
        const key = base;
        const prev = manifest[key];
        const marker = path.join(out, '.extracted.ok');
        const failMarker = path.join(out, '.extracted.fail');
        const unchanged = prev && srcStat && prev.size === srcStat.size && prev.mtimeMs === srcStat.mtimeMs;
        // Skip immédiat si corrompu et inchangé
        if (unchanged && prev && prev.status === 'corrupt' && fs.existsSync(failMarker)) {
          sum.items.push({ src, skipped: 'corrupt', outDir: out });
          continue;
        }
        if (unchanged && fs.existsSync(out) && fs.existsSync(marker)) {
          sum.items.push({ src, cached: true, outDir: out });
          continue;
        }
        if (!fs.existsSync(dst)) await fsp.copyFile(src, dst);
        fs.mkdirSync(out, { recursive: true });
        const hasCompose = ['driver.compose.json', 'driver.json'].some(n => fs.existsSync(path.join(out, n)));
        const needExtract = !hasCompose || !fs.existsSync(out) || !fs.readdirSync(out).length || (!fs.existsSync(marker) && !fs.existsSync(failMarker));
        if (needExtract) {
          const res = await extract(dst, out);
          sum.items.push({ src, copiedTo: dst, outDir: out, method: res.method, ok: res.ok });
          if (!res.ok) {
            sum.errors.push({ src, error: res.error });
            try { fs.writeFileSync(failMarker, String(res.error || 'extract failed')); } catch(_) {}
            if (srcStat) manifest[key] = { status: 'corrupt', size: srcStat.size, mtimeMs: srcStat.mtimeMs, outDir: path.relative(CWD, out) };
            console.log(`[ingest] ${base} -> ${res.method} (FAIL, skipped next runs)`);
          } else {
            try { fs.writeFileSync(marker, 'ok'); } catch(_) {}
            try { if (fs.existsSync(failMarker)) fs.unlinkSync(failMarker); } catch(_) {}
            if (srcStat) manifest[key] = { status: 'ok', size: srcStat.size, mtimeMs: srcStat.mtimeMs, outDir: path.relative(CWD, out) };
            console.log(`[ingest] ${base} -> ${res.method} (OK)`);
          }
        } else {
          if (fs.existsSync(failMarker) && prev && prev.status === 'corrupt' && unchanged) {
            sum.items.push({ src, skipped: 'corrupt' });
          } else {
            sum.items.push({ src, cached: true });
          }
        }
      } catch (e) {
        sum.errors.push({ src, error: String(e) });
      }
    }
  }

  for (let i = 0; i < concurrency; i++) workers.push(worker());
  await Promise.all(workers);

  try { fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2)); } catch(_) {}
  await fsp.writeFile(path.join(TMP, 'summary.json'), JSON.stringify(sum, null, 2));
  console.log('[ingest] summary.json written (persistent)');
})().catch(e => {
  console.error('[ingest] fatal', e);
  process.exitCode = 1;
});
