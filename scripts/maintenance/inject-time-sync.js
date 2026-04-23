#!/usr/bin/env node
/**
 * scripts/maintenance/inject-time-sync.js
 * Time Sync Injector for TRV/Thermostat/LCD Drivers
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DDIR = path.join(process.cwd(), 'drivers');
const DRY = process.env.DRY_RUN === 'true';

// Drivers that should have time sync
const TARGET_PATTERNS = [
  /radiator/i, /thermostat/i, /trv/i, /heating/i,
  /lcd.*sensor/i, /smart_lcd/i, /hvac/i, /climate/i,
  /heater/i
];

function shouldInject(driverName) {
  return TARGET_PATTERNS.some(p => p.test(driverName));
}

function buildTimeSyncBlock() {
  return `
    // --- Homey Time Sync for TRV/LCD/Thermostat devices ---
    // Syncs the device clock with the Homey box time every 6 hours.
    try {
      const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');
      this._timeSync = new ZigbeeTimeSync(this, { throttleMs: 6 * 60 * 60 * 1000 });
      
      this.homey.setTimeout(async () => {
        try {
          const result = await this._timeSync.sync({ force: true });
          if (!result.success && result.reason === 'no_rtc') {
            await this._tuyaTimeSyncFallback();
          }
        } catch (e) {
          this.log('[TimeSync] Initial sync failed:', e.message);
        }
      }, 10000);
      
      this._timeSyncInterval = this.homey.setInterval(async () => {
        try {
          const result = await this._timeSync.sync();
          if (!result.success && result.reason === 'no_rtc') {
            await this._tuyaTimeSyncFallback();
          }
        } catch (e) {
          this.log('[TimeSync] Periodic sync failed:', e.message);
        }
      }, 6 * 60 * 60 * 1000);
    } catch (e) {
      this.log('[TimeSync] Init failed:', e.message);
    }
`;
}

function buildTuyaTimeSyncMethod() {
  return `
  async _tuyaTimeSyncFallback() {
    try {
      const node = this.zclNode;
      const tuyaCluster = node?.endpoints?.[1]?.clusters?.tuya       ;
      if (!tuyaCluster) return;

      const now = new Date();
      const payload = Buffer.from([
        now.getFullYear() - 2000,
        now.getMonth() + 1,
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getDay() === 0 ? 7 : now.getDay()
      ]);

      await tuyaCluster.datapoint({ dp: 36, datatype: 4, data: payload });
      this.log('[TimeSync] Tuya DP36 sync sent');
    } catch (e) {
      this.log('[TimeSync] Tuya fallback failed:', e.message);
    }
  }
`;
}

function findInitMethod(code) {
  const match = code.match(/async\s+(onNodeInit|onMeshInit)\s*\([^)]*\)\s*\{/);
  if (match) return { method: match[1], index: match.index + match[0].length };
  return null;
}

function main() {
  console.log('=== Time Sync Injector ===');
  if (!fs.existsSync(DDIR)) return;

  for (const d of fs.readdirSync(DDIR)) {
    if (!shouldInject(d)) continue;
    const devFile = path.join(DDIR, d, 'device.js');
    if (!fs.existsSync(devFile)) continue;

    let code = fs.readFileSync(devFile, 'utf8');
    if (code.includes('ZigbeeTimeSync')) continue;

    const init = findInitMethod(code);
    if (!init) continue;

    const syncBlock = buildTimeSyncBlock();
    let newCode = code.substring(0, init.index) + syncBlock + code.substring(init.index);

    const method = buildTuyaTimeSyncMethod();
    const lastBrace = newCode.lastIndexOf('}');
    newCode = newCode.substring(0, lastBrace) + method + '\n' + newCode.substring(lastBrace);

    if (DRY) {
      console.log(`[DRY] Would inject into ${d}`);
    } else {
      fs.writeFileSync(devFile, newCode);
      console.log(`[OK] Injected into ${d}`);
    }
  }
}

main();
