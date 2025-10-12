# Device Data Reception Fixes v2.15.32

**Date:** 2025-10-12  
**Issue Source:** Homey Community Forum  
**Affected Devices:** HOBEIAN Multisensor (ZG-204ZV), PIR Radar Sensor (ZG-204ZM), SOS Emergency Button

## Problem Summary

Users reported complete lack of data reception from Tuya-based sensors:
- **HOBEIAN Multisensor (ZG-204ZV):** Motion, illumination, temperature, humidity showing "N/A"
- **PIR Radar Sensor (ZG-204ZM):** Motion and illumination not reporting
- **SOS Emergency Button:** No action on press, incorrect battery reading (1% vs 3.36V measured)

Root causes identified:
1. Tuya cluster (0xEF00) detection limited to endpoint 1 only
2. IAS Zone enrollment missing CIE address write
3. No retry logic for critical initialization steps
4. Insufficient logging for debugging data reception issues

## Fixes Applied

### 1. Enhanced Tuya Cluster Detection (`utils/tuya-cluster-handler.js`)

**Before:**
```javascript
const tuyaCluster = zclNode.endpoints[1]?.clusters[TUYA_CLUSTER_ID];
```

**After:**
```javascript
// Auto-detect Tuya cluster on ANY endpoint (critical fix for HOBEIAN devices)
let tuyaCluster = null;
let tuyaEndpoint = null;

for (const [epId, endpoint] of Object.entries(zclNode.endpoints)) {
  if (endpoint.clusters && endpoint.clusters[TUYA_CLUSTER_ID]) {
    tuyaCluster = endpoint.clusters[TUYA_CLUSTER_ID];
    tuyaEndpoint = epId;
    device.log(`[TuyaCluster] ✅ Found on endpoint ${epId}`);
    break;
  }
}
```

**Impact:** Ensures Tuya cluster is found regardless of which endpoint it's on

### 2. Added Reporting Configuration with Retry

**Before:**
```javascript
await tuyaCluster.read('dataPoints');
```

