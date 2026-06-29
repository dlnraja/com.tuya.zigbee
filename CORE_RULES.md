# CORE RULES — Tuya Unified Zigbee for Homey Pro
> Single source of truth for all AI agents, developers, and CI/CD pipelines
> Version: 5.0.0 | Last Updated: 2026-06-18 (Documentation Finalizer v8.0)
> Rules: R1-R61 (61 enrichment rules) + CP1-CP10 (10 crash prevention rules) + IC1-IC4 (4 image conformity rules) + FM1-FM3 (3 forum/multi-manufacturer rules)

## 🎯 Vision
**LOCAL-FIRST** — 100% local execution on Homey Pro. Zero cloud calls during normal operation.
- Heap < 64MB
- Bundle < 7MB
- 100% Homey SDK3 compliant
- Maximum fault tolerance

## 📊 Project Stats (v9.0.53)
- **430 drivers** (379 Zigbee + 51 WiFi)
- **4,304 fingerprints** (4,035 unique manufacturerNames)
- **4,138 flow cards** (across 339 drivers)
- **156 unique capabilities**
- **23 time sync formats** (5 MCU protocol versions)
- **11-layer pipeline** (L0-L11)
- **533 lib files** | **565 scripts** | **40 workflows** | **334 docs**
- **667 URLs** tracked in Knowledge Base

## 🔴 CRITICAL RULES (Never Violate)

### R0: Cross-App Prompt Benefit
Every prompt, diagnosis, PR review, issue reply, forum reply, and automation plan must consider both maintained app tracks:

- `master` / `com.dlnraja.tuya.zigbee`
- `stable-v5` / `com.dlnraja.tuya.zigbee.stable`

Universal fixes for security, CI, publish verification, crash prevention, SDK3 validation, battery handling, physical buttons, endpoint mapping, and flow reliability are cross-app candidates by default. Always record whether the change should be master-only, stable-only, or propagated to both. Never copy App IDs, version metadata, publish secrets, or branch-specific store links across tracks.

When the prompt involves Gmail crash logs, Homey dashboard diagnostics, forum/GitHub notification emails, or generated diagnostic artifacts, follow `docs/rules/DIAGNOSTIC_HISTORY_RULES.md`: collect through the sanitized IMAP/dashboard paths, run privacy redaction first, run `npm run check:diag-history`, and never commit raw diagnostic state.

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

### R27: Offline Command Queuing (v9.0.53)
```js
// WiFi devices automatically queue commands when offline
// TuyaLocalClient handles offline queuing transparently
// Commands older than 5 minutes are dropped on reconnect
// Use connection-state event to track online/offline transitions
this._client.on('connection-state', (state) => {
  // state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
});
```

### R28: DPCache for Offline Fallback (v9.0.53)
```js
const { getDeviceCache } = require('../../lib/managers/DPCache');
const cache = getDeviceCache(deviceId);
cache.updateFromDps(data.dps);  // Cache incoming DP values
const cached = cache.get(dpId); // Returns { value, age } or null
```

### R29: ErrorClassifier Retry Logic (v9.0.53)
```js
const { withRetry, isRetryable } = require('../../lib/utils/ErrorClassifier');
const result = await withRetry(() => device.setDP(1, true), {
  maxRetries: 3,
  onRetry: (err, attempt, delay) => device.log(`Retry ${attempt} in ${delay}ms`)
});
```

### R30: Batch Capability Updates (v9.0.53)
```js
const BatchCapabilityUpdater = require('../../lib/managers/BatchCapabilityUpdater');
const batcher = new BatchCapabilityUpdater(device, { windowMs: 50 });
batcher.queue('measure_temperature', 22.5);
batcher.queue('measure_humidity', 65);
// Both applied together after 50ms window
```

### R31: Safe Logger for Utilities (v9.0.53)
```js
// BANNED in lib/ utilities:
device.log?.(msg) || console.log(msg);

// REQUIRED:
const { createSafeLogger } = require('../../lib/utils/safeLogger');
const _log = createSafeLogger(device, 'PREFIX');
_log.log(msg); // Uses device.log if available, silent otherwise
```

### R32: this.homey.setTimeout/setInterval (v9.0.53)
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

### R33: assertZCLNode Guard (v9.0.53)
```js
// REQUIRED in onNodeInit for Zigbee devices:
const { assertZCLNode } = require('../../lib/util');

async onNodeInit({ zclNode }) {
  assertZCLNode(zclNode); // Throws if zclNode is invalid
  this.zclNode = zclNode;
  // ...
}
```

