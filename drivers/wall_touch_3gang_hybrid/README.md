# 🎨 Wall Touch Button 3 Gang - Hybrid Driver Example

## 📖 Overview

This driver demonstrates the **complete power of the BaseHybridDevice architecture**. It's an intelligent 3-button wall switch that automatically adapts between battery and mains power operation.

## 🎯 Key Features

### Intelligent Power Management
- ✅ **Auto-detection** of power source (Battery vs AC Mains)
- ✅ **Dynamic capability management** - Battery icon disappears in AC mode
- ✅ **Seamless transitions** - No user intervention required
- ✅ **Energy configuration** - Adapts automatically to power source

### Multi-Button Control
- 🔘 **3 independent buttons** with individual control
- 🔘 **Combination detection** - Detects multiple button presses
- 🔘 **Toggle or Momentary** modes
- 🔘 **Command or Scene** modes

### Advanced Features
- 🌡️ **Temperature monitoring**
- 🚨 **Tamper detection**
- 📊 **Configurable reporting**
- ⚙️ **User settings** for customization

---

## 🏗️ Architecture

### File Structure

```
drivers/wall_touch_3gang_hybrid/
├── driver.compose.json    # Driver configuration
├── device.js              # Device logic (extends BaseHybridDevice)
├── driver.js              # Driver & flow cards
├── assets/
│   └── images/
│       ├── small.png      # 75x75
│       ├── large.png      # 500x500
│       └── xlarge.png     # 1000x1000
└── README.md              # This file
```

### Class Hierarchy

```
Homey.Device
    ↓
ZigBeeDevice (homey-zigbeedriver)
    ↓
BaseHybridDevice (../../lib/BaseHybridDevice.js)
    ↓
WallTouch3GangHybridDevice (device.js)
```

---

## 🔋 Hybrid Power Management

### How It Works

#### 1. Auto-Detection

```javascript
// BaseHybridDevice automatically detects power source
async detectPowerSource() {
  // Checks Zigbee Power Configuration cluster
  // Reads attribute: mainsPowerSource, batteryVoltage, etc.
  // Sets this.powerType = 'BATTERY' | 'AC' | 'DC'
}
```

#### 2. Dynamic Capabilities

```javascript
// Battery Mode → Shows battery capabilities
if (this.powerType === 'BATTERY') {
  await this.addCapability('measure_battery');
  await this.addCapability('alarm_battery');
  // Removes power capabilities
}

// AC Mode → Shows power capabilities
if (this.powerType === 'AC') {
  await this.removeCapability('measure_battery');
  await this.removeCapability('alarm_battery');
  // Battery icon disappears from UI!
}
```

#### 3. Energy Configuration

```javascript
// Battery Mode
{
  "energy": {
    "batteries": ["CR2032", "CR2032"]
  }
}

// AC Mode
{
  "energy": {
    "approximation": {
      "usageOff": 0.3,
      "usageOn": 2.5
    }
  }
}
```

---

## 🔘 Button Functionality

### 3-Button Control

Each button has independent control:

```javascript
// Capabilities
"onoff.button1"
"onoff.button2"
"onoff.button3"

// Endpoints
Button 1 → Endpoint 1
Button 2 → Endpoint 2
Button 3 → Endpoint 3
```

### Button Modes

#### Toggle Mode (Default)
```javascript
// Button stays ON/OFF when pressed
await device.setCapabilityValue('onoff.button1', true);  // ON
await device.setCapabilityValue('onoff.button1', false); // OFF
```

#### Momentary Mode
```javascript
// Button auto-resets after press
onButtonChanged(button, value) {
  if (switchType === 'momentary') {
    setTimeout(() => {
      this.setCapabilityValue(`onoff.${button}`, false);
    }, 200);
  }
}
```

### Combination Detection

```javascript
// Detects multiple button presses
// Example: Button 1 + Button 2 pressed together
onMultipleButtonPress(valueObj) {
  const pressed = [1, 2]; // Buttons pressed
  this.triggerButtonCombination(pressed);
}
```

---

## 📊 Flow Cards

### Triggers

#### Button Pressed (Generic)
```
WHEN Button [1|2|3] was pressed [on|off]
```

**Tokens:**
- `button` (number) - Which button (1, 2, or 3)
- `state` (string) - State ("on" or "off")

#### Button 1/2/3 Pressed (Specific)
```
WHEN Button 1 pressed
WHEN Button 2 pressed
WHEN Button 3 pressed
```

**Tokens:**
- `state` (string) - State ("on" or "off")

#### Multiple Buttons Pressed
```
WHEN Multiple buttons pressed
```

**Tokens:**
- `buttons` (string) - Comma-separated list ("1,2")
- `count` (number) - Number of buttons pressed

