# ZCL Architecture - Zigbee Direct Native Support

## Overview

This app implements **native Zigbee Direct** communication with devices, bypassing any hub/bridge dependency (eWeLink Cube, iHost, etc.). All devices connect directly to Homey Pro's Zigbee coordinator.

## Cluster Library (ZCL)

### Core Clusters Used

| Cluster | ID | Hex | Purpose |
|---------|-----|-----|---------|
| Basic | 0 | 0x0000 | Device info (manufacturer, model) |
| Power Configuration | 1 | 0x0001 | Battery level, voltage |
| Identify | 3 | 0x0003 | Device identification |
| Groups | 4 | 0x0004 | Group membership |
| Scenes | 5 | 0x0005 | Scene support |
| On/Off | 6 | 0x0006 | Switch control |
| Level Control | 8 | 0x0008 | Dimming |
| Color Control | 768 | 0x0300 | Color, temperature |
| Temperature | 1026 | 0x0402 | Temperature measurement |
| Humidity | 1029 | 0x0405 | Humidity measurement |
| Occupancy | 1030 | 0x0406 | Motion detection |
| IAS Zone | 1280 | 0x0500 | Security sensors |
| IAS WD | 1282 | 0x0502 | Warning devices |
| Window Covering | 258 | 0x0102 | Curtains/blinds |
| Thermostat | 513 | 0x0201 | Climate control |
| Metering | 1794 | 0x0702 | Energy metering |
| Electrical | 2820 | 0x0B04 | Power measurement |
| Tuya Private | 61184 | 0xEF00 | Tuya DP protocol |

---

## IAS Zone (0x0500) - Security Sensors

### Zone Types

| Type | ID | Devices |
|------|-----|---------|
| Motion Sensor | 0x000D | PIR, mmWave |
| Contact Switch | 0x0015 | Door/window |
| Fire Sensor | 0x0028 | Smoke detectors |
| Water Sensor | 0x002A | Water leak |
| CO Sensor | 0x002B | Carbon monoxide |
| Personal Emergency | 0x002C | SOS buttons |
| Vibration Sensor | 0x002D | Vibration |
| Glass Break | 0x0226 | Glass break |

### Zone Status Bits

```javascript
const IAS_ZONE_STATUS = {
  ALARM1: 0x0001,        // Bit 0: Zone alarm 1
  ALARM2: 0x0002,        // Bit 1: Zone alarm 2
  TAMPER: 0x0004,        // Bit 2: Tamper
  BATTERY_LOW: 0x0008,   // Bit 3: Battery low
  SUPERVISION: 0x0010,   // Bit 4: Supervision
  RESTORE: 0x0020,       // Bit 5: Restore
  TROUBLE: 0x0040,       // Bit 6: Trouble
  AC_MAINS: 0x0080,      // Bit 7: AC (mains)
  TEST: 0x0100,          // Bit 8: Test mode
  BATTERY_DEFECT: 0x0200 // Bit 9: Battery defect
};
```

### Implementation Example

```javascript
// Register IAS Zone listener
iasZoneCluster.on('zoneStatusChangeNotification', (payload) => {
  const status = payload.zoneStatus;
  const alarm = !!(status & 0x0001);
  const tamper = !!(status & 0x0004);
  const batteryLow = !!(status & 0x0008);

  this.setCapabilityValue('alarm_smoke', alarm);
  this.setCapabilityValue('alarm_tamper', tamper);
  this.setCapabilityValue('alarm_battery', batteryLow);
});
```

---

## IAS WD (0x0502) - Warning Devices

### Commands

#### startWarning

```javascript
await iasWdCluster.startWarning({
  warningInfo: (mode & 0x0F) | ((strobe & 0x03) << 4) | ((level & 0x03) << 6),
  warningDuration: 30,  // seconds
  strobeDutyCycle: 50,  // percent
  strobeLevel: 1
});
```

#### Warning Modes

| Mode | Value | Description |
|------|-------|-------------|
| Stop | 0 | Stop warning |
| Burglar | 1 | Burglar alarm |
| Fire | 2 | Fire alarm |
| Emergency | 3 | Emergency |
| Police Panic | 4 | Police panic |
| Fire Panic | 5 | Fire panic |
| Emergency Panic | 6 | Emergency panic |

#### Siren Levels

| Level | Value | Description |
|-------|-------|-------------|
| Low | 0 | ~65 dB |
| Medium | 1 | ~85 dB |
| High | 2 | ~105 dB |
| Very High | 3 | ~120 dB |

### Supported Sirens

| Brand | Models | Notes |
|-------|--------|-------|
| HEIMAN | HS2WD-E, SRHMP-I1 | Full IAS WD |
| Tuya | TS0216, TS0219 | Some use 0xEF00 |
| Develco | SIRZB-110, SIRZB-120 | Standard IAS WD |
| Neo | NAS-AB02B | Tuya-based |

---

## Tuya Private Cluster (0xEF00)

### Datapoint Types

| Type | ID | Size | Description |
|------|-----|------|-------------|
| RAW | 0x00 | Variable | Raw bytes |
| BOOL | 0x01 | 1 | Boolean |
| VALUE | 0x02 | 4 | Integer (BE) |
| STRING | 0x03 | Variable | UTF-8 string |
| ENUM | 0x04 | 1 | Enumeration |
| BITMAP | 0x05 | 1-4 | Bit flags |