### R34: Deferred Heavy Initialization (v9.0.53)
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

### R35: registerMultipleCapabilities (v9.0.53)
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

### R36: onEndDeviceAnnounce Re-configuration (v9.0.53)
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

## 🖼️ Image Conformity Rules

### IC1: SVG Standards (All Driver Icons)
```xml
<!-- REQUIRED - All driver SVG icons must conform to Homey standards: -->
<!-- viewBox: 960x960 for Homey capability icons -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 960" width="960" height="960">
  <!-- Flat design, single-color preferred -->
  <!-- NO gradients (linearGradient, radialGradient) -->
  <!-- NO raster images (embedded PNG, JPG, base64) -->
  <!-- Transparent or single solid fill background -->
</svg>
```

### IC2: App Icon Standards
```xml
<!-- REQUIRED - App icon at assets/icon.svg: -->
<!-- viewBox: 0 0 100 100 -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <!-- Current: 1212 bytes, no gradients, no rasters, fully compliant -->
</svg>
```

### IC3: Image Generation
```bash
# REQUIRED - Use regen-images.js for driver images:
node scripts/regen-images.js          # Generate all images
node scripts/regen-images.js --check  # Check conformity only

# Image sizes generated:
# small.png  (75x75)   - Device list thumbnail
# large.png  (500x500) - Device detail view
# xlarge.png (1000x1000) - High-res display
# Compression: level 9, white background (r:255, g:255, b:255, alpha:1)
```

### IC4: Image Conformity Audit Results
| Metric | Value |
|--------|-------|
| Total drivers | 430 |
| Drivers with SVG | 430 (100%) |
| Drivers without SVG | 0 |
| App icon compliant | Yes (100x100, no gradients, no rasters) |
| Regen script | `scripts/regen-images.js` |
| Last audit | 2026-06-17 |

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

### New Modules Created (10 Total)
| Module | File | Size | Purpose |
|--------|------|------|---------|
| CircuitBreaker | `lib/utils/CircuitBreaker.js` | 7.3KB | Fault tolerance for external APIs (CLOSED/OPEN/HALF_OPEN) |
| ValueConverterRegistry | `lib/converters/ValueConverterRegistry.js` | 16.2KB | Centralized DP value converters (Z2M-inspired) |
| CapabilityMapCache | `lib/utils/CapabilityMapCache.js` | 3.8KB | WeakMap-based capabilityMap caching |
| BatchCapabilityUpdater | `lib/managers/BatchCapabilityUpdater.js` | 4.2KB | Batch capability updates (50ms window) |
| DPCache | `lib/managers/DPCache.js` | 3.5KB | Per-device DP value cache for offline fallback |
| safeLogger | `lib/utils/safeLogger.js` | 1.8KB | Safe logger replacing console.log fallbacks |
| ConnectionStateTracker | `lib/utils/ConnectionStateTracker.js` | 6.1KB | WiFi connection state tracking with history and uptime stats |
| RetryWithBackoff | `lib/utils/RetryWithBackoff.js` | 5.4KB | Exponential backoff retry for DP queries and ZCL reads |
| CrashPrevention | `lib/utils/CrashPrevention.js` | 8.2KB | Comprehensive crash prevention utilities (safeAsync, safePromise, guardDestroyed, safeTimeout, safeInterval, safeCleanup, safeSetCapability, safeTriggerFlow, safeSendCommand, withRetry) |
| ErrorClassifier | `lib/utils/ErrorClassifier.js` | 4.7KB | Structured error handling (readAttrCatch, classify, isRetryable, getRetryDelay, withRetry) |

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

## 🧠 Advanced Feature Module Rules

### R43: Presence Confidence Scoring (v9.0.53)
```js
// REQUIRED - Use PresenceConfidenceScorer for multi-factor presence detection:
const PresenceConfidenceScorer = require('../../lib/presence/PresenceConfidenceScorer');
const scorer = new PresenceConfidenceScorer({ deviceId: this.getId() });

// Feed sensor data:
scorer.addSignal('motion', { detected: true, timestamp: Date.now() });
scorer.addSignal('door', { open: true, timestamp: Date.now() });

// Get confidence (0-100):
const confidence = scorer.getConfidence();
if (confidence > 80) {
  this.safeSetCapabilityValue('presence_detected', true);
}
```