#### Power Source Changed
```
WHEN Power source changed
```

**Tokens:**
- `from` (string) - Previous source ("battery", "ac")
- `to` (string) - New source ("battery", "ac")

**Use Case:** Notify when device switches from battery to mains

#### Tamper Alarm
```
WHEN Tamper alarm triggered
```

**Use Case:** Security notification

### Conditions

#### Is on Battery Power
```
IF Device is on battery power
```

#### Is on Mains Power
```
IF Device is on mains power
```

#### Battery Level Below
```
IF Battery is below [20]%
```

**Arguments:**
- `level` (range 0-100) - Threshold percentage

### Actions

#### Toggle Button
```
THEN Toggle button [1|2|3]
```

**Arguments:**
- `button` (dropdown) - Which button to toggle

#### Set Button State
```
THEN Set button [1|2|3] to [on|off]
```

**Arguments:**
- `button` (dropdown) - Which button
- `state` (dropdown) - Target state

#### Refresh Device
```
THEN Refresh device
```

Re-detects power source and updates capabilities

---

## ⚙️ Settings

### Power Source

**Type:** Dropdown  
**Default:** Auto Detect

```
- Auto Detect (Recommended)
- Battery
- AC Mains
```

**Use Case:** Force specific mode if auto-detection fails

### Switch Type

**Type:** Dropdown  
**Default:** Toggle

```
- Toggle (On/Off) - Button stays in state
- Momentary (Push) - Button auto-resets
```

### Button Mode

**Type:** Dropdown  
**Default:** Command Mode

```
- Command Mode - Controls devices directly
- Scene Mode - Triggers scenes only
```

**Use Case:** 
- Command: Physical control
- Scene: Automation trigger only

### Reporting Interval

**Type:** Number  
**Range:** 60-3600 seconds  
**Default:** 300 (5 minutes)

Controls how often device reports status.

---

## 🎯 Example Flows

### Example 1: Smart Lighting Control

```
WHEN Button 1 pressed (on)
THEN Turn on Living Room Lights

WHEN Button 1 pressed (off)
THEN Turn off Living Room Lights
```

### Example 2: Scene Activation

```
WHEN Multiple buttons pressed
AND Buttons = "1,2"
THEN Activate Movie Mode

WHEN Multiple buttons pressed
AND Buttons = "2,3"
THEN Activate Sleep Mode
```

### Example 3: Battery Alert

```
WHEN Battery is below 20%
AND Device is on battery power
THEN Send notification "Wall Switch battery low"
```

### Example 4: Power Source Monitoring

```
WHEN Power source changed
AND To = "ac"
THEN Send notification "Wall Switch now on mains power"
```

### Example 5: Security

```
WHEN Tamper alarm triggered
THEN Send notification "Wall Switch tamper detected!"
AND Turn on all lights
AND Start recording cameras
```

---

## 🔧 Technical Implementation

### Initialization

```javascript
async onNodeInit() {
  // 1. Call parent init (BaseHybridDevice)
  await super.onNodeInit();
  
  // 2. Initialize buttons
  await this.initializeButtons();
  
  // 3. Initialize temperature
  await this.initializeTemperature();
  
  // 4. Initialize tamper
  await this.initializeTamper();
}
```

### Button Registration

```javascript
async initializeButtons() {
  const buttons = ['button1', 'button2', 'button3'];
  
  for (const button of buttons) {
    const capabilityId = `onoff.${button}`;
    const endpoint = parseInt(button.replace('button', ''));
    
    // Add capability
    if (!this.hasCapability(capabilityId)) {
      await this.addCapability(capabilityId);
    }
    
    // Register listener
    this.registerCapabilityListener(capabilityId, 
      (value) => this.onButtonChanged(button, value)
    );
    
    // Register Zigbee cluster
    this.registerCapability(capabilityId, this.CLUSTER.ON_OFF, {
      endpoint: endpoint
    });
  }
}
```

### Power Source Detection

```javascript
async detectPowerSource() {
  const previousPowerType = this.powerType;
  
  // Parent method does actual detection
  await super.detectPowerSource();
  
  // Trigger flow if changed
  if (previousPowerType !== this.powerType) {
    await this.triggerPowerSourceChanged(
      previousPowerType.toLowerCase(),
      this.powerType.toLowerCase()
    );
  }
}
```

### Settings Handler

```javascript
async onSettings({ oldSettings, newSettings, changedKeys }) {
  // Power source changed
  if (changedKeys.includes('power_source')) {
    await this.detectPowerSource();
    await this.configurePowerCapabilities();
  }
  
  // Reporting interval changed
  if (changedKeys.includes('reporting_interval')) {
    await this.configureReporting();
  }
  
  // Button mode changed
  if (changedKeys.includes('button_mode')) {
    await this.configureButtonMode(newSettings.button_mode);
  }
}
```

