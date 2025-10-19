# 🔷 Philips Hue Integration (UNBRANDED)

**Source:** Johan Bendz - com.philips.hue.zigbee  
**Approach:** UNBRANDED categorization  
**Date:** 2025-10-12

---

## 📋 Overview

Integration of **25 Philips Hue Zigbee drivers** from Johan Bendz's excellent work, organized in an **UNBRANDED** manner by function rather than brand.

### Credit

**Original Author:** Sebastian Johansson  
**Current Maintainer:** Johan Bendz (since April 2020)  
**Repository:** https://github.com/JohanBendz/com.philips.hue.zigbee

---

## 📊 Driver Analysis

### Total Drivers: 25

| Category | Count | Status |
|----------|-------|--------|
| **Indoor Lighting** | 10 | ✅ Priority 1 |
| **Outdoor Lighting** | 2 | 🔄 Priority 2 |
| **Power & Energy** | 1 | ✅ Created (smart_plug_dimmer_ac) |
| **Controllers** | 3 | 🔄 Priority 2 |
| **Sensors** | 2 | ✅ Priority 1 |
| **Outdoor** | 2 | 🔄 Priority 3 |

---

## 🎨 Categorization (UNBRANDED)

### Smart Lighting (Indoor)

#### White & Color Bulbs
- **Models:** LCT001, LCT007, LCT010, LCT014, LCT015, LCT016, LCA001
- **Capabilities:** onoff, dim, light_temperature, light_hue, light_saturation
- **Driver ID:** `bulb_white_color_ac`
- **Clusters:** 0, 3, 4, 5, 6, 8, 768 (Color Control)

#### White Ambiance Bulbs
- **Models:** LTW001, LTW004, LTW010, LTW012, LTW013, LTW014, LTW015, LTA001
- **Capabilities:** onoff, dim, light_temperature
- **Driver ID:** `bulb_white_ambiance_ac`
- **Clusters:** 0, 3, 4, 5, 6, 8, 768

#### White Bulbs
- **Models:** LWB004, LWB006, LWB007, LWB010, LWB014
- **Capabilities:** onoff, dim
- **Driver ID:** `bulb_white_ac`
- **Clusters:** 0, 3, 4, 5, 6, 8

#### LED Strips
- **Models:** LST001, LST002, LST003, LST004
- **Capabilities:** onoff, dim, light_temperature, light_hue, light_saturation
- **Driver ID:** `led_strip_color_ac`
- **Clusters:** 0, 3, 4, 5, 6, 8, 768

#### GU10 Spots
- **Models:** LWG001, LWG004, LCG002, LTG002
- **Capabilities:** onoff, dim, light_temperature (some models)
- **Driver ID:** `spot_gu10_ac`
- **Clusters:** 0, 3, 4, 5, 6, 8

#### Ceiling Lights
- **Models:** LTC001, LTC002, LTC003, LTC011, LTC012, LTC014, LTC015, LTC021
- **Capabilities:** onoff, dim, light_temperature
- **Driver ID:** `ceiling_light_ambiance_ac`
- **Clusters:** 0, 3, 4, 5, 6, 8, 768

### Outdoor Lighting

#### Outdoor Wall/Lantern
- **Models:** LWA001-005, LWW001-002, LWF001-002, 1743030P7, 1742930P7, 1744430P7
- **Capabilities:** onoff, dim
- **Driver ID:** `outdoor_wall_light_ac`
- **Clusters:** 0, 3, 4, 5, 6, 8

#### Outdoor Spots
- **Models:** LCS001, 1743130P7, 1743830P7
- **Capabilities:** onoff, dim, light_temperature
- **Driver ID:** `outdoor_spot_ac`
- **Clusters:** 0, 3, 4, 5, 6, 8, 768

### Power & Energy

#### Smart Plug (Already Created)
- **Models:** LOM001, LOM002, LOM003
- **Driver:** `smart_plug_dimmer_ac` ✅
- **Status:** Created and validated

### Controllers (Wireless)

#### Dimmer Switch
- **Models:** RWL020, RWL021
- **Capabilities:** alarm_battery
- **Battery:** CR2450
- **Driver ID:** `wireless_dimmer_switch_cr2450`
- **Clusters:** 0, 1, 3, 4096 (Touchlink)

#### Smart Button
- **Models:** ROM001
- **Capabilities:** alarm_battery
- **Battery:** CR2450
- **Driver ID:** `wireless_smart_button_cr2450`
- **Clusters:** 0, 1, 3, 4096

#### Tap Switch (Battery-Free)
- **Models:** ZGPSWITCH
- **Type:** ZigBee Green Power
- **Driver ID:** `wireless_tap_switch`
- **Endpoint:** 242 (Green Power)

### Motion & Presence Sensors

#### Indoor Motion Sensor
- **Models:** SML001, SML003
- **Capabilities:** alarm_motion, measure_temperature, measure_luminance, alarm_battery
- **Battery:** AAA
- **Driver ID:** `motion_sensor_indoor_battery`
- **Clusters:** 0, 1, 3, 1024, 1026, 1030