### R44: Battery Health Intelligence (v9.0.53)
```js
// REQUIRED - Use BatteryHealthIntelligence for long-term degradation tracking:
const BatteryHealthIntelligence = require('../../lib/battery/BatteryHealthIntelligence');
const health = new BatteryHealthIntelligence({ deviceId: this.getId() });

// Record voltage readings over time:
health.recordVoltage(3.0, Date.now());

// Get health assessment:
const assessment = health.getAssessment();
// { capacityFade, selfDischargeRate, remainingUsefulLife, recommendation }
```

### R45: Device Group Management (v9.0.53)
```js
// RECOMMENDED - Use DeviceGroupManager for coordinated multi-device actions:
const DeviceGroupManager = require('../../lib/groups/DeviceGroupManager');
const groupManager = new DeviceGroupManager(this.homey);

// Create a group:
const group = await groupManager.createGroup('Living Room Lights', [
  deviceId1, deviceId2, deviceId3
]);

// Synchronized command with jitter:
await group.setAll('onoff', true, { jitterMs: 50 });
```

### R46: Advanced Flow Conditions (v9.0.53)
```js
// RECOMMENDED - Use AdvancedMultiConditionFlows for complex flow logic:
const AdvancedMultiConditionFlows = require('../../lib/features/AdvancedMultiConditionFlows');
const conditions = new AdvancedMultiConditionFlows();

// Multi-device AND/OR/NOT conditions:
const result = await conditions.evaluate({
  logic: 'AND',
  conditions: [
    { capability: 'measure_temperature', operator: '>', value: 22 },
    { capability: 'presence_detected', operator: '==', value: true },
    { timeConstraint: { after: '08:00', before: '22:00' } }
  ]
});
```

### R47: Diagnostic Report Export (v9.0.53)
```js
// RECOMMENDED - Use DiagnosticReportExport for support diagnostics:
const DiagnosticReportExport = require('../../lib/features/DiagnosticReportExport');
const exporter = new DiagnosticReportExport(this.homey);

// Generate report:
const report = await exporter.generate({
  includeDevices: true,
  includeTopology: true,
  includeBatteryHistory: true,
  format: 'json' // or 'pdf'
});
```

### R48: Network Topology Awareness (v9.0.53)
```js
// RECOMMENDED - Use NetworkTopologyTrigger for mesh health flows:
const NetworkTopologyTrigger = require('../../lib/features/NetworkTopologyTrigger');
const topo = new NetworkTopologyTrigger(this.homey);

// Monitor router availability:
topo.on('routerLost', (router) => {
  this.log(`Router ${router.ieeeAddr} lost`);
});

// Check mesh health:
const health = topo.getMeshHealth();
// { totalRouters, onlineRouters, avgLqi, orphanedDevices }
```

## 🏠 Forum-Based Device Addition Rules

### R59: Forum Device Addition Workflow (v8.0)
```js
// REQUIRED - Follow this workflow when adding devices from forum reports:
// 1. Monitor Homey Community Forum for device support requests
// 2. Extract device model ID, manufacturer name, productId from forum posts
// 3. Cross-reference with Z2M/ZHA databases for DP mappings
// 4. Verify manufacturerName + productId doesn't exist in another driver
// 5. Add fingerprint to appropriate driver with CaseInsensitiveMatcher
// 6. Run check-fingerprint-health.js validation
// 7. Document in CHANGELOG.md with forum issue reference
```

### R60: Multi-Manufacturer Support (v8.0)
```js
// REQUIRED - Handle multi-manufacturer devices correctly:
// Same device model sold under different brands = separate fingerprints
// Example: Device X sold as "Brand A" and "Brand B"
// Both need fingerprints in the same driver

// CORRECT:
manufacturerName: ['_TZE200_abc123', '_TZE200_def456']

// WRONG - missing second manufacturer:
manufacturerName: ['_TZE200_abc123']
```

### R61: One Manufacturer = Thousands of Devices (v8.0)
```js
// REQUIRED - Understand manufacturer scale:
// One manufacturerName can produce thousands of device variants
// Each variant may have different productId
// Same manufacturerName in multiple drivers is NORMAL when productId differs

// Example: _TZE200_gubdgai2 appears in:
// - curtain_motor (productId: TS0601)
// - cover_roller (productId: TS130F)
// This is NOT a collision - it's correct multi-product support
```

