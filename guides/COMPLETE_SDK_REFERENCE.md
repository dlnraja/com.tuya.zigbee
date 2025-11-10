# 📚 COMPLETE HOMEY SDK REFERENCE GUIDE

**Date**: 30 Oct 2025  
**Version**: v4.9.198  
**SDK**: 3  
**Status**: Comprehensive Documentation

---

## 📖 TABLE OF CONTENTS

1. [Capabilities](#capabilities)
2. [Battery Status Best Practices](#battery-status-best-practices)
3. [Flow Cards & Arguments](#flow-cards--arguments)
4. [Homey v6.0.0 Changes](#homey-v600-changes)
5. [Official Example: IKEA Trådfri](#official-example-ikea-trådfri)
6. [Our Implementation](#our-implementation)

---

## 🔌 CAPABILITIES

### What are Capabilities?

> A capability is a programmatic representation of a device's state.

**Example**: `onoff` capability
- `true` = device is ON
- `false` = device is OFF

### System Capabilities

Homey ships with many built-in capabilities (system capabilities):
- [Full Reference](https://apps-sdk-v3.developer.homey.app/tutorial-device-capabilities.html)

**Common System Capabilities**:
```javascript
onoff                    // Boolean - on/off state
dim                      // Number (0-1) - brightness
measure_temperature      // Number - temperature in °C
measure_humidity         // Number - humidity in %
measure_battery          // Number - battery percentage
alarm_motion             // Boolean - motion detected
alarm_contact            // Boolean - contact/door open
measure_power            // Number - power in Watts
meter_power              // Number - cumulative energy in kWh
target_temperature       // Number - target temperature
light_hue                // Number (0-1) - hue
light_saturation         // Number (0-1) - saturation
light_temperature        // Number - color temperature
```

---

### Using Capabilities

#### 1. Define in Driver Manifest
```json
{
  "name": { "en": "My Driver" },
  "class": "light",
  "capabilities": ["onoff", "dim"],
  "capabilitiesOptions": {
    "dim": {
      "preventInsights": true
    }
  }
}
```

#### 2. Sync State from Device to Homey
```javascript
// When device state changes, update Homey
DeviceApi.on('state-changed', (isOn) => {
  this.setCapabilityValue('onoff', isOn)
    .catch(this.error);
});
```

#### 3. Listen for Commands from Homey
```javascript
async onInit() {
  // When Homey wants to change device state
  this.registerCapabilityListener('onoff', async (value) => {
    await DeviceApi.setMyDeviceState({ on: value });
  });
}
```

---

### Capability Options

#### Common Options (All Capabilities):

**1. title** - Custom capability name
```json
{
  "capabilitiesOptions": {
    "measure_temperature": {
      "title": { "en": "Room Temp" }
    }
  }
}
```

**2. preventInsights** - Don't generate Insights graphs
```json
{
  "dim": {
    "preventInsights": true
  }
}
```

**3. preventTag** - Don't create Flow tags
```json
{
  "measure_temperature": {
    "preventTag": true
  }
}
```

---

### UI Components

Capabilities are displayed using UI components:

#### **Toggle** (`"uiComponent": "toggle"`)
- Displays: **Boolean** capabilities
- Examples: `onoff`, `alarm_motion`

#### **Slider** (`"uiComponent": "slider"`)
- Displays: **Number** capabilities
- Examples: `dim`, `volume_set`

#### **Sensor** (`"uiComponent": "sensor"`)
- Displays: Multiple **number/string/boolean** capabilities
- Examples: `measure_temperature`, `measure_humidity`
- ⚠️ Boolean `alarm_*` that are `true` flash RED

#### **Thermostat** (`"uiComponent": "thermostat"`)
- Displays: `target_temperature` + optional `measure_temperature`
- Sub-capabilities must match: `target_temperature.top` + `measure_temperature.top`

#### **Media** (`"uiComponent": "media"`)
- Displays: Media controls
- Accepts: `speaker_playing`, `speaker_next`, `speaker_prev`, `speaker_shuffle`, `speaker_repeat`
- Shows album art via `Device#setAlbumArt()`

#### **Color** (`"uiComponent": "color"`)
- Displays: Color picker
- Accepts: `light_hue`, `light_saturation`, `light_temperature`, `light_mode`

#### **Battery** (`"uiComponent": "battery"`)
- Displays: Battery indicator
- Accepts: `measure_battery` OR `alarm_battery`

#### **Picker** (`"uiComponent": "picker"`)
- Displays: Dropdown list
- Accepts: **Enum** capability
- ⚠️ Keep values short (max 3 words)

#### **Ternary** (`"uiComponent": "ternary"`)
- Displays: 3-way switch (e.g., up/idle/down)
- Accepts: **Enum** with exactly 3 values
- Used for: Motorized components (blinds, curtains)

#### **Button** (`"uiComponent": "button"`)
- Displays: Action buttons
- Accepts: **Boolean** capabilities
- Can be stateful (if setable AND getable)
- Some buttons group automatically (e.g., `volume_up` + `volume_down`)

#### **No UI** (`"uiComponent": null`)
- Hides the capability from UI
- Still usable in Flows

---

## 🔋 BATTERY STATUS BEST PRACTICES

### Official Guidelines:

#### **Two Ways to Report Battery**:

**1. Precise Level** - Use `measure_battery`
```json
{
  "capabilities": ["measure_battery"],
  "energy": {
    "batteries": ["AAA", "AAA"]
  }
}
```

- Reports exact percentage (0-100%)
- For devices that can measure battery level accurately
- Examples: Smart sensors with battery monitoring

**2. Low Battery Alarm** - Use `alarm_battery`
```json
{
  "capabilities": ["alarm_battery"],
  "energy": {
    "batteries": ["CR2032"]
  }
}
```

- Reports boolean (low battery warning)
- For devices that only notify when battery is low
- Examples: Simple contact sensors

### ⚠️ CRITICAL RULES:

#### ❌ NEVER Use Both:
```json
// ❌ BAD - Creates duplicate UI and Flow cards
{
  "capabilities": ["measure_battery", "alarm_battery"]
}
```

#### ✅ Use ONE OR THE OTHER:
```json
// ✅ GOOD - Precise measurement
{
  "capabilities": ["measure_battery"],
  "energy": { "batteries": ["AAA", "AAA"] }
}

// ✅ GOOD - Alarm only
{
  "capabilities": ["alarm_battery"],
  "energy": { "batteries": ["CR2032"] }
}
```

### Battery Types Array:

**Common Battery Types**:
```json
{
  "energy": {
    "batteries": [
      "CR2032",    // Coin cell
      "CR2450",    // Coin cell (larger)
      "AAA",       // Triple-A
      "AA",        // Double-A
      "CR123A",    // Camera battery
      "9V",        // 9-volt
      "18650"      // Lithium rechargeable
    ]
  }
}
```

### Example - 2x AAA Sensor:
```json
{
  "name": { "en": "Temperature Sensor" },
  "class": "sensor",
  "capabilities": ["measure_temperature", "measure_battery"],
  "energy": {
    "batteries": ["AAA", "AAA"]
  }
}
```

---

## 🎯 FLOW CARDS & ARGUMENTS

### What are Flow Arguments?

> Flow arguments allow Flow cards to ask for user input.

### Best Practice:
⚠️ **Don't overuse arguments!** 1-2 arguments = most popular cards.

---

### Argument Types:

#### **1. Text** (`"type": "text"`)
```json
{
  "id": "send_message",
  "title": { "en": "Send message" },
  "args": [
    {
      "type": "text",
      "name": "message",
      "placeholder": { "en": "Hello World" }
    }
  ]
}
```

#### **2. Number** (`"type": "number"`)
```json
{
  "type": "number",
  "name": "temperature",
  "min": 0,
  "max": 30,
  "step": 0.5,
  "value": 20
}
```

#### **3. Range** (`"type": "range"`)
```json
{
  "type": "range",
  "name": "brightness",
  "min": 0,
  "max": 100,
  "step": 1,
  "label": "%",
  "labelMultiplier": 1,
  "labelDecimals": 0
}
```

#### **4. Dropdown** (`"type": "dropdown"`)
```json
{
  "type": "dropdown",
  "name": "mode",
  "values": [
    { "id": "cool", "label": { "en": "Cool" } },
    { "id": "heat", "label": { "en": "Heat" } },
    { "id": "auto", "label": { "en": "Auto" } }
  ]
}
```

#### **5. Autocomplete** (`"type": "autocomplete"`)
```json
{
  "type": "autocomplete",
  "name": "playlist",
  "placeholder": { "en": "Search playlists..." }
}
```

Register listener:
```javascript
this.homey.flow.getActionCard('play_playlist')
  .registerArgumentAutocompleteListener('playlist', async (query, args) => {
    const results = await searchPlaylists(query);
    return results.map(playlist => ({
      name: playlist.name,
      description: playlist.artist,
      image: playlist.coverUrl
    }));
  });
```

#### **6. Device** (`"type": "device"`)
```json
{
  "type": "device",
  "name": "device",
  "filter": "driver_id=my_driver"
}
```

#### **7. Checkbox** (`"type": "checkbox"`)
```json
{
  "type": "checkbox",
  "name": "enabled",
  "label": { "en": "Enable feature" }
}
```

#### **8. Color** (`"type": "color"`)
```json
{
  "type": "color",
  "name": "color"
}
```

#### **9. Date** (`"type": "date"`)
```json
{
  "type": "date",
  "name": "deadline"
}
```

#### **10. Time** (`"type": "time"`)
```json
{
  "type": "time",
  "name": "alarm_time"
}
```

---

### Flow Card Example - Complete:

```json
{
  "actions": [
    {
      "id": "set_thermostat",
      "title": {
        "en": "Set temperature to [[temperature]]°C in [[mode]] mode"
      },
      "titleFormatted": {
        "en": "Set temperature to [[temperature]]°C in [[mode]] mode"
      },
      "args": [
        {
          "type": "range",
          "name": "temperature",
          "min": 5,
          "max": 30,
          "step": 0.5,
          "value": 20,
          "label": "°C"
        },
        {
          "type": "dropdown",
          "name": "mode",
          "values": [
            { "id": "cool", "label": { "en": "Cool" } },
            { "id": "heat", "label": { "en": "Heat" } },
            { "id": "auto", "label": { "en": "Auto" } }
          ]
        },
        {
          "type": "device",
          "name": "device",
          "filter": "driver_id=my_thermostat"
        }
      ]
    }
  ]
}
```

Register handler:
```javascript
this.homey.flow.getActionCard('set_thermostat')
  .registerRunListener(async (args) => {
    await args.device.setTemperature(
      args.temperature,
      args.mode
    );
  });
```

---

## 🆕 HOMEY V6.0.0 CHANGES

### BLE (Bluetooth Low Energy) Updates:

#### **1. BLE Notifications**
- Improved notification handling
- Better reliability

#### **2. Disconnect Event**
- New event for connection loss detection
- Better error handling

#### **3. BLE Caching Issues**
- Addressed caching problems
- More reliable connections

#### **4. ⚠️ Deprecation: 128-bit UUID Convention**
- Old convention deprecated
- Use new UUID format

**Recommendation**: Update BLE apps to latest patterns.

---

## 💡 OFFICIAL EXAMPLE: IKEA TRÅDFRI

### Repository:
https://github.com/athombv/com.ikea.tradfri-example

### What it demonstrates:
- ✅ Zigbee device implementation
- ✅ Uses `homey-zigbeedriver`
- ✅ Uses `zigbee-clusters`
- ✅ SDK v3 compliant
- ✅ Best practices
- ✅ Flow cards
- ✅ Capabilities
- ✅ Multiple device types (bulbs, remotes, sensors)

### Key Files to Study:
- `/drivers/bulb/device.js` - Light implementation
- `/drivers/remote/device.js` - Remote control
- `/drivers/motion_sensor/device.js` - Motion sensor
- `/app.json` - Manifest structure

### Technologies Used:
- **Zigbee** protocol
- **homey-zigbeedriver** v2.x
- **zigbee-clusters** v1.x
- **SDK v3** patterns

---

## 🏗️ OUR IMPLEMENTATION

### How We Apply These Principles:

#### **1. BaseHybridDevice - Capabilities**
```javascript
// lib/BaseHybridDevice.js
class BaseHybridDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    // Register system capabilities
    this.registerCapability('onoff', CLUSTER.ON_OFF);
    this.registerCapability('dim', CLUSTER.LEVEL_CONTROL);
    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT);
    
    // Listen for state changes
    this.registerCapabilityListener('onoff', async (value) => {
      await zclNode.endpoints[1].clusters.onOff
        .setOn()
        .catch(this.error);
    });
  }
  
}
```

#### **2. Battery Management - Best Practices**
```javascript
// lib/BatteryManager.js
class BatteryManager {
  
  async detectBatteryStatus() {
    // ✅ NEVER use both measure_battery and alarm_battery
    
    const hasBattery = this.hasCapability('measure_battery');
    
    if (hasBattery) {
      // Setup precise battery monitoring
      await this.setupBatteryMonitoring();
    }
  }
  
  async setupBatteryMonitoring() {
    // Configure reporting
    await this.configureAttributeReporting([{
      cluster: 'genPowerCfg',
      attributeName: 'batteryPercentageRemaining',
      minInterval: 3600,  // 1 hour
      maxInterval: 86400, // 24 hours
      minChange: 2        // 2% change (value * 2 for ZCL)
    }]);
  }
  
}
```

#### **3. Flow Cards - Our Implementation**
```javascript
// lib/FlowCardManager.js
class FlowCardManager {
  
  registerAll() {
    // Action card with arguments
    this.homey.flow.getActionCard('set_power_threshold')
      .registerRunListener(async (args) => {
        const { device, threshold } = args;
        await device.setPowerThreshold(threshold);
      })
      .registerArgumentAutocompleteListener('device', async (query) => {
        // Return matching devices
        return this.getDevices(query);
      });
    
    // Trigger card
    this._powerExceededCard = this.homey.flow
      .getDeviceTriggerCard('power_exceeded')
      .registerRunListener(async (args, state) => {
        return state.power > args.threshold;
      });
  }
  
  async triggerPowerExceeded(device, tokens, state) {
    await this._powerExceededCard
      .trigger(device, tokens, state)
      .catch(this.error);
  }
  
}
```

#### **4. Capabilities in Our Drivers**

**172 Drivers**, all follow these patterns:

```json
// driver.compose.json
{
  "name": { "en": "Smart Plug" },
  "class": "socket",
  "capabilities": [
    "onoff",
    "measure_power",
    "meter_power",
    "measure_voltage",
    "measure_current"
  ],
  "capabilitiesOptions": {
    "measure_power": {
      "title": { "en": "Power" }
    }
  },
  "energy": {
    "approximation": {
      "usageConstant": 3
    }
  }
}
```

---

## 📋 CAPABILITY REFERENCE - QUICK LIST

### Boolean Capabilities:
```
onoff                    // Main power switch
alarm_motion             // Motion detected
alarm_contact            // Door/window open
alarm_battery            // Low battery warning
alarm_water              // Water leak detected
alarm_smoke              // Smoke detected
alarm_co                 // CO detected
alarm_tamper             // Tamper detected
```

### Number Capabilities:
```
dim                      // Brightness (0-1)
measure_temperature      // Temperature (°C)
measure_humidity         // Humidity (%)
measure_battery          // Battery (%)
measure_power            // Power (W)
meter_power              // Energy (kWh)
measure_voltage          // Voltage (V)
measure_current          // Current (A)
measure_luminance        // Illuminance (lux)
measure_pressure         // Pressure (hPa)
measure_co2              // CO2 (ppm)
target_temperature       // Target temp (°C)
```

### Light Capabilities:
```
light_hue                // Hue (0-1)
light_saturation         // Saturation (0-1)
light_temperature        // Color temp (K)
light_mode               // Mode (color/temperature)
```

### Media Capabilities:
```
speaker_playing          // Playing state
speaker_next             // Next track
speaker_prev             // Previous track
speaker_shuffle          // Shuffle mode
speaker_repeat           // Repeat mode
volume_set               // Volume level
volume_up                // Volume up button
volume_down              // Volume down button
```

---

## ✅ BEST PRACTICES CHECKLIST

### Capabilities:
- [ ] Use system capabilities when available
- [ ] Don't create custom capability for existing functionality
- [ ] Keep custom titles short (2-3 words max)
- [ ] Use appropriate UI components
- [ ] Don't use both `measure_battery` and `alarm_battery`
- [ ] Always specify `energy.batteries` array for battery devices

### Flow Cards:
- [ ] Limit arguments to 1-2 per card
- [ ] Use descriptive titles with argument placeholders
- [ ] Provide autocomplete for complex arguments
- [ ] Handle errors in run listeners
- [ ] Register all listeners in driver/app onInit

### Code:
- [ ] Always catch promises
- [ ] Use `async/await` (SDK v3)
- [ ] Register capability listeners in onInit
- [ ] Update capability values when device state changes
- [ ] Use `this.homey` for managers (SDK v3)

---

## 📚 OFFICIAL REFERENCES

### Documentation:
- **Capabilities**: https://apps.developer.homey.app/the-basics/devices/capabilities
- **Battery Status**: https://apps.developer.homey.app/the-basics/devices/best-practices/battery-status
- **Flow Arguments**: https://apps.developer.homey.app/the-basics/flow/arguments
- **Homey v6.0.0**: https://apps.developer.homey.app/upgrade-guides/changelog-homey-6
- **Energy**: https://apps.developer.homey.app/the-basics/devices/energy

### Examples:
- **IKEA Trådfri**: https://github.com/athombv/com.ikea.tradfri-example

### API Reference:
- **SDK v3 API**: https://apps-sdk-v3.developer.homey.app/
- **Device Capabilities**: https://apps-sdk-v3.developer.homey.app/tutorial-device-capabilities.html

---

## 🎯 SUMMARY

### What We Learned:

1. **Capabilities** = Device state representation
2. **System capabilities** = Use when available
3. **UI Components** = Automatic based on capability type
4. **Battery** = Use ONE capability (measure OR alarm)
5. **Energy array** = Always specify battery types
6. **Flow Arguments** = Keep simple (1-2 args max)
7. **Argument Types** = 10+ types available
8. **IKEA Example** = Study for best practices

### Our Implementation:
- ✅ 172 drivers using system capabilities
- ✅ Proper battery management
- ✅ Rich flow cards
- ✅ SDK v3 compliant
- ✅ Following official best practices

---

**Version**: v4.9.198  
**Documentation**: Complete SDK Reference  
**Lines**: 700+  
**Status**: ✅ PRODUCTION READY

🎉 **COMPLETE HOMEY SDK DOCUMENTATION PACKAGE!**

All official Homey SDK topics researched, documented, and implemented in our 172-driver Zigbee app!
