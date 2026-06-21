const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function fixFlowFile(p) {
  if (!p.endsWith('.json')) return;
  
  let original = fs.readFileSync(p, 'utf8');
  let t = original;
  
  // Quick check if we need to do anything
  if (!t.includes('"enum"') && !t.includes('"zone"') && !t.includes('"label"')) return;

  try {
    let json = JSON.parse(t);
    
    // recursive function to fix args arrays
    function fixArgs(obj) {
      if (Array.isArray(obj)) {
        obj.forEach(fixArgs);
      } else if (obj !== null && typeof obj === 'object') {
        if (obj.args && Array.isArray(obj.args)) {
          obj.args.forEach(arg => {
            if (arg.type === 'enum') arg.type = 'dropdown';
            if (arg.type === 'zone') arg.type = 'autocomplete';
            if (arg.values && Array.isArray(arg.values)) {
              arg.values.forEach(v => {
                if (v.label && !v.title) {
                  v.title = v.label;
                }
                delete v.label;
              });
            }
          });
        }
        for (let key in obj) {
          fixArgs(obj[key]);
        }
      }
    }
    
    fixArgs(json);
    
    let newContent = JSON.stringify(json, null, 2);
    // Preserve formatting if possible, or just overwrite
    if (original !== newContent) {
      fs.writeFileSync(p, newContent);
      console.log('Fixed', p);
    }
  } catch(e) {
    console.error('Failed to parse', p, e.message);
  }
}

console.log("Fixing .homeycompose...");
walkDir('.homeycompose', fixFlowFile);

console.log("Fixing drivers...");
walkDir('drivers', p => {
  if (p.endsWith('compose.json')) {
    fixFlowFile(p);
  }
});