---

## 📡 Zigbee Configuration

### Manufacturer IDs

```json
"manufacturerName": [
  "_TZ3000_xabckq1v",
  "_TZ3000_lupfd8zu",
  "_TZ3000_4fjiwweb",
  "_TZ3000_kjfzuycl"
]
```

### Product IDs

```json
"productId": [
  "TS004F",
  "TS0043",
  "TS0044"
]
```

### Endpoints

```json
{
  "1": {
    "clusters": [0, 1, 3, 6, 4096, 64704],
    "bindings": [6, 1]
  },
  "2": {
    "clusters": [6],
    "bindings": [6]
  },
  "3": {
    "clusters": [6],
    "bindings": [6]
  }
}
```

**Clusters:**
- `0` = Basic
- `1` = Power Configuration
- `3` = Identify
- `6` = On/Off
- `4096` = IAS Zone (tamper)
- `64704` = Manufacturer Specific

---

## 🎓 Learning from This Example

### What This Demonstrates

✅ **Complete hybrid architecture**
- Auto-detection
- Dynamic capabilities
- Energy management

✅ **Multi-endpoint Zigbee**
- 3 separate endpoints
- Individual control
- Proper clustering

✅ **Advanced flow cards**
- Triggers with tokens
- Conditions with logic
- Actions with arguments

✅ **User settings**
- Dropdowns
- Number ranges
- Dynamic behavior

✅ **Professional structure**
- Clean separation of concerns
- Proper error handling
- Comprehensive logging

### Reusable Patterns

#### Pattern 1: Multi-Capability Registration
```javascript
const capabilities = ['cap1', 'cap2', 'cap3'];
for (const cap of capabilities) {
  this.registerCapabilityListener(cap, handler);
}
```

#### Pattern 2: Endpoint Mapping
```javascript
const endpoint = parseInt(name.replace('button', ''));
this.registerCapability(capId, cluster, { endpoint });
```

#### Pattern 3: Flow Card Triggering
```javascript
async triggerEvent(tokens) {
  const driver = this.driver;
  await driver.eventTrigger.trigger(this, tokens);
}
```

#### Pattern 4: Settings Response
```javascript
async onSettings({ changedKeys }) {
  if (changedKeys.includes('setting')) {
    await this.reconfigureDevice();
  }
}
```

---

## 🚀 Usage Guide

### Installation

1. Pair device in Homey
2. Device auto-detects power source
3. Capabilities appear automatically
4. Configure settings if needed

### Configuration

1. **Check Power Source**
   - Settings → Power Source
   - Should show "Auto Detect" (recommended)

2. **Set Switch Type**
   - Toggle: For physical switches
   - Momentary: For scene triggers

3. **Set Button Mode**
   - Command: Direct control
   - Scene: Automation only

4. **Adjust Reporting**
   - Default: 300 seconds (5 min)
   - Lower: More responsive, more battery drain
   - Higher: Less responsive, better battery life

### Troubleshooting

**Battery icon won't disappear:**
- Go to Settings → Power Source
- Change to "AC Mains"
- Device will reconfigure

**Buttons not responding:**
- Check Button Mode setting
- If "Scene Mode", buttons only trigger flows
- Change to "Command Mode" for direct control

**Temperature not updating:**
- Increase Reporting Interval
- Use "Refresh device" action in flow
- Check Zigbee signal strength

---

## 📚 Related Documentation

- [BaseHybridDevice.js](../../lib/BaseHybridDevice.js) - Base class implementation
- [BatteryManager.js](../../lib/BatteryManager.js) - Battery management
- [PowerManager.js](../../lib/PowerManager.js) - Power management
- [Hybrid System Guide](../../docs/HYBRID_SYSTEM.md) - Complete guide

---

## 💡 Tips & Best Practices

### For Users

✅ Use Auto Detect for power source
✅ Set realistic reporting intervals
✅ Test flows after changing settings
✅ Monitor battery level if on battery

### For Developers

✅ Always call `super.onNodeInit()` first
✅ Use proper error handling
✅ Log important state changes
✅ Test both battery and AC modes
✅ Document manufacturer IDs thoroughly

---

## 🎊 Conclusion

This driver showcases the **complete hybrid system capabilities**:

- **Zero user configuration** needed for power management
- **Intelligent adaptation** between power sources
- **Professional user experience** with hidden irrelevant features
- **Comprehensive functionality** with all expected features

**This is the gold standard for hybrid Zigbee devices in Homey!**

---

*Created as part of Universal Tuya Zigbee v4.9.2*  
*Demonstrates BaseHybridDevice architecture*
