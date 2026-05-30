const fs = require('fs'), path = require('path');
const driversDir = 'drivers';
const issues = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walk(fp);
    else if (f.endsWith('.js')) {
      const src = fs.readFileSync(fp, 'utf8');
      if (/onNodeInit\s*\(/.test(src) && !/super\.onNodeInit/.test(src)) {
        // Check if it's an override method (has 'async onNodeInit' or 'onNodeInit(')
        const lines = src.split('\n');
        const initLines = lines.filter(l => /\bonNodeInit\s*\(/.test(l) && !/\/\//.test(l));
        if (initLines.length > 0) {
          issues.push({ file: fp.replace(process.cwd()+'\\','').replace(/\\/g,'/'), lines: initLines.map(l=>l.trim()).slice(0,2) });
        }
      }
    }
  }
}

walk(driversDir);
walk('lib');
console.log('Drivers/lib missing super.onNodeInit():', issues.length);
issues.slice(0,20).forEach(i => console.log('  '+i.file+': '+i.lines[0].substring(0,60)));
if(issues.length>20) console.log('  ...and '+(issues.length-20)+' more');
