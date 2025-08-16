#!/usr/bin/env node
'use strict';

'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { extract } = require('./utils/archiver');

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
      } catch (e) {
        // Ignore les erreurs de lecteur
      }
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
        try {
          s = fs.statSync(cur);
        } catch (e) {
          continue;
        }
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
            } catch (e) {
              // Ignore les erreurs de fichier
            }
          }
        }
      }
    } catch (e) {
      // Ignore les erreurs de répertoire
    }
  }
  return out;
}

async function ingestOne(src, sum) {
  const base = path.basename(src);
  const dst = path.join(TMP, base);
  const out = path.join(TMP, path.basename(base, '.zip'));
  
  try {
    if (!fs.existsSync(dst)) {
      await fsp.copyFile(src, dst);
    }
    
    const hasCompose = ['driver.compose.json', 'driver.json'].some(n => 
      fs.existsSync(path.join(out, n))
    );
    
    if (!hasCompose || !fs.existsSync(out) || !fs.readdirSync(out).length) {
      fs.mkdirSync(out, { recursive: true });
      const res = extract(dst, out, {
        timeoutSec: Number(process.env.TIMEOUT_EXTRACT || 240),
        use7z: process.env.USE_7Z !== '0'
      });
      
      sum.items.push({
        src,
        copiedTo: dst,
        outDir: out,
        method: res.method,
        ok: res.ok
      });
      
      if (!res.ok) {
        sum.errors.push({ src, error: res.error });
      }
      
      console.log(`[ingest] ${base} -> ${res.method} (${res.ok ? 'OK' : 'FAIL'})`);
    } else {
      sum.items.push({ src, cached: true });
    }
  } catch (e) {
    sum.errors.push({ src, error: String(e) });
  }
}

async function main() {
  try {
    fs.mkdirSync(TMP, { recursive: true });
    
    const home = os.homedir();
    const roots = [
      BAK, 
      CWD, 
      path.join(home, 'Desktop'), 
      path.join(home, 'Downloads'), 
      path.join(home, 'Documents'), 
      ...drives()
    ];
    
    const z = findZips(roots);
    const sum = {
      searched: roots,
      found: z.length,
      items: [],
      errors: []
    };
    
    if (!z.length) {
      console.log('[ingest] no Tuya zips found');
      await fsp.writeFile(path.join(TMP, 'summary.json'), JSON.stringify(sum, null, 2));
      return;
    }
    
    const PAR = Number(process.env.TUYA_PARALLEL_LIMIT || 4);
    let i = 0;
    
    async function next() {
      if (i >= z.length) return;
      const cur = i++;
      await ingestOne(z[cur], sum);
      await next();
    }
    
    await Promise.all(Array.from({ length: Math.min(PAR, z.length) }, () => next()));
    
    await fsp.writeFile(path.join(TMP, 'summary.json'), JSON.stringify(sum, null, 2));
    console.log('[ingest] summary.json written (persistent)');
    
  } catch (e) {
    console.error('[ingest] fatal', e);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, findZips, ingestOne };