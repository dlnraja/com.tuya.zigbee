# CORE RULES — Tuya Unified Zigbee for Homey Pro
> Single source of truth for all AI agents, developers, and CI/CD pipelines
> Version: 2.0.0 | Last Updated: 2026-06-16 (TITAN Protocol v2)

## 🎯 Vision
**LOCAL-FIRST** — 100% local execution on Homey Pro. Zero cloud calls during normal operation.
- Heap < 64MB
- Bundle < 7MB
- 100% Homey SDK3 compliant
- Maximum fault tolerance

## 📊 Project Stats (v9.0.40)
- **430 drivers** (379 Zigbee + 51 WiFi)
- **4,304 fingerprints** (4,035 unique manufacturerNames)
- **4,138 flow cards** (across 339 drivers)
- **156 unique capabilities**
- **23 time sync formats** (5 MCU protocol versions)
- **11-layer pipeline** (L0-L11)
- **586 lib files** | **613 scripts** | **66 workflows** | **323 docs**
- **667 URLs** tracked in Knowledge Base

## 🔴 CRITICAL RULES (Never Violate)

### R1: safeSetCapabilityValue
```js
// BANNED - crashes after device destroy:
this.setCapabilityValue('onoff', true);

// REQUIRED - checks _destroyed flag:
this.safeSetCapabilityValue('onoff', true);
```

### R2: super.onDeleted() for WiFi
```js
// BANNED - leaks TCP connections:
async onDeleted() { this.log('Deleted'); }

// REQUIRED:
async onDeleted() { await super.onDeleted(); }
```

### R3: Mixin Order
```js
// BANNED - wrong method resolution:
class Device extends VirtualButtonMixin(PhysicalButtonMixin(Base)) {}

// REQUIRED:
class Device extends PhysicalButtonMixin(VirtualButtonMixin(Base)) {}
```

### R4: Buffer-Based JSON Loading
```js
// BANNED - creates UTF-16 string, 2x memory:
const data = JSON.parse(fs.readFileSync(fpath, 'utf8'));

// REQUIRED:
const data = JSON.parse(fs.readFileSync(fpath));
```

### R5: _destroyed Guard
```js
// REQUIRED in all async callbacks:
async _onData(data) {
  if (this._destroyed) return;
  // process data
}
```

### R6: No console.log in Drivers
```js
// BANNED:
console.log('Device initialized');

// REQUIRED:
this.log('Device initialized');
this.error('Failed:', err);
```

### R7: UnifiedBatteryHandler
```js
// BANNED - linear formula:
const percent = (voltage - 2.5) / 0.5;

// REQUIRED:
const percent = UnifiedBatteryHandler.calculateFromVoltage(voltage, '3V_2100');
```

### R8: markAppCommand Before Physical Commands
```js
// REQUIRED to prevent ghost button presses:
this.markAppCommand(gang, value);
await this._sendCommand(value);
```

## 🟠 HIGH PRIORITY RULES

### R9: Flow Cards in Driver.onInit()
```js
// CORRECT - register in driver:
class MyDriver extends Homey.Driver {
  async onInit() {
    const card = this.homey.flow.getActionCard('my_action');
    card.registerRunListener(async (args, state) => { /* ... */ });
  }
}
```

### R10: No titleFormatted with [[device]]
```js
// BANNED - causes manual device selection bug:
"titleFormatted": { "en": "The [[device]] is {{on|off}}" }

// CORRECT:
"title": { "en": "The device is {{on|off}}" }
```

### R11: Settings Keys
```js
// CORRECT:
this.getSetting('zb_model_id');
this.getSetting('zb_manufacturer_name');

// WRONG:
this.getSetting('zb_modelId');
this.getSetting('zb_manufacturerName');
```

### R12: Backlight Values
```js
// CORRECT - strings only:
const lightMode = backlightMode === 'normal' ? 1 : 2;

// WRONG - never numeric:
const lightMode = backlightMode === 0 ? 1 : 2;
```

### R13: Import Paths
```js
// CORRECT:
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

// WRONG:
const TuyaZigbeeDevice = require('../../lib/TuyaZigbeeDevice');
```

## 🟡 MEDIUM PRIORITY RULES

