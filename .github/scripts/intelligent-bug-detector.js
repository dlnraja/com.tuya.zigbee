
/**
 * Enhanced Auto-Triage with Intelligent Bug Pattern Detection
 * Detects known issues and provides targeted solutions
 */

const BUG_PATTERNS = {
  soil_sensor_connection: {
    keywords: ['soil_sensor', 'soil sensor', 'connection', 'pairing', '_TZE284', '_TZE200', 'fertilizer', 'DP109', 'DP112'],
    confidence: (title, body) => {
      const text = (title + ' ' + body).toLowerCase();
      let score = 0;
      if (text.includes('soil') && text.includes('sensor')) score += 30;
      if (text.includes('_tze284') || text.includes('_tze200')) score += 20;
      if (text.includes('connection') || text.includes('pairing')) score += 20;
      if (text.includes('fertilizer') || text.includes('dp109')) score += 15;
      if (text.includes('ts0601')) score += 15;
      return score;
    },
    response: `🌱 **Soil Sensor Connection Issue Detected**

This appears to be a known soil sensor pairing issue. Here are targeted solutions:

**For _TZE284 variants with DP109/DP112 (fertility support):**
✅ **Fixed in v5.11.114+** - Added DP109/DP112 support for fertilizer measurements
✅ **Fixed in v5.11.136+** - Removed restrictive endpoints causing pairing failures

**Quick fix steps:**
1. Update app to latest version (v5.11.136+)
2. Remove sensor from Homey completely
3. Reset sensor: Hold button 5+ seconds until LED blinks rapidly  
4. Re-pair in "Add Device" → "Tuya Zigbee" → "Soil Sensor"
5. Keep sensor within 2m of Homey during pairing

**If still failing:**
- Check battery level (replace if <20%)
- Try different pairing mode: Hold button 3 seconds for normal mode
- Verify sensor is TS0601 model

**Diagnostics needed if issue persists:**
Please provide full diagnostic report:
- Settings → Advanced → Report issue
- Screenshot of exact pairing error
- Battery level percentage

This helps us identify new variants or edge cases.`
  },

  fingerbot_listeners: {
    keywords: ['fingerbot', 'Missing Capability Listener', 'button.push', 'onoff', 'capability listener'],
    confidence: (title, body) => {
      const text = (title + ' ' + body).toLowerCase();
      let score = 0;
      if (text.includes('fingerbot')) score += 40;
      if (text.includes('missing capability listener')) score += 40;
      if (text.includes('button.push') || text.includes('onoff')) score += 20;
      return score;
    },
    response: `🤖 **Fingerbot Capability Listener Issue Detected**

This was a **known bug fixed in v5.12.3**.

**Root cause:** 
Heavy initialization in \`TuyaZigbeeDevice.onNodeInit()\` could crash before capability listeners were registered, causing "Missing Capability Listener" errors.

**Solution implemented in v5.12.3:**
✅ Capability listeners now registered **BEFORE** super.onNodeInit()
✅ Prevents initialization crash from blocking listener setup
✅ Battery status reporting also fixed

**To resolve your issue:**
1. **Update** app to v5.12.3+ (or latest test version)
2. **Remove** fingerbot device from Homey
3. **Re-pair** the device

The error should **not** occur on the latest version.

If issue persists after updating and re-pairing, please provide:
- App version number
- Full diagnostic report
- Screenshot of error message`
  },

  ts0601_bindings: {
    keywords: ['TS0601', 'create_bindings_failed', 'zdoInvalidEndpoint', 'binding', 'pairing failed'],
    confidence: (title, body) => {
      const text = (title + ' ' + body).toLowerCase();
      let score = 0;
      if (text.includes('ts0601')) score += 30;
      if (text.includes('create_bindings_failed') || text.includes('zdoinvalidendpoint')) score += 50;
      if (text.includes('binding')) score += 10;
      if (text.includes('pairing') && text.includes('fail')) score += 10;
      return score;
    },
    response: `⚡ **TS0601 Binding Failure Detected**

This was **fixed in v6.0** thanks to @Robsta86's contribution (PR #180)!

**Root cause:**
TS0601 devices (Tuya DP protocol) reject standard ZCL bindings [1, 1280, 1030] with zdoInvalidEndpoint error.

**Solution in v6.0:**
✅ Changed bindings to \`[61184]\` (Tuya DP cluster only)
✅ Tested with _TZE204_sxm7l9xa and _TZE204_qasjif9e
✅ Applies to ALL TS0601 devices (presence sensors, soil sensors, etc.)

**To fix:**
1. Update to **v6.0+** (or latest test version)
2. Remove affected device
3. Re-pair

**Affected devices:**
- All TS0601 presence sensors
- TS0601 soil sensors  
- TS0601 climate sensors
- Any Tuya DP device showing binding errors

The fix is automatic in v6.0+.`
  },

  multigang_flowcards: {
    keywords: ['gang', 'flow card', 'TS0002', 'TS0003', 'switch_2gang', 'switch_3gang', 'unlinked', 'sub-capability'],
    confidence: (title, body) => {
      const text = (title + ' ' + body).toLowerCase();
      let score = 0;
      if ((text.includes('gang') || text.includes('ts0002') || text.includes('ts0003')) && text.includes('flow')) score += 40;
      if (text.includes('unlinked') || text.includes('not working')) score += 20;
      if (text.includes('switch_2gang') || text.includes('switch_3gang')) score += 20;
      return score;
    },
    response: `🔌 **Multi-Gang Switch Flow Card Issue Detected**

**v6.0 improvements for multi-gang switches:**
✅ Comprehensive error recovery in onNodeInit()
✅ Graceful degradation prevents total device failure
✅ Better logging for diagnosis

**Common causes:**

1. **Capability naming convention:**
   - Gang 1: onoff (NOT onoff.gang1)
   - Gang 2: onoff.gang2
   - Gang 3: onoff.gang3
   - Gang 4: onoff.gang4

2. **Flow card ID pattern:**
   - Must match: switch_Xgang_turn_on_gangN
   - Example: switch_3gang_turn_on_gang2

3. **Driver initialization error:**
   - Update to v6.0+ for improved error recovery

**Diagnosis steps:**
1. Check device capabilities: Settings → Advanced → Capabilities
2. Verify app version is v6.0+
3. Check Homey logs for initialization errors

**If flow cards completely missing:**
- Remove device
- Update to v6.0+
- Re-pair device
- Check if flow cards appear

Please provide diagnostic report if issue persists after updating.`
  },

  driver_not_initialized: {
    keywords: ['Driver Not Initialized', 'driver not initialized', 'initialization', 'init error'],
    confidence: (title, body) => {
      const text = (title + ' ' + body).toLowerCase();
      let score = 0;
      if (text.includes('driver not initialized')) score += 60;
      if (text.includes('initialization') && text.includes('error')) score += 30;
      return score;
    },
    response: `🚨 **"Driver Not Initialized" Error**

This critical issue was **fixed in v6.0** (March 2026).

**Root cause:**
Exception in onNodeInit() prevented device initialization, leaving device in broken state.

**v6.0 Solution:**
✅ Comprehensive try-catch in all multi-gang switches
✅ Non-fatal error handling - device remains partially functional
✅ Clear user messaging via setUnavailable()
✅ Enhanced logging for diagnostics

**Affected drivers (all fixed in v6.0):**
- switch_2gang, switch_3gang, switch_4gang
- Devices: TZ3000_jl7qyupf, TZ3000_46t1rvdu, TZ3000_bvrlqyj7

**To resolve:**
1. **Update** to v6.0+ immediately
2. **Remove** affected device from Homey
3. **Re-pair** device
4. Device should initialize successfully

**If error persists on v6.0+:**
This indicates a NEW edge case. Please provide:
- Full diagnostic report
- Manufacturer name and product ID
- Complete error message from logs

This helps us identify additional variants needing fixes.`
  }
};

/**
 * Analyze issue/PR and provide intelligent response
 */
function analyzeAndRespond(title, body) {
  const responses = [];
  
  for (const [patternName, pattern] of Object.entries(BUG_PATTERNS)) {
    const confidence = pattern.confidence(title, body);
    
    if (confidence >= 50) {
      responses.push({
        pattern: patternName,
        confidence,
        response: pattern.response
      });
    }
  }
  
  // Sort by confidence and return highest match
  responses.sort((a, b) => b.confidence - a.confidence);
  
  if (responses.length > 0) {
    const best = responses[0];
    return {
      shouldRespond: true,
      confidence: best.confidence,
      pattern: best.pattern,
      response: best.response
    };
  }
  
  return { shouldRespond: false };
}

module.exports = { BUG_PATTERNS, analyzeAndRespond };







