const path = require('path');
const fs = require('fs');
const ignore = require('ignore');
const ig = ignore.default().add(fs.readFileSync('.homeyignore','utf8'));
const base = process.cwd();
let totalSize = 0, fileCount = 0;
const bigFiles = [];
function walk(dir) {
  let e2; try { e2 = fs.readdirSync(dir, {withFileTypes:true}); } catch { return; }
  for (const e of e2) {
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full).replace(/\\/g,'/');
    try { if (ig.ignores(rel)) continue; } catch { continue; }
    if (e.isDirectory()) { walk(full); continue; }
    try { const s = fs.statSync(full).size; totalSize+=s; fileCount++; if(s>150000) bigFiles.push({rel,mb:Math.round(s/1024/1024*100)/100}); } catch {}
  }
}
walk(base);
bigFiles.sort((a,b)=>b.mb-a.mb);
const totalMB = Math.round(totalSize/1024/1024*100)/100;
console.log('ARCHIVE SIZE: '+totalMB+' MB ('+fileCount+' files)');
console.log(totalMB > 50 ? 'WARNING: Still > 50MB' : 'OK: Under 50MB');
console.log('\nFiles > 150KB:');
bigFiles.slice(0,12).forEach(f=>console.log('  '+f.mb+' MB -- '+f.rel));
const readme = ['README.txt','README.nl.txt','README.de.txt','README.fr.txt'];
console.log('\nREADME check:');
readme.forEach(f=>{try{console.log((ig.ignores(f)?'BAD-EXCLUDED':'OK-included')+' -- '+f);}catch{}});