### R14: Fingerprint Matching
- `manufacturerName` + `productId` (COMBINED) must match
- Same mfr in multiple drivers is NORMAL if productId differs
- Use `CaseInsensitiveMatcher.js` — manual `.toLowerCase()` forbidden
- **NO WILDCARDS** in manufacturerName

### R15: Flow Card ID Uniqueness
- Pattern: `{driver}_physical_gang{N}_{on|off}`
- Must be globally unique across ALL drivers

### R16: Multi-DP Frame Parsing
- `TuyaDPParser.parseMultiple()` handles multiple DPs in single frame
- Never assume one frame = one DP

### R17: Curtain Position Invert
- Some curtains report 0=open, 100=closed
- Use `positionInvert: true` in cover profile

### R18: Smart Divisor Calibration
- Never assume 1:1 scaling
- Check SmartDivisorManager for auto-detection
- Known: DP18 (temp/10), DP19 (humidity/10), DP22 (formaldehyde/100)

## 🔵 ENRICHMENT RULES

### R19: Use Centralised Converters (v9.1.0)
```js
const { numeric, enumMap, boolean, positionInvert } = require('../../lib/converters/ValueConverterRegistry');

// In dpMappings:
'18': { capability: 'measure_temperature', transform: numeric({ divisor: 10 }).fromDevice },
'4':  { capability: 'thermostat_mode', transform: enumMap({ 0:'off', 1:'heat', 2:'auto' }).fromDevice },
'1':  { capability: 'onoff', transform: boolean().fromDevice },
```

### R20: Use TuyaQuirk for Device-Specific Fixes
```js
const { QuirkRegistry } = require('../../lib/tuya-local/TuyaQuirk');
await QuirkRegistry.applyAll(this);
```

### R21: Use ErrorClassifier for Error Handling
```js
const { readAttrCatch } = require('../../lib/utils/ErrorClassifier');
cluster.on('attr.measuredValue', readAttrCatch(this, 'Temperature'));
```

### R22: Use CapabilityMigrator for Driver Updates
```js
const { migrateCapabilities } = require('../../lib/utils/CapabilityMigrator');
await migrateCapabilities(this, { remove: ['old_cap'], ensure: ['new_cap'] });
```

### R23: Circuit Breaker for External APIs (v9.1.0)
```js
const CircuitBreaker = require('../../lib/utils/CircuitBreaker');
const breaker = new CircuitBreaker({
  name: 'TuyaCloudAPI',
  failureThreshold: 5,
  resetTimeout: 30000,
  successThreshold: 2,
});
const result = await breaker.exec(() => api.getDevices());
```

### R24: CapabilityMapCache (v9.1.0)
```js
const CapabilityMapCache = require('../../lib/utils/CapabilityMapCache');

// In device onInit():
CapabilityMapCache.warmup(this);

// After adding/removing capabilities:
CapabilityMapCache.invalidate(this);
```

### R25: WiFi Smart Divisor Protocol (v9.1.0)
```js
const { smartDivisorDetect } = require('../../lib/managers/SmartDivisorManager');

// WiFi devices MUST pass protocol: 'wifi' for correct divisor lookup:
const divisor = smartDivisorDetect(rawValue, dpId, {
  manufacturerName: this.getManufacturerName(),
  capability: 'measure_temperature',
  deviceId: this.getId(),
  protocol: 'wifi',
});
```

### R26: _destroyed Guard in All Async Callbacks
```js
// REQUIRED in all event handlers and async callbacks:
_onConnected() {
  if (this._destroyed) return;
  // ...
}
_onData(data) {
  if (this._destroyed) return;
  // ...
}
```

### R27: Offline Command Queuing (v9.0.40)
```js
// WiFi devices automatically queue commands when offline
// TuyaLocalClient handles offline queuing transparently
// Commands older than 5 minutes are dropped on reconnect
// Use connection-state event to track online/offline transitions
this._client.on('connection-state', (state) => {
  // state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
});
```

### R28: DPCache for Offline Fallback (v9.0.40)
```js
const { getDeviceCache } = require('../../lib/managers/DPCache');
const cache = getDeviceCache(deviceId);
cache.updateFromDps(data.dps);  // Cache incoming DP values
const cached = cache.get(dpId); // Returns { value, age } or null
```

