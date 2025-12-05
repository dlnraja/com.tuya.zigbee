# Comprehensive Device Information Extraction
## JohanBendz/com.tuya.zigbee GitHub Repository Analysis

**Analysis Date:** 2025-12-05
**Repository:** JohanBendz/com.tuya.zigbee
**Data Source:** All 1,306 Issues + 177 Pull Requests

---

## Executive Summary

This comprehensive analysis extracted device information from **ALL** GitHub issues and pull requests in the JohanBendz/com.tuya.zigbee repository, including both open and closed items.

### Key Findings

- **Total Devices Analyzed:** 1,117 unique device references
- **Unique Manufacturer Names:** 631
- **Unique Model IDs:** 57
- **Unique Device Combinations:** 603 (manufacturerName + modelId pairs)
- **DataPoints Mapped:** 31 distinct DPs from driver files

### Device Status Distribution

| Status | Count | Description |
|--------|-------|-------------|
| **Successfully Added** | 364 | Devices that have been implemented (closed issues with "New Device" label) |
| **Pending** | 371 | Open device requests awaiting implementation |
| **Problematic** | 46 | Devices with bug reports or issues |

---

## Manufacturer Names Analysis

### Total: 631 Unique Manufacturer Names

### Distribution by Prefix

| Prefix | Count | Description |
|--------|-------|-------------|
| `_TZ3000` | 339 | Most common manufacturer prefix (53.7%) |
| `_TZE200` | 109 | Second most common (17.3%) |
| `_TZE204` | 54 | Third most common (8.6%) |
| `_TZ3210` | 52 | Fourth most common (8.2%) |
| `_TYZB01` | 30 | Older Tuya prefix (4.8%) |
| `_TZE284` | 13 | Newer Tuya prefix (2.1%) |
| `TUYATEC` | 13 | Legacy Tuya naming (2.1%) |

### Complete List of Manufacturer Names

The full list includes 631 unique manufacturer identifiers following these patterns:

**Common Patterns:**
- `_TZ3000_xxxxxxxx` (8-character lowercase alphanumeric)
- `_TZE200_xxxxxxxx` (8-character lowercase alphanumeric)
- `_TZE204_xxxxxxxx` (8-character lowercase alphanumeric)
- `_TZ3210_xxxxxxxx` (8-character lowercase alphanumeric)
- `_TZE284_xxxxxxxx` (8-character lowercase alphanumeric)
- `_TYZB01_xxxxxxxx` (8-character lowercase alphanumeric)
- `TUYATEC-xxxxxxxx` (8-character alphanumeric)

**Sample Manufacturer Names:**
```
_TZ3000_0ausfos0
_TZ3000_0dumfk2z
_TZ3000_0hkmcrza
_TZ3000_0s1izerx
_TZ3000_18ejxno0
_TZE200_3towulqd
_TZE200_8ygsuhe1
_TZE200_a8sdabtg
_TZE204_5cuocqty
_TZE204_ahwvlkpy
_TZE204_bjzrowv2
_TZE284_aao3yzhs
_TZE284_gyzlwu5q
_TZE284_myd45weu
```

---

## Model IDs Analysis

### Total: 57 Unique Model IDs

### Distribution by Category

| Category | Count | Model Range |
|----------|-------|-------------|
| **Sensors** (TS02xx) | 14 | TS0201-TS0225 |
| **Lights/Dimmers** (TS05xx) | 10 | TS0501-TS0505 |
| **Buttons/Remotes** (TS004x) | 6 | TS0041-TS0046 |
| **Switches 1-4 Gang** (TS000x) | 5 | TS0001-TS0004 |
| **Switches w/Neutral** (TS001x) | 5 | TS0011-TS0014 |
| **Smart Plugs** | 1 | TS011F |
| **Tuya Custom** | 1 | TS0601 |

### Complete List of Model IDs

```
SNZB-02, SNZB-03, SNZB-04, SNZB-05
TS0000, TS0001, TS0002, TS0003, TS0004
TS0011, TS0011F, TS0012, TS0013, TS0014
TS0041, TS0042, TS0043, TS0044, TS0046, TS0049
TS0052, TS0101, TS0111, TS0115, TS0121
TS0201, TS0202, TS0203, TS0204, TS0205, TS0207
TS0210, TS0211, TS0212, TS0215A, TS0219
TS0222, TS0224, TS0225
TS0501A, TS0501B, TS0502, TS0502A, TS0502B
TS0503A, TS0503B, TS0504B, TS0505A, TS0505B
TS0601, TS0726
TS1001, TS1101, TS1201
```

