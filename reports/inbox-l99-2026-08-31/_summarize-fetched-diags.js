'use strict';
const fs = require('fs');
const path = require('path');

function summarize(id) {
  const p = path.join('.github/state/homey-app-diag', `${id}.sanitized.json`);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const s = j.logSanitized || '';
  const lines = s.split(/\n/);
  const um = [];
  let grab = false;
  for (const l of lines) {
    if (/User Message/i.test(l)) {
      grab = true;
      um.push(l);
      continue;
    }
    if (grab) {
      if (/^\s*stdout:|^\s*stderr:|^\d{4}-/.test(l) && um.length > 1) break;
      um.push(l);
      if (um.length > 10) break;
    }
  }
  console.log(`\n======== ${id.slice(0, 8)} v${j.version} Homey ${j.homeyVersion}`);
  console.log(um.join('\n').slice(0, 600));
  const interesting = lines
    .filter((l) => /m1cvyneb|zgyzgdua|clrdrnya|5slehgeo|Unknown|wall_dimmer|scene_switch|curtain_motor|presence_sensor|Error:|TypeError|FAILED|onoff|dim |TX |EF00|magic|heal|Driver:/i.test(l))
    .slice(0, 30);
  console.log('---hits---');
  console.log(interesting.join('\n').slice(0, 3000));
}

for (const id of [
  '60959c24-a0e6-4159-8cf1-12f9ba5df612',
  '8c49c683-294c-4965-ade1-e165c56a06e9',
  'c40705a1-9b08-444b-868f-c5a14ca4d2b2',
  'b3bd114a-4861-43a0-8201-6a9f4bc547e8',
  '8cc4aef0-a486-4cb1-badd-087ed84f43da',
]) {
  summarize(id);
}