**After:**
```javascript
// Configure reporting (critical for HOBEIAN devices)
await tuyaCluster.configureReporting([{
  attributeId: 0,
  minimumReportInterval: 0,
  maximumReportInterval: 3600,
  reportableChange: 0
}]);

// Request initial data with retry (3 attempts)
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    await tuyaCluster.read('dataPoints');
    device.log(`[TuyaCluster] ✅ Initial data requested (attempt ${attempt})`);
    break;
  } catch (err) {
    if (attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

**Impact:** Increases reliability of initial data fetch from devices

### 3. Enhanced IAS Zone Enrollment

**Applied to:**
- `drivers/motion_temp_humidity_illumination_multi_battery/device.js`
- `drivers/pir_radar_illumination_sensor_battery/device.js`
- `drivers/sos_emergency_button_cr2032/device.js`

**Critical additions:**

#### a) IAS CIE Address Write with Retry
```javascript
// CRITICAL: Write IAS CIE Address for enrollment with retry
let cieWritten = false;
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    await endpoint.clusters.iasZone.writeAttributes({
      iasCieAddress: zclNode.ieeeAddr
    });
    this.log(`✅ IAS CIE address written (attempt ${attempt})`);
    cieWritten = true;
    break;
  } catch (err) {
    this.log(`⚠️ IAS CIE write attempt ${attempt} failed:`, err.message);
    if (attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

#### b) Configure Reporting with Retry
```javascript
let reportingConfigured = false;
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    await endpoint.clusters.iasZone.configureReporting({
      zoneStatus: {
        minInterval: 0,
        maxInterval: 300,
        minChange: 1
      }
    });
    this.log(`✅ IAS Zone reporting configured (attempt ${attempt})`);
    reportingConfigured = true;
    break;
  } catch (err) {
    if (attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

#### c) Enhanced Motion Detection Parsing
```javascript
endpoint.clusters.iasZone.on('zoneStatusChangeNotification', async (payload) => {
  this.log('🚶 MOTION DETECTED! Notification:', JSON.stringify(payload));
  
  // Support multiple zone status formats
  const motionDetected = payload.zoneStatus?.alarm1 || 
                         payload.zoneStatus?.alarm2 || 
                         (payload.zoneStatus & 1) === 1;
  
  this.log('Motion state:', motionDetected ? 'DETECTED ✅' : 'Clear ⭕');
  await this.setCapabilityValue('alarm_motion', motionDetected);
});
```

**Impact:** Proper IAS Zone enrollment ensures devices send motion/button press events

### 4. Comprehensive Logging for Debugging

**Added to all drivers:**

```javascript
// Enhanced logging for debugging data reception issues
device.log('[TuyaCluster] Raw data received:', JSON.stringify(data));

if (!data.dataPoints) {
  device.log('[TuyaCluster] ⚠️ No dataPoints in response, data keys:', Object.keys(data));
  return;
}

device.log('[TuyaCluster] 📦 DataPoints received:', JSON.stringify(data.dataPoints));

// Detailed datapoint processing
Object.entries(data.dataPoints).forEach(([dp, value]) => {
  const dpNum = parseInt(dp);
  this.log(`🔍 Processing DP ${dpNum}:`, value, `(type: ${typeof value})`);
});
```

**Impact:** Users can provide detailed logs when reporting issues, making debugging much easier

## Testing Recommendations

### For Users with HOBEIAN Multisensor (ZG-204ZV):

1. **Remove and re-pair the device** after updating to v2.15.32
2. **Monitor Homey logs** (Settings → System → Logging)
3. Look for these success indicators:
   - `✅ Tuya cluster found on endpoint X`
   - `✅ IAS CIE address written`
   - `✅ IAS Zone reporting configured`
   - `📦 DataPoints received: 1,2,4,5,9`
4. **Test all sensors:**
   - Wave hand in front → motion should trigger
   - Cover sensor → illumination should change
   - Breathe on sensor → temperature/humidity should change

### For Users with SOS Emergency Button:

1. **Remove and re-pair the device**
2. **Press button** and check logs for:
   - `🚨 SOS BUTTON PRESSED! Notification:`
   - `✅ SOS alarm triggered!`
3. **Verify battery reading** is reasonable (not 1%)
4. **Test in flows** to ensure automation triggers

### For Users with PIR Radar Sensor (ZG-204ZM):

1. **Remove and re-pair the device**
2. **Test motion detection:**
   - Walk in front of sensor
   - Check both PIR and radar detection
3. **Check illumination sensor**
4. **Monitor logs** for successful enrollment

## Datapoint Mappings Reference

### HOBEIAN ZG-204ZV (Multisensor)
- DP 1: Motion (boolean)
- DP 2: Battery (0-100%)
- DP 4: Temperature (int ÷ 10 = °C)
- DP 5: Humidity (0-100%)
- DP 9: Illuminance (lux)

### HOBEIAN ZG-204ZM (PIR+Radar)
- DP 1: Presence (boolean)
- DP 2: Battery (0-100%)
- DP 9: Illuminance (lux)

### SOS Emergency Button
- DP 1: SOS trigger (boolean)
- DP 2: Battery (0-100%)
- DP 13: Action type (0=single, 1=double, 2=hold)

## Technical Background

### Why Tuya Devices Are Different

Standard Zigbee devices use well-defined clusters like:
- `ILLUMINANCE_MEASUREMENT` (0x0400)
- `TEMPERATURE_MEASUREMENT` (0x0402)
- `IAS_ZONE` (0x0500)

Tuya devices use a **proprietary cluster 0xEF00 (61184)** that encodes all data as "datapoints" with numeric IDs. This requires special handling to decode the data properly.

### IAS Zone Enrollment Process

For motion sensors and buttons to work, they must be enrolled with Homey as the IAS CIE (Control and Indicating Equipment):

1. Write `iasCieAddress` to device (tells device where to send events)
2. Configure reporting parameters
3. Listen for `zoneStatusChangeNotification` events
4. Parse zone status to determine motion/button state

Previous versions were missing step 1, causing devices to not send notifications.

## Related Forum Threads

- [Homey Community - HOBEIAN Drivers Issue](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352)
- [Major Update v2.1.85 - Complete Tuya Cluster Fix](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352?page=14)

## Version History

- **v2.15.31:** Initial IAS Zone notification fix
- **v2.15.32:** Complete Tuya cluster detection + IAS enrollment + retry logic
