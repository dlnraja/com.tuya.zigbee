'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRV = path.join(ROOT, 'drivers');
const TMP = path.join(ROOT, '.tmp_tuya_zip_work');
const REFS = path.join(ROOT, 'refs');
const FP = path.join(REFS, 'fingerprints.json');
const RPT = path.join(ROOT, 'VERIFY_REPORT.md');

const BK = ['backup', 'final-release'].map(p => path.join(ROOT, p));

function j(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function w(p, o) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); }

function A(v) { return v == null ? [] : (Array.isArray(v) ? v : [v]); }

function* compFiles(d) {
  if (!fs.existsSync(d)) return;
  
  const st = [d];
  while (st.length) {
    const c = st.pop();
    let s;
    try { s = fs.statSync(c); } catch { continue; }
    
    if (s.isDirectory()) {
      for (const e of fs.readdirSync(c)) {
        const p = path.join(c, e);
        try {
          const ss = fs.statSync(p);
          if (ss.isDirectory()) {
            st.push(p);
          } else if (ss.isFile() && /driver(\.compose)?\.json$/i.test(p)) {
            yield p;
          }
        } catch {}
      }
    }
  }
}

function collect(d, tag) {
  const out = [];
  for (const c of compFiles(d)) {
    const o = j(c);
    if (!o) continue;
    
    const z = o.zigbee || {};
    const m = A(z.manufacturerName);
    const md = A(z.modelId || z.productId);
    
    if (m.length || md.length) {
      out.push({ tag, compose: c, mans: m, mods: md });
    }
  }
  return out;
}

function fps() {
  const map = new Map();
  const push = (m, id, src) => {
    const k = `${String(m || 'unk').slice(0, 48)}|${String(id || 'unk').slice(0, 64)}`.toLowerCase();
    if (!map.has(k)) {
      map.set(k, { manufacturerName: m, modelId: id, sources: new Set([src]) });
    } else {
      map.get(k).sources.add(src);
    }
  };
  
  for (const r of collect(DRV, 'repo')) {
    for (const m of r.mans) {
      for (const id of r.mods) {
        push(m, id, r.tag);
      }
    }
  }
  
  if (fs.existsSync(TMP)) {
    for (const r of collect(TMP, 'zip')) {
      for (const m of r.mans) {
        for (const id of r.mods) {
          push(m, id, r.tag);
        }
      }
    }
  }
  
  for (const b of BK) {
    if (fs.existsSync(b)) {
      for (const r of collect(b, 'backup')) {
        for (const m of r.mans) {
          for (const id of r.mods) {
            push(m, id, r.tag);
          }
        }
      }
    }
  }
  
  const o = {};
  for (const [k, v] of map.entries()) {
    o[k] = { manufacturerName: v.manufacturerName, modelId: v.modelId, sources: [...v.sources] };
  }
  return o;
}

function normName(n) {
  if (n == null) return { en: 'Tuya Device', fr: 'Appareil Tuya' };
  if (typeof n === 'string') return { en: n, fr: n };
  
  const o = { ...n };
  if (!o.en) o.en = Object.values(n)[0] || 'Tuya Device';
  if (!o.fr) o.fr = o.en;
  return o;
}

function mergeZ(z, mans, mods) {
  z = z || {};
  const M = new Set([...(A(z.manufacturerName)), ...mans].filter(Boolean));
  z.manufacturerName = [...M];
  
  const models = new Set([...(A(z.modelId)), ...(A(z.productId)), ...mods].filter(Boolean));
  z.modelId = [...models];
  
  return z;
}

function fixReadme() {
  const f = path.join(ROOT, 'README.md');
  let t = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '# Tuya Zigbee for Homey\n';
  
  t = t.replace(/.*publish.*\n/gi, '').replace(/.*store.*homey.*\n/gi, '');
  
  const blk = `## Installation (Test mode only)

- \`npm install\`
- \`npx homey app validate\`
- \`npx homey app run\` (Docker) or \`--remote\`

`;
  
  t = /##\s*Installation/i.test(t) ? t.replace(/##\s*Installation[\s\S]*?(?=\n##|\Z)/i, blk) : (t + '\n' + blk);
  
  if (!/##\s*Changelog/i.test(t)) {
    t += `\n## Changelog

See \`CHANGELOG_AUTO.md\` for automated additions/fixes.
`;
  }
  
  if (!/##\s*Drivers Coverage/i.test(t)) {
    t += `\n## Drivers Coverage

All additions are merged; drivers reorganized by domain/category/vendor/model.
`;
  }
  
  fs.writeFileSync(f, t);
}

(function() {
  const F = fps();
  w(FP, F);
  
  const rep = [];
  let cnt = 0, chg = 0;
  
  for (const c of compFiles(DRV)) {
    const o = j(c);
    if (!o) {
      rep.push(`- ${c}: unreadable`);
      continue;
    }
    
    let mod = false;
    
    const before = JSON.stringify(o.name);
    o.name = normName(o.name);
    if (JSON.stringify(o.name) !== before) {
      mod = true;
      rep.push(`* fixed name: ${c}`);
    }
    
    if (!Array.isArray(o.capabilities)) {
      o.capabilities = o.capabilities ? [o.capabilities].filter(Boolean) : [];
      mod = true;
      rep.push(`* fixed caps array: ${c}`);
    }
    
    const base = path.basename(path.dirname(c)).toLowerCase();
    const mans = [], mods = [];
    
    for (const k of Object.keys(F)) {
      const v = F[k];
      const ids = [].concat(v.modelId || []).map(x => String(x).toLowerCase());
      if (ids.some(x => x.includes(base)) || base.includes(String(v.manufacturerName || '').toLowerCase())) {
        mans.push(v.manufacturerName);
        mods.push(...ids);
      }
    }
    
    const bz = JSON.stringify(o.zigbee);
    o.zigbee = mergeZ(o.zigbee, [].concat(...mans).filter(Boolean), mods);
    if (JSON.stringify(o.zigbee) !== bz) {
      mod = true;
      rep.push(`* merged zigbee ids: ${c}`);
    }
    
    if (mod) {
      fs.writeFileSync(c, JSON.stringify(o, null, 2));
      chg++;
    }
    cnt++;
  }
  
  fixReadme();
  
  const lines = [
    `# Verify & Coherence Report`,
    '',
    `Drivers scanned: ${cnt}`,
    `Drivers modified: ${chg}`,
    '',
    `Fingerprints: ${Object.keys(F).length} (refs/fingerprints.json)`,
    '',
    ...rep
  ];
  
  fs.writeFileSync(RPT, lines.join('\n') + '\n');
  console.log('[verify] done; report at VERIFY_REPORT.md');
})();
