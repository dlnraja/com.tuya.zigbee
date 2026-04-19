# Utility Functions - Data Collection & KPI System

## Overview

This directory contains utility functions for comprehensive data collection, energy KPI tracking, and safe driver management in the Universal Tuya Zigbee app.

**Inspired by:**
-  Homey SDK3 Documentation
-  athombv official apps (IKEA Tradfri, etc.)
-  JohanBendz community apps (Philips Hue Zigbee)
-  Tuya & Zigbee specifications
-  User feedback & diagnostics

---

## Files

### 1. `driver-preference.js` (v4.9.312)

**Purpose:** Store user's manual driver selection to prevent auto-migration from overriding it.

**Key Functions:**
```javascript
// Store user's driver choice (call during pairing)
await setUserPreferredDriver(deviceId, 'usb_outlet');

// Retrieve user preference (HIGHEST PRIORITY)
const userPref = await getUserPreferredDriver(deviceId);

// Clear on device removal
await clearUserPreferredDriver(deviceId);
```

**Behavior:**
- User selects driver during pairing  **STORED**
- Smart-Adapt detects mismatch  **BLOCKED**
- User preference = **HIGHEST PRIORITY** (locks driver)

---

### 2. `driver-switcher.js` (v4.9.312)

**Purpose:** Safe automatic driver switching with 6-step validation.

**Key Functions:**
```javascript
const decision = await ensureDriverAssignment(
  device,
  'switch',          // Current
  'usb_outlet',      // Recommended
  deviceInfo
);
```

**6 Safety Checks:**
1.  User preference (BLOCK if exists)
2.  Recommended quality (BLOCK if unknown)
3.  Tuya DP heuristics (BLOCK if current better)
4.  Cluster evidence (BLOCK if insufficient)
5.  Confidence threshold (BLOCK if <70%)
6.  Power source mismatch (WARN)

**Decision Tree:**
```
User pref exists?  BLOCK
Recommended unknown?  BLOCK
Tuya DP + current Tuya-aware?  BLOCK
Insufficient clusters?  BLOCK
Low confidence?  BLOCK
All checks pass?  ALLOW
```

---

### 3. `battery-reader.js` (v4.9.312)

**Purpose:** Enhanced battery & energy reading with 4 fallback methods.

**Key Functions:**
```javascript
const batteryData = await readBattery(device, zclNode);
// Returns: { voltage, percent, source }

const energyData = await readEnergy(device, zclNode);
// Returns: { power, voltage, current, source }
```

**4 Fallback Methods:**
1.  `genPowerCfg.batteryVoltage` (standard)
2.  `genPowerCfg.batteryPercentageRemaining` (alternative)
3.  Tuya DP detection (warns if cluster 0xEF00 hidden)
4.  Stored value fallback (last known value)

**Voltage Curve (CR2032):**
- 3.0V = 100%
- 2.5V = 50%
- 2.0V = 0%

---

### 4. `energy-kpi.js` (v4.9.313)

**Purpose:** Collect and compute energy KPI in rolling windows for monitoring & debugging.

**Key Functions:**
```javascript
// Push new sample
await pushEnergySample(deviceId, {
  power: 12.5,      // W
  voltage: 230,     // V
  current: 0.054    // A
});

// Get computed KPI
const kpi = await getDeviceKpi(deviceId);
// Returns: {
//   avgPower, maxPower, minPower, powerStdDev,
//   avgVoltage, voltageStability,
//   avgCurrent, maxCurrent,
//   samplesCount, timespan
// }

// Get all devices
const allKpi = await getAllKpi();

// Clear on device removal
await clearDeviceKpi(deviceId);
```

**Rolling Window:**
- Size: 12 samples (default)
- Timespan: ~1 hour (if polled every 5 min)
- Storage: Homey ManagerSettings

**KPI Metrics:**
- **Power:** avg, max, min, standard deviation
- **Voltage:** avg, max, min, stability %
- **Current:** avg, max
- **Timespan:** duration covered by samples

---

### 5. `cluster-configurator.js` (v4.9.313)

**Purpose:** Configure Zigbee clusters for automatic attribute reporting.

**Based on:**
- Homey SDK3 best practices
- IKEA Tradfri app (athombv)
- Philips Hue Zigbee app (JohanBendz)

