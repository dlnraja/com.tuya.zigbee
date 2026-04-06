const fs = require('fs');
const glob = require('glob').sync;

glob('drivers/**/*.json').forEach(f => {
  let t = fs.readFileSync(f, 'utf8');
  let newT = t.replace(/"other"/g, '"NON_SPECIFIED"');
  if (t !== newT) {
    fs.writeFileSync(f, newT);
    console.log('Fixed', f);
  }
});