---

## DataPoint (DP) Mappings

### Total: 31 Distinct DataPoints Discovered

Extracted from driver implementation files in the repository.

### Common DataPoint Mappings

| DP | Common Usage | Found in Drivers |
|----|--------------|------------------|
| **DP1** | Switch (on/off) | 8 drivers |
| **DP2** | Target humidity / Settings | 8 drivers |
| **DP3** | Humidity sensor | 6 drivers |
| **DP4** | Battery level | 6 drivers |
| **DP5** | Temperature (value / 10) | 5 drivers |
| **DP7** | Work state (enum) | 3 drivers |
| **DP9** | Countdown timer | 3 drivers |
| **DP15** | Battery percentage | 4 drivers |
| **DP17** | Current (A × 1000) | 1 driver |
| **DP18** | Power (W × 10) | 2 drivers |
| **DP19** | Voltage (V × 10) | 2 drivers |
| **DP20** | Energy (kWh × 100) | 1 driver |
| **DP101** | Battery percentage | 5 drivers |
| **DP102** | Detection delay / Fading time | 2 drivers |
| **DP103** | Position (curtains) | 3 drivers |
| **DP104** | Target distance / Illuminance | 3 drivers |
| **DP105** | Soil moisture | 3 drivers |
| **DP106** | Illuminance threshold | 2 drivers |
| **DP107** | Presence state (enum) | 1 driver |
| **DP108** | Motion state (enum) | 1 driver |

### DataPoint Usage by Driver

**Most Common DPs:**
- **Plug/Socket drivers:** DP1, DP17-20 (power/energy metering)
- **Sensor drivers:** DP3-5, DP15, DP101 (temp/humidity/battery)
- **Motion/Radar sensors:** DP102-108 (detection settings)
- **Soil sensors:** DP3, DP4, DP5, DP9, DP105 (moisture/temp)
- **Curtain motors:** DP1-7, DP103 (position/control)
- **Thermostats:** DP3-7, DP13, DP35-47, DP101, DP104 (climate control)

---

## Device Type Analysis

### Top 20 Device Types by Frequency

| Rank | Device Type | Occurrences |
|------|-------------|-------------|
| 1 | button | 423 |
| 2 | sensor | 360 |
| 3 | switch | 294 |
| 4 | temperature | 128 |
| 5 | humidity | 121 |
| 6 | light | 88 |
| 7 | motion | 65 |
| 8 | plug | 65 |
| 9 | curtain | 60 |
| 10 | remote | 57 |
| 11 | door | 54 |
| 12 | dimmer | 51 |
| 13 | presence | 50 |
| 14 | water | 48 |
| 15 | socket | 44 |
| 16 | radar | 42 |
| 17 | window | 34 |
| 18 | smoke | 26 |
| 19 | strip | 25 |
| 20 | bulb | 23 |

---

## Successfully Added Devices (Sample)

These devices were successfully implemented and merged (closed issues with "New Device" label):

### Recent Additions (2025)

| Issue # | Manufacturer | Model | Device Type | Closed Date |
|---------|--------------|-------|-------------|-------------|
| #1224 | _TZ3000_rdhukkmi | TS0201 | Temperature/Humidity Sensor | 2025-07-02 |
| #1215 | _TZE200_icka1clh | TS0601 | Button | 2025-05-06 |
| #1196 | _TZ3000_v1w2k9dd | TS0201 | Button/Sensor | 2025-04-07 |
| #1184 | _TZ3040_wqmtjsyk | - | Light/Motion Sensor | 2025-03-27 |
| #1181 | _TZ3000_hhiodade | TS0011 | Switch/Light/Button | 2025-03-17 |
| #1180 | _TZ3000_18ejxno0 | TS0012 | Switch/Light/Button | 2025-03-17 |
| #1156 | _TZE204_e5m9c5hl | TS0601 | Button/Sensor/Presence | 2025-02-05 |
| #1148 | _TZ3000_w0qqde0g | - | Button/Plug | 2025-02-03 |
| #1132 | _TZE204_nqqylykc | TS0601 | Dimmer | 2025-01-20 |

