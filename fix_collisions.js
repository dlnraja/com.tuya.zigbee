const fs = require('fs');
const dirs = ['generic_diy', 'air_purifier_presence', 'motion_sensor_2', 'radar_sensor_ceiling', 'radar_sensor_2', 'motion_sensor', 'bed_sensor'];
dirs.forEach(d => {
  const p = 'drivers/' + d + '/driver.compose.json';
  if (!fs.existsSync(p)) return;
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/\s*"_tze20[04]_3towulqd",?/gi, '');
  c = c.replace(/\s*"_tz3000_3towulqd",?/gi, '');
  fs.writeFileSync(p, c);
});
console.log('Removed from colliders');
