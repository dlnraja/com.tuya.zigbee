# Tuya Cloud App (com.tuya2) - Feature Analysis & Inspiration

**Source:** https://homey.app/en-us/app/com.tuya2/Tuya/
**GitHub:** https://github.com/Drenso/com.tuya2
**Version:** 1.2.2

##  Key Features to Implement

### Priority 1: Generic DP Triggers (MUST HAVE)
The Tuya Cloud app has powerful **generic status triggers** that work with ANY Tuya DP:

```json
{
  "id": "receive_status_boolean",
  "title": "Receive a Tuya Status (Boolean)",
  "titleFormatted": "Status [[code]] gets a new Boolean value",
  "args": [
    { "name": "device", "type": "device" },
    { "name": "code", "type": "autocomplete" }  // DP code autocomplete!
  ],
  "tokens": [
    { "name": "value", "type": "boolean" }
  ]
}
```

**Types supported:**
- `receive_status_boolean` - Boolean values
- `receive_status_number` - Numeric values
- `receive_status_string` - String values
- `receive_status_json` - JSON objects

### Priority 2: Generic DP Actions (MUST HAVE)
Actions to **send any Tuya command** to any DP:

```json
{
  "id": "send_command",
  "title": "Send Tuya Command",
  "titleFormatted": "Set [[code]] to [[value]]",
  "args": [
    { "name": "device", "type": "device" },
    { "name": "code", "type": "autocomplete" },
    { "name": "value", "type": "text" }
  ]
}
```

---

##  Complete Flow Cards Comparison

### TRIGGERS - Tuya Cloud App Has:

| Flow Card | Our App | Status |
|-----------|---------|--------|
| Receive Tuya Status (Boolean/Number/String/JSON) |  | **TO ADD** |
| Button pressed/clicked/double-clicked with switch selector |  | Have |
| Button knob turned (clockwise/counterclockwise) |  | TO ADD |
| Camera crying child detected |  | N/A (cloud only) |
| Camera pet detected |  | N/A (cloud only) |
| Camera sound detected |  | N/A (cloud only) |
| Doorbell rang |  | TO ADD (if Zigbee doorbell exists) |
| Fan light turned on/off |  | TO ADD |
| Irrigator rain detected |  | TO ADD |
| Light switch LED on/off |  | TO ADD |

### TRIGGERS - Our App Already Has (BETTER):

| Flow Card | Description |
|-----------|-------------|
| Button pressed/double/long/multi |  Complete |
| Button released / released after long |  Advanced |
| Button pressed X times |  Specific count |
| Contact changed |  |
| Device offline |  Unique! |
| Motion with lux condition |  Advanced! |
| No motion timeout |  Advanced! |
| Power above/below threshold |  Energy monitoring |
| Daily energy exceeded |  |

### ACTIONS - Tuya Cloud App Has:

| Flow Card | Our App | Status |
|-----------|---------|--------|
| Send Tuya Command (generic DP) |  | **TO ADD** |
| Camera motion/sound/pet detection switch |  | N/A |
| Camera night mode |  | N/A |
| Camera PTZ control |  | N/A |
| Child lock (circuit breaker) |  | TO ADD |
| Infrared remote press button |  | N/A (cloud) |
| Light standby light |  | TO ADD |
| Sensor sensitivity |  | TO ADD |

---

##  Device Types Comparison

### Tuya Cloud App Drivers:
- airco, button, camera, circuit_breaker, dehumidifier, dimmer, doorbell
- fan, garage_door, heater, humidifier, irrigator, light, other
- sensor_climate, sensor_co2, sensor_contact, sensor_gas, sensor_human
- sensor_motion, sensor_pm2.5, sensor_smoke, sensor_vibration
- siren, socket, thermostat, window_coverings

### Our App Has (164+ drivers):
-  All sensor types (climate, motion, presence, contact, smoke, gas, water, vibration)
-  All switch types (1-6 gang)
-  All plug/socket types
-  All light types (dimmer, RGB, color temp)
-  Covers/curtains/blinds
-  Thermostats/TRV
-  Buttons (1-8 button, scene switches)
-  Sirens/alarms
-  Air quality (PM2.5, CO2, VOC, formaldehyde)
-  Missing: Camera (cloud only), Infrared Remote, Irrigator, Humidifier/Dehumidifier

---

##  Settings Comparison

### Tuya Cloud App Settings:
- Device Specification label
- Motion switch/tracking
- Sound detection switch
- Brightness min/max per channel
- LED type (LED, incandescent, halogen)
- Alarm settings (volume, timeout, muffling, ringtone, brightness)
- Humidifier modes (auto, health, baby, sleep)
- Spray level (1-10)

### Our App Settings (BETTER):
-  Temperature/humidity calibration
-  Power reporting intervals
-  LED indicator settings
-  Power-on behavior
-  Time sync settings (LCD devices)
-  Zigbee-specific settings (manufacturer info)

---

##  Implementation Plan

### Phase 1: Generic DP Flow Cards (HIGH PRIORITY)
1. Add `receive_dp_value` trigger with autocomplete for DP codes
2. Add `send_dp_command` action with autocomplete for DP codes
3. Support Boolean, Number, String, Enum types

### Phase 2: Device-Specific Enhancements
1. Knob rotation support for rotary buttons
2. Fan light control (separate on/off for fan vs light)
3. Child lock action for circuit breakers
4. Sensor sensitivity settings

### Phase 3: New Device Types (if Zigbee versions exist)
1. Irrigator/watering controller
2. Humidifier/dehumidifier
3. Doorbell (Zigbee)

---

##  Key Takeaways

### What Tuya Cloud Does Better:
1. **Generic DP access** - Users can trigger/action ANY DP code
2. **Autocomplete for DP codes** - Easy to discover available DPs
3. **Multiple value types** - Boolean, Number, String, JSON triggers

### What Our App Does Better:
1. **100% LOCAL** - No cloud dependency!
2. **More device support** - 164+ drivers vs ~25
3. **Advanced motion triggers** - Lux conditions, timeouts
4. **Power monitoring triggers** - Threshold & duration based
5. **Device offline detection** - Unique feature!
6. **Zigbee-native** - Direct communication, faster, more reliable

### Conclusion:
The **generic DP triggers/actions** are the most valuable feature to add.
This would give advanced users full control over ANY Tuya DP without
needing driver updates for new features.
