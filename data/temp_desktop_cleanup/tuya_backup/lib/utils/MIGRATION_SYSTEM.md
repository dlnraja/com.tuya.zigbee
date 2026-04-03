# 🔄 Safe Migration System v4.9.315

## 🎯 Overview

**Problem:** device.setDriver() crashes (SDK3 incompatible) + Invalid driver IDs + User preference not respected

**Solution:** Migration Queue System with validation, protection, and manual instructions

---

## 📦 Components

### 1. **capability-safe-create.js** ✅
Prevents crash when capability already exists

```javascript
const { addCapabilitySafe } = require('./utils/capability-safe-create');

// BEFORE (crashes if exists):
await device.addCapability('measure_battery');

// AFTER (safe):
await addCapabilitySafe(device, 'measure_battery');
// → Logs warning if exists, no crash
```

**Fixes:**
- ❌ Error: A Capability with ID already exists
- ✅ Graceful skip with warning log

---

### 2. **migration-queue.js** ✅
Queue migrations instead of direct device.setDriver()

```javascript
const { queueMigration } = require('./utils/migration-queue');

// Queue migration (safe)
await queueMigration(
  deviceId,
  'current_driver',
  'target_driver',
  'Auto-detected better match',
  95 // confidence
);
```

**Features:**
- ✅ Atomic queue operations
- ✅ Duplicate prevention
- ✅ Statistics tracking
- ✅ Manual instructions logged

---

### 3. **safe-auto-migrate.js** ✅
Validates migration before execution

```javascript
const { safeAutoMigrate } = require('./utils/safe-auto-migrate');

// Safe migration with validation
await safeAutoMigrate(
  device,
  'target_driver',
  95, // confidence
  'Better match detected'
);
```

**Validation Rules:**

| Rule | Check | Action if Failed |
|------|-------|------------------|
| 1 | Confidence ≥ 90% | Skip migration |
| 2 | Target driver exists | Reject (invalid ID) |
| 3 | User preference not set | Skip migration |
| 4 | Not Tuya DP device | Protect device |
| 5 | Different driver | Skip (same) |
| 6 | Not already queued | Skip (duplicate) |

---

## 🚫 Protected Devices

Devices **NEVER auto-migrate** (protected):

### Tuya DP Devices
```javascript
// Model: TS0601
// Manufacturer: _TZE*
// Cluster: 0xEF00 (hidden)

→ Protected
→ Reason: Cluster 0xEF00 not visible, analysis unreliable
```

### User Preference Set
```javascript
// User explicitly selected driver
→ Protected
→ Reason: Respect user choice
```

### Battery Devices
```javascript
// Has measure_battery capability
→ Protected
→ Reason: Preserve battery configuration
```

---

## 🔄 Migration Flow

```
┌─────────────────────────────────────────────────────────────┐
│  SmartDriverAdaptation detects wrong driver                │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  safeAutoMigrate() validates migration                      │
│                                                             │
│  ✅ Confidence ≥ 90%                                        │
│  ✅ Target driver exists                                    │
│  ✅ User preference not set                                 │
│  ✅ Not Tuya DP device                                      │
│  ✅ Different driver                                        │
│  ✅ Not already queued                                      │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  queueMigration() adds to queue                             │
│  - Stores: deviceId, current, target, reason, confidence   │
│  - Logs manual migration instructions                       │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  processMigrationQueue() (App.onStart or manual)            │
│  - Validates target driver still exists                     │
│  - Logs instructions for user                               │
│  - Optional: Send notification                              │
└─────────────────────────────────────────────────────────────┘
                         ↓
                  USER ACTION REQUIRED
                  (Manual re-pairing)
```

---

## 📊 Before vs After

### BEFORE v4.9.315:

```javascript
// autoMigrateDriver() (old)
❌ await device.setDriver(targetDriverId);
   → Error: device.setDriver is not a function
   → App crash

❌ No validation of target driver
   → Error: Invalid Driver ID: usb_outlet
   → App crash

❌ No user preference check
   → Overrides user selection
   → User frustration

❌ No Tuya DP protection
   → Wrong driver for TS0601
   → No data recovery
```

