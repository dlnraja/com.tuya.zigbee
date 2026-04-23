const fs = require('fs');
const path = require('path');
const drivers = [
  'switch_2gang','switch_3gang','switch_4gang',
  'switch_wall_5gang','switch_wall_6gang','switch_wall_7gang','switch_wall_8gang',
  'wall_switch_2gang_1way','wall_switch_3gang_1way','wall_switch_4gang_1way'
];
drivers.forEach(dr => {
  const f = path.join('drivers', dr, 'device.js');
  let c = fs.readFileSync(f, 'utf8');
  // Fix: replace any occurrence that has magic||both but NOT already auto||magic||both
  // First clean up any doubled auto from previous bad fixes
  c = c.replace(/mode === 'auto' \|\| mode === 'auto' \|\| mode === 'magic'/g, "mode === 'auto' || mode === 'magic'");
  // Now fix: magic||both -> auto||magic||both (only where auto is not already present)
  c = c.replace(/\(mode === 'magic' \|\| mode === 'both'\)/g, "(mode === 'auto' || mode === 'magic' || mode === 'both')");
  fs.writeFileSync(f, c);
  // Verify
  const lines = c.split('\n');
  lines.forEach((l/i) => {
    if (l.includes('magic') && l.includes('both') && l.includes('scene'))
      console.log(dr + ':' + (i+1) + ' ' + l.trim());
  });
});