## 🏭 Forum & Multi-Manufacturer Rules (FM1-FM3)

### FM1: Forum-Based Device Addition Workflow
```js
// REQUIRED - Follow this structured workflow for forum-reported devices:
// 1. MONITOR: Watch Homey Community Forum for device requests
// 2. EXTRACT: Get model ID, manufacturer name, productId from posts
// 3. CROSS-REF: Check Z2M/ZHA databases for DP mappings
// 4. VERIFY: Ensure manufacturerName + productId not in another driver
// 5. ADD: Fingerprint to appropriate driver with CaseInsensitiveMatcher
// 6. VALIDATE: Run check-fingerprint-health.js
// 7. DOCUMENT: Add to CHANGELOG.md with forum issue reference

// Example forum report:
// "I have a _TZE204_clrdrnya TS0601 motion sensor that doesn't work"
// -> Check Z2M for DP mappings
// -> Verify not in another driver
// -> Add to motion_sensor_radar_mmwave
// -> Validate and document
```

### FM2: Multi-Manufacturer Device Support
```js
// REQUIRED - Same device sold under multiple brands:
// Each brand may have different manufacturerName but same functionality
// All variants must be in the same driver's manufacturerName array

// CORRECT - All variants listed:
manufacturerName: [
  '_TZE200_abc123',  // Brand A
  '_TZE200_def456',  // Brand B
  '_TZE204_ghi789'   // Brand C (newer module)
]

// WRONG - Missing variants:
manufacturerName: ['_TZE200_abc123']  // Brand B and C won't work

// VALIDATION: After adding, run:
// node scripts/validation/check-fingerprint-health.js
```

### FM3: One Manufacturer = Thousands of Devices
```js
// REQUIRED - Understand manufacturer scale:
// One manufacturerName (e.g., _TZE200_gubdgai2) can produce:
// - Multiple device types (sensors, switches, covers)
// - Multiple product IDs (TS0601, TS130F, TS0001)
// - Multiple firmware versions

// SAME MANUFACTURER IN MULTIPLE DRIVERS = NORMAL
// This is NOT a collision when productId differs:

// Driver: switch_1gang
manufacturerName: ['_TZ3000_abc']
productId: ['TS0001']

// Driver: switch_2gang
manufacturerName: ['_TZ3000_abc']
productId: ['TS0002']

// Both are correct - same manufacturer, different products

// ANTI-PATTERN: Using wildcards
manufacturerName: ['_TZE200_*']  // BANNED - causes false matches
```

### R49: Predictive Health Engine (v9.0.53)
```js
// RECOMMENDED - Use PredictiveHealthEngine for proactive monitoring:
const PredictiveHealthEngine = require('../../lib/features/PredictiveHealthEngine');
const engine = new PredictiveHealthEngine(this.homey);

// Register device for monitoring:
engine.trackDevice(deviceId, {
  checkInterval: 3600000, // 1 hour
  thresholds: { battery: 20, lqi: 50 }
});

// Get predictions:
const predictions = engine.getPredictions(deviceId);
// { failureProbability, recommendedAction, timeToFailure }
```

### R50: Energy History Store (v9.0.53)
```js
// RECOMMENDED - Use EnergyHistoryStore for consumption tracking:
const EnergyHistoryStore = require('../../lib/features/EnergyHistoryStore');
const store = new EnergyHistoryStore(this.homey);

// Record consumption:
store.record(deviceId, { power: 150, energy: 0.15, timestamp: Date.now() });

// Query history:
const history = store.query(deviceId, { from: '7d', granularity: 'hourly' });
```

### R51: Signal Triangulation for Presence (v9.0.53)
```js
// RECOMMENDED - Use SignalTriangulation for location-aware presence:
const SignalTriangulation = require('../../lib/presence/SignalTriangulation');
const triangulation = new SignalTriangulation(this.homey);

// Register sensor positions:
triangulation.addSensor('sensor1', { x: 0, y: 0, floor: 0 });
triangulation.addSensor('sensor2', { x: 5, y: 0, floor: 0 });

// Get estimated position:
const position = triangulation.estimate(deviceId);
// { x, y, floor, confidence }
```

