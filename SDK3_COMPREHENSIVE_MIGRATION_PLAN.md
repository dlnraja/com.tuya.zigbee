# SDK3 Comprehensive Migration Plan - USB Outlets & Climate Monitor

## Executive Summary

This document outlines the complete SDK3 migration strategy for:
1. **USB Outlet drivers** (1gang, 2port, 3gang, advanced, basic)
2. **Climate Monitor** with time sync and backlight button
3. **Battery Management** (Tuya custom, Zigbee classic, proprietary)
4. **All drivers** verification for SDK3 numeric cluster IDs

## Phase 1: USB Outlet Multi-Gang Migration

### 1.1 USB Outlet 1 Gang (usb_outlet_1gang)

**Current State:**
- ❌ Using SwitchDevice but configured for single socket
- ⚠️ Mix of CLUSTER constants and numeric IDs
- ⚠️ measure_battery capability but likely AC powered

**SDK3 Target Configuration:**
```json
{
  "capabilities": ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current"],
  "endpoints": {
    "1": {
      "clusters": [0, 3, 4, 5, 6, 1794, 2820],
      "bindings": [6, 1]
    }
  }
}
```

**Key Clusters (Numeric IDs):**
- `0` - Basic (power source detection)
- `1` - Power Configuration (battery if present)
- `3` - Identify
- `4` - Groups
- `5` - Scenes
- `6` - OnOff (main control)
- `1794` (0x0702) - Metering (meter_power)
- `2820` (0x0B04) - Electrical Measurement (measure_power, measure_voltage, measure_current)

---

### 1.2 USB Outlet 2 Port (usb_outlet_2port)

**Current State:**
- ✅ Has `onoff` and `onoff.usb2` capabilities
- ❌ Only endpoint 1 and 2 clusters configured
- ⚠️ Missing power measurement on individual ports

**SDK3 Target Configuration:**
```json
{
  "capabilities": ["onoff", "onoff.usb2", "measure_battery"],
  "endpoints": {
    "1": {
      "clusters": [0, 3, 4, 5, 6],
      "bindings": [6, 1]
    },
    "2": {
      "clusters": [0, 4, 5, 6],
      "bindings": [6, 1]
    }
  }
}
```

**Device.js Implementation:**
```javascript
async onNodeInit() {
  this.gangCount = 2;
  
  // Initialize base switch with multi-gang support
  await super.onNodeInit();
  
  // Register gang 1 (main onoff)
  this.registerCapability('onoff', 6, {
    endpoint: 1,
    // ... config
  });
  
  // Register gang 2 (onoff.usb2)
  this.registerCapability('onoff.usb2', 6, {
    endpoint: 2,
    // ... config
  });
}
```

---

### 1.3 USB Outlet 3 Gang (usb_outlet_3gang)

**Current State:**
- ✅ Has `onoff`, `onoff.usb2`, `onoff.usb3` capabilities
- ✅ Endpoints 1, 2, 3 configured
- ⚠️ Has measure_power/meter_power but how to split across 3 gangs?

**SDK3 Target Configuration:**
```json
{
  "capabilities": ["onoff", "onoff.usb2", "onoff.usb3", "measure_power", "meter_power"],
  "endpoints": {
    "1": { "clusters": [0, 4, 5, 6], "bindings": [6, 1] },
    "2": { "clusters": [0, 4, 5, 6], "bindings": [6, 1] },
    "3": { "clusters": [0, 4, 5, 6], "bindings": [6, 1] }
  }
}
```

**Power Measurement Strategy:**
- Total power for all 3 gangs (most devices report aggregate)
- OR per-gang if device supports individual measurement

---

## Phase 2: Climate Monitor Enhancement

### 2.1 Current Climate Monitor

**Manufacturer IDs:**
- `_TZE200_*` series (Tuya custom cluster 0xEF00 / 61184)
- `_TZ3000_*` series (Standard Zigbee)
- `lumi.*` (Xiaomi/Aqara)

**Current Capabilities:**
- ✅ `measure_temperature`
- ✅ `measure_humidity` 
- ✅ `measure_battery`

### 2.2 Enhanced Features Needed

#### Time/Date Synchronization

**User Requirement:** Device screen shows time/date from Homey

