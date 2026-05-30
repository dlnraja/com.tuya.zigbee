const fs = require('fs'), path = require('path');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) results.push(...walk(fp));
    else if (f.endsWith('.js')) results.push(fp);
  }
  return results;
}

let fixed = 0, skipped = 0;

for (const fp of walk('drivers')) {
  let src = fs.readFileSync(fp, 'utf8');
  
  // Only process files that have onNodeInit but NOT super.onNodeInit
  if (!/\bonNodeInit\s*\(/.test(src)) continue;
  if (/super\.onNodeInit/.test(src)) { skipped++; continue; }
  
  // Find the opening of onNodeInit method body and inject super call
  // Pattern: async onNodeInit({ zclNode }) {\n  this.log(...)
  // We insert: await super.onNodeInit({ zclNode }); as first statement
  const newSrc = src.replace(
    /(async\s+onNodeInit\s*\(\s*\{[^)]*\}\s*\)\s*\{)/g,
    (match, p1) => {
      // Extract the parameter name (e.g. zclNode)
      const paramMatch = p1.match(/\{\s*([^}]+)\}/);
      const params = paramMatch ? paramMatch[0] : '{ zclNode }';
      return p1 + '\n    await super.onNodeInit(' + params + ').catch(() => {});';
    }
  );
  
  if (newSrc !== src) {
    fs.writeFileSync(fp, newSrc, 'utf8');
    console.log('FIXED: ' + fp.replace(process.cwd()+'\\','').replace(/\\/g,'/'));
    fixed++;
  }
}

console.log('\n=== RESULT ===');
console.log('Fixed:', fixed);
console.log('Skipped (already OK):', skipped);
