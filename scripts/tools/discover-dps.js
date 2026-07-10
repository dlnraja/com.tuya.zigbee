#!/usr/bin/env node
'use strict';
// v9.0.40: DP Discovery Tool
// Inspired by andiwirz/com.tuyalocal discover-dps.js
// Connects to a Tuya WiFi device and dumps all available DPs
// Useful for adding new device support

const TuyAPI = require('tuyapi');

const PROTOCOL_VERSIONS = ['3.3', '3.4', '3.5', '3.2', '3.1'];

async function discoverDPS(deviceId, localKey, ip, version) {
  console.log(`\n🔍 Discovering DPs for device ${deviceId}...`);
  console.log(`   IP: ${ip || 'auto-discover'}`);
  console.log(`   Key: ${localKey.substring(0, 8)}...`);
  console.log(`   Version: ${version || 'auto-detect'}\n`);

  const versionsToTry = version ? [version] : PROTOCOL_VERSIONS;

  for (const ver of versionsToTry) {
    console.log(`   Trying protocol v${ver}...`);
    try {
      const device = new TuyAPI({
        id: deviceId,
        key: localKey,
        ip: ip || undefined,
        version: ver,
      });

      // Auto-discover IP if not provided
      if (!ip) {
        console.log('   Scanning LAN for device...');
        await device.find({ timeout: 10000 });
      }

      await device.connect();
      console.log(`   ✅ Connected using protocol v${ver}\n`);

      // Get current state (this returns all DPs)
      const state = await device.get({ schema: true });
      console.log('📊 Current DP State:');
      console.log('━'.repeat(60));

      if (state && state.dps) {
        const dps = state.dps;
        const sorted = Object.entries(dps).sort(([a], [b]) => Number(a) - Number(b));

        for (const [dp, value] of sorted) {
          const type = typeof value;
          const typeLabel = type === 'boolean' ? 'BOOL' :
                           type === 'number' ? (Number.isInteger(value) ? 'VALUE' : 'FLOAT') :
                           type === 'string' ? 'STRING' :
                           Array.isArray(value) ? 'RAW' : 'UNKNOWN';

          console.log(`   DP ${dp.padStart(3)}: ${typeLabel.padEnd(7)} = ${JSON.stringify(value)}`);
        }

        console.log('\n' + '━'.repeat(60));
        console.log(`\n📋 Summary:`);
        console.log(`   Total DPs: ${sorted.length}`);
        console.log(`   Protocol: v${ver}`);
        console.log(`   IP: ${device.device.ip || 'unknown'}`);

        // Generate dpMappings template
        console.log('\n📝 dpMappings Template:');
        console.log('━'.repeat(60));
        console.log('get dpMappings() {');
        console.log('  return {');
        for (const [dp, value] of sorted) {
          const cap = guessCapability(dp, value);
          if (cap) {
            console.log(`    ${dp}: { capability: '${cap}' },`);
          } else {
            console.log(`    ${dp}: { capability: null, internal: 'dp${dp}' }, // ${typeof value}: ${JSON.stringify(value).substring(0, 30)}`);
          }
        }
        console.log('  };');
        console.log('}');

      } else {
        console.log('   ⚠️ No DPs returned. Device may be sleeping or not responding.');
      }

      device.disconnect();
      return;
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}`);
    }
  }

  console.log('\n❌ Could not connect with any protocol version.');
  console.log('   Check: device_id, local_key, IP address, network connectivity');
}

/**
 * Guess capability from DP number and value
 */
function guessCapability(dp, value) {
  const dpNum = Number(dp);
  const commonMappings = {
    1: typeof value === 'boolean' ? 'onoff' : null,
    2: typeof value === 'number' ? 'dim' : null,
    3: typeof value === 'number' ? 'light_temperature' : null,
    4: typeof value === 'number' ? 'measure_battery' : null,
    5: typeof value === 'number' ? 'measure_temperature' : null,
    6: typeof value === 'number' ? 'measure_humidity' : null,
    7: typeof value === 'string' ? null : null,
    8: typeof value === 'number' ? 'windowcoverings_set' : null,
    9: typeof value === 'boolean' ? 'onoff' : null,
    10: typeof value === 'number' ? 'measure_temperature' : null,
    11: typeof value === 'number' ? 'measure_humidity' : null,
    12: typeof value === 'number' ? 'measure_co2' : null,
    14: typeof value === 'number' ? 'measure_power' : null,
    15: typeof value === 'number' ? 'measure_voltage' : null,
    16: typeof value === 'number' ? 'measure_current' : null,
    17: typeof value === 'number' ? 'measure_power' : null,
    18: typeof value === 'number' ? 'measure_temperature' : null,
    19: typeof value === 'number' ? 'measure_humidity' : null,
    20: typeof value === 'number' ? 'meter_power' : null,
  };

  return commonMappings[dpNum] || null;
}

// CLI
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node discover-dps.js <device_id> <local_key> [ip] [version]');
  console.log('Example: node discover-dps.js abc123def456 0123456789abcdef 192.168.1.100 3.3');
  process.exit(1);
}

const [deviceId, localKey, ip, version] = args;
discoverDPS(deviceId, localKey, ip, version).catch(console.error);