### R29: ErrorClassifier Retry Logic (v9.0.40)
```js
const { withRetry, isRetryable } = require('../../lib/utils/ErrorClassifier');
const result = await withRetry(() => device.setDP(1, true), {
  maxRetries: 3,
  onRetry: (err, attempt, delay) => device.log(`Retry ${attempt} in ${delay}ms`)
});
```

### R30: Batch Capability Updates (v9.0.40)
```js
const BatchCapabilityUpdater = require('../../lib/managers/BatchCapabilityUpdater');
const batcher = new BatchCapabilityUpdater(device, { windowMs: 50 });
batcher.queue('measure_temperature', 22.5);
batcher.queue('measure_humidity', 65);
// Both applied together after 50ms window
```

### R31: Safe Logger for Utilities (v9.0.40)
```js
// BANNED in lib/ utilities:
device.log?.(msg) || console.log(msg);

// REQUIRED:
const { createSafeLogger } = require('../../lib/utils/safeLogger');
const _log = createSafeLogger(device, 'PREFIX');
_log.log(msg); // Uses device.log if available, silent otherwise
```

### R32: this.homey.setTimeout/setInterval (v9.0.40)
```js
// BANNED - global setTimeout/setInterval in device code:
setTimeout(() => { ... }, 1000);
setInterval(() => { ... }, 5000);

// REQUIRED - use Homey SDK timers:
this.homey.setTimeout(() => { ... }, 1000);
this.homey.setInterval(() => { ... }, 5000);

// EXCEPTION - Promise-based delays are acceptable:
await new Promise(r => this.homey.setTimeout(r, 100));

// EXCEPTION - Fallback patterns are acceptable:
(this.homey?.setTimeout ?? setTimeout)(() => { ... }, 1000);
```

### R33: assertZCLNode Guard (v9.0.40)
```js
// REQUIRED in onNodeInit for Zigbee devices:
const { assertZCLNode } = require('../../lib/util');

async onNodeInit({ zclNode }) {
  assertZCLNode(zclNode); // Throws if zclNode is invalid
  this.zclNode = zclNode;
  // ...
}
```

### R34: Deferred Heavy Initialization (v9.0.40)
```js
// REQUIRED - Defer non-critical initialization to avoid blocking device startup:
async onNodeInit({ zclNode }) {
  // Critical initialization first
  this.zclNode = zclNode;
  await this.initCriticalManagers();

  // Defer heavy operations
  this.homey.setTimeout(async () => {
    await this.scanUnknownClusters().catch(this.error);
    await this.enforceClusterBindings().catch(this.error);
    await this.queryAllDatapoints().catch(this.error);
  }, 1000);
}
```

### R35: registerMultipleCapabilities (v9.0.40)
```js
// RECOMMENDED for lights and multi-capability devices:
const multiCaps = [];
if (this.hasCapability('onoff')) multiCaps.push('onoff');
if (this.hasCapability('dim')) multiCaps.push('dim');
if (this.hasCapability('light_temperature')) multiCaps.push('light_temperature');

if (multiCaps.length >= 2) {
  this.registerMultipleCapabilities(multiCaps, async (valueObj, optsObj) => {
    // Handle debounced multi-capability changes
    if (valueObj.onoff !== undefined && valueObj.dim !== undefined) {
      // Handle onoff + dim together
    }
  });
}
```

### R36: onEndDeviceAnnounce Re-configuration (v9.0.40)
```js
// REQUIRED - Re-configure attribute reporting when battery devices wake up:
async onEndDeviceAnnounce() {
  // Re-bind clusters
  await this.enforceClusterBindings();

  // Re-configure attribute reporting
  await this._reconfigureAttributeReporting();

  // Query all datapoints for Tuya DP devices
  if (this._protocolInfo?.isTuyaDP) {
    await this.tuyaEF00Manager?.queryAllDatapoints?.();
  }
}
```

### R37: ConnectionStateTracker for WiFi Devices (v9.0.41)
```js
// REQUIRED - Track connection state for WiFi devices:
const ConnectionStateTracker = require('../../lib/utils/ConnectionStateTracker');
const tracker = new ConnectionStateTracker({ deviceId: this.getId() });

tracker.on('stateChange', ({ oldState, newState }) => {
  if (newState === 'connected') { /* re-sync state */ }
  if (newState === 'disconnected') { /* queue commands */ }
});

// Use convenience methods:
tracker.markConnected();
tracker.markDisconnected();
tracker.markReconnecting();

// Get stats:
const stats = tracker.getStats();
// { state, isConnected, reconnectCount, uptime, ... }
```

