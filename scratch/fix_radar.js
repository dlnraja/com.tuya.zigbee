const fs = require('fs');
const path = require('path');

const filePath = 'drivers/presence_sensor_radar/device.js';
let content = fs.readFileSync(filePath, 'utf8');

const target = `        const threshold = useAggressive ? 15000 : 60000;

      // Create time payload (8 bytes: UTC + Local)
      const payload = Buffer.alloc(8);
      payload.writeUInt32BE(utcSeconds, 0);
      payload.writeUInt32BE(localSeconds, 4);

      // Send time response command (0x64 = 100)
      if (tuyaCluster.command) {
        await tuyaCluster.command('mcuSyncTime', { payloadSize: 8, payload });
        this.log('[RADAR] â ° Time sync sent to device');
      }
    } catch (e) {
      this.log(\`[RADAR] âšï¸  Time sync failed: \${e.message}\`);
    }
  }`;

const replacement = `        const threshold = useAggressive ? 15000 : 60000;
        if (timeSinceLastPresence > threshold) {
          this.log(\`[RADAR] 🔄 No presence update in \${threshold / 1000}s, requesting DP refresh...\`);
          await this._requestDPRefresh(zclNode);
          await this._requestSpecificDP(zclNode, 1);
        }

        luxPollCounter++;
        if (luxPollCounter >= 3) {
          luxPollCounter = 0;
          if (config.hasIlluminance !== false) {
            this.log('[RADAR] ☀️ Polling lux DPs...');
            const luxDPs = [12, 102, 103, 104, 106];
            for (const dp of luxDPs) {
              if (config.dpMap?.[dp]?.cap === 'measure_luminance') {
                await this._requestSpecificDP(zclNode, dp);
                break;
              }
            }
          }
        }
      } catch (e) {
        this.log(\`[RADAR] ⚠️ Polling error: \${e.message}\`);
      }
    }, pollInterval);

    setTimeout(() => {
      this._requestDPRefresh(zclNode);
      this._requestSpecificDP(zclNode, 1);
    }, 2000);
  }

  async _sendTimeSync(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.[CLUSTERS.TUYA_EF00];
      if (!tuyaCluster) return;

      const ZIGBEE_EPOCH = new Date(Date.UTC(2000, 0, 1, 0, 0, 0)).getTime();
      const utcSeconds = Math.floor((Date.now() - ZIGBEE_EPOCH) / 1000);
      const localSeconds = utcSeconds + (-new Date().getTimezoneOffset() * 60);

      const payload = Buffer.alloc(8);
      payload.writeUInt32BE(utcSeconds, 0);
      payload.writeUInt32BE(localSeconds, 4);

      if (tuyaCluster.command) {
        await tuyaCluster.command('mcuSyncTime', { payloadSize: 8, payload });
        this.log('[RADAR] ⏰ Time sync sent to device');
      }
    } catch (e) {
      this.log(\`[RADAR] ⚠️ Time sync failed: \${e.message}\`);
    }
  }`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content);
    console.log('Successfully repaired radar driver.');
} else {
    console.log('Target content not found.');
    // Try without mangled chars
    const targetNoMangle = target.replace(/â °/g, '').replace(/âšï¸ /g, '');
    console.log('Target (no mangle) search...');
}