### AFTER v4.9.315:

```javascript
// safeAutoMigrate() (new)
✅ Validates target driver exists
   → Rejects invalid IDs
   → No crash

✅ Checks user preference
   → Respects user choice
   → Protected migration

✅ Protects Tuya DP devices
   → Preserves current driver
   → Data recovery works

✅ Queues migration safely
   → Logs instructions
   → No crash

✅ All rules enforced
   → Confidence check
   → Duplicate prevention
   → Battery protection
```

---

## 🛠️ Usage Examples

### Example 1: Add Capability Safely

```javascript
const { addCapabilitySafe } = require('./utils/capability-safe-create');

// In device onInit:
await addCapabilitySafe(this, 'measure_battery');
await addCapabilitySafe(this, 'measure_power');

// Logs:
// [CAP-SAFE] ✅ Added capability: measure_battery
// [CAP-SAFE] ⚠️  Capability measure_power already exists - skipping
```

### Example 2: Queue Migration

```javascript
const { queueMigration } = require('./utils/migration-queue');

// Detect wrong driver
if (currentDriver !== recommendedDriver) {
  await queueMigration(
    device.getData().id,
    currentDriver,
    recommendedDriver,
    'Cluster analysis recommends different driver',
    95
  );
}

// Logs:
// [MIGRATION-QUEUE] ✅ Queued migration:
//   Device: abc123
//   Current: switch_basic_1gang
//   Target: usb_adapter
//   Reason: Cluster analysis recommends different driver
//   Confidence: 95%
```

### Example 3: Safe Auto-Migrate

```javascript
const { safeAutoMigrate } = require('./utils/safe-auto-migrate');

// In SmartDriverAdaptation:
if (needsAdaptation) {
  const success = await safeAutoMigrate(
    device,
    bestDriver,
    confidence,
    reason
  );
  
  if (success) {
    device.log('Migration queued - user action required');
  } else {
    device.log('Migration blocked - see logs for reason');
  }
}
```

### Example 4: Process Queue (App.onStart)

```javascript
const { processMigrationQueue } = require('./utils/migration-queue');

class MyApp extends Homey.App {
  async onInit() {
    this.log('App starting...');
    
    // Process queued migrations
    await processMigrationQueue(this.homey);
    
    this.log('App ready');
  }
}
```

---

## 📝 Manual Migration Instructions

When migration is queued, user sees:

```
[SAFE-MIGRATE] ✅ Migration queued successfully

  ℹ️  Manual migration required (SDK3 limitation):
    1. Open Homey app
    2. Remove this device
    3. Re-pair device
    4. Select driver: climate_sensor_soil

  Or check migration queue for batch processing
```

---

## 🔍 Debugging

### View Queue

```javascript
const { getMigrationQueue } = require('./utils/migration-queue');

const queue = await getMigrationQueue();
console.log('Queued migrations:', queue);

// Output:
// [
//   {
//     deviceId: 'abc123',
//     currentDriverId: 'climate_monitor_temp_humidity',
//     targetDriverId: 'climate_sensor_soil',
//     reason: 'Override specifies climate_sensor_soil',
//     confidence: 100,
//     queuedAt: 1699456789000,
//     status: 'pending'
//   }
// ]
```

### Statistics

```javascript
const { getMigrationStats } = require('./utils/migration-queue');

const stats = await getMigrationStats();
console.log('Migration stats:', stats);

// Output:
// {
//   total: 3,
//   byStatus: { pending: 3 },
//   byTargetDriver: {
//     climate_sensor_soil: 2,
//     usb_adapter: 1
//   },
//   avgConfidence: 96
// }
```

### Clear Queue

```javascript
const { clearDeviceMigrations } = require('./utils/migration-queue');

// Clear migrations for specific device
await clearDeviceMigrations('abc123');

// Or clear all
const { popMigrations } = require('./utils/migration-queue');
await popMigrations();
```

---

## 🚨 Error Handling

### Invalid Driver ID

