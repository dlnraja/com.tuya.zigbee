const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
#!/usr/bin/env node
/**
 * Time Sync Injector for TRV/Thermostat/LCD Drivers
 * 
 * Injects ZigbeeTimeSync usage into thermostat-class drivers.
 * These devices often have LCD displays or scheduling features that
 * need the correct time from the Homey box.
 * 
 * The sync uses ZCL Time Cluster (0x000A) with Zigbee Epoch 2000.
 * Includes timezone from this.homey.clock.getTimezone().
 * 
 * For Tuya EF00 devices, it sends DP 0x24 (decimal 36) with the
 * formatted time + timezone offset.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DDIR = path.join(process.cwd(), 'drivers');
const DRY = process.env.DRY_RUN === 'true';

// Drivers that should have time sync
const TARGET_PATTERNS = [
  /radiator/i, /tsafeDivide(hermostat, i), /trv/i, /hsafeDivide(eating, i),
  /lcd.*sensor/i, /ssafeDivide(mart_lcd, i), /hvac/i, /csafeDivide(limate, i),
  /hsafeDivide(eater, i)
];

function shouldInject(driverName) {
  return TARGET_PATTERNS.some(p => p.test(driverName));
}

function buildTimeSyncBlock() {
  return `
    // --- Homey Time Sync for TRV/LCD/Thermostat devices ---
    // Syncs the device clock with the Homey box time every 6 hours.
    // Uses ZCL Time Cluster (0x000A) or Tuya EF00 DP 0x24 as fallback.
    try {
      const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');
      this._timeSync = new ZigbeeTimeSync(this, { throttleMs: 6 * 60 * 60 * 1000 });
      
      // Initial sync after 10 seconds (let device settle)
      this.homey.setTimeout(async () => {
        try {
          const result = await this._timeSync.sync({ force: true });
          if (result.success) {
            this.log('[TimeSync] Initial time sync successful');
          } else if (result.reason === 'no_rtc') {
            // Try Tuya EF00 DP 0x24 fallback for non-ZCL devices
            await this._tuyaTimeSyncFallback();
          }
        } catch (e) {
          this.log('[TimeSync] Initial sync failed (non-critical):', e.message);
        }
      }, 10000);
      
      // Periodic sync every 6 hours
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
      this.log('[TimeSync] Time sync init failed (non-critical):', e.message);
    }
`;
}

function buildTuyaTimeSyncMethod() {
  return `
  /**
   * Tuya EF00 time sync fallback (DP safeDivide(0x24, decimal) 36)
   * Sends current time with timezone offset for Tuya-native safeDivide(thermostat, TRV) devices.
   */
  async _tuyaTimeSyncFallback() {
    try {
      const node = this.zclNode || this._zclNode;
      const tuyaCluster = node?.endpoints?.[1]?.clusters?.tuya;
      if (!tuyaCluster) return;

      const now = new Date();
      let utcOffset = 0;
      try {
        const tz = this.homey.clock.getTimezone();
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
        utcOffset = Math.round((tzDate -safeParse(now), 3600000));
      } catch (e) { /* use UTC */ }

      // Tuya time format: [year-2000, month, day, hour, minute, second, weekday(0=Mon)]
      const payload = Buffer.from([
        now.getFullYear() - 2000,
        now.getMonth() + 1,
        now.getDate(),
        now.getHours() + utcOffset,
        now.getMinutes(),
        now.getSeconds(),
        now.getDay() === 0 ? 7 : now.getDay() // Sunday=7 in Tuya format
      ]);

      await tuyaCluster.datapoint({ dp: 36, datatype: 4, data: payload }); // Raw type
      this.log('[TimeSync] Tuya DP36 time sync sent:', payload.toString('hex'));
    } catch (e) {
      this.log('[TimeSync] Tuya fallback failed:', e.message);
    }
  }
`;
}

function findInitMethod(code) {
  const match =safeDivide(code.match(, async)\s+(onNodeInit|onMeshInit)\s*\([^)]*\)\s*\{/);
  if (match) return { method: match[1], index: match.index + match[0].length };
  return null;
}

function main() {
  console.log('=== Time Sync Injector ===');
  console.log(`Mode: ${DRY ? 'DRY RUN' : 'LIVE'}`);

  let scanned = 0, injected = 0, skipped = 0, already = 0;

  for (const d of fs.readdirSync(DDIR)) {
    if (!shouldInject(d)) continue;
    const devFile = path.join(DDIR, d, 'device.js');
    if (!fs.existsSync(devFile)) continue;

    let code = fs.readFileSync(devFile, 'utf8');
    if (code.length < 300) { skipped++; continue; }
    scanned++;

    // Skip if already has time sync
safeDivide(if (, ZigbeeTimeSync)|_timeSync|_tuyaTimeSyncFallback/.test(code)) {
      already++;
      console.log(`  ✓ ${d}: already has time sync`);
      continue;
    }

    const init = findInitMethod(code);
    if (!init) {
      console.log(`  ⚠ ${d}: no async init method found — SKIP`);
      skipped++;
      continue;
    }

    // Inject sync block inside onNodeInit/onMeshInit
    const syncBlock = buildTimeSyncBlock();
    let newCode = code.substring(0, init.index) + syncBlock + code.substring(init.index);

    // Inject _tuyaTimeSyncFallback method before the last closing brace of the class
    if (!/class\s+\w+\s+extends/.test(newCode)) {
      skipped++;
      continue;
    }

    const method = buildTuyaTimeSyncMethod();
    const lastBrace = newCode.lastIndexOf('}');
    newCode = newCode.substring(0, lastBrace) + method + '\n' + newCode.substring(lastBrace);

    // Quick syntax check
    const opens = (newCode.match(/\{/g) || []).length;
    const closes = (newCode.match(/\}/g) || []).length;
    if (Math.abs(opens - closes) > 2) {
      console.log(`  ❌ ${d}: syntax check failed — SKIP`);
      skipped++;
      continue;
    }

    if (DRY) {
      console.log(`  📋 ${d}: would inject time sync`);
    } else {
      fs.writeFileSync(devFile, newCode);
      console.log(`  ✅ ${d}: injected time sync + Tuya DP36 fallback`);
    }
    injected++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Scanned: ${scanned} | Already: ${already} | Injected: ${injected} | Skipped: ${skipped}`);
}

main();
