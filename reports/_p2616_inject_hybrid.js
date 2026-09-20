'use strict';
/**
 * P2616 — inject fleet hybrid UNION call into restored dedicated device.js
 * (prior patch only rewrote headers; call was skipped because header already said P2616)
 */
const fs = require('fs');

function injectScene4() {
  const p = 'drivers/scene_switch_4/device.js';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('await installWallSceneRemoteHybrid(this, zclNode')) {
    console.log('scene_switch_4: hybrid call already present');
    return;
  }
  const marker = '    // v10.1.1: E000 + DP cluster detection for scene switch devices\n';
  if (!s.includes(marker)) throw new Error('scene_switch_4 marker missing');
  const inject = `    // WHY(P2616 complementary): fleet hybrid first — soft; dedicated hotfix stacks below stay (P2520)
    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 4,
        tag: 'SCENE_SWITCH_4',
        onPress: async (btn, press) => {
          await this._triggerSceneSwitch4(btn, press);
        },
      });
    } catch (e) {
      this.log('[SCENE_SWITCH_4] hybrid soft-fail (dedicated stacks continue):', e.message);
    }

    // v10.1.1 dedicated hotfix stacks (complementary to hybrid — never wipe)
`;
  s = s.replace(marker, inject);
  // fix mojibake em-dashes from prior UTF-16 copy
  s = s.replace(/\u00e2\u0080\u0094/g, '—').replace(/â/g, '—');
  fs.writeFileSync(p, s);
  console.log('scene_switch_4: injected hybrid UNION');
}

function injectButton4() {
  const p = 'drivers/button_wireless_4/device.js';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('await installWallSceneRemoteHybrid(this, zclNode')) {
    console.log('button_wireless_4: hybrid call already present');
    return;
  }
  const marker = '    // v10.1.2: E000 + LevelControl cluster detection for TS0044/TS004F devices\n';
  if (!s.includes(marker)) throw new Error('button_wireless_4 marker missing');
  const inject = `    // WHY(P2616 complementary): fleet hybrid first — soft; dedicated hotfix stacks below stay (P2520)
    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 4,
        tag: 'BUTTON_WIRELESS_4',
        onPress: async (btn, press) => {
          await this._triggerButton4Gang(btn, press);
        },
      });
    } catch (e) {
      this.log('[BUTTON_WIRELESS_4] hybrid soft-fail (dedicated stacks continue):', e.message);
    }

    // v10.1.2 dedicated hotfix stacks (complementary to hybrid — never wipe)
`;
  s = s.replace(marker, inject);
  s = s.replace(/\u00e2\u0080\u0094/g, '—').replace(/â/g, '—');
  fs.writeFileSync(p, s);
  console.log('button_wireless_4: injected hybrid UNION');
}

injectScene4();
injectButton4();