**Implementation:**
```javascript
/**
 * Sync time/date to device
 * For Tuya devices: Use cluster 0xEF00 DP 0x19 (time sync)
 * For Zigbee devices: Use cluster 0x000A (time)
 */
async syncTimeToDevice() {
  try {
    // Method 1: Standard Zigbee Time Cluster (0x000A / 10)
    const timeCluster = this.zclNode.endpoints[1]?.clusters[10];
    
    if (timeCluster) {
      const zigbeeEpoch = Date.now() / 1000 - 946684800; // Seconds since 2000-01-01
      
      await timeCluster.writeAttributes({
        time: Math.floor(zigbeeEpoch),
        timeStatus: {
          master: false,
          synchronized: true,
          masterZoneDst: false,
          superseding: false
        }
      });
      
      this.log('✅ Time synced via standard Zigbee cluster');
      return;
    }
    
    // Method 2: Tuya Custom Cluster (0xEF00 / 61184)
    const tuyaCluster = this.zclNode.endpoints[1]?.clusters[61184];
    
    if (tuyaCluster) {
      const now = new Date();
      const timeData = {
        dp: 0x19, // Time sync DP
        datatype: 0x02, // String
        data: Buffer.from([
          now.getFullYear() - 2000,
          now.getMonth() + 1,
          now.getDate(),
          now.getHours(),
          now.getMinutes(),
          now.getSeconds()
        ])
      };
      
      await tuyaCluster.command('dataReport', timeData);
      this.log('✅ Time synced via Tuya custom cluster');
      return;
    }
    
    this.log('⚠️  No time cluster available');
  } catch (err) {
    this.error('Time sync failed:', err);
  }
}

/**
 * Auto-sync time every hour
 */
async setupAutoTimeSync() {
  // Initial sync
  await this.syncTimeToDevice();
  
  // Sync every hour
  this.timeSyncInterval = setInterval(async () => {
    await this.syncTimeToDevice();
  }, 60 * 60 * 1000); // 1 hour
}
```

#### Screen Backlight Button

**User Requirement:** Button to control screen backlight on/off

**Implementation:**
```javascript
/**
 * Add button capability for screen backlight control
 */
async setupBacklightButton() {
  // Add button capability if not present
  if (!this.hasCapability('button.backlight')) {
    await this.addCapability('button.backlight');
  }
  
  // Register button listener
  this.registerCapabilityListener('button.backlight', async () => {
    await this.toggleBacklight();
  });
}

/**
 * Toggle screen backlight
 */
async toggleBacklight() {
  try {
    // Method 1: Tuya Custom Cluster DP
    const tuyaCluster = this.zclNode.endpoints[1]?.clusters[61184];
    
    if (tuyaCluster) {
      // DP 0x0E = backlight on/off
      await tuyaCluster.command('dataReport', {
        dp: 0x0E,
        datatype: 0x01, // Boolean
        data: Buffer.from([0x01]) // Toggle
      });
      
      this.log('✅ Backlight toggled via Tuya DP');
      return;
    }
    
    // Method 2: Standard identify cluster (flash briefly)
    const identifyCluster = this.zclNode.endpoints[1]?.clusters[3];
    
    if (identifyCluster) {
      await identifyCluster.identify({ identifyTime: 5 }); // 5 seconds
      this.log('✅ Screen flashed via identify cluster');
      return;
    }
    
    this.log('⚠️  Backlight control not available');
  } catch (err) {
    this.error('Backlight toggle failed:', err);
  }
}
```

**Driver Settings:**
```json
{
  "id": "backlight_auto_off",
  "type": "number",
  "label": {
    "en": "Backlight Auto-Off (seconds)",
    "fr": "Extinction Auto Éclairage (secondes)"
  },
  "value": 10,
  "min": 0,
  "max": 300,
  "step": 5,
  "hint": {
    "en": "Automatically turn off backlight after this time (0 = always on)",
    "fr": "Éteindre automatiquement l'éclairage après ce délai (0 = toujours allumé)"
  }
}
```

---

## Phase 3: Battery Management - Multi-Protocol Support

### 3.1 Battery Detection Strategies

**Problem:** Devices use different battery reporting methods:
1. **Standard Zigbee** - Cluster 1 (Power Configuration)
2. **Tuya Custom** - Cluster 61184 (0xEF00) DP 101
3. **Proprietary** - Manufacturer-specific attributes

### 3.2 Intelligent Battery Detection

