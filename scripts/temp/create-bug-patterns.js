const fs = require('fs');

// Analyze recent issues to extract bug patterns
const bugPatterns = {
  // Issue #178, #176, #177 - Soil sensor connection issues
  soil_sensor_connection: {
    keywords: ['soil_sensor', 'connection', 'pairing', '_TZE284', '_TZE200', 'TS0601'],
    autoResponse: `This appears to be a soil sensor pairing issue. Known solutions:

**For _TZE284 variants with DP109/DP112 (fertility):**
1. Ensure app is updated to v5.11.136+
2. Remove restrictive endpoints (fixed in latest version)
3. Try pairing in "Add Device"  "Tuya Zigbee"  "Soil Sensor"

**If pairing still fails:**
- Reset sensor: Hold button 5+ seconds until LED blinks rapidly
- Place sensor within 2m of Homey during pairing
- Check battery level (replace if <20%)

**Diagnostics needed:**
Please provide:
- Full diagnostic report (Settings  Advanced  Report issue)
- Screenshot of pairing error
- Sensor battery level`,
    relatedDrivers: ['soil_sensor'],
    fixes: ['v5.11.114 - Added DP109/DP112 support', 'v5.11.136 - Removed restrictive endpoints']
  },

  // Issue #162 - Fingerbot capability listeners
  fingerbot_capability: {
    keywords: ['fingerbot', 'Missing Capability Listener', 'button.push', 'onoff'],
    autoResponse: `This fingerbot issue was fixed in **v5.12.3**. 

**Root cause:** Heavy initialization in TuyaZigbeeDevice.onNodeInit() crashed before capability listeners were registered.

**Solution implemented:**
- Capability listeners now registered BEFORE super.onNodeInit()
- Prevents crash from blocking listener setup

**To fix your device:**
1. Update app to v5.12.3+ (or latest test version)
2. Remove fingerbot from Homey
3. Re-pair the device

The error should not occur on latest version.`,
    relatedDrivers: ['fingerbot'],
    fixes: ['v5.12.3 - Register listeners before super.onNodeInit()']
  },

  // Issue #179 - TS0601 binding failures (FIXED in PR #180)
  ts0601_bindings: {
    keywords: ['TS0601', 'create_bindings_failed', 'zdoInvalidEndpoint', 'presence_sensor'],
    autoResponse: `This TS0601 binding issue was **fixed in v6.0** (PR #180 by @Robsta86).

**Root cause:** TS0601 devices reject standard ZCL bindings [1, 1280, 1030] with zdoInvalidEndpoint.

**Solution:** Changed bindings to [61184] (Tuya DP cluster only).

**Affected devices:**
- _TZE204_sxm7l9xa
- _TZE204_qasjif9e  
- All TS0601 presence sensors

**To fix:**
Update to latest version and re-pair.`,
    relatedDrivers: ['presence_sensor_radar'],
    fixes: ['v6.0 - Changed bindings to [61184] for TS0601']
  },

  // Issue #170 - Multi-gang flow cards
  multigang_flowcards: {
    keywords: ['TS0003', 'TS0002', 'Gang', 'Flow cards', 'unlinked', 'switch_2gang', 'switch_3gang'],
    autoResponse: `Multi-gang switch flow card issue detected.

**Common causes:**
1. **Capability naming mismatch:** Gang 1 = \`onoff\`, Gang 2 = \`onoff.gang2\`, Gang 3 = \`onoff.gang3\`
2. **Flow card ID pattern:** Must match exactly \`switch_Xgang_turn_on_gangN\`

**Diagnostics:**
1. Check device capabilities in Advanced settings
2. Verify flow cards exist for your driver
3. Confirm gang numbering matches capabilities

**If flow cards missing:**
- This may indicate driver initialization error
- Update to v6.0+ which has comprehensive error recovery

Please provide diagnostic report if issue persists.`,
    relatedDrivers: ['switch_2gang', 'switch_3gang', 'switch_4gang'],
    fixes: ['v6.0 - Enhanced error recovery in multi-gang switches']
  }
};

fs.writeFileSync('data/bug-patterns.json', JSON.stringify(bugPatterns, null, 2));
console.log(' Created bug pattern database with auto-responses');
