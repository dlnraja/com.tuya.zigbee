const fs = require('fs');
const filePath = 'drivers/presence_sensor_radar/device.js';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

const startIdx = 2275; // 0-indexed is 2274
const endIdx = 2290;   // 0-indexed is 2289

const replacement = [
    '        if (timeSinceLastPresence > threshold) {',
    '          this.log(`[RADAR] 🔄 No presence update in ${threshold / 1000}s, requesting DP refresh...`);',
    '          await this._requestDPRefresh(zclNode);',
    '          await this._requestSpecificDP(zclNode, 1);',
    '        }',
    '',
    '        luxPollCounter++;',
    '        if (luxPollCounter >= 3) {',
    '          luxPollCounter = 0;',
    '          if (config.hasIlluminance !== false) {',
    '            this.log(\'[RADAR] ☀️ Polling lux DPs...\');',
    '            const luxDPs = [12, 102, 103, 104, 106];',
    '            for (const dp of luxDPs) {',
    '              if (config.dpMap?.[dp]?.cap === \'measure_luminance\') {',
    '                await this._requestSpecificDP(zclNode, dp);',
    '                break;',
    '              }',
    '            }',
    '          }',
    '        }',
    '      } catch (e) {',
    '        this.log(`[RADAR] ⚠️ Polling error: ${e.message}`);',
    '      }',
    '    }, pollInterval);',
    '',
    '    setTimeout(() => {',
    '      this._requestDPRefresh(zclNode);',
    '      this._requestSpecificDP(zclNode, 1);',
    '    }, 2000);',
    '  }',
    '',
    '  async _sendTimeSync(zclNode) {',
    '    try {',
    '      const ep1 = zclNode?.endpoints?.[1];',
    '      const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.[CLUSTERS.TUYA_EF00];',
    '      if (!tuyaCluster) return;',
    '',
    '      const ZIGBEE_EPOCH = new Date(Date.UTC(2000, 0, 1, 0, 0, 0)).getTime();',
    '      const utcSeconds = Math.floor((Date.now() - ZIGBEE_EPOCH) / 1000);',
    '      const localSeconds = utcSeconds + (-new Date().getTimezoneOffset() * 60);',
    '',
    '      const payload = Buffer.alloc(8);',
    '      payload.writeUInt32BE(utcSeconds, 0);',
    '      payload.writeUInt32BE(localSeconds, 4);',
    '',
    '      if (tuyaCluster.command) {',
    '        await tuyaCluster.command(\'mcuSyncTime\', { payloadSize: 8, payload });',
    '        this.log(\'[RADAR] ⏰ Time sync sent to device\');',
    '      }',
    '    } catch (e) {',
    '      this.log(`[RADAR] ⚠️ Time sync failed: ${e.message}`);',
    '    }',
    '  }'
];

lines.splice(startIdx, endIdx - startIdx + 1, ...replacement);
fs.writeFileSync(filePath, lines.join('\n'));
console.log('Fixed radar driver via line splicing.');