### R38: RetryWithBackoff for Critical Operations (v9.0.41)
```js
// REQUIRED - Use RetryWithBackoff for DP queries and ZCL reads:
const RetryWithBackoff = require('../../lib/utils/RetryWithBackoff');

// Factory method with device-appropriate presets:
const retry = RetryWithBackoff.forDevice(this);

// Execute with retry:
const result = await retry.queryDP(cluster, dpId);
const value = await retry.setDP(cluster, dpId, value, dataType);
const attr = await retry.readAttribute(cluster, 'measuredValue');

// Custom retry:
const result = await retry.execute(async () => {
  return await someOperation();
}, { operation: 'Custom operation' });
```

### R39: ConnectionState Persistence (v9.0.41)
```js
// RECOMMENDED - Persist connection stats for diagnostics:
const tracker = new ConnectionStateTracker({ deviceId: this.getId() });

// On device delete, export stats:
async onDeleted() {
  const stats = tracker.toJSON();
  // Store in device settings or diagnostics
  await super.onDeleted();
}

// Restore on init:
const tracker = new ConnectionStateTracker({ deviceId: this.getId() });
tracker.fromJSON(savedStats);
```

### R40: Connection Uptime Monitoring (v9.0.41)
```js
// RECOMMENDED - Monitor connection reliability:
const stats = tracker.getStats();

// Check uptime percentage:
if (stats.uptime < 95) {
  this.log(`Warning: Low connection uptime: ${stats.uptime}%`);
}

// Check for excessive reconnects:
if (stats.reconnectCount > 10) {
  this.log(`Warning: ${stats.reconnectCount} reconnects detected`);
}

// Check for stale connections:
if (tracker.isStale) {
  this.log('Connection appears stale, triggering reconnect');
  await this._reconnect();
}
```

### R41: ErrorClassifier Integration (v9.0.41)
```js
// REQUIRED - Use ErrorClassifier for structured error handling:
const { readAttrCatch, classify } = require('../../lib/utils/ErrorClassifier');

// Wrap cluster attribute listeners:
cluster.on('attr.measuredValue', readAttrCatch(this, 'Temperature'));

// Classify errors for retry decisions:
try {
  await device.setDP(1, true);
} catch (err) {
  const { retryable, delay } = classify(err);
  if (retryable) {
    await new Promise(r => this.homey.setTimeout(r, delay));
    // retry...
  }
}
```

### R42: CrashPrevention Utilities (v9.0.41)
```js
// REQUIRED - Use CrashPrevention for crash-safe operations:
const CrashPrevention = require('../../lib/utils/CrashPrevention');

// Safe async wrapper:
const safeFn = CrashPrevention.safeAsync(myAsyncFn, this);
await safeFn(); // Returns null on error

// Guard against destroyed devices:
CrashPrevention.guardDestroyed(this, () => {
  // Safe to execute
});

// Safe timeout with _destroyed check:
const timer = CrashPrevention.safeTimeout(this, () => {
  // Safe to execute after delay
}, 1000);

// Safe interval with _destroyed check:
const interval = CrashPrevention.safeInterval(this, () => {
  // Safe to execute periodically
}, 5000);

// Safe cleanup:
CrashPrevention.safeCleanup(resource, 'ResourceName', this);

// Safe capability setting:
await CrashPrevention.safeSetCapability(this, 'onoff', true);

// Safe flow triggering:
await CrashPrevention.safeTriggerFlow(this, flowCard, tokens, state);

// Safe Zigbee command:
await CrashPrevention.safeSendCommand(this, cluster, 'command', data);

// Safe initialization:
await CrashPrevention.safeInit(this, async () => {
  // Initialize device
});

// Safe deletion:
await CrashPrevention.safeDelete(this, async () => {
  // Cleanup device
});

// Retry with backoff:
const result = await CrashPrevention.withRetry(async () => {
  return await someOperation();
}, { maxRetries: 3, delay: 1000, context: this });
```