**Key Functions:**
```javascript
// Auto-configure all relevant clusters
const results = await autoConfigureReporting(device, zclNode);
// Returns: { battery: bool, power: bool, climate: bool, onoff: bool, level: bool }

// Individual configurations
await configureBatteryReporting(endpoint, { 
  minInterval: 3600,   // 1 hour
  maxInterval: 86400,  // 24 hours
  minChange: 5         // 5%
});

await configurePowerReporting(endpoint, {
  minInterval: 10,     // 10 seconds
  maxInterval: 300,    // 5 minutes
  minChangePower: 5    // 5W
});

await configureClimateReporting(endpoint, {
  minInterval: 60,     // 1 minute
  maxInterval: 3600,   // 1 hour
  minChangeTemp: 50    // 0.5°C
});

await configureOnOffReporting(endpoint);
await configureLevelReporting(endpoint);
```

**Supported Clusters:**
- `genPowerCfg` (battery)
- `haElectricalMeasurement` (power, voltage, current)
- `seMetering` (instantaneous demand)
- `msTemperatureMeasurement` (temperature)
- `msRelativeHumidity` (humidity)
- `genOnOff` (switch state)
- `genLevelCtrl` (dimmer level)

**Reporting Intervals:**
```
Battery:     1h - 24h  (change: 5%)
Power:       10s - 5min (change: 5W)
Voltage:     10s - 5min (change: 5V)
Current:     10s - 5min (change: 100mA)
Temperature: 1min - 1h (change: 0.5°C)
Humidity:    1min - 1h (change: 1%)
OnOff:       1s - 1h   (immediate)
Level:       1s - 1h   (change: 5/254)
```

---

### 6. `data-collector.js` (v4.9.313)

**Purpose:** Comprehensive data collection via attribute reports & periodic polling.

**Key Functions:**
```javascript
// Register attribute report listeners
await registerReportListeners(device, zclNode);

// Start periodic polling (fallback)
const interval = startPeriodicPolling(device, zclNode, 300000); // 5min

// Stop polling
stopPeriodicPolling(interval);
```

**Report Listeners:**
-  **Battery:** `batteryPercentageRemaining`, `batteryVoltage`
-  **Power:** `activePower`, `rmsvoltage`, `rmscurrent`
-  **Temperature:** `measuredValue`
-  **Humidity:** `measuredValue`
-  **OnOff:** `onOff`
-  **Level:** `currentLevel`

**Data Flow:**
```
1. Device reports attribute change
2. Listener catches event
3. Update capability value
4. Push to KPI (energy data)
5. Store for fallback
```

**Periodic Polling:**
- Interval: 5 minutes (default)
- Fallback when reports fail
- Uses `readBattery()` and `readEnergy()`
- Pushes samples to KPI

---

## Integration in SmartDriverAdaptation

**Step 8: Data Collection & KPI** (v4.9.313)

```javascript
// Configure attribute reporting
const reportingConfig = await autoConfigureReporting(device, zclNode);

// Register listeners
await registerReportListeners(device, zclNode);

// Start polling (5min)
const interval = startPeriodicPolling(device, zclNode, 300000);

// Get current KPI
const kpi = await getDeviceKpi(deviceId);
```

---

## Complete Flow

```

                    DEVICE INITIALIZATION                     

                             
                             

 Step 1-6: Driver adaptation, safety checks, capabilities   

                             
                             

 Step 7: Safe driver assignment (user pref priority)        

                             
                             

 Step 8: DATA COLLECTION & KPI                              
                                                             
                     
   Configure Attribute Reporting                          
    - Battery: 1h-24h                                     
    - Power: 10s-5min                                     
    - Climate: 1min-1h                                    
                     
                                                            
                                                            
                     
   Register Report Listeners                              
    - Battery reports  capability                        
    - Power reports  capability + KPI                    
    - Climate reports  capability                        
                     
                                                            
                                                            
                     
   Start Periodic Polling (5min)                          
    - Fallback when reports fail                          
    - Read battery/energy manually                        
    - Push to KPI                                         
                     
                                                             

                             
                             
                      Device Running
                             
                             
    
      Continuous Data Collection             
                                             
      Reports  Listeners  Capabilities     
      Polling  Read  Capabilities + KPI    
      KPI  Rolling Window (12 samples)      
    
```

---

## Log Output Examples

### Step 8: Data Collection Setup

