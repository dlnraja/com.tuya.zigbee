# 📋 FLOW CARDS IMPLEMENTATION GUIDE

**Version**: v4.9.160
**Date**: 29 October 2025

---

## 🎯 OVERVIEW

This app now includes **58 triggers**, **13 conditions**, and **12 actions** = **83 flow cards total**.

All flow cards are **fully implemented** with handlers in `FlowCardManager.js`.

---

## 📊 FLOW CARDS BREAKDOWN

### ✅ TRIGGERS (58 total)

#### Battery & Power (4)
- `battery_low` - Battery drops below low threshold (20%)
- `battery_critical` - Battery drops below critical threshold (10%)
- `battery_charged` - Battery reaches 100%
- `power_source_changed` - Device switches between AC/Battery

#### Buttons (40+)
- `button_wireless_1_button_pressed` - Single button pressed
- `button_wireless_2_button_1_pressed` - Multi-button (2-gang)
- `button_wireless_3_button_1_pressed` - Multi-button (3-gang)
- `button_wireless_4_button_1_pressed` - Multi-button (4-gang)
- `button_wireless_6_button_1_pressed` - Multi-button (6-gang)
- `button_wireless_8_button_1_pressed` - Multi-button (8-gang)
- And all variations (button 1-8 for each gang)

#### USB Outlets (10+)
- `usb_outlet_1gang_turned_on` - 1-gang outlet on
- `usb_outlet_1gang_turned_off` - 1-gang outlet off
- `usb_outlet_2port_port1_turned_on` - 2-port port 1 on
- `usb_outlet_3gang_port1_turned_on` - 3-gang port 1 on
- And all variations

#### NEW Triggers (+13)
- `button_released` - Button released (with duration token)
- `temperature_changed` - Temperature changed (current, previous, change tokens)
- `humidity_changed` - Humidity changed (current, previous, change tokens)
- `motion_started` - Motion detected
- `motion_stopped` - Motion stopped (with duration token)
- `presence_changed` - Presence state changed
- `contact_opened` - Contact/door opened
- `contact_closed` - Contact/door closed
- `alarm_triggered` - Alarm triggered (with type token)
- `device_online` - Device came online
- `device_offline` - Device went offline
- `target_temperature_reached` - Target temperature reached

---

### ✅ CONDITIONS (13 total)

#### Power & Battery (3)
- `is_battery_powered` - Check if device is battery powered
- `is_ac_powered` - Check if device is AC powered
- `battery_below_threshold` - Check if battery below X%

#### NEW Conditions (+10)
- `temperature_above` - Temperature above X°C
- `temperature_below` - Temperature below X°C
- `humidity_above` - Humidity above X%
- `humidity_below` - Humidity below X%
- `battery_below` - Battery below X%
- `is_online` - Device is online/reachable
- `has_motion` - Motion is currently detected
- `is_open` - Contact/door is open
- `is_closed` - Contact/door is closed
- `alarm_active` - Any alarm is currently active

---

### ✅ ACTIONS (12 total)

#### Battery & Power (2)
- `request_battery_update` - Force battery status update
- `set_energy_mode` - Set energy mode (performance/balanced/power_saving)

#### NEW Actions (+10)
- `set_brightness` - Set brightness to X% (for lights)
- `dim_by` - Dim by X%
- `brighten_by` - Brighten by X%
- `set_color_temperature` - Set color temperature (2700-6500K)
- `set_target_temperature` - Set target temperature
- `increase_temperature` - Increase temperature by X°C
- `decrease_temperature` - Decrease temperature by X°C
- `identify_device` - Blink device LED (identify)
- `reset_device` - Soft reset device
- `send_custom_command` - Send custom Zigbee command

---

## 🔧 IMPLEMENTATION

### 1. FlowCardManager.js

Located at: `lib/FlowCardManager.js`

**Registers ALL flow cards** at app startup:

```javascript
// In app.js
const FlowCardManager = require('./lib/FlowCardManager');

class UniversalTuyaZigbeeApp extends Homey.App {
  async onInit() {
    // Register ALL flow cards
    this.flowCardManager = new FlowCardManager(this.homey);
    this.flowCardManager.registerAll();
  }
}
```

