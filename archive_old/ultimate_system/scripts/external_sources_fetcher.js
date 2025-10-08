#!/usr/bin/env node
/*
 * external_sources_fetcher.js
 * --------------------------------------------------------------
 * Reads references/external_sources.json, fetches each URL, extracts
 * Tuya-like manufacturers (patterns like '_TZ*', '_TZE*') and product IDs ('TSxxxx'), then
 * writes timestamped files into .external_sources/ for enrichment.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CONFIG = path.join(ROOT, 'references', 'external_sources.json');
const OUT_DIR = path.join(ROOT, '.external_sources');

function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }
function fetchUrl(url, timeout = 20000){
  return new Promise((resolve)=>{
    const req = https.get(url, { timeout, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res)=>{
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      let data=''; res.on('data', ch => data+=ch); res.on('end', ()=> resolve(data));
    });
    req.on('error', ()=> resolve(null));
    req.on('timeout', ()=> { req.destroy(); resolve(null); });
  });
}
function extractManufacturers(text){ if(!text) return []; const re=/(?:^|[^A-Z0-9])(_(?:TZ\d{3,4}|TZE\d{3}|TZ3040|TZ3500|TZ3600)_[A-Za-z0-9_\-]+)(?![A-Z0-9])/g; const set=new Set(); let m; while((m=re.exec(text))!==null){ set.add(m[1]); } return Array.from(set); }
function extractProductIds(text){ if(!text) return []; const re=/(TS\d{3,4}[A-Z]?)/g; const set=new Set(); let m; while((m=re.exec(text))!==null){ set.add(m[1].toUpperCase()); } return Array.from(set); }

async function main(){
  ensureDir(OUT_DIR);
  const cfg = JSON.parse(fs.readFileSync(CONFIG,'utf8'));
  const outputs = [];
  for (const s of cfg.sources || []){
    const html = await fetchUrl(s.url);
    const manufacturers = extractManufacturers(html).sort();
    const productIds = extractProductIds(html).sort();
    const payload = {
      generatedAt: new Date().toISOString(),
      source: s,
      counts: { manufacturers: manufacturers.length, productIds: productIds.length },
      manufacturers,
      productIds
    };
    const slug = (s.name || s.url).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
    const outFile = path.join(OUT_DIR, `${slug}_${Date.now()}.json`);
    fs.writeFileSync(outFile, JSON.stringify(payload,null,2),'utf8');
    outputs.push({ file: path.relative(ROOT, outFile), counts: payload.counts });
    console.log(`✅ Fetched ${s.name || s.url}: ${manufacturers.length} manufacturers, ${productIds.length} productIds`);
  }
  const indexFile = path.join(OUT_DIR, 'index.json');
  fs.writeFileSync(indexFile, JSON.stringify({ generatedAt: new Date().toISOString(), outputs }, null, 2), 'utf8');
  console.log(`📝 Index written: ${path.relative(ROOT, indexFile)}`);
}

if (require.main===module){ main().catch(e=>{ console.error('❌ external_sources_fetcher failed:', e.message); process.exit(1); }); }

module.exports = { main };