#### Outdoor Motion Sensor
- **Models:** SML002, SML004
- **Capabilities:** alarm_motion, measure_temperature, measure_luminance, alarm_battery
- **Battery:** AAA
- **Driver ID:** `motion_sensor_outdoor_battery`
- **Clusters:** 0, 1, 3, 1024, 1026, 1030

---

## 🔧 Technical Specifications

### Common Properties

**Manufacturer:** Signify Netherlands B.V.  
**Alternative Names:** Philips, Philips Hue  
**Protocol:** Zigbee 3.0  
**Power Source:** AC (mains) or Battery  
**Endpoint (lights):** 11  
**Endpoint (sensors):** 2  
**Endpoint (green power):** 242

### Cluster Mappings

| Cluster ID | Name | Usage |
|------------|------|-------|
| 0 | Basic | Device info |
| 1 | Power Configuration | Battery |
| 3 | Identify | Pairing |
| 4 | Groups | Group control |
| 5 | Scenes | Scene control |
| 6 | OnOff | Power control |
| 8 | Level Control | Dimming |
| 768 | Color Control | Color/temp |
| 1024 | Illuminance Measurement | Light sensor |
| 1026 | Temperature Measurement | Temp sensor |
| 1030 | Occupancy Sensing | Motion |
| 4096 | Touchlink | Commissioning |

---

## 📦 Driver Structure

### Lighting Driver Template

```
drivers/bulb_white_color_ac/
├── driver.compose.json      (Zigbee config)
├── device.js                (Device logic)
├── driver.js                (Driver class)
├── pair/
│   └── interview.svg        (Pairing image)
└── assets/
    ├── small.png            (75x75)
    ├── large.png            (500x500)
    └── xlarge.png           (1000x1000)
```

### Key Features Per Driver

✅ **Auto-detection** of available features  
✅ **Graceful degradation** if clusters missing  
✅ **Multilingual** support (EN/FR/NL/DE)  
✅ **Professional images** (SDK3 compliant)  
✅ **Settings** for behavior customization  
✅ **Flow cards** for automation

---

## 🎯 Implementation Priority

### Phase 1: HIGH PRIORITY ✅
1. ✅ smart_plug_dimmer_ac (DONE)
2. 🔄 bulb_white_color_ac
3. 🔄 bulb_white_ambiance_ac
4. 🔄 motion_sensor_indoor_battery

### Phase 2: MEDIUM PRIORITY
5. bulb_white_ac
6. led_strip_color_ac
7. spot_gu10_ac
8. wireless_dimmer_switch_cr2450

### Phase 3: LOWER PRIORITY
9. ceiling_light_ambiance_ac
10. outdoor_wall_light_ac
11. outdoor_spot_ac
12. wireless_smart_button_cr2450
13. motion_sensor_outdoor_battery
14. wireless_tap_switch

---

## 📚 Resources

### Johan Bendz Repository
- **URL:** https://github.com/JohanBendz/com.philips.hue.zigbee
- **License:** Check repository
- **Contributors:** 16+
- **Stars:** Active community

### Philips Hue Technical
- **Official Site:** https://www.philips-hue.com/
- **Manufacturer:** Signify Netherlands B.V.
- **Protocol:** Zigbee 3.0
- **Documentation:** Available via Signify

### Homey Resources
- **SDK3:** https://apps-sdk-v3.developer.homey.app/
- **Zigbee Clusters:** Standard ZCL library
- **Community:** Homey Community Forum

---

## 🔄 Differences from Original

### UNBRANDED Approach

| Aspect | Johan Bendz | Our Approach |
|--------|-------------|--------------|
| **Name** | "Philips Hue" | "Smart Lighting" |
| **Organization** | By brand | By function |
| **Driver names** | Hue-specific | Generic |
| **Focus** | Brand identity | Device function |
| **User experience** | Brand selection | Function selection |

### Advantages UNBRANDED

✅ **Universal compatibility** - Works with similar devices  
✅ **Clear function** - Users know what device does  
✅ **No brand confusion** - Simple categorization  
✅ **Easier to find** - Search by function  
✅ **Future-proof** - New brands easy to add

---

## ✅ Validation Status

### Created
- ✅ smart_plug_dimmer_ac

### Analysis Complete
- ✅ All 100+ Philips Hue devices identified
- ✅ Categorization strategy defined
- ✅ Technical specs documented
- ✅ Priority order established

### Next Steps
1. Create Phase 1 drivers
2. Test with real devices
3. Community feedback
4. Iterate and improve

---

## 🙏 Acknowledgments

**Huge thanks to:**
- **Johan Bendz** - Excellent Philips Hue Zigbee work
- **Sebastian Johansson** - Original app creator
- **Community contributors** - 16+ developers
- **Ian_Gibbo** - Community request that started this

**This integration follows the UNBRANDED principles while respecting and building upon Johan Bendz's excellent foundation.**

---

*Documentation created: 2025-10-12*  
*Integration: Universal Tuya Zigbee v2.15.25+*  
*Approach: UNBRANDED by function*