### R52: Room Signal Aggregation (v9.0.53)
```js
// RECOMMENDED - Use RoomSignalAggregator for room-level presence:
const RoomSignalAggregator = require('../../lib/presence/RoomSignalAggregator');
const aggregator = new RoomSignalAggregator();

// Add sensors to room:
aggregator.addSensorToRoom('living_room', 'motion_sensor_1');
aggregator.addSensorToRoom('living_room', 'door_sensor_1');

// Get room occupancy:
const occupancy = aggregator.getRoomOccupancy('living_room');
// { occupied: true, confidence: 95, lastActivity: timestamp }
```

### R53: Schedule Manager (v9.0.53)
```js
// RECOMMENDED - Use ScheduleManager for cron-like scheduling:
const ScheduleManager = require('../../lib/features/ScheduleManager');
const scheduler = new ScheduleManager(this.homey);

// Create schedule:
scheduler.addSchedule('morning_lights', {
  cron: '0 7 * * 1-5', // 7am weekdays
  action: () => device.setCapabilityValue('onoff', true),
  holidays: 'skip' // Skip on holidays
});
```

### R54: Transition Engine (v9.0.53)
```js
// RECOMMENDED - Use TransitionEngine for smooth value changes:
const TransitionEngine = require('../../lib/features/TransitionEngine');
const transition = new TransitionEngine();

// Gradual dimming:
await transition.execute({
  device,
  capability: 'dim',
  from: 0,
  to: 1,
  duration: 5000, // 5 seconds
  steps: 50,
  easing: 'easeInOut'
});
```

### R55: Solar Elevation Calculations (v9.0.53)
```js
// RECOMMENDED - Use SolarElevation for sun-based automation:
const SolarElevation = require('../../lib/features/SolarElevation');
const solar = new SolarElevation({ latitude: 52.37, longitude: 4.89 });

// Get current sun position:
const position = solar.getPosition();
// { elevation: 45, azimuth: 180, isDay: true }

// Schedule by sun event:
solar.on('sunset', () => {
  device.setCapabilityValue('onoff', true); // Turn on lights at sunset
});
```

### R56: Tariff Calculator (v9.0.53)
```js
// RECOMMENDED - Use TariffCalculator for energy cost tracking:
const TariffCalculator = require('../../lib/features/TariffCalculator');
const tariff = new TariffCalculator({
  peak: 0.25,    // EUR/kWh
  offPeak: 0.15, // EUR/kWh
  peakHours: { start: '07:00', end: '23:00' }
});

// Calculate cost:
const cost = tariff.calculate(energyKwh, timestamp);
// { cost, period: 'peak'|'offPeak', rate }
```

### R57: Configuration Backup/Restore (v9.0.53)
```js
// RECOMMENDED - Use ConfigurationBackupRestore for device migration:
const ConfigurationBackupRestore = require('../../lib/features/ConfigurationBackupRestore');
const backup = new ConfigurationBackupRestore(this.homey);

// Backup device settings:
const data = await backup.backupDevice(deviceId);

// Restore to new device:
await backup.restoreDevice(newDeviceId, data);
```

### R58: Battery Hybrid Manager (v9.0.53)
```js
// RECOMMENDED - Use BatteryHybridManager for dual-power devices:
const BatteryHybridManager = require('../../lib/battery/BatteryHybridManager');
const hybrid = new BatteryHybridManager({ deviceId: this.getId() });

// Track power source:
hybrid.setPowerSource('mains'); // or 'battery'
const effectiveBattery = hybrid.getEffectiveBattery();
// Returns 100 when on mains, actual battery level when on battery
```

### New Anti-Patterns

### AP13: Using Deprecated HybridSwitchBase
```js
// BANNED - HybridSwitchBase is deprecated:
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');

// REQUIRED - Use UnifiedSwitchBase directly:
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
class Device extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {}
```

### AP14: Missing positionInvert Check on Curtains
```js
// BANNED - Assuming all curtains have same position mapping:
const position = rawValue; // May be inverted

// REQUIRED - Check cover profile for positionInvert quirk:
const { getCoverProfile } = require('../../lib/registry/profiles/covers');
const profile = getCoverProfile(this);
const position = profile.positionInvert ? (100 - rawValue) : rawValue;
```

---
*Generated by Documentation Updater v7.0 -- June 2026*
*Synthesized from: CLAUDE.md, .cursorrules, .clinerules, .cascade, ARCHITECTURE_AI.md, Z2M, ZHA, athombv repos*
*Final enrichment: R1-R58 + CP1-CP10 + IC1-IC4 + 42 modules + image conformity + presence + battery health*
