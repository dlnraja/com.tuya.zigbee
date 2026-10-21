#!/usr/bin/env node
'use strict';
// P2926 — static coverage report: every button/remote/scene/knob driver and the paths it listens on.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const drv = path.join(root, 'drivers');
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch (_e) { return ''; } };
const mixin = read(path.join(root, 'lib/mixins/PhysicalButtonMixin.js'));
const btnDev = read(path.join(root, 'lib/devices/ButtonDevice.js'));
const NAME = /button|remote|scene|knob|wall_switch|switch_wall|dimmer_wall|wall_remote/i;
const rows = [];
for (const id of fs.readdirSync(drv).sort()) {
  const src = read(path.join(drv, id, 'device.js'));
  if (!src) { continue; }
  const isBtn = /extends\s+[\w(]*ButtonDevice\b/.test(src);
  const isMix = /PhysicalButtonMixin|extends\s+(UnifiedSwitchBase|TuyaSpecificClusterDevice|TuyaZigbeeDevice)\b/.test(src);
  if (!NAME.test(id) && !isBtn) { continue; }
  if (!isBtn && !isMix && !/_triggerPhysicalFlow|triggerButtonPress/.test(src)) { continue; }
  const base = isBtn ? 'ButtonDevice' : isMix ? 'PhysicalButtonMixin' : 'own';
  const p = new Set();
  const inherits = isBtn || isMix;
  const has = (re) => re.test(src) || (inherits && (re.test(mixin) || (isBtn && re.test(btnDev))));
  if (has(/commandToggle|'toggle'|onOff/)) { p.add('zcl_onoff'); }
  if (has(/0xFD|253/)) { p.add('tuya_fd'); }
  if (has(/commandRecall/)) { p.add('scene_recall'); }
  if (has(/levelControl|'step'/)) { p.add('level_step'); }
  if (has(/E000|57344/)) { p.add('e000'); }
  if (has(/dp|datapoint/i)) { p.add('ef00_dp'); }
  if (has(/wrapHandleFrame|handleFrame/)) { p.add('raw'); }
  if (has(/multistateInput/)) { p.add('multistate'); }
  if (isBtn) { ['multistate', 'onoff_attr', 'e000', 'e001', 'raw', 'unknown_capture', 'mode_8004_d020', 'dp_crosscheck', 'wake_bind', 'scene_recall'].forEach((x) => p.add(x)); }
  const dedup = inherits || /_triggerPhysicalFlow/.test(src) ? 'router-dynamic' : 'local';
  rows.push({ driver: id, base, dedup, paths: [...p].sort() });
}
if (require.main === module) {
  const md = ['| driver | base | dedup | paths |', '|---|---|---|---|',
    ...rows.map((r) => `| ${r.driver} | ${r.base} | ${r.dedup} | ${r.paths.join(', ')} |`)].join('\n');
  if (process.argv.includes('--json')) { console.log(JSON.stringify(rows, null, 1)); } else { console.log(md); }
}
module.exports = { rows };
