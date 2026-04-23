const fs = require('fs');
const path = require('path');
const d = 'drivers';
let fixed = 0, already = 0;
fs.readdirSync(d).forEach(dr => {
  try {
    const f = path.join(d, dr, 'device.js');
    let c = fs.readFileSync(f, 'utf8');
    const orig = c;
    // Clean doubled auto from prior bad fixes
    while (c.includes("'auto' || mode === 'auto'")) {
      c = c.replace("'auto' || mode === 'auto'", "'auto'");
    }
    // Fix: magic||both without auto -> auto||magic||both
    while (c.includes("(mode === 'magic' || mode === 'both')")) {
      c = c.replace("(mode === 'magic' || mode === 'both')", "(mode === 'auto' || mode === 'magic' || mode === 'both')");
    }
    if (c !== orig) { fs.writeFileSync(f, c); fixed++; console.log('Fixed: ' + dr); }
  } catch(e) {}
});
// Verify
let bad = 0;
fs.readdirSync(d).forEach(dr => {
  try {
    const f = path.join(d, dr, 'device.js');
    const c = fs.readFileSync(f, 'utf8');
    const lines = c.split('\n');
    lines.forEach((l/i) => {
      if (l.includes("'magic'") && l.includes("'both'") && !l.includes("'auto'")) {
        console.log('STILL BAD: ' + dr + ':' + (i+1));
        bad++;
      }
    });
  } catch(e) {}
});
console.log('Fixed: ' + fixed + ', Still bad: ' + bad);
