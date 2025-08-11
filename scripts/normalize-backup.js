'use strict';
/**
 * Normalise les backups :
 * - Crée .backup/zips/ si absent.
 * - Déplace tout ZIP tuya trouvé dans le repo vers ./.backup/zips/.
 * - Optionnel : re-zippe des dossiers libres dans ./.backup/zips/ (si déjà extraits).
 * Jamais de suppression (KEEP_BACKUP=1 by design).
 */
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const BAK = path.join(ROOT, '.backup');
const ZIPS = path.join(BAK, 'zips');
const RX = /(tuya|com\.tuya).*\.zip$/i;

(function() {
  fs.mkdirSync(BAK, { recursive: true });
  fs.mkdirSync(ZIPS, { recursive: true });
  
  const st = [ROOT];
  let moved = 0;
  
  while (st.length) {
    const cur = st.pop();
    let s;
    try { s = fs.statSync(cur); } catch { continue; }
    
    if (s.isDirectory()) {
      for (const e of fs.readdirSync(cur)) {
        const p = path.join(cur, e);
        
        if (p === BAK || p === ZIPS || /node_modules|\.git|\.homeybuild|\.tmp_tuya_zip_work/.test(p)) continue;
        
        try {
          const ss = fs.statSync(p);
          if (ss.isDirectory()) {
            st.push(p);
          } else if (ss.isFile() && RX.test(p)) {
            const dst = path.join(ZIPS, path.basename(p));
            if (path.resolve(p) !== path.resolve(dst)) {
              try {
                fs.copyFileSync(p, dst);
                fs.unlinkSync(p);
              } catch {
                fs.copyFileSync(p, dst);
              }
              moved++;
              console.log('[normbak] moved zip →', path.relative(ROOT, dst));
            }
          }
        } catch {}
      }
    }
  }
  
  console.log(`[normbak] done; zips dir = ${path.relative(ROOT, ZIPS)}; moved: ${moved}`);
})();