### Common Datapoints

```javascript
const TUYA_DP = {
  // Siren
  SIREN_SWITCH: 13,
  SIREN_VOLUME: 5,
  SIREN_DURATION: 7,
  SIREN_MELODY: 21,

  // Climate
  TEMPERATURE: 1,
  HUMIDITY: 2,
  BATTERY_PERCENT: 4,

  // Motion
  OCCUPANCY: 1,
  SENSITIVITY: 2,

  // Switch
  SWITCH_1: 1,
  SWITCH_2: 2,
  SWITCH_3: 3,
  SWITCH_4: 4,

  // Curtain
  CURTAIN_SWITCH: 1,   // 0=open, 1=stop, 2=close
  CURTAIN_POSITION: 2
};
```

### Sending Tuya DP Command

```javascript
async sendTuyaDatapoint(dpId, dpType, value) {
  const seq = Math.floor(Math.random() * 65535);
  let dpData;

  switch (dpType) {
    case 0x01: // BOOL
      dpData = Buffer.from([value ? 1 : 0]);
      break;
    case 0x02: // VALUE
      dpData = Buffer.alloc(4);
      dpData.writeInt32BE(value, 0);
      break;
    case 0x04: // ENUM
      dpData = Buffer.from([value]);
      break;
  }

  const cmd = Buffer.alloc(6 + dpData.length);
  cmd.writeUInt16BE(seq, 0);
  cmd[2] = dpId;
  cmd[3] = dpType;
  cmd.writeUInt16BE(dpData.length, 4);
  dpData.copy(cmd, 6);

  await tuyaCluster.datapoint({ data: cmd });
}
```

---

## Device Configuration (driver.compose.json)

### Example: Smoke Detector

```json
{
  "id": "smoke_detector_advanced",
  "class": "sensor",
  "capabilities": ["alarm_smoke", "alarm_tamper", "alarm_battery", "measure_battery"],
  "zigbee": {
    "manufacturerName": ["HEIMAN", "_TZ3000_xxx"],
    "productId": ["SmokeSensor-N-3.0", "TS0205"],
    "endpoints": {
      "1": {
        "clusters": [0, 1, 3, 1280],
        "bindings": [1280, 1]
      }
    }
  }
}
```

### Example: Siren

```json
{
  "id": "siren",
  "class": "other",
  "capabilities": ["onoff", "alarm_siren"],
  "zigbee": {
    "manufacturerName": ["HEIMAN", "_TZ3000_xxx"],
    "productId": ["WarningDevice", "TS0216"],
    "endpoints": {
      "1": {
        "clusters": [0, 1, 3, 6, 1280, 1282],
        "bindings": [1282, 1280, 6]
      }
    }
  }
}
```

---

## Library Files

| File | Purpose |
|------|---------|
| `lib/ZigbeeClusterManager.js` | Universal cluster handler |
| `lib/UniversalIasDevice.js` | Base class for IAS devices |
| `lib/HeimanIasDevice.js` | HEIMAN-specific handling |
| `lib/SonoffZclDevice.js` | SONOFF-specific handling |

---

## Brand Support

### HEIMAN

- **Clusters**: Standard IAS Zone + IAS WD
- **Battery**: genPowerCfg (0x0001)
- **Models**: HS1SA, HS2WD, HS3MS, etc.

### SONOFF/eWeLink

- **Clusters**: Standard Zigbee 3.0
- **Battery**: genPowerCfg or attribute reports
- **Models**: SNZB series

### Tuya

- **Clusters**: Standard + 0xEF00 for advanced
- **DP Protocol**: Required for non-standard features
- **Models**: TS0xxx series

### Aqara/LUMI

- **Clusters**: Standard + some proprietary
- **Battery**: genPowerCfg with custom attributes
- **Models**: lumi.xxx, RTCGQ, MCCGQ, etc.

### IKEA

- **Clusters**: Standard Zigbee HA 1.2
- **Battery**: genPowerCfg
- **Models**: TRADFRI, E1xxx series

### Philips Hue

- **Clusters**: Standard ZLL
- **Battery**: genPowerCfg for sensors
- **Models**: LWA, LCA, SML, RWL series

---

## Flow Cards

### Triggers

- `alarm_smoke_true` - Smoke detected
- `alarm_co_true` - CO detected
- `alarm_water_true` - Water leak detected
- `alarm_motion_true` - Motion detected
- `alarm_contact_true` - Contact opened

### Actions

- `siren_start` - Start siren
- `siren_stop` - Stop siren
- `squawk` - Short beep

---

## Debugging

### Check device clusters

```javascript
// In device.js onNodeInit
const zclNode = this.zclNode;
for (const [epId, ep] of Object.entries(zclNode.endpoints)) {
  this.log(`Endpoint ${epId}:`, Object.keys(ep.clusters));
}
```

### Read IAS Zone type

```javascript
const { zoneType } = await iasZoneCluster.readAttributes(['zoneType']);
this.log('Zone type:', zoneType);
```

### Test IAS WD

```javascript
// Test siren for 5 seconds
await iasWdCluster.startWarning({
  warningInfo: 0x01,
  warningDuration: 5
});
```