```javascript
/**
 * Multi-protocol battery detection
 */
async setupBatteryMonitoring() {
  this.log('🔋 Setting up intelligent battery monitoring...');
  
  const endpoint = this.zclNode.endpoints[1];
  
  // Method 1: Standard Zigbee Power Configuration (Cluster 1)
  if (endpoint?.clusters?.powerConfiguration) {
    try {
      this.registerCapability('measure_battery', 1, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => Math.round(value / 2), // Convert 0-200 to 0-100%
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 300,    // 5 minutes
            maxInterval: 3600,   // 1 hour
            minChange: 2         // 1% change (raw value 2)
          }
        },
        getOpts: {
          getOnStart: true
        }
      });
      
      this.log('✅ Battery monitoring: Standard Zigbee (cluster 1)');
      this.batteryMethod = 'zigbee_standard';
      return;
    } catch (err) {
      this.log('Standard battery setup failed:', err.message);
    }
  }
  
  // Method 2: Tuya Custom Cluster (61184)
  if (endpoint?.clusters[61184]) {
    try {
      endpoint.clusters[61184].on('response', async (data) => {
        if (data.dp === 101) { // Battery DP
          const battery = data.data.readUInt8(0);
          await this.setCapabilityValue('measure_battery', battery).catch(this.error);
          this.log('🔋 Battery (Tuya):', battery + '%');
        }
      });
      
      // Request battery status
      await endpoint.clusters[61184].command('dataQuery', { dp: 101 });
      
      this.log('✅ Battery monitoring: Tuya Custom (cluster 61184, DP 101)');
      this.batteryMethod = 'tuya_custom';
      return;
    } catch (err) {
      this.log('Tuya battery setup failed:', err.message);
    }
  }
  
  // Method 3: Manufacturer-specific
  if (endpoint?.clusters?.basic) {
    try {
      const manufacturer = this.getData().manufacturerName || '';
      
      if (manufacturer.startsWith('lumi.')) {
        // Xiaomi/Aqara uses basic cluster attribute 0xFF01
        endpoint.clusters.basic.on('attr.65281', async (value) => {
          const battery = value.batteryVoltage ? 
            this.voltageToBattery(value.batteryVoltage) : null;
          
          if (battery !== null) {
            await this.setCapabilityValue('measure_battery', battery).catch(this.error);
            this.log('🔋 Battery (Xiaomi):', battery + '%');
          }
        });
        
        this.log('✅ Battery monitoring: Xiaomi/Aqara (attribute 0xFF01)');
        this.batteryMethod = 'xiaomi_custom';
        return;
      }
    } catch (err) {
      this.log('Manufacturer battery setup failed:', err.message);
    }
  }
  
  this.log('⚠️  No battery monitoring available (AC powered?)');
  this.batteryMethod = 'none';
}

/**
 * Convert battery voltage to percentage (Xiaomi/Aqara)
 */
voltageToBattery(voltage) {
  // CR2032: 3.0V = 100%, 2.0V = 0%
  // CR2450: 3.0V = 100%, 2.0V = 0%
  // AA/AAA: 1.5V = 100%, 0.9V = 0%
  
  const batteryType = this.getSetting('battery_type') || 'CR2032';
  
  const voltageRanges = {
    'CR2032': { max: 3000, min: 2000 },
    'CR2450': { max: 3000, min: 2000 },
    'CR123A': { max: 3000, min: 2000 },
    'AA': { max: 1500, min: 900 },
    'AAA': { max: 1500, min: 900 }
  };
  
  const range = voltageRanges[batteryType] || voltageRanges['CR2032'];
  const percentage = Math.round(
    ((voltage - range.min) / (range.max - range.min)) * 100
  );
  
  return Math.max(0, Math.min(100, percentage));
}
```

### 3.3 Battery Settings Enhancement

```json
{
  "settings": [
    {
      "id": "battery_reporting_method",
      "type": "dropdown",
      "label": {
        "en": "Battery Reporting Method",
        "fr": "Méthode Rapport Batterie"
      },
      "value": "auto",
      "values": [
        {
          "id": "auto",
          "label": { "en": "Auto Detect", "fr": "Détection Auto" }
        },
        {
          "id": "zigbee_standard",
          "label": { "en": "Standard Zigbee (Cluster 1)", "fr": "Zigbee Standard (Cluster 1)" }
        },
        {
          "id": "tuya_custom",
          "label": { "en": "Tuya Custom (Cluster 61184, DP 101)", "fr": "Tuya Personnalisé (Cluster 61184, DP 101)" }
        },
        {
          "id": "xiaomi_custom",
          "label": { "en": "Xiaomi/Aqara (Attribute 0xFF01)", "fr": "Xiaomi/Aqara (Attribut 0xFF01)" }
        }
      ],
      "hint": {
        "en": "Override automatic battery detection method",
        "fr": "Forcer la méthode de détection de batterie"
      }
    }
  ]
}
```

