const fs = require('fs'), path = require('path');

function scanDir(dir, ext) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const fp = path.join(d, f);
      const stat = fs.statSync(fp);
      if (stat.isDirectory() && !f.startsWith('.') && f !== 'node_modules' && f !== 'legacy') walk(fp);
      else if (f.endsWith(ext)) results.push(fp);
    }
  }
  walk(dir);
  return results;
}

const issues = { PF01: [], PF02: [], MANUAL_ID: [] };
const libFiles = scanDir('lib', '.js');
console.log('Scanning', libFiles.length, 'lib JS files...');

for (const fp of libFiles) {
  const lines = fs.readFileSync(fp, 'utf8').split('\n');
  const rel = fp.replace(process.cwd()+'\\','').replace(/\\/g,'/');
  lines.forEach((line, i) => {
    const ln = i + 1;
    if (/if.*return.*:.*null/.test(line)) issues.PF01.push(rel+':'+ln+': '+line.trim().substring(0,80));
    if (/Math\.round.*safeDivide.*\)\)/.test(line)) issues.PF02.push(rel+':'+ln+': '+line.trim().substring(0,80));
    if (/manufacturerName\s*={2,3}\s*["']|modelId\s*={2,3}\s*["']|productId\s*={2,3}\s*["']/.test(line))
      issues.MANUAL_ID.push(rel+':'+ln+': '+line.trim().substring(0,80));
  });
}

console.log('\nPF-01 (if/ternary):', issues.PF01.length);
issues.PF01.slice(0,5).forEach(x=>console.log('  '+x));
console.log('\nPF-02 (Math.round parens):', issues.PF02.length);
issues.PF02.forEach(x=>console.log('  '+x));
console.log('\nMANUAL_IDENTITY_COMPARE:', issues.MANUAL_ID.length);
issues.MANUAL_ID.slice(0,10).forEach(x=>console.log('  '+x));

const badFiles = new Set([...issues.PF01,...issues.PF02,...issues.MANUAL_ID].map(x=>x.split(':')[0]));
console.log('\nFiles with issues:', [...badFiles].join('\n  '));
