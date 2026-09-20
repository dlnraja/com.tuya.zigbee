'use strict';
const fs = require('fs');

function patchScene4() {
  let s = fs.readFileSync('drivers/scene_switch_4/device.js', 'utf8');
  if (!s.includes('installWallSceneRemoteHybrid')) {
    s = s.replace(
      "const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');",
      "const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');\n"
      + "const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');",
    );
  }

  const headerRe = /\/\*\*[\s\S]*?\*\/\r?\nclass SceneSwitch4Device/;
  s = s.replace(headerRe, `/**
 * SceneSwitch4Device - v10.1.1 E000 + DP + P2616 complementary hybrid
 *
 * Dedicated hotfix stacks (E000/OnOff-0xFD/DP/raw P2312/P2328) stay armed.
 * Fleet installWallSceneRemoteHybrid is UNION — never a replacement (P2520).
 * P2614: Homey Button N device view. TX: never 0x8004 on TS0044.
 */
class SceneSwitch4Device`);

  if (!s.includes('P2616 complementary')) {
    const marker = '    // v10.1.1: E000 + DP cluster detection for scene switch devices\n';
    const inject = `    // WHY(P2616 complementary): fleet hybrid first — soft; dedicated stacks below stay
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

    // v10.1.1 dedicated hotfix stacks (complementary to hybrid)
`;
    if (!s.includes(marker)) throw new Error('scene_switch_4 marker missing');
    s = s.replace(marker, inject);
  }

  s = s.replace(
    /this\.log\('\[SCENE_SWITCH_4\] hybrid RX:[\s\S]*?initialized with hybrid wrappers'\);/,
    "this.log('[SCENE_SWITCH_4] P2616 hybrid UNION dedicated (E000/0xFD/DP/raw); TX: no 0x8004; UI: Button N device view');",
  );

  fs.writeFileSync('drivers/scene_switch_4/device.js', s);
  console.log('scene_switch_4', {
    hybrid: s.includes('installWallSceneRemoteHybrid'),
    e000: s.includes('_setupE000Detection'),
    raw: s.includes('_setupRawFrameInterceptor'),
    p2616: s.includes('P2616'),
  });
}

function patchButton4() {
  let s = fs.readFileSync('drivers/button_wireless_4/device.js', 'utf8');
  if (!s.includes('installWallSceneRemoteHybrid')) {
    s = s.replace(
      "const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');",
      "const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');\n"
      + "const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');",
    );
  }

  const headerRe = /\/\*\*[\s\S]*?\*\/\r?\nclass Button4GangDevice/;
  s = s.replace(headerRe, `/**
 * Button4GangDevice - v10.1.2 TS0044/TS004F + P2616 complementary hybrid
 *
 * Dedicated E000/LevelControl/DP/raw (P2328 parseZclHeader + unrecognized diag) stay.
 * Fleet hybrid is UNION — never wipe hotfixes (P2520).
 * P2614: Homey Button N device view.
 */
class Button4GangDevice`);

  if (!s.includes('P2616 complementary')) {
    const marker = '    // v10.1.2: E000 + LevelControl cluster detection for TS0044/TS004F devices\n';
    const inject = `    // WHY(P2616 complementary): fleet hybrid first — soft; dedicated stacks below stay
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

    // v10.1.2 dedicated hotfix stacks (complementary to hybrid)
`;
    if (!s.includes(marker)) throw new Error('button_wireless_4 marker missing');
    s = s.replace(marker, inject);
  }

  s = s.replace(
    "this.log('[BUTTON_WIRELESS_4] v10.1.2 initialized with E000 + LevelControl + DP support');",
    "this.log('[BUTTON_WIRELESS_4] P2616 hybrid UNION dedicated (E000/Level/DP/raw); UI: Button N device view');",
  );

  fs.writeFileSync('drivers/button_wireless_4/device.js', s);
  console.log('button_wireless_4', {
    hybrid: s.includes('installWallSceneRemoteHybrid'),
    level: s.includes('_setupLevelControlDetection'),
    unrec: s.includes('_logUnrecognizedFrame'),
    onDeleted: s.includes('async onDeleted'),
    p2616: s.includes('P2616'),
  });
}

patchScene4();
patchButton4();