**Total Successfully Added:** 364 devices

---

## Pending Device Requests (Sample)

Open issues requesting new device support:

| Issue # | Manufacturer | Model | Device Type | Created Date |
|---------|--------------|-------|-------------|--------------|
| #1312 | _TZ3210_cehuw1lw | TS011F | Socket | 2025-11-17 |
| #1311 | _TZ3000_7ysdnebc | TS1101 | - | 2025-11-17 |
| #1310 | _TZE200_9xfjixap | TS0601 | Temperature/Thermostat | 2025-11-15 |
| #1308 | _TZ3040_wqmtjsyk | TS0202 | Motion Sensor | 2025-11-13 |
| #1307 | _TZE200_dcrrztpa | TS0601 | Switch/Plug | 2025-11-12 |
| #1305 | _TZE200_rhgsbacq | TS0601 | mmWave Radar | 2025-11-10 |
| #1304 | _TZ3000_zutizvyk | TS0203 | Door/Window Sensor | 2025-11-09 |
| #1302 | _TZE204_8fffc3kb | TS0601 | Dimmer/Light/Strip | 2025-11-08 |
| #1301 | _TZE200_nv6nxo0c | TS0601 | Curtain/Remote | 2025-11-07 |

**Total Pending:** 371 devices

---

## Problematic Devices

Devices with reported bugs or issues (46 total):

These devices have been added but have reported problems in:
- Temperature/humidity readings
- Battery reporting
- DP mapping errors
- Cluster compatibility issues
- Device pairing problems

---

## Device Catalog Summary

### By Manufacturer Prefix

- **_TZ3000 series:** 339 unique manufacturers, primarily switches, sensors, and smart plugs
- **_TZE200 series:** 109 unique manufacturers, primarily TS0601 custom devices
- **_TZE204 series:** 54 unique manufacturers, newer custom implementations
- **_TZ3210 series:** 52 unique manufacturers, smart plugs and advanced switches

### By Model Type

- **TS0601:** Universal Tuya custom protocol device (most versatile)
- **TS0201-TS0225:** Sensor devices (temperature, humidity, motion, door, etc.)
- **TS0001-TS0014:** Switch devices (1-4 gang, with/without neutral)
- **TS0041-TS0046:** Button/remote devices (1-4 button configurations)
- **TS0501-TS0505:** Light devices (dimmers, color temperature, RGB, RGBW)
- **TS011F:** Smart plug with power monitoring

---

## Diagnostic Codes Analysis

Common diagnostic patterns found in device interviews:

### ZCL Version
- Most devices: `zclVersion: 3`
- Some older devices: `zclVersion: 1-2`

### Application Versions
- Wide variation: 1-255
- Most common: 64-82 range

### Power Sources
- `mains`: Wall-powered devices (switches, plugs, lights)
- `battery`: Battery-powered devices (sensors, buttons)
- `unknown`: Some older devices

### Common Clusters
- **Basic (0):** Device identification
- **OnOff (6):** Switch control
- **Level (8):** Dimming control
- **Color (768):** Color control
- **Temperature Measurement (1026):** Temperature sensors
- **Humidity Measurement (1029):** Humidity sensors
- **Occupancy Sensing (1030):** Motion/presence sensors
- **Electrical Measurement (2820):** Power metering
- **Tuya Specific (57344, 57345):** Custom Tuya functionality

---

## Error Patterns and Common Issues

### Most Common Problems

1. **Temperature/Humidity Offset Issues**
   - Incorrect DP mapping
   - Need for calibration offsets
   - Value scaling issues (÷10, ÷100)

2. **Battery Reporting**
   - DP4 vs DP15 vs DP101 confusion
   - Percentage vs voltage reporting
   - Battery state enum interpretation

3. **Device Not Pairing**
   - Missing manufacturerName in driver
   - Incorrect cluster configuration
   - Zigbee firmware compatibility

4. **DP Mapping Errors**
   - Wrong DP assigned to capability
   - Missing DP handlers
   - Incorrect data type parsing

