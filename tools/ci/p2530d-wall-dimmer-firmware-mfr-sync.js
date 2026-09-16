'use strict';
const fs = require('fs');
const path = require('path');

function fix(root) {
  const rel = 'drivers/wall_dimmer_tuya/driver.compose.json';
  const p = path.join(root, rel);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const names = j.zigbee.manufacturerName || [];
  // Prefer exact form already present (unionStrings is case-insensitive)
  const existing = names.find((m) => String(m).toLowerCase() === '_tz3210_ngqk6jia');
  const canon = existing || '_TZ3210_ngqk6jia';
  if (!existing) {
    names.push(canon);
    j.zigbee.manufacturerName = names;
  }
  if (j.firmwareUpdates?.updates?.[0]?.device) {
    j.firmwareUpdates.updates[0].device.manufacturerName = [canon];
  }
  fs.writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
  console.log(root, 'firmware mfr=', canon);
}

fix(path.resolve(__dirname, '../..'));
fix(path.resolve(__dirname, '../../../stable'));
