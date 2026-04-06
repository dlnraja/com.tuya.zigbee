const fs = require('fs');
const glob = require('glob').sync;

glob('drivers/**/*.json').forEach(f => {
  let t = fs.readFileSync(f, 'utf8');
  let newT = t.replace(/"NON_SPECIFIED"/g, '"CR2450"');
  if (t !== newT) {
    fs.writeFileSync(f, newT);
    console.log('Fixed', f);
  }
});