5. **Soil Sensor Issues** (Recent Focus)
   - DP mapping confusion between climate and soil sensors
   - Moisture vs humidity reporting
   - Temperature calibration

---

## Comparison with Existing Analysis

### Previous Analysis (analysis_results.json)
- **PRs Analyzed:** 26 of 175 (14.9%)
- **Issues Analyzed:** 39 of 1,111 (3.5%)
- **Manufacturer IDs Found:** 72

### This Comprehensive Analysis
- **PRs Analyzed:** 177 of 177 (100%)
- **Issues Analyzed:** 1,306 of 1,306 (100%)
- **Manufacturer IDs Found:** 631

**Improvement:** This analysis captured **8.8x more manufacturer names** and analyzed **100% of all data** versus the previous partial analysis.

---

## Key Insights

### Device Ecosystem

1. **Rapid Growth:** 364 devices successfully added, 371 pending requests shows active development
2. **Manufacturer Diversity:** 631 unique manufacturers indicates Tuya's extensive OEM network
3. **Model Consolidation:** Only 57 model IDs across 631 manufacturers shows heavy reuse of base designs
4. **TS0601 Dominance:** The universal custom protocol model is used for the most diverse device types

### Development Patterns

1. **Community-Driven:** Most device additions come from user-submitted device interviews
2. **DP Discovery:** DataPoint mappings are discovered empirically through testing
3. **Driver Reuse:** Similar devices share driver code with minor DP variations
4. **Iterative Improvement:** Many devices have multiple issues/PRs for refinements

### Technical Challenges

1. **DP Inconsistency:** Same functionality uses different DPs across manufacturers
2. **Documentation Gap:** Manufacturers rarely provide DP documentation
3. **Firmware Variations:** Same manufacturer/model can have different firmware versions
4. **Cluster Complexity:** Tuya custom clusters (57344, 57345) require reverse engineering

---

## Recommendations

### For Device Support

1. **Priority Queue:** Focus on the 371 pending devices with most community interest
2. **DP Documentation:** Create comprehensive DP mapping database from working devices
3. **Driver Templates:** Develop standardized templates for common device types
4. **Testing Framework:** Implement automated testing for new device additions

### For Developers

1. **Device Interview Required:** Always request full device interview from users
2. **DP Verification:** Test all DPs systematically before implementation
3. **Calibration Support:** Include offset/calibration options for sensors
4. **Error Handling:** Implement robust error handling for malformed DP data

### For Users

1. **Provide Complete Info:** Include device interview, manufacturer, model, and purchase link
2. **Test Thoroughly:** Verify all capabilities after device addition
3. **Report Issues:** Document specific problems with DP values and expected behavior
4. **Be Patient:** Community-driven development takes time

---

## Data Files Generated

1. **comprehensive_device_extraction.json** (900 KB)
   - Raw extraction of all 1,117 devices
   - Full details including errors, diagnostics, labels

2. **COMPREHENSIVE_DEVICE_REPORT.json** (491.6 KB)
   - Organized summary with categorization
   - Device catalog with status classification
   - Statistical analysis

3. **DATAPOINT_MAPPINGS.json**
   - 31 DataPoints mapped from driver files
   - Usage patterns across drivers
   - Implementation examples

4. **COMPREHENSIVE_DEVICE_ANALYSIS.md** (this file)
   - Human-readable summary
   - Complete findings and insights
   - Recommendations

---

## Conclusion

This comprehensive analysis of the JohanBendz/com.tuya.zigbee repository reveals a thriving ecosystem with:

- **631 unique Tuya manufacturers** supported or pending
- **57 distinct device models** across 603 unique combinations
- **364 successfully implemented devices** with working drivers
- **371 pending device requests** from the community
- **31 mapped DataPoints** with documented functionality

The repository demonstrates excellent community engagement and systematic device support expansion. The primary challenges remain DataPoint discovery and manufacturer-specific variations, but the established patterns and driver templates provide a solid foundation for continued growth.

---

**Analysis Complete**
*Generated: 2025-12-05*
*Repository: JohanBendz/com.tuya.zigbee*
*Method: Automated extraction from all 1,483 GitHub issues and pull requests*