---

## Phase 4: SDK3 Validation - All Drivers

### 4.1 Critical SDK3 Requirements

#### Numeric Cluster IDs ONLY

**❌ WRONG:**
```javascript
const { CLUSTER } = require('zigbee-clusters');

this.registerCapability('onoff', CLUSTER.ON_OFF, {...});
```

**✅ CORRECT:**
```javascript
this.registerCapability('onoff', 6, {...}); // OnOff cluster ID
```

**Common Cluster IDs:**
- `0` - Basic
- `1` - Power Configuration
- `3` - Identify
- `4` - Groups
- `5` - Scenes
- `6` - OnOff
- `8` - Level Control
- `10` - Time
- `768` (0x0300) - Color Control
- `1024` (0x0400) - Illuminance Measurement
- `1026` (0x0402) - Temperature Measurement
- `1029` (0x0405) - Relative Humidity
- `1030` (0x0406) - Occupancy Sensing
- `1280` (0x0500) - IAS Zone
- `1794` (0x0702) - Metering
- `2820` (0x0B04) - Electrical Measurement
- `61184` (0xEF00) - Tuya Custom

#### Proper Endpoint Configuration

**Multi-Gang Devices:**
```json
{
  "endpoints": {
    "1": { "clusters": [0, 3, 4, 5, 6], "bindings": [6, 1] },
    "2": { "clusters": [0, 4, 5, 6], "bindings": [6, 1] },
    "3": { "clusters": [0, 4, 5, 6], "bindings": [6, 1] }
  }
}
```

#### Attribute Reporting Configuration

**Best Practices:**
```javascript
reportOpts: {
  configureAttributeReporting: {
    minInterval: 5,      // Min seconds between reports
    maxInterval: 300,    // Max seconds between reports
    minChange: 1         // Min value change to trigger report
  }
}
```

---

## Phase 5: Implementation Checklist

### USB Outlets
- [x] usb_outlet_1gang - Migrate to SwitchDevice with power measurement
- [ ] usb_outlet_2port - Multi-endpoint (gang 2) support
- [ ] usb_outlet_3gang - Multi-endpoint (gang 3) support
- [ ] usb_outlet_advanced - Verify SDK3 compliance
- [ ] usb_outlet_basic - Verify SDK3 compliance

### Climate Monitor
- [ ] Add time sync functionality (Zigbee + Tuya)
- [ ] Add backlight button capability
- [ ] Add backlight auto-off setting
- [ ] Test with all manufacturer variants

### Battery Management
- [ ] Implement multi-protocol battery detection
- [ ] Add battery method selection in settings
- [ ] Add voltage-to-percentage conversion for Xiaomi
- [ ] Test with CR2032, CR2450, AA, AAA batteries

### SDK3 Validation
- [ ] Verify ALL drivers use numeric cluster IDs
- [ ] Remove all CLUSTER constant references
- [ ] Validate with `homey app validate --level publish`
- [ ] Zero warnings target

### Testing & Deployment
- [ ] Test Peter's diagnostic scenarios
- [ ] Verify no regressions in working features
- [ ] Clean .homeycompose/.homeybuild cache
- [ ] Push to GitHub
- [ ] Publish to Homey App Store

---

## Phase 6: Peter's Success Patterns

Based on diagnostic reports `EMAIL_RESPONSE_PETER_DIAGNOSTIC_015426b4.md` and `CRITICAL_PETER_DIAGNOSTIC_v2.15.70.md`:

### What Worked
- ✅ Temperature: 13.6°C → 14.6°C (cluster 1026)
- ✅ Humidity: 91.6% → 89.1% (cluster 1029)
- ✅ Illuminance: 2566 lux → 2692 lux (cluster 1024)
- ✅ Battery: 100% → 75% (cluster 1, batteryPercentageRemaining)

### What Failed (IAS Zone Issue)
- ❌ Motion detection (cluster 1280)
- ❌ SOS button (cluster 1280)

### Key Learning
**Standard Zigbee clusters work perfectly when using numeric IDs and proper attribute reporting configuration.**

---

## Next Steps

1. **Complete USB outlet migrations** (this session)
2. **Enhance climate monitor** (time sync + backlight)
3. **Validate all drivers** for SDK3 compliance
4. **Test thoroughly** before push
5. **Deploy to production**

---

**Document Version:** 1.0  
**Date:** 2025-10-26  
**Author:** Dylan Rajasekaram  
**Status:** In Progress
