const d = require('fs'), path = require('path');
let utf16Count = 0;
function walk(dir) {
  try {
    d.readdirSync(dir).forEach(f => {
      const fp = path.join(dir, f);
      try {
        if (d.statSync(fp).isDirectory()) { walk(fp); }
        else if (f.endsWith('.js')) {
          const c = d.readFileSync(fp, 'utf8');
          // The TITAN check: JSON.parse(fs.readFileSync...'utf8')
          if (c.includes('JSON.parse(fs.readFileSync') && c.includes("'utf8'")) {
            utf16Count++;
            console.log('FOUND:', fp);
            // Show the line
            c.split('\n').forEach((line, i) => {
              if (line.includes('JSON.parse(fs.readFileSync') && line.includes("'utf8'")) {
                console.log('  line', i+1, ':', line.trim());
              }
            });
          }
        }
      } catch(e) {}
    });
  } catch(e) {}
}
walk('lib');
console.log('Total utf16 JSON loading:', utf16Count);
