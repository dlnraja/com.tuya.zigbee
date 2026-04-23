const fs = require('fs');
const path = require('path');
const targets = ['_TZ3000_0dumfk2z', '_TZE200_vvmbj46n', '_TZE200_pay2byax', '_TZ3000_bgsigers'];
const d = 'drivers';
targets.forEach(mfr => {
  const found = [];
  fs.readdirSync(d).forEach(dr => {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(d, dr, 'driver.compose.json'), 'utf8'));
      const z = c.zigbee;
      if (!z) return;
      const entries = Array.isArray(z) ? z : [z]      ;
      entries.forEach(entry => {
        if ((entry.manufacturerName || []).some(m => m.toLowerCase() === mfr.toLowerCase())) {
          found.push({ driver: dr, pids: entry.productId });
        }
      });
    } catch(e) {}
  });
  if (found.length === 0) console.log('NOT FOUND: ' + mfr);
  else found.forEach(f => console.log('FOUND: ' + mfr + ' -> ' + f.driver + ' (pids: ' + f.pids.join(',') + ')'));
});