## 📋 Validation Commands
```bash
npm run check:all          # All validations
npm run check:health       # Comprehensive health check
npm run check:wifi         # WiFi lifecycle validation
npm run check:mixin        # Mixin order validation
npm run security-scan      # Security scan
```

## 📚 Key Documentation
| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Full project reference |
| `ARCHITECTURE_AI.md` | 3 AI layers |
| `PROJECT_INDEX.md` | Master reference (30 sections) |
| `WIFI_LOCAL_FIRST_ARCHITECTURE.md` | WiFi architecture diagrams |
| `BEST_PRACTICES_500.md` | 500+ best practices |
| `FLOW_CARD_ARGUMENT_TYPES.md` | Flow card types reference |
| `KNOWN_ISSUES.md` | Known issues tracker |

## 🔄 Auto-Audit System
- **Workflow**: `.github/workflows/ai-monthly-audit.yml`
- **Schedule**: 1st of every month at 00:00 UTC
- **Knowledge Cache**: `.ai/KNOWLEDGE_CACHE.json`
- **Output**: Automatic PR with audit results

---

## 🤖 Agent Behavior Rules

### A1: Thinking Blocks
Before taking action, reflect on the codebase state and potential side-effects.

### A2: Incremental Verification
Do not attempt to fix 10 things at once. Plan, execute one logical block, test/verify, reflect.

### A3: Tool-Driven Loop
Read files to confirm context, search codebase for dependencies, run validation scripts before making blind code edits.

### A4: Shadow Mode
All repairs and synchronization pipelines must operate in Shadow Mode -- no public forum announcements, no notifications to external threads, zero automated forum interactions.

### A5: Information Flow
- SCAN everything (Johan, WiFi, all threads, forks) then implement SILENTLY
- External sources: NEVER mention in forum/changelogs/commits/PR comments
- Own sources (dlnraja T140352, own GitHub): CAN mention
- Forum: ALWAYS merge with last dlnraja post

## 🔗 Z2M/ZHA Cross-Reference Rules

### Z1: When Adding New Devices
1. Search Z2M converters: `zigbee-herdsman-converters/src/devices/tuya.ts`
2. Search ZHA quirks: `zhaquirks/tuya/__init__.py`
3. Cross-reference DP mappings to known Tuya standard DPs
4. Verify manufacturerName: exact match (case-insensitive at runtime)
5. Check for variants: same mfr may have TZE200/TZE204/TZE284 prefixes

### Z2: Manufacturer Prefix Patterns
- `_TZ3000_*` / `_TZ3210_*` / `_TZ3400_*` -- Older Tuya modules
- `_TZE200_*` -- Tuya Zigbee modules (most common)
- `_TZE204_*` -- Tuya Zigbee modules v2 (newer)
- `_TZE284_*` -- Tuya Zigbee modules v3 (latest)
- `TS0601` -- Generic Tuya DP device (most common productId)
- `TS130F` -- Tuya ZCL curtain motor