**Methods**:
- `registerAll()` - Register all flow cards
- `registerNewTriggers()` - Register +13 new triggers
- `registerNewConditions()` - Register +10 new conditions
- `registerNewActions()` - Register +10 new actions
- `registerMotionSensorCards()` - Legacy motion cards
- `registerSmartPlugCards()` - Legacy plug cards
- `registerButtonCards()` - Legacy button cards
- `registerTemperatureSensorCards()` - Legacy temp cards
- `registerDeviceHealthCards()` - Legacy health cards

---

### 2. FlowTriggerHelpers.js

Located at: `lib/FlowTriggerHelpers.js`

**Helper class** to easily trigger flow cards from devices:

```javascript
// In BaseHybridDevice.js
const FlowTriggerHelpers = require('./FlowTriggerHelpers');

class BaseHybridDevice extends ZigBeeDevice {
  constructor() {
    this.flowTriggers = new FlowTriggerHelpers(this);
  }
}
```

**Usage Examples**:

```javascript
// Trigger button released
await this.flowTriggers.triggerButtonReleased(2.5); // 2.5 seconds

// Trigger temperature changed
await this.flowTriggers.triggerTemperatureChanged(23.5, 22.0);

// Trigger humidity changed
await this.flowTriggers.triggerHumidityChanged(65, 60);

// Trigger battery low
await this.flowTriggers.triggerBatteryLow(15, 2.8);

// Trigger motion started
await this.flowTriggers.triggerMotionStarted();

// Trigger motion stopped
await this.flowTriggers.triggerMotionStopped(300); // 5 minutes

// Trigger contact opened
await this.flowTriggers.triggerContactOpened(3600); // was closed 1h

// Trigger alarm
await this.flowTriggers.triggerAlarmTriggered('motion');

// Trigger device online/offline
await this.flowTriggers.triggerDeviceOnline(600); // was offline 10min
await this.flowTriggers.triggerDeviceOffline();
```

---

### 3. BaseHybridDevice.js

Located at: `lib/BaseHybridDevice.js`

**Automatically triggers** flow cards when capabilities change:

#### Battery Monitoring
```javascript
async monitorBatteryThresholds(batteryLevel) {
  const lowThreshold = 20;
  const criticalThreshold = 10;
  
  if (batteryLevel <= lowThreshold) {
    // Auto-trigger battery_low
    await this.flowTriggers.triggerBatteryLow(batteryLevel);
  }
}
```

**Triggered automatically** when:
- Battery percentage changes
- Temperature changes (via capability listener)
- Humidity changes (via capability listener)
- Motion detected/stopped (via IAS zone)
- Contact opened/closed (via IAS zone)

---

## 📝 DEVICE-SPECIFIC IMPLEMENTATION

### Climate Monitor (TS0601)

**File**: `drivers/climate_monitor_temp_humidity/device.js`

```javascript
// When Tuya DataPoint received
async handleTuyaDataPoints(dataPoints) {
  for (const dp of dataPoints) {
    if (dp.dp === 1) { // Temperature
      const newTemp = dp.value / 10;
      const oldTemp = this.getCapabilityValue('measure_temperature') || 0;
      
      await this.setCapabilityValue('measure_temperature', newTemp);
      
      // TRIGGER: temperature_changed
      if (Math.abs(newTemp - oldTemp) >= 0.5) {
        await this.flowTriggers.triggerTemperatureChanged(newTemp, oldTemp);
      }
    }
    
    if (dp.dp === 2) { // Humidity
      const newHumidity = dp.value;
      const oldHumidity = this.getCapabilityValue('measure_humidity') || 0;
      
      await this.setCapabilityValue('measure_humidity', newHumidity);
      
      // TRIGGER: humidity_changed
      if (Math.abs(newHumidity - oldHumidity) >= 5) {
        await this.flowTriggers.triggerHumidityChanged(newHumidity, oldHumidity);
      }
    }
  }
}
```

---

### Button Devices (Wireless Buttons)

**File**: `drivers/button_wireless_4/device.js` (example)

