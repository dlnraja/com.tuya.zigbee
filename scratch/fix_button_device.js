const fs = require('fs');
const path = 'drivers/button_wireless_4/device.js';
let content = fs.readFileSync(path, 'utf8');

// The corruption started around _setupEnhancedPhysicalButtonDetection
// and _setupTuyaE000ButtonDetection got merged into it.

// Let's try to restore the structure.
// I will look for the redundant _scheduleModeMaintenance first.
const redundantMatch = /\n\s+\/\/ v5.5.617: Schedule periodic mode maintenance \(cold boot recovery\)\n\s+\/\/ Research: After battery removal, mode resets - need to re-apply\n\s+_scheduleModeMaintenance\(\) \{\n\s+\/\/ Check mode every 5 minutes if not verified\n\s+this._modeMaintenanceInterval = this.homey.setInterval\(async \(\) => \{\n\s+if \(this._modeVerified\) return;/g;

if (content.match(redundantMatch)) {
    console.log('Found redundant _scheduleModeMaintenance');
    // We only want one.
}

// Actually, it's easier to just try to replace the whole middle section with a known good structure.
// But I don't have the whole original.

// Wait! I can see the "handleSceneRecall" in the corrupted file ending abruptly.
const corruptedPos = content.indexOf('await this.triggerButtonPress(button, pressType);\n        const endpoint = zclNode?.endpoints?.[ep] ;');
if (corruptedPos > -1) {
    console.log('Found truncation point');
}

// I'll try to find where _setupTuyaE000ButtonDetection starts in the corrupted file
const e000Start = content.indexOf('async _setupTuyaE000ButtonDetection(zclNode) {');
console.log('E000 Start Pos:', e000Start);

// I'll try to fix the handleSceneRecall block.
content = content.replace(/await this\.triggerButtonPress\(button, pressType\);\n\s+const endpoint = zclNode\?\.endpoints\?\.\[ep\] ;\n\s+if \(!endpoint\) continue;/, 
`await this.triggerButtonPress(button, pressType);
          };

          // Pattern 1: recall
          scenesCluster.on('recall', async (payload) => {
            const sceneId = payload?.sceneId ?? 0      ;
            await handleSceneRecall(sceneId);
          });
        }
      }
    } catch (e) {}
  }`);

fs.writeFileSync(path, content);
console.log('Patch 1 applied');
