# ZHA Device Handlers - Tuya Quirks Database

> **Source:** [github.com/zigpy/zha-device-handlers](https://github.com/zigpy/zha-device-handlers/tree/dev/zhaquirks/tuya)
> **Purpose:** Cross-reference DP mappings and manufacturer-specific behaviors
> **Created:** 2026-01-31

---

## 📋 Tuya Protocol Constants

```javascript
// Cluster IDs
TUYA_CLUSTER_ID = 0xEF00;      // 61184 - Main Tuya DP cluster
TUYA_CLUSTER_E000_ID = 0xE000; // 57344 - Manufacturer specific
TUYA_CLUSTER_E001_ID = 0xE001; // 57345 - External switch type
TUYA_CLUSTER_1888_ID = 0x1888; // 6280 - Manufacturer specific
TUYA_CLUSTER_ED00_ID = 0xED00; // 60672 - Manufacturer specific

// Command IDs
TUYA_SET_DATA = 0x00;
TUYA_GET_DATA = 0x01;
TUYA_SET_DATA_RESPONSE = 0x02;
TUYA_QUERY_DATA = 0x03;
TUYA_SEND_DATA = 0x04;
TUYA_ACTIVE_STATUS_RPT = 0x06;
TUYA_SET_TIME = 0x24;

// DP Types
TUYA_DP_TYPE_RAW = 0x00;
TUYA_DP_TYPE_BOOL = 0x01;
TUYA_DP_TYPE_VALUE = 0x02;
TUYA_DP_TYPE_STRING = 0x03;
TUYA_DP_TYPE_ENUM = 0x04;
TUYA_DP_TYPE_FAULT = 0x05;
```

---

## 🌡️ TRV / Thermostat DP Mappings

### Siterwell TRV

| DP ID (hex) | DP ID (dec) | Attribute | Transform | Description |
|-------------|-------------|-----------|-----------|-------------|
| 0x0107 | 263 | child_lock | - | [0] unlocked [1] child-locked |
| 0x0112 | 274 | window_detection | - | [0] inactive [1] active |
| 0x0114 | 276 | valve_detect | - | [0] do not report [1] report |
| 0x026D | 621 | valve_state | - | Opening percentage (4 bytes) |
| 0x0202 | 514 | target_temp | ×10 | Target temp (decidegree → centidegree) |
| 0x0203 | 515 | temperature | ×10 | Current temp (decidegree → centidegree) |
| 0x0215 | 533 | battery | - | Battery percentage |
| 0x0404 | 1028 | mode | - | [0] off [1] scheduled [2] manual |

### Moes TRV

| DP ID | Attribute | Transform | Description |
|-------|-----------|-----------|-------------|
| 1 | child_lock | - | Child lock |
| 2 | window_detection | - | Window detection (3 bytes) |
| 3 | valve_detect | - | Valve detection |
| 4 | mode | - | [0] schedule [1] manual [2] temp_hand [3] holiday |
| 5 | window_open | - | Window open indicator |
| 6 | valve_state | - | Valve opening percentage |
| 16 | target_temp | ×10 | Target temperature |
| 24 | local_temp | ×10 | Local temperature |
| 27 | temp_calibration | ×10 | Temperature calibration |
| 28 | child_lock_2 | - | Child lock (duplicate) |
| 35 | battery_low | - | Battery low indicator |
| 40 | week_format | - | 5+2 / 6+1 / 7 day schedule |
| 45 | away_temp | ×100 | Away mode temperature |
| 46 | auto_lock | - | Auto lock |
| 101 | min_temp | ×100 | Minimum temperature limit |
| 102 | max_temp | ×100 | Maximum temperature limit |
| 103 | boost_time | - | Boost duration (seconds) |
| 104 | force_valve | - | Force valve state |
| 105 | comfort_temp | ×100 | Comfort mode temperature |
| 106 | eco_temp | ×100 | Eco mode temperature |
| 112 | workday_schedule | 18 bytes | Workday schedule |
| 113 | weekend_schedule | 18 bytes | Weekend schedule |

### Zonnsmart TRV

| DP ID | Attribute | Transform | Description |
|-------|-----------|-----------|-------------|
| 2 | mode | - | System mode |
| 8 | window_detection | - | Window detection |
| 10 | frost_protection | - | Frost protection |
| 16 | target_temp | ×10 | Target temperature |
| 24 | temperature | ×10 | Current temperature |
| 27 | temp_calibration | ×10 | Temperature calibration |
| 28 | week_format | - | Week format |
| 32 | holiday_temp | ×10 | Holiday temperature |
| 35 | battery | - | Battery percentage |
| 101 | uptime | - | Device uptime |
| 102 | child_lock | - | Child lock |
| 105 | fault_detection | - | Fault detection |
| 103 | boost_time | - | Boost duration |
| 104 | opened_window_temp | - | Opened window temperature |
| 106 | comfort_temp | - | Comfort temperature |
| 107 | eco_temp | - | Eco temperature |
| 108 | heating_stop | - | Heating stop |
| 115 | online_mode | - | Online mode (enum/bool) |

---

## 📡 Radar / mmWave Sensors

### MmwRadarManufCluster (_TZE200_ar0slwnd, _TZE200_sfiy5tfs, etc.)

| DP ID | Attribute | Transform | Description |
|-------|-----------|-----------|-------------|
| 1 | occupancy | - | Presence state |
| 2 | dp_2 | - | Unknown |
| 3 | dp_3 | - | Unknown |
| 4 | sensitivity | - | Sensitivity (1-9) |
| 6 | dp_6 | - | Unknown |
| 9 | distance | ÷100 | Target distance (cm → m) |
| 101 | min_distance | - | Minimum detection distance |
| 102 | max_distance | - | Maximum detection distance |
| 103 | dp_103 | - | String value |
| 104 | illuminance | log10 formula | Illuminance (lux) |
| 105 | detection_delay | - | Detection delay |
| 106 | fading_time | - | Fading time |
| 107 | dp_107 | - | Unknown |
| 108 | dp_108 | - | Unknown |

**Illuminance Transform:**
```javascript
// ZHA quirk formula
illuminance = x !== 0 ? 10000 * Math.log10(x) + 1 : 0;
```

### NeoMotion (_TZE200_7hfcudw5, _TZE200_ppuj1vem)

| DP ID | Attribute | Transform | Description |
|-------|-----------|-----------|-------------|
| 101 | occupancy | - | Motion detected |
| 104 | temperature | ×10 | Temperature (centidegree) |
| 105 | humidity | ×100 | Humidity (percent × 100) |
| 113 | dp_113 | - | Unknown enum |

### Supported Radar Manufacturers

```javascript
const ZHA_RADAR_FINGERPRINTS = [
  "_TZE200_ar0slwnd",
  "_TZE200_sfiy5tfs",
  "_TZE200_mrf6vtua",
  "_TZE200_ztc6ggyl",
  "_TZE204_ztc6ggyl",
  "_TZE200_wukb7rhc",
  "_TZE204_qasjif9e",
  "_TZE200_7hfcudw5",
  "_TZE200_ppuj1vem",
];
```

---

## 💡 Switch OnOff Cluster Attributes

### TuyaZBOnOffAttributeCluster (0x0006)

| Attribute ID | Name | Type | Values |
|--------------|------|------|--------|
| 0x8000 | child_lock | Bool | true/false |
| 0x8001 | backlight_mode | Enum | [0] off [1] normal [2] inverted |
| 0x8002 | power_on_state | Enum | [0] off [1] on [2] last_state |
| 0x8004 | switch_mode | Enum | [0] command [1] event |

### TuyaSmartRemoteOnOffCluster (TS004X)

**Rotate Type (Command 0xFC):**
- 0x00 = RIGHT
- 0x01 = LEFT
- 0x02 = STOP

**Press Type (Command 0xFD):**
- 0x00 = SHORT_PRESS
- 0x01 = DOUBLE_PRESS
- 0x02 = LONG_PRESS

---

## 🪟 Cover / Curtain DP Mappings

### Standard Cover DPs

| DP ID | Name | Description |
|-------|------|-------------|
| 1 | control | [0] open [1] stop [2] close |
| 2 | percent_control | Position command (0-100) |
| 3 | percent_state | Current position (0-100) |
| 5 | direction_change | Motor direction |
| 6 | cover_inverted | Invert position |

### Window Cover Commands

```javascript
WINDOW_COVER_COMMAND_UPOPEN = 0x0000;
WINDOW_COVER_COMMAND_DOWNCLOSE = 0x0001;
WINDOW_COVER_COMMAND_STOP = 0x0002;
WINDOW_COVER_COMMAND_LIFTPERCENT = 0x0005;
WINDOW_COVER_COMMAND_CUSTOM = 0x0006;
```

---

## ⚡ Energy Metering

### TuyaZBMeteringCluster

```javascript
// Constant attributes for metering correction
MULTIPLIER = 1;
DIVISOR = 100;  // kWh correction
```

### TuyaZBElectricalMeasurement

```javascript
// Current measurement correction
AC_CURRENT_MULTIPLIER = 1;
AC_CURRENT_DIVISOR = 1000;  // mA to A
```

---

## 🔌 External Switch Type (Cluster 0xE001)

| Attribute | ID | Values |
|-----------|-----|--------|
| external_switch_type | 0xD030 | [0] Toggle [1] State [2] Momentary |

---

## 📱 Battery Level Enum (Neo Sensors)

```javascript
const NeoBatteryLevel = {
  BATTERY_FULL: 0x00,
  BATTERY_HIGH: 0x01,
  BATTERY_MEDIUM: 0x02,
  BATTERY_LOW: 0x03,
  USB_POWER: 0x04
};
```

---

## 🔧 Integration Notes for Universal Tuya Zigbee

### Already Implemented in Project

| Feature | File | Status |
|---------|------|--------|
| Tuya DP cluster 0xEF00 | lib/tuya/TuyaCluster.js | ✅ |
| OnOff attributes 0x8001-0x8004 | lib/devices/HybridSwitchBase.js | ✅ |
| Cover DPs 1-6 | lib/devices/HybridCoverBase.js | ✅ |
| TRV DPs | drivers/radiator_valve/device.js | ✅ |
| Radar sensors | drivers/presence_sensor_radar/device.js | ✅ |

### Potential Improvements from ZHA

1. **Illuminance formula** - Use log10 transform for lux values
2. **Neo battery enum** - Map 0-4 to percentage
3. **External switch type** - Add cluster 0xE001 support
4. **Smart remote rotation** - Add TS004X rotation support

---

## 🪟 Cover Manufacturers (from ZHA)

```javascript
const ZHA_COVER_FINGERPRINTS = [
  // Standard
  "_TZE200_fzo2pocs",
  // Inverted controls
  "_TZE200_cowvfni3",
  // Inverted position
  // (many more in quirks...)
];
```

---

## 💡 Dimmer Manufacturers (from ZHA)

### Single Channel Dimmers

```javascript
const ZHA_SINGLE_DIMMER = [
  "_TZE200_dfxkcots",
  "_TZE200_whpb9yts",
  "_TZE200_ebwgzdqq",
  "_TZE200_9i9dt8is",
  "_TZE200_swaamsoy",
  "_TZE200_0nauxa0p",
  "_TZE200_la2c2uo9",
  "_TZE200_1agwnems",
  "_TZE200_9cxuhakf",  // Mercator IKUU SSWM-DIMZ
  "_TZE200_a0syesf5",  // Mercator IKUU SSWRM-ZB
  "_TZE200_p0gzbqct",
  "_TZE200_w4cryh2i",
  "_TZE204_dcnsggvz",
  "_TZE200_6fjev1mn",
];
```

### Single Channel Dimmers (with Green Power)

```javascript
const ZHA_SINGLE_DIMMER_GP = [
  "_TZE200_3p5ydos3",
  "_TZE200_ip2akl4w",
  "_TZE200_vucankjx",  // Loratap
  "_TZE200_y8yjulon",
  "_TZE204_n9ctkb6j",  // BSEED
  "_TZE204_vevc4c6g",  // BSEED
  "_TZE204_5cuocqty",  // Avatto ZDMS16-1
  "_TZE204_nqqylykc",  // Avatto ZDMS16-1
];
```

### Double Channel Dimmers

```javascript
const ZHA_DOUBLE_DIMMER = [
  "_TZE200_e3oitdyu",
  "_TZE204_bxoo2swd",
];
```

---

## 📚 References

- [ZHA Device Handlers - Tuya](https://github.com/zigpy/zha-device-handlers/tree/dev/zhaquirks/tuya)
- [Zigbee2MQTT Tuya Converters](https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts)
- [Tuya Zigbee Protocol Analysis](https://developer.tuya.com/en/docs/iot/zigbee-protocol)
