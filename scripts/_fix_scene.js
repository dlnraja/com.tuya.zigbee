const fs = require('fs');
const path = require('path');
const drivers = [
  'switch_2gang','switch_3gang','switch_4gang',
  'switch_wall_5gang','switch_wall_6gang','switch_wall_7gang','switch_wall_8gang',
  'wall_switch_2gang_1way','wall_switch_3gang_1way','wall_switch_4gang_1way'
];
const pattern = /mode === 'magic' \|\| mode === 'both'/g;
const replacement = "mode === 'auto' || mode === 'magic' || mode === 'both'";
drivers.forEach(dr => {
  const f = path.join('drivers', dr, 'device.js');
  let c = fs.readFileSync(f, 'utf8');
  const old = c;
  c = c.replace(pattern, replacement);
  if (c !== old) { fs.writeFileSync(f, c); console.log('Fixed:', dr); }
  else { console.log('No change:', dr); }
});