```
 [SMART ADAPT] Configuring data collection & KPI...
 [CLUSTER-CONFIG] Auto-configuring attribute reporting...
   [CLUSTER-CONFIG] Configuring battery reporting...
   minInterval: 3600s (60min)
   maxInterval: 86400s (24h)
   minChange: 5%
   [CLUSTER-CONFIG]  Battery percentage reporting configured
   [CLUSTER-CONFIG]  Battery voltage reporting configured
   
   [CLUSTER-CONFIG] Configuring power reporting...
   [CLUSTER-CONFIG]  Active power reporting configured
   [CLUSTER-CONFIG]  RMS voltage reporting configured
   [CLUSTER-CONFIG]  RMS current reporting configured
   
 [CLUSTER-CONFIG] Configuration complete: { battery: true, power: true, climate: false, onoff: true, level: false }

 [DATA-COLLECTOR] Registering attribute report listeners...
   [DATA-COLLECTOR] Registering battery listeners...
   [DATA-COLLECTOR] Registering power listeners...
   [DATA-COLLECTOR] Registering OnOff listener...
 [DATA-COLLECTOR] Listeners registered

 [DATA-COLLECTOR] Starting periodic polling (5min interval)...
   [DATA-COLLECTOR]  Polling data...
   [BATTERY-READER] Trying genPowerCfg cluster...
    Battery read: 85% (2.8V) [genPowerCfg.batteryVoltage]
   [ENERGY-READER] Trying haElectricalMeasurement...
    Energy read: 12W, 230V, 0.05A [haElectricalMeasurement]
   [ENERGY-KPI] Sample pushed for device123: {"ts":1699420800000,"power":12,"voltage":230,"current":0.05}
 [DATA-COLLECTOR] Polling started

 [ENERGY-KPI] Current KPI: {
  "avgPower": 11.8,
  "maxPower": 15.2,
  "minPower": 8.5,
  "powerStdDev": 2.1,
  "avgVoltage": 229.5,
  "voltageStability": 98.7,
  "avgCurrent": 0.051,
  "samplesCount": 12,
  "timespanHours": "1.0"
}
```

### Attribute Report Received

```
[DATA-COLLECTOR]  Battery report: 83%
[DATA-COLLECTOR]  Power report: 13.2W
[DATA-COLLECTOR]  Voltage report: 231V
[DATA-COLLECTOR]  Current report: 0.057A
[ENERGY-KPI] Sample pushed for device123: {"ts":1699420860000,"power":13.2,"voltage":231,"current":0.057}
```

---

## Usage in Drivers

### On Device Init

```javascript
const SmartDriverAdaptation = require('../../lib/SmartDriverAdaptation');

async onNodeInit({ zclNode }) {
  // Standard Homey driver init...
  
  // Smart-Adapt (includes data collection)
  const adapter = new SmartDriverAdaptation(this);
  const result = await adapter.analyzeAndAdapt();
  
  // Data collection is now active:
  // - Attribute reports configured
  // - Listeners registered
  // - Periodic polling started
  // - KPI tracking enabled
}
```

### On Device Delete

```javascript
const { clearUserPreferredDriver } = require('../../lib/utils/driver-preference');
const { clearDeviceKpi } = require('../../lib/utils/energy-kpi');
const { stopPeriodicPolling } = require('../../lib/utils/data-collector');

async onDeleted() {
  // Clear user preference
  await clearUserPreferredDriver(this.getData().id);
  
  // Clear KPI data
  await clearDeviceKpi(this.getData().id);
  
  // Stop polling
  const interval = this.getStoreValue('pollingInterval');
  if (interval) stopPeriodicPolling(interval);
}
```

---

## Benefits

### For Users

-  **Reliable data:** 4 fallback methods + periodic polling
-  **Battery info:** Works even when standard methods fail
-  **Energy monitoring:** Power, voltage, current tracked
-  **Historical KPI:** See trends over time
-  **User choice respected:** Driver locked when manually selected

### For Debugging

-  **Detailed logs:** See exactly what's working/failing
-  **KPI data:** Diagnose power/voltage issues
-  **Reporting status:** Know if reports are configured
-  **Fallback transparency:** See which method provided data

### For Development

-  **Modular design:** Each utility is independent
-  **SDK3 compliant:** Based on official docs
-  **Community-inspired:** Best practices from popular apps
-  **Extensible:** Easy to add new data sources

---

## Version History

- **v4.9.312:** Driver preference, safe switcher, battery reader
- **v4.9.313:** Energy KPI, cluster configurator, data collector

---

## References

- [Homey SDK3 Zigbee Docs](https://apps.developer.homey.app/the-basics/zigbee)
- [athombv/node-homey-zigbeedriver](https://github.com/athombv/node-homey-zigbeedriver)
- [athombv/node-zigbee-clusters](https://github.com/athombv/node-zigbee-clusters)
- [JohanBendz community apps](https://github.com/JohanBendz)
- [Zigbee Cluster Specification](https://etc.athom.com/zigbee_cluster_specification.pdf)
