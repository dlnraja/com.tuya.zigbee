const fs = require('fs');
const glob = require('glob');
const files = glob.sync('drivers/wall_switch_*_1way/driver.flow.compose.json');
files.push('drivers/wall_dimmer_1gang_1way/driver.flow.compose.json');
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let j = JSON.parse(fs.readFileSync(f, 'utf8'));
  let changed = false;
  if (j.triggers) {
    for (const t of j.triggers) {
      if (t.titleFormatted) {
         delete t.titleFormatted;
         changed = true;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(f, JSON.stringify(j, null, 2));
    console.log('Fixed ' + f);
  }
}
