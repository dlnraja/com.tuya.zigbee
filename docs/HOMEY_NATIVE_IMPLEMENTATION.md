# HOMEY NATIVE FEATURES IMPLEMENTATION GUIDE

**Generated:** 2025-11-04T12:04:33.481Z

---

## 🎨 HOMEY SDK3 NATIVE FEATURES

### 1. Flow Cards

**Location:** `flow/`

**Triggers (4):**
- `device_battery_low` - Battery is low
- `device_offline` - Device went offline
- `device_online` - Device came online
- `firmware_update_available` - Firmware update available

**Conditions (2):**
- `is_online` - Device is !{{online|offline}}
- `battery_below` - Battery is below

**Actions (3):**
- `identify_device` - Identify device (blink)
- `check_firmware_update` - Check for firmware updates
- `reset_device` - Reset device to defaults

**Implementation in app.js:**

```javascript
async onInit() {
  // Register Flow Cards
  this.homey.flow.getTriggerCard('device_battery_low');
  this.homey.flow.getTriggerCard('device_offline');
  
  this.homey.flow.getConditionCard('is_online')
    .registerRunListener(async (args) => {
      return args.device.getAvailable();
    });
  
  this.homey.flow.getActionCard('identify_device')
    .registerRunListener(async (args) => {
      await args.device.identify();
    });
}
```

---

### 2. Insights (Analytics)

**Metrics (4):**
- `battery_health` - Battery Health (%)
- `device_uptime` - Device Uptime (%)
- `zigbee_lqi` - Zigbee Link Quality ()
- `command_success_rate` - Command Success Rate (%)

**Implementation in device.js:**

```javascript
async onInit() {
  // Create insights
  await this.homey.insights.createLog('battery_health', {
    title: { en: 'Battery Health' },
    type: 'number',
    units: '%'
  });
  
  // Log data
  await this.homey.insights.getLog('battery_health')
    .createEntry(batteryLevel);
}
```

---

### 3. Notifications

**Types:** device_offline, battery_low, firmware_update, zigbee_network_issue

**Implementation:**

```javascript
// Send notification
await this.homey.notifications.createNotification({
  excerpt: this.homey.__('notifications.battery_low', {
    device: this.getName()
  })
});
```

---

### 4. Settings Page

**Pages (3):**
- General Settings (settings)
- Diagnostics (activity)
- Advanced (wrench)

**Location:** `settings/`

**Files:**
- `settings/index.html` - Main settings page
- `settings/settings.js` - Settings logic
- `settings/style.css` - Homey-styled CSS

---

### 5. Device Classes (Homey Standard)

**Available classes:**
- `plug` - Icon: socket, Energy: true
- `light` - Icon: light_bulb, Energy: false
- `sensor` - Icon: sensor, Energy: false
- `curtain` - Icon: windowcoverings, Energy: false
- `thermostat` - Icon: radiator, Energy: false
- `lock` - Icon: lock, Energy: false
- `doorbell` - Icon: doorbell, Energy: false
- `button` - Icon: remote, Energy: false
- `socket` - Icon: socket, Energy: true
- `other` - Icon: homey, Energy: false

**Usage in driver:**

```json
{
  "class": "socket",
  "capabilities": ["onoff", "measure_power"],
  "energy": {
    "approximation": {
      "usageOn": 5,
      "usageOff": 0.5
    }
  }
}
```

---

### 6. Standard Capabilities

**Use Homey built-in capabilities:**

- `onoff` - Turned on
- `dim` - Dim level
- `light_hue` - Standard
- `light_saturation` - Standard
- `light_temperature` - Standard

**Benefits:**
- ✅ Automatic UI in Homey app
- ✅ Standard behavior
- ✅ Flow card integration
- ✅ Insights tracking
- ✅ Energy management

---

### 7. Images (Homey Guidelines)

**Driver images:**
- Small: 75x75px
- Large: 500x500px

**App images:**
- Small: 250x175px
- Large: 500x350px
- XLarge: 1000x700px

**Format:** PNG, transparent background
**Color:** Single color or simple gradient
**Style:** Minimalist, clear

---

### 8. Colors (Homey Brand)

**Primary colors:**
- Primary: #00E6A0 (Homey green)
- Secondary: #4A90E2
- Success: #00E676
- Warning: #FFB300
- Error: #FF3B30

**Usage in settings/style.css:**

```css
.button-primary {
  background: #00E6A0;
  color: white;
}
```

---

### 9. Discovery

**Strategy:** zigbee

**Implementation:**

```javascript
// Automatic Zigbee discovery
// No additional code needed - handled by homey-zigbeedriver
```

---

### 10. Energy Management

**For powered devices:**

```json
{
  "energy": {
    "approximation": {
      "usageOn": 10,
      "usageOff": 0.5
    }
  }
}
```

**For battery devices:**

```json
{
  "energy": {
    "batteries": ["AAA", "AAA"]
  }
}
```

---

## 🎨 HOMEY DESIGN GUIDELINES

### Icons

- Format: SVG
- Size: 24x24
- Style: Outlined (Material Design)
- Color: Single color

### Typography

- Font: System font
- Headers: Bold, 16-18px
- Body: Regular, 14px
- Small: 12px

### Spacing

- Grid: 8px base unit
- Padding: 16px
- Margin: 8px, 16px, 24px

### Layout

- Mobile-first
- Responsive
- Touch-friendly (44px min touch target)
- Clean, minimal

---

## 📝 IMPLEMENTATION CHECKLIST

**App Level:**
- ✅ Flow cards (triggers, conditions, actions)
- ✅ Insights logs
- ✅ Notifications
- ✅ Settings page
- ✅ Brand color
- ✅ Discovery

**Driver Level:**
- ✅ Standard device class
- ✅ Standard capabilities
- ✅ Energy management
- ✅ Correct images (75x75, 500x500)
- ✅ Pairing instructions
- ✅ Settings (if needed)

**Device Level:**
- ✅ Capability listeners
- ✅ Insights logging
- ✅ Flow card triggers
- ✅ Availability tracking
- ✅ Error handling

---

## 🚀 NEXT STEPS

1. Implement Flow Card handlers in app.js
2. Add Insights logging in devices
3. Create Settings page UI
4. Update all driver images (Homey guidelines)
5. Add energy approximations
6. Test with Homey app
7. Validate with `homey app validate`

---

**Reference:** https://apps.developer.homey.app/
**SDK3 API:** https://apps-sdk-v3.developer.homey.app/