```javascript
// BEFORE:
await device.setDriver('usb_outlet'); // ❌ Crash: Invalid Driver ID

// AFTER:
await safeAutoMigrate(device, 'usb_outlet', 95, 'Test');
// → Logs: ❌ Target driver not found: usb_outlet
// → Returns: false
// → No crash
```

### Null Manufacturer

```javascript
// BEFORE:
if (manufacturer.startsWith('_TZE')) // ❌ Crash: Cannot read 'startsWith' of null

// AFTER:
if (manufacturer && manufacturer.startsWith('_TZE')) // ✅ Safe
```

### Duplicate Capability

```javascript
// BEFORE:
await device.addCapability('fan_speed'); // ❌ Crash: Capability already exists

// AFTER:
await addCapabilitySafe(device, 'fan_speed'); // ✅ Skip with warning
```

---

## 🎯 Benefits

| Benefit | Before | After |
|---------|--------|-------|
| **Crash Prevention** | ❌ 3 types of crashes | ✅ No crashes |
| **Validation** | ❌ No checks | ✅ 6 validation rules |
| **User Respect** | ❌ Overrides choice | ✅ Respects preference |
| **Tuya Protection** | ❌ Wrong drivers | ✅ Protected |
| **Error Messages** | ❌ Cryptic errors | ✅ Clear instructions |
| **Recovery** | ❌ App restart needed | ✅ Graceful handling |

---

## 📚 Integration

### In SmartDriverAdaptation.js

Replace old autoMigrateDriver() calls:

```javascript
// OLD:
await autoMigrateDriver(this.device, recommendedDriver);

// NEW:
await autoMigrateDriver(
  this.device,
  recommendedDriver,
  confidence,
  reason
);
```

### In App.js (onInit)

Add queue processing:

```javascript
const { processMigrationQueue } = require('./lib/utils/migration-queue');

async onInit() {
  // ... other init code ...
  
  // Process migration queue
  await processMigrationQueue(this.homey);
}
```

### In Devices

Use safe capability functions:

```javascript
const { addCapabilitySafe, removeCapabilitySafe } = require('../../lib/utils/capability-safe-create');

async onInit() {
  // Safe capability management
  await addCapabilitySafe(this, 'measure_battery');
  await addCapabilitySafe(this, 'measure_power');
}
```

---

## 🔧 Configuration

No configuration needed! System works out-of-the-box with smart defaults:

- Confidence threshold: 90%
- Tuya DP protection: Always on
- User preference: Always respected
- Queue storage: ManagerSettings (persistent)

---

## 📊 Metrics

Track migration system performance:

```javascript
const { getMigrationStats } = require('./utils/migration-queue');

setInterval(async () => {
  const stats = await getMigrationStats();
  console.log('Migration system health:', {
    queued: stats.total,
    avgConfidence: stats.avgConfidence,
    drivers: Object.keys(stats.byTargetDriver)
  });
}, 60000); // Every minute
```

---

## 🆘 Troubleshooting

### Migration not queued?

Check logs for:
- ⚠️  Confidence too low
- 🔒 User preference set
- ⚠️  Tuya DP device detected
- ⏭️  Migration already queued

### Queue not processing?

Ensure processMigrationQueue() is called in App.onInit()

### Invalid driver errors?

System now **prevents** invalid driver IDs - check target driver exists

---

## 🎉 Result

**v4.9.315 fixes ALL reported crashes:**

✅ No more: "Capability already exists" crash  
✅ No more: "device.setDriver is not a function" crash  
✅ No more: "Cannot read 'startsWith' of null" crash  
✅ No more: "Invalid Driver ID: usb_outlet" crash  

**And improves migration:**

✅ User preference respected  
✅ Tuya DP devices protected  
✅ Clear manual instructions  
✅ Validation before execution  
✅ Queue for batch processing  

---

**Documentation:** lib/utils/MIGRATION_SYSTEM.md  
**Version:** 4.9.315  
**Author:** Windsurf AI + User feedback (Log 38c234c8)  
**Date:** 2025-11-08