### Z3: Known Misclassifications
- Climate sensors detected as presence sensors (Issue #325)
- Rain sensors placed in water_leak driver (Issue #388)
- MMWave radars missing distance threshold handling

## 🔒 Security Rules

### S1: GitHub Token
- NEVER commit tokens to `.git/config`
- Use `GH_PAT` secret for cross-repo access
- `GITHUB_TOKEN` for current repo only

### S2: Sensitive Files Block
`*.key`, `*.pem`, `config.json`, `secrets.json`, `credentials.json`, `token.json`, `oauth2.keys.json`, `client_secret*.json`

## 🛡️ Crash Prevention Rules

### CP1: Use CrashPrevention for All Async Operations
```js
// REQUIRED - Wrap all async operations with CrashPrevention:
const CrashPrevention = require('../../lib/utils/CrashPrevention');

// Instead of:
async _onData(data) {
  try {
    await this.processData(data);
  } catch (err) {
    this.error('Error:', err.message);
  }
}

// Use:
async _onData(data) {
  if (this._destroyed) return;
  await CrashPrevention.safeAsync(this.processData.bind(this), this, 'DataProcessing')(data);
}
```

### CP2: Guard All Async Callbacks with _destroyed Check
```js
// REQUIRED - Check _destroyed flag in all async callbacks:
async _onConnected() {
  if (this._destroyed) return;
  // ... rest of callback
}

async _onData(data) {
  if (this._destroyed) return;
  // ... rest of callback
}
```

### CP3: Use SafeTimeout and SafeInterval
```js
// BANNED - Raw setTimeout/setInterval:
setTimeout(() => { this.doSomething(); }, 1000);
setInterval(() => { this.poll(); }, 5000);

// REQUIRED - Use CrashPrevention safe wrappers:
const timer = CrashPrevention.safeTimeout(this, () => {
  this.doSomething();
}, 1000);

const interval = CrashPrevention.safeInterval(this, () => {
  this.poll();
}, 5000);
```

### CP4: Always Cleanup Resources on Delete
```js
// REQUIRED - Clean up all resources in onDeleted:
async onDeleted() {
  this._destroyed = true;

  // Clear timers
  CrashPrevention.clearTimeout(this, this._timer);
  CrashPrevention.clearInterval(this, this._interval);

  // Cleanup managers
  CrashPrevention.safeCleanup(this._manager, 'Manager', this);

  // Call parent
  await super.onDeleted();
}
```

### CP5: Use SafePromise for Unhandled Promises
```js
// BANNED - Unhandled promise rejection:
this.someAsyncOperation();

// REQUIRED - Wrap with SafePromise:
CrashPrevention.safePromise(this.someAsyncOperation(), this, 'AsyncOperation');
```

### CP6: Use GuardDestroyed for Device Operations
```js
// REQUIRED - Guard all device operations:
CrashPrevention.guardDestroyed(this, () => {
  this.setCapabilityValue('onoff', true);
});

// Or with homey guard:
CrashPrevention.guardHomey(this, () => {
  this.homey.setTimeout(() => { ... }, 1000);
});
```

### CP7: Use SafeSetCapability for Capability Updates
```js
// BANNED - Direct setCapabilityValue:
await this.setCapabilityValue('onoff', true);

// REQUIRED - Use CrashPrevention:
await CrashPrevention.safeSetCapability(this, 'onoff', true);
```

### CP8: Use SafeTriggerFlow for Flow Triggers
```js
// BANNED - Direct flow trigger:
await flowCard.trigger(this, tokens, state);

// REQUIRED - Use CrashPrevention:
await CrashPrevention.safeTriggerFlow(this, flowCard, tokens, state);
```

### CP9: Use SafeSendCommand for Zigbee Commands
```js
// BANNED - Direct cluster command:
await cluster.on();

// REQUIRED - Use CrashPrevention:
await CrashPrevention.safeSendCommand(this, cluster, 'on');
```

### CP10: Use WithRetry for Critical Operations
```js
// REQUIRED - Use CrashPrevention.withRetry for critical operations:
const result = await CrashPrevention.withRetry(async () => {
  return await this.sendCommand(command);
}, { maxRetries: 3, delay: 1000, context: this });
```

## 📊 Crash Pattern Analysis Summary

### Identified Crash Patterns (v9.0.41)

| Pattern | Count | Severity | Location |
|---------|-------|----------|----------|
| .then() without .catch() | 59 | HIGH | lib/, drivers/ |
| Empty catch handlers | 968 | MEDIUM | lib/, drivers/ |
| Unsafe setCapabilityValue | 87 | HIGH | lib/ |
| Missing _destroyed guard | 45+ | HIGH | drivers/ |
| Missing super.onDeleted() | 20+ | MEDIUM | drivers/ |
| Raw setTimeout/setInterval | 100+ | MEDIUM | lib/, drivers/ |
| Unhandled promise rejections | 14 | HIGH | drivers/ |

### Prevention Measures Implemented

| Measure | Status | Description |
|---------|--------|-------------|
| CrashPrevention.js | ✅ | Comprehensive crash prevention utilities |
| CORE_RULES.md CP1-CP10 | ✅ | 10 crash prevention rules added |
| safeAsync/safePromise | ✅ | Async error handling wrappers |
| guardDestroyed/guardHomey | ✅ | Device state guards |
| safeTimeout/safeInterval | ✅ | Timer management with _destroyed check |
| safeCleanup | ✅ | Resource cleanup utilities |
| safeSetCapability | ✅ | Safe capability value setting |
| safeTriggerFlow | ✅ | Safe flow card triggering |
| safeSendCommand | ✅ | Safe Zigbee command sending |
| withRetry | ✅ | Retry with backoff logic |

### Recommended Next Steps

1. **Audit all .then() without .catch()**: Add proper error handling to 59 instances
2. **Audit empty catch handlers**: Add logging to 968 instances
3. **Replace unsafe setCapabilityValue**: Use safeSetCapabilityValue in 87 instances
4. **Add _destroyed guard**: Add guard to 45+ async callbacks
5. **Fix missing super.onDeleted()**: Add parent call to 20+ drivers
6. **Replace raw timers**: Use CrashPrevention.safeTimeout/safeInterval
7. **Handle unhandled promises**: Wrap 14 instances with safePromise

## 📋 Validation Commands

### S3: Environment Variables
- NEVER commit `.env` files
- Use `.env.example` as template
- Secrets managed via GitHub Secrets

---

## 🏆 TITAN Protocol Audit Results (2026-06-16)

### Bugs Fixed This Session
| # | Severity | Description | Files Affected |
|---|----------|-------------|----------------|
| 1 | 🔴 CRITICAL | `TuyaLocalDevice.onDeleted()` missing `super.onDeleted()` | 29 WiFi drivers |
| 2 | 🔴 CRITICAL | `EweLinkLocalDevice.onDeleted()` missing `super.onDeleted()` | 6+ eWeLink drivers |
| 3 | 🔴 CRITICAL | 159 drivers using raw `setCapabilityValue` | 159 driver files |
| 4 | 🟡 MEDIUM | Incorrect placeholder URLs in KNOWLEDGE_CACHE.json | 1 file |

### New Modules Created
| Module | File | Purpose |
|--------|------|---------|
| CircuitBreaker | `lib/utils/CircuitBreaker.js` | Fault tolerance for external APIs |
| ValueConverterRegistry | `lib/converters/ValueConverterRegistry.js` | Centralized DP value converters (Z2M-inspired) |
| CapabilityMapCache | `lib/utils/CapabilityMapCache.js` | Cache capabilityMap in onInit() |
| BatchCapabilityUpdater | `lib/managers/BatchCapabilityUpdater.js` | Batch capability updates (50ms window) |
| DPCache | `lib/managers/DPCache.js` | Per-device DP value cache for offline fallback |
| safeLogger | `lib/utils/safeLogger.js` | Safe logger replacing console.log fallbacks |
| ConnectionStateTracker | `lib/utils/ConnectionStateTracker.js` | WiFi connection state tracking with history and uptime stats |
| RetryWithBackoff | `lib/utils/RetryWithBackoff.js` | Exponential backoff retry for DP queries and ZCL reads |

### Integrations Completed
| Integration | File | Status |
|-------------|------|--------|
| CircuitBreaker -> TuyaCloudAPI | `lib/tuya-local/TuyaCloudAPI.js` | Integrated |
| DPCache -> TuyaLocalDevice | `lib/tuya-local/TuyaLocalDevice.js` | Integrated |
| Offline queue -> TuyaLocalClient | `lib/tuya-local/TuyaLocalClient.js` | Integrated |
| ErrorClassifier retry logic | `lib/utils/ErrorClassifier.js` | Integrated |
| safeLogger -> TuyaTimeSync/TuyaDataQuery/TuyaGatewayEmulator/DataRecoveryManager | `lib/tuya/` | Integrated |
| 28 redundant workflows archived | `.archive/workflows-disabled/` | 66 -> 36 workflows |

### Validation Commands Added
```bash
npm run check:all          # All validations
npm run check:health       # Comprehensive health check
npm run check:wifi         # WiFi lifecycle validation
npm run check:mixin        # Mixin order validation
npm run security-scan      # Security scan
node scripts/validation/check-destroyed-guard.js  # _destroyed guards
node scripts/validation/check-super-ondeleted.js  # super.onDeleted()
node scripts/validation/check-circuit-breaker.js  # CircuitBreaker integration
```

---
*Generated by TITAN Protocol v2 -- June 2026*
*Synthesized from: CLAUDE.md, .cursorrules, .clinerules, .cascade, ARCHITECTURE_AI.md, Z2M, ZHA, athombv repos*
