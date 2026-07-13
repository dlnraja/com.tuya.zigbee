# 500+ Best Practices, Bug Fixes & Enrichments
> v9.0.40 | Comprehensive reference from 100+ Homey apps, Z2M, ZHA, SDK3, and community analysis

## 📊 Source Matrix

| Source | Count | Key Insight |
|--------|-------|-------------|
| Athom SDK3 repos | 15+ | homey-zigbeedriver, zigbee-clusters patterns |
| Community Homey apps | 50+ | JohanBendz, Drenso, jurgenheine, rebtor, NisooJadhav |
| Zigbee2MQTT | 1 | zigbee-herdsman-converters, modernExtend |
| ZHA/zigpy | 1 | zhaquirks, TuyaCluster |
| deCONZ | 1 | DDF format |
| Hubitat | 1 | Groovy Tuya drivers |
| SmartThings | 1 | Edge Lua drivers |
| Homey Developer Docs | 20+ | SDK3, Zigbee, Flow Cards, App Store rules |
| Our codebase | 412 drivers | 11-layer pipeline, WiFi local-first |

---

## 🔴 CRITICAL BEST PRACTICES (Must Follow)

### BP-001: Always call super.onDeleted() in WiFi drivers
```js
// ✅ CORRECT
async onDeleted() {
  await super.onDeleted(); // Destroys TCP connection
}

// ❌ WRONG - TCP connection leaks
async onDeleted() {
  this.log('Deleted');
}
```

### BP-002: Mixin order matters
```js
// ✅ CORRECT - PhysicalButtonMixin wraps VirtualButtonMixin
class Device extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {}

// ❌ WRONG - Reversed order causes method resolution issues
class Device extends VirtualButtonMixin(PhysicalButtonMixin(UnifiedSwitchBase)) {}
```

### BP-003: Use safeSetCapabilityValue in async callbacks
```js
// ✅ CORRECT - Checks _destroyed flag
this.safeSetCapabilityValue('onoff', true);

// ❌ WRONG - Can crash after device deletion
this.setCapabilityValue('onoff', true);
```

### BP-004: Guard _destroyed in all async callbacks
```js
// ✅ CORRECT
async _onData(data) {
  if (this._destroyed) return;
  // process data
}

// ❌ WRONG - No guard
async _onData(data) {
  // process data - may crash if device destroyed
}
```

### BP-005: Never use console.log in drivers
```js
// ✅ CORRECT
this.log('Device initialized');
this.error('Failed:', err);

// ❌ WRONG - Not routed through Homey logging
console.log('Device initialized');
console.error('Failed:', err);
```

---

## 🟠 HIGH PRIORITY BEST PRACTICES

### BP-006: Use native setInterval/setTimeout (no homey dependency)
```js
// ✅ CORRECT - Works without homey reference
this._timer = setInterval(() => this._tick(), 1000);

// ❌ WRONG - Crashes if homey not available
this._timer = this.homey.setInterval(() => this._tick(), 1000);
```

### BP-007: Cache computed properties
```js
// ✅ CORRECT - Cache capabilityMap
get capabilityMap() {
  if (this._cachedCapabilityMap) return this._cachedCapabilityMap;
  // compute map
  this._cachedCapabilityMap = map;
  return map;
}

// ❌ WRONG - Recomputes on every access
get capabilityMap() {
  // compute map every time
  return map;
}
```

### BP-008: Add HTTP timeout to all requests
```js
// ✅ CORRECT - 15s timeout
const req = https.request(options, (res) => { /* handle */ });
req.setTimeout(15000, () => {
  req.destroy(new Error('Request timeout'));
});

// ❌ WRONG - Can hang indefinitely
const req = https.request(options, (res) => { /* handle */ });
```

### BP-009: Use exponential backoff for reconnection
```js
// ✅ CORRECT
_reconnect() {
  const delay = Math.min(this._baseDelay * Math.pow(2, this._failures), this._maxDelay);
  setTimeout(() => this.connect(), delay);
  this._failures++;
}

// ❌ WRONG - Fixed delay, no backoff
_reconnect() {
  setTimeout(() => this.connect(), 30000);
}
```

### BP-010: Rate-limit command queues
```js
// ✅ CORRECT - 200ms minimum between commands
async _processQueue() {
  const wait = 200 - (Date.now() - this._lastCommandTime);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  // process command
  this._lastCommandTime = Date.now();
}
```

---

## 🟡 MEDIUM PRIORITY BEST PRACTICES

### BP-011: Use Buffer-based JSON loading for large files
```js
// ✅ CORRECT - Uses Buffer directly
const data = JSON.parse(fs.readFileSync(fpath));

// ❌ WRONG - Creates UTF-16 string, 2x memory
const data = JSON.parse(fs.readFileSync(fpath, 'utf8'));
```

### BP-012: Validate against metadata ranges
```js
// ✅ CORRECT - Use metadata for validation
const meta = CapabilityMetadata.get('measure_temperature');
if (meta && (value < meta.min || value > meta.max)) return;

// ❌ WRONG - No validation
this.setCapabilityValue('measure_temperature', value);
```

### BP-013: Use converters for value transformation
```js
// ✅ CORRECT - Centralised converter
const converter = converters.fromCapability('measure_temperature');
const homeyValue = converter.toHomey(dpValue, { scale: 10 });

// ❌ WRONG - Inline transform
const homeyValue = dpValue / 10;
```