```javascript
// When button pressed
async handleButtonPress(buttonNumber, pressType) {
  this.log('[BUTTON] Button', buttonNumber, pressType);
  
  // Store press time
  this.buttonPressTime = Date.now();
  
  // Trigger legacy card
  await this.homey.flow.getDeviceTriggerCard(`button_wireless_4_button_${buttonNumber}_pressed`)
    .trigger(this, { button: buttonNumber });
}

// When button released
async handleButtonRelease(buttonNumber) {
  const pressDuration = (Date.now() - this.buttonPressTime) / 1000;
  
  // TRIGGER: button_released (NEW)
  await this.flowTriggers.triggerButtonReleased(pressDuration);
}
```

---

### Motion Sensors

**File**: `drivers/motion_sensor_mmwave/device.js` (example)

```javascript
// When motion detected
async onMotionDetected() {
  await this.setCapabilityValue('alarm_motion', true);
  
  // TRIGGER: motion_started
  await this.flowTriggers.triggerMotionStarted();
  
  // Store motion start time
  this.motionStartTime = Date.now();
}

// When motion stopped
async onMotionCleared() {
  await this.setCapabilityValue('alarm_motion', false);
  
  const motionDuration = (Date.now() - this.motionStartTime) / 1000;
  
  // TRIGGER: motion_stopped
  await this.flowTriggers.triggerMotionStopped(motionDuration);
}
```

---

### Contact Sensors

**File**: `drivers/contact_sensor/device.js` (example)

```javascript
// When contact opened
async onContactOpened() {
  await this.setCapabilityValue('alarm_contact', true);
  
  const closedDuration = (Date.now() - this.lastClosedTime) / 1000;
  
  // TRIGGER: contact_opened
  await this.flowTriggers.triggerContactOpened(closedDuration);
}

// When contact closed
async onContactClosed() {
  await this.setCapabilityValue('alarm_contact', false);
  
  const openDuration = (Date.now() - this.lastOpenTime) / 1000;
  
  // TRIGGER: contact_closed
  await this.flowTriggers.triggerContactClosed(openDuration);
  
  this.lastClosedTime = Date.now();
}
```

---

## 🧪 TESTING

### Test Triggers

```javascript
// In device settings or diagnostics
await this.flowTriggers.triggerTemperatureChanged(25.0, 24.0);
await this.flowTriggers.triggerBatteryLow(15);
await this.flowTriggers.triggerMotionStarted();
```

### Test Conditions

Use Homey Flow editor:
1. Create flow: WHEN [any trigger]
2. AND: Use one of the 13 conditions
3. THEN: Send notification
4. Test!

### Test Actions

Use Homey Flow editor:
1. Create flow: WHEN [trigger]
2. THEN: Use one of the 12 actions
3. Verify device responds

---

## 📊 STATUS

✅ **ALL FLOW CARDS IMPLEMENTED**

| Type | Count | Status |
|------|-------|--------|
| Triggers | 58 | ✅ All registered |
| Conditions | 13 | ✅ All registered |
| Actions | 12 | ✅ All registered |
| **TOTAL** | **83** | ✅ **100%** |

---

## 🚀 DEPLOYMENT

**Version**: v4.9.160

**Files Modified**:
- `lib/FlowCardManager.js` - Updated with +33 handlers
- `lib/FlowTriggerHelpers.js` - NEW helper class
- `lib/BaseHybridDevice.js` - Integrated FlowTriggerHelpers
- `app.js` - Integrated FlowCardManager
- `flow/triggers.json` - 58 triggers
- `flow/conditions.json` - 13 conditions
- `flow/actions.json` - 12 actions

**Ready for production!** 🎉

---

## 📚 REFERENCES

- Homey SDK3 Flow Cards: https://apps-sdk-v3.developer.homey.app/tutorial-flow-cards.html
- Best practices from: gruijter/zigbee2mqtt, JohanBendz/Philips Hue Zigbee
- Documentation: `docs/BEST_PRACTICES_FROM_TOP_APPS.md`

---

**END OF IMPLEMENTATION GUIDE**
