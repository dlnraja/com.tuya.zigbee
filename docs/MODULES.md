# Module Documentation

> Tuya Unified Zigbee for Homey Pro
> Version: 9.0.53 | Last Updated: 2026-06-18
> Total Modules: 42

---

## Table of Contents

1. [Crash Prevention & Safety](#crash-prevention--safety)
2. [Error Handling & Retry](#error-handling--retry)
3. [Connection Management](#connection-management)
4. [Capability Management](#capability-management)
5. [Battery Management](#battery-management)
6. [Presence Detection](#presence-detection)
7. [Device Groups](#device-groups)
8. [Advanced Features](#advanced-features)
9. [Converters & Parsers](#converters--parsers)
10. [Utility Modules](#utility-modules)

---

## Crash Prevention & Safety

### CrashPrevention
- **File**: `lib/utils/CrashPrevention.js` (398 lines)
- **Purpose**: Comprehensive crash prevention for all async operations
- **API**:
  ```js
  const CrashPrevention = require('../../lib/utils/CrashPrevention');

  // Safe async wrapper
  const safeFn = CrashPrevention.safeAsync(myAsyncFn, this);
  await safeFn(); // Returns null on error

  // Guard against destroyed devices
  CrashPrevention.guardDestroyed(this, () => { /* safe */ });

  // Safe timeout/interval with _destroyed check
  const timer = CrashPrevention.safeTimeout(this, fn, 1000);
  const interval = CrashPrevention.safeInterval(this, fn, 5000);

  // Safe capability setting
  await CrashPrevention.safeSetCapability(this, 'onoff', true);

  // Safe flow triggering
  await CrashPrevention.safeTriggerFlow(this, flowCard, tokens, state);

  // Safe Zigbee command
  await CrashPrevention.safeSendCommand(this, cluster, 'on');

  // Retry with backoff
  const result = await CrashPrevention.withRetry(fn, { maxRetries: 3, delay: 1000 });
  ```
- **Rules**: CP1-CP10

### safeLogger
- **File**: `lib/utils/safeLogger.js` (38 lines)
- **Purpose**: Safe logger replacing console.log fallbacks in lib/ utilities
- **API**:
  ```js
  const { createSafeLogger } = require('../../lib/utils/safeLogger');
  const _log = createSafeLogger(device, 'PREFIX');
  _log.log(msg); // Uses device.log if available, silent otherwise
  ```
- **Rules**: R31

---

## Error Handling & Retry

### ErrorClassifier
- **File**: `lib/utils/ErrorClassifier.js` (225 lines)
- **Purpose**: Structured error handling with retry logic
- **API**:
  ```js
  const { readAttrCatch, classify, isRetryable, getRetryDelay, withRetry } = require('../../lib/utils/ErrorClassifier');

  // Wrap cluster attribute listeners
  cluster.on('attr.measuredValue', readAttrCatch(this, 'Temperature'));

  // Classify errors for retry decisions
  const { retryable, delay } = classify(err);

  // Automatic retry with backoff
  const result = await withRetry(() => device.setDP(1, true), {
    maxRetries: 3,
    onRetry: (err, attempt, delay) => device.log(`Retry ${attempt} in ${delay}ms`)
  });
  ```
- **Rules**: R21, R29, R41

### RetryWithBackoff
- **File**: `lib/utils/RetryWithBackoff.js` (278 lines)
- **Purpose**: Exponential backoff retry for DP queries and ZCL reads
- **API**:
  ```js
  const RetryWithBackoff = require('../../lib/utils/RetryWithBackoff');
  const retry = RetryWithBackoff.forDevice(this);

  // Execute with retry
  const result = await retry.queryDP(cluster, dpId);
  const value = await retry.setDP(cluster, dpId, value, dataType);
  const attr = await retry.readAttribute(cluster, 'measuredValue');

  // Custom retry
  const result = await retry.execute(async () => someOperation(), { operation: 'Custom' });
  ```
- **Rules**: R38

### CircuitBreaker
- **File**: `lib/utils/CircuitBreaker.js` (251 lines)
- **Purpose**: Fault tolerance for external APIs (CLOSED/OPEN/HALF_OPEN states)
- **API**:
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
- **Rules**: R23

---

## Connection Management

### ConnectionStateTracker
- **File**: `lib/utils/ConnectionStateTracker.js` (303 lines)
- **Purpose**: WiFi connection state tracking with history, uptime stats, state persistence
- **API**:
  ```js
  const ConnectionStateTracker = require('../../lib/utils/ConnectionStateTracker');
  const tracker = new ConnectionStateTracker({ deviceId: this.getId() });

  tracker.on('stateChange', ({ oldState, newState }) => {
    if (newState === 'connected') { /* re-sync state */ }
    if (newState === 'disconnected') { /* queue commands */ }
  });

  // Convenience methods
  tracker.markConnected();
  tracker.markDisconnected();
  tracker.markReconnecting();

  // Get stats
  const stats = tracker.getStats();
  // { state, isConnected, reconnectCount, uptime, ... }

  // Persistence
  const json = tracker.toJSON();
  tracker.fromJSON(savedStats);
  ```
- **Rules**: R37, R39, R40

---

## Capability Management

### CapabilityMapCache
- **File**: `lib/utils/CapabilityMapCache.js` (151 lines)
- **Purpose**: WeakMap-based capabilityMap caching to reduce GC pressure
- **API**:
  ```js
  const CapabilityMapCache = require('../../lib/utils/CapabilityMapCache');
  CapabilityMapCache.warmup(this); // In device onInit()
  CapabilityMapCache.invalidate(this); // After capability change
  ```
- **Rules**: R24

### BatchCapabilityUpdater
- **File**: `lib/managers/BatchCapabilityUpdater.js` (104 lines)
- **Purpose**: Batch capability updates with 50ms window
- **API**:
  ```js
  const BatchCapabilityUpdater = require('../../lib/managers/BatchCapabilityUpdater');
  const batcher = new BatchCapabilityUpdater(device, { windowMs: 50 });
  batcher.queue('measure_temperature', 22.5);
  batcher.queue('measure_humidity', 65);
  // Both applied together after 50ms window
  ```
- **Rules**: R30

### DPCache
- **File**: `lib/managers/DPCache.js` (162 lines)
- **Purpose**: Per-device DP value cache for offline fallback (5min TTL, LRU)
- **API**:
  ```js
  const { getDeviceCache } = require('../../lib/managers/DPCache');
  const cache = getDeviceCache(deviceId);
  cache.updateFromDps(data.dps);
  const cached = cache.get(dpId); // Returns { value, age } or null
  ```
- **Rules**: R28

---

## Battery Management

### UnifiedBatteryHandler
- **File**: `lib/battery/UnifiedBatteryHandler.js` (59.5KB)
- **Purpose**: Non-linear battery calculation with profile support
- **API**:
  ```js
  const UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler');
  const percent = UnifiedBatteryHandler.calculateFromVoltage(voltage, '3V_2100');
  ```
- **Rules**: R7

### BatteryHealthIntelligence
- **File**: `lib/battery/BatteryHealthIntelligence.js` (1499 lines)
- **Purpose**: Long-term battery degradation tracking and predictive replacement alerts
- **Features**:
  - Capacity fade detection (tracks max voltage over time)
  - Self-discharge rate monitoring
  - Temperature-compensated calculations
  - Remaining useful life (RUL) estimation
  - Early warning system for critical batteries
- **API**:
  ```js
  const BatteryHealthIntelligence = require('../../lib/battery/BatteryHealthIntelligence');
  const health = new BatteryHealthIntelligence({ deviceId: this.getId() });
  health.recordVoltage(3.0, Date.now());
  const assessment = health.getAssessment();
  // { capacityFade, selfDischargeRate, remainingUsefulLife, recommendation }
  ```
- **Rules**: R44

### BatteryHybridManager
- **File**: `lib/battery/BatteryHybridManager.js` (428 lines)
- **Purpose**: Devices with both battery and mains power sources
- **API**:
  ```js
  const BatteryHybridManager = require('../../lib/battery/BatteryHybridManager');
  const hybrid = new BatteryHybridManager({ deviceId: this.getId() });
  hybrid.setPowerSource('mains'); // or 'battery'
  const effectiveBattery = hybrid.getEffectiveBattery(); // 100 when on mains
  ```
- **Rules**: R58

### BatteryMonitoringSystem
- **File**: `lib/battery/BatteryMonitoringSystem.js` (229 lines)
- **Purpose**: Continuous battery monitoring with alert system

### BatteryIconDetector
- **File**: `lib/battery/BatteryIconDetector.js` (118 lines)
- **Purpose**: Battery icon selection based on charge level and health

### BatteryManagerV3
- **File**: `lib/battery/BatteryManagerV3.js` (241 lines)
- **Purpose**: Battery manager v3 with improved calculation engine

### BatterySystem
- **File**: `lib/battery/BatterySystem.js` (390 lines)
- **Purpose**: Unified battery system integrating all battery modules

---

## Presence Detection

### PresenceConfidenceScorer
- **File**: `lib/presence/PresenceConfidenceScorer.js` (222 lines)
- **Purpose**: Multi-factor presence scoring using motion, door/window, and ambient light sensors
- **Algorithm**: Bayesian confidence scoring with temporal decay
- **API**:
  ```js
  const PresenceConfidenceScorer = require('../../lib/presence/PresenceConfidenceScorer');
  const scorer = new PresenceConfidenceScorer({ deviceId: this.getId() });
  scorer.addSignal('motion', { detected: true, timestamp: Date.now() });
  scorer.addSignal('door', { open: true, timestamp: Date.now() });
  const confidence = scorer.getConfidence(); // 0-100
  ```
- **Rules**: R43

### SignalTriangulation
- **File**: `lib/presence/SignalTriangulation.js` (295 lines)
- **Purpose**: Location-aware presence detection using Zigbee signal strength
- **API**:
  ```js
  const SignalTriangulation = require('../../lib/presence/SignalTriangulation');
  const triangulation = new SignalTriangulation(this.homey);
  triangulation.addSensor('sensor1', { x: 0, y: 0, floor: 0 });
  const position = triangulation.estimate(deviceId);
  // { x, y, floor, confidence }
  ```
- **Rules**: R51

### AdvancedPresenceEngine
- **File**: `lib/presence/AdvancedPresenceEngine.js` (464 lines)
- **Purpose**: Advanced presence engine combining all presence detection modules

### VirtualPresenceDetector
- **File**: `lib/presence/VirtualPresenceDetector.js` (360 lines)
- **Purpose**: Virtual presence detection using indirect signals (light, motion, door sensors)

### NetworkPresenceCorrelation
- **File**: `lib/presence/NetworkPresenceCorrelation.js` (297 lines)
- **Purpose**: Network-level presence correlation using device connectivity patterns

### RoomSignalAggregator
- **File**: `lib/presence/RoomSignalAggregator.js` (313 lines)
- **Purpose**: Room-level presence consolidation from multiple sensors
- **API**:
  ```js
  const RoomSignalAggregator = require('../../lib/presence/RoomSignalAggregator');
  const aggregator = new RoomSignalAggregator();
  aggregator.addSensorToRoom('living_room', 'motion_sensor_1');
  const occupancy = aggregator.getRoomOccupancy('living_room');
  // { occupied: true, confidence: 95, lastActivity: timestamp }
  ```
- **Rules**: R52

### SignalCartography
- **File**: `lib/presence/SignalCartography.js` (315 lines)
- **Purpose**: Signal strength mapping for indoor positioning

---

## Device Groups

### DeviceGroupManager
- **File**: `lib/groups/DeviceGroupManager.js` (384 lines)
- **Purpose**: Coordinate actions across multiple devices with synchronized commands
- **Features**: Dynamic group creation, synchronized command execution with jitter, group-level energy aggregation, scene persistence
- **API**:
  ```js
  const DeviceGroupManager = require('../../lib/groups/DeviceGroupManager');
  const groupManager = new DeviceGroupManager(this.homey);
  const group = await groupManager.createGroup('Living Room Lights', [id1, id2, id3]);
  await group.setAll('onoff', true, { jitterMs: 50 });
  ```
- **Rules**: R45

---

## Advanced Features

### AdvancedMultiConditionFlows
- **File**: `lib/features/AdvancedMultiConditionFlows.js` (327 lines)
- **Purpose**: Multi-device AND/OR/NOT conditions with time-based constraints and cooldown periods
- **Rules**: R46

### ConditionEngine
- **File**: `lib/features/ConditionEngine.js` (352 lines)
- **Purpose**: Complex condition evaluation engine for flows

### DiagnosticReportExport
- **File**: `lib/features/DiagnosticReportExport.js` (230 lines)
- **Purpose**: Shareable diagnostic reports with aggregated logs, network topology, battery history
- **Rules**: R47

### NetworkTopologyTrigger
- **File**: `lib/features/NetworkTopologyTrigger.js` (262 lines)
- **Purpose**: Flow triggers based on Zigbee mesh health and router availability
- **Rules**: R48

### NetworkTopologyCollector
- **File**: `lib/features/NetworkTopologyCollector.js` (388 lines)
- **Purpose**: Collect and visualize Zigbee mesh network topology

### PredictiveHealthEngine
- **File**: `lib/features/PredictiveHealthEngine.js` (395 lines)
- **Purpose**: Proactive device health monitoring and failure prediction
- **Rules**: R49

### StateHistoryTrigger
- **File**: `lib/features/StateHistoryTrigger.js` (235 lines)
- **Purpose**: Flow triggers based on historical state patterns

### ScheduleManager
- **File**: `lib/features/ScheduleManager.js` (319 lines)
- **Purpose**: Cron-like device scheduling with holiday awareness
- **Rules**: R53

### SolarElevation
- **File**: `lib/features/SolarElevation.js` (299 lines)
- **Purpose**: Sun-position-based automation triggers
- **Rules**: R55

### TransitionEngine
- **File**: `lib/features/TransitionEngine.js` (196 lines)
- **Purpose**: Smooth capability value transitions (e.g., gradual dimming)
- **Rules**: R54

### EnergyHistoryStore
- **File**: `lib/features/EnergyHistoryStore.js` (265 lines)
- **Purpose**: Persistent energy consumption tracking with historical data
- **Rules**: R50

### TariffCalculator
- **File**: `lib/features/TariffCalculator.js` (250 lines)
- **Purpose**: Time-of-use energy cost calculations
- **Rules**: R56

### TuyaCloudSceneSync
- **File**: `lib/features/TuyaCloudSceneSync.js` (176 lines)
- **Purpose**: Synchronize scenes between Homey and Tuya Cloud

### DeviceMigrationWizard
- **File**: `lib/features/DeviceMigrationWizard.js` (235 lines)
- **Purpose**: Guided device migration between drivers

### ConfigurationBackupRestore
- **File**: `lib/features/ConfigurationBackupRestore.js` (197 lines)
- **Purpose**: Device settings backup and restore
- **Rules**: R57

### CapabilityExportImport
- **File**: `lib/features/CapabilityExportImport.js` (221 lines)
- **Purpose**: Export and import device capabilities for migration

### CustomCapabilityTemplates
- **File**: `lib/features/CustomCapabilityTemplates.js` (274 lines)
- **Purpose**: Template-based custom capability creation

### DynamicFlowCardManager
- **File**: `lib/dynamic/DynamicFlowCardManager.js`
- **Purpose**: Dynamic flow card creation and management

---

## Converters & Parsers

### ValueConverterRegistry
- **File**: `lib/converters/ValueConverterRegistry.js` (483 lines)
- **Purpose**: Centralised DP value converters (Z2M-inspired pattern)
- **API**:
  ```js
  const { numeric, enumMap, boolean, positionInvert } = require('../../lib/converters/ValueConverterRegistry');

  // In dpMappings:
  '18': { capability: 'measure_temperature', transform: numeric({ divisor: 10 }).fromDevice },
  '4':  { capability: 'thermostat_mode', transform: enumMap({ 0:'off', 1:'heat', 2:'auto' }).fromDevice },
  '1':  { capability: 'onoff', transform: boolean().fromDevice },
  ```
- **Rules**: R19

### TuyaDPParser
- **File**: `lib/tuya/TuyaDPParser.js` (6.3KB)
- **Purpose**: Multi-DP parser with MCU UART detection
- **Rules**: R16

### SmartDivisorManager
- **File**: `lib/managers/SmartDivisorManager.js` (16.7KB)
- **Purpose**: Auto-detects DP value divisors at runtime
- **Rules**: R18, R25

---

## Utility Modules

### CaseInsensitiveMatcher
- **File**: `lib/utils/CaseInsensitiveMatcher.js`
- **Purpose**: Case-insensitive manufacturer name matching
- **Rules**: R14

### AdaptiveDataParser
- **File**: `lib/utils/AdaptiveDataParser.js`
- **Purpose**: Intercepts raw DP data and applies intelligent scaling

### CapabilityMigrator
- **File**: `lib/utils/CapabilityMigrator.js`
- **Purpose**: Driver update capability migrations
- **Rules**: R22

### GreenPowerManager
- **File**: `lib/zigbee/GreenPowerManager.js`
- **Purpose**: Zigbee Green Power device support

---

## Integration Guide

### For New Drivers
1. Import the base class from `lib/devices/`
2. Apply mixins: `PhysicalButtonMixin(VirtualButtonMixin(BaseClass))`
3. Use `safeSetCapabilityValue()` everywhere
4. Call `markAppCommand()` before physical commands
5. Use `CrashPrevention` for all async operations
6. Use `ValueConverterRegistry` for DP transforms

### For WiFi Devices
1. Call `await super.onDeleted()` in onDeleted()
2. Use `ConnectionStateTracker` for connection monitoring
3. Use `CircuitBreaker` for external API calls
4. Use `RetryWithBackoff` for critical operations

### For Battery Devices
1. Use `UnifiedBatteryHandler.calculateFromVoltage()` for battery percentage
2. Use `BatteryHealthIntelligence` for degradation tracking
3. Use `BatteryHybridManager` for dual-power devices

### For Presence Detection
1. Use `PresenceConfidenceScorer` for multi-factor scoring
2. Use `RoomSignalAggregator` for room-level occupancy
3. Use `SignalTriangulation` for location-aware detection