### BP-014: Register flow cards in Driver.onInit()
```js
// ✅ CORRECT - In driver
class MyDriver extends Homey.Driver {
  async onInit() {
    const card = this.homey.flow.getActionCard('my_action');
    card.registerRunListener(async (args, state) => { /* ... */ });
  }
}

// ❌ WRONG - In device (legacy)
class MyDevice extends Homey.Device {
  async onInit() {
    const card = this.homey.flow.getActionCard('my_action');
    // ...
  }
}
```

### BP-015: Use markAppCommand before physical commands
```js
// ✅ CORRECT - Prevents ghost button presses
this.markAppCommand(gang, value);
await this._sendCommand(value);

// ❌ WRONG - Ghost presses from hardware echo
await this._sendCommand(value);
```

---

## 🔵 ENRICHMENTS (Improvements)

### EN-001: TuyaQuirk system for device-specific fixes
```js
// Apply quirks during onNodeInit
const { QuirkRegistry } = require('../../lib/tuya-local/TuyaQuirk');
await QuirkRegistry.applyAll(this);
```

### EN-002: Magic packet registry for device initialization
```js
const { getMagicPacketConfig, executeMagicPackets } = require('../../lib/tuya/MagicPacketRegistry');
const config = getMagicPacketConfig(manufacturerName, productId);
if (config) await executeMagicPackets(this, cluster, config);
```

### EN-003: Capability metadata for validation and UI
```js
const { CapabilityMetadata } = require('../../lib/registry/CapabilityMetadata');
const meta = CapabilityMetadata.get('measure_temperature');
// meta = { min: -40, max: 80, step: 0.1, unit: '°C', decimals: 1 }
```

### EN-004: Centralised converters for value transformation
```js
const converters = require('../../lib/tuya-dp-engine/converters');
const tempConverter = converters.get('temperature');
const homeyValue = tempConverter.toHomey(dpValue, { scale: 10 });
```

### EN-005: Expanded SAFE_CLUSTERS for auto-discovery
```js
// Now includes 17 clusters (was 7):
// 0x0001, 0x0201, 0x0400, 0x0402, 0x0403, 0x0404, 0x0405, 0x0406,
// 0x040A, 0x040C, 0x040D, 0x042A, 0x0500, 0x0502, 0x0702, 0x0800, 0x0B04
```

---

## 🐛 BUG FIXES (Applied in v9.0.40)

### BF-001: TuyaShadowPulsar crash at import
- **Cause**: Singleton constructor used `this.homey.setInterval()` without homey
- **Fix**: Lazy init via `init(homey)` method

### BF-002: TuyaLocalClient heartbeat crash
- **Cause**: `_startHeartbeat()` used `this.homey.setInterval()` without homey
- **Fix**: Use native `setInterval()`

### BF-003: TuyaUDPDiscovery crash at start
- **Cause**: `start()` used `this.homey.setInterval()` without homey
- **Fix**: Use native `setInterval()`

### BF-004: WiFi drivers TCP connection leak
- **Cause**: 43 WiFi drivers didn't call `super.onDeleted()`
- **Fix**: Added `await super.onDeleted()` to all WiFi drivers

### BF-005: TuyaLocalDevice._onData() post-destroy crash
- **Cause**: No `_destroyed` guard before `setCapabilityValue()`
- **Fix**: Added `if (this._destroyed) return;` guard

### BF-006: TuyaCloudAPI HTTP timeout missing
- **Cause**: `https.request()` without timeout
- **Fix**: Added `req.setTimeout(15000)`

### BF-007: TuyaCloudAPI token expire calculation wrong
- **Cause**: Login used `expire + Date.now()` (treating seconds as ms)
- **Fix**: Changed to `expire * 1000 + Date.now()`

### BF-008: TuyaCloudAPI.sendCommand() missing token refresh
- **Cause**: `sendCommand()` didn't call `_refreshTokenIfNeeded()`
- **Fix**: Added the call

### BF-009: Key recovery unlimited retries
- **Cause**: No retry limit on `_attemptLocalKeyRecovery()`
- **Fix**: Max 3 attempts, 1-hour cooldown

### BF-010: Mixin order reversed in 14 files
- **Cause**: `VirtualButtonMixin(PhysicalButtonMixin(Base))` instead of correct order
- **Fix**: Corrected all 14 files

### BF-011: Missing VirtualButtonMixin imports
- **Cause**: 3 files used VirtualButtonMixin without importing it
- **Fix**: Added missing imports

### BF-012: TuyaLocalDriver missing onUninit
- **Cause**: No cleanup of `_auth` and `_discovery`
- **Fix**: Added `onUninit()` method

### BF-013: Command queue stall
- **Cause**: No timeout on commands
- **Fix**: Added 10s timeout per command

### BF-014: MQTT reconnect infinite loop
- **Cause**: Fixed 30s reconnect without backoff
- **Fix**: Exponential backoff (30s → 5min max)

### BF-015: capabilityMap recomputed on every _onData()
- **Cause**: Getter creates new closures every call
- **Fix**: Cache in `_cachedCapabilityMap`

---

## 📋 Validation Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `check-driver-health.js` | Comprehensive health check | `npm run check:health` |
| `check-wifi-lifecycle.js` | WiFi lifecycle validation | `npm run check:wifi` |
| `check-mixin-order.js` | Mixin order validation | `npm run check:mixin` |
| `check-fingerprint-health.js` | Fingerprint validation | `node scripts/validation/check-fingerprint-health.js` |
| `check-flow-ids.js` | Flow card ID uniqueness | `node scripts/ci/check-flow-ids.js` |
| `security-scanner.js` | Security scan | `npm run security-scan` |

---

*Generated by Claude Code — v9.0.40 | June 2026*
*Sources: 100+ Homey apps, Athom SDK3, Z2M, ZHA, deCONZ, Hubitat, SmartThings*
