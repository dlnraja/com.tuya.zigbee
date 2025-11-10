# 🏆 BEST PRACTICES - Inspirées des meilleures apps Homey

## 📚 APPS ANALYSÉES

1. **gruijter/zigbee2mqtt** - SDK3, MQTT bridge, flow cards extensifs
2. **JohanBendz/Philips Hue Zigbee** - SDK3, 16 contributors, très mature
3. **JohanBendz/Zigbee Light Template** - Template officiel SDK3

---

## 🎯 CE QU'ON DOIT AMÉLIORER

### 1. FLOW CARDS - MASSIVEMENT ENRICHIR

#### A. TRIGGERS (When...)
**Actuellement**: Basique (button_pressed, alarm triggers)

**À AJOUTER**:
```json
{
  "triggers": [
    // Button events
    { "id": "button_pressed", "title": "A button was pressed" },
    { "id": "button_double_press", "title": "A button was double-pressed" },
    { "id": "button_long_press", "title": "A button was held" },
    { "id": "button_released", "title": "A button was released" },
    
    // Sensor events
    { "id": "temperature_changed", "title": "Temperature changed" },
    { "id": "humidity_changed", "title": "Humidity changed" },
    { "id": "battery_low", "title": "Battery is low", "args": [
      { "name": "threshold", "type": "range", "min": 5, "max": 30, "step": 5 }
    ]},
    
    // Motion/Occupancy
    { "id": "motion_detected", "title": "Motion detected" },
    { "id": "motion_stopped", "title": "No motion detected" },
    { "id": "presence_changed", "title": "Presence changed" },
    
    // Contact sensors
    { "id": "contact_opened", "title": "Contact opened" },
    { "id": "contact_closed", "title": "Contact closed" },
    
    // Alarm events
    { "id": "alarm_triggered", "title": "Alarm triggered", "args": [
      { "name": "alarm_type", "type": "dropdown", "values": [
        { "id": "smoke", "label": "Smoke" },
        { "id": "co", "label": "CO" },
        { "id": "water", "label": "Water leak" },
        { "id": "motion", "label": "Motion" }
      ]}
    ]},
    
    // Climate
    { "id": "target_temperature_reached", "title": "Target temperature reached" },
    
    // Device state
    { "id": "device_online", "title": "Device came online" },
    { "id": "device_offline", "title": "Device went offline" }
  ]
}
```

#### B. CONDITIONS (And...)
**Actuellement**: Très limité

**À AJOUTER**:
```json
{
  "conditions": [
    // Temperature/Humidity
    { "id": "temperature_above", "title": "Temperature is above" },
    { "id": "temperature_below", "title": "Temperature is below" },
    { "id": "humidity_above", "title": "Humidity is above" },
    { "id": "humidity_below", "title": "Humidity is below" },
    
    // Battery
    { "id": "battery_below", "title": "Battery level is below" },
    
    // Device state
    { "id": "is_on", "title": "Device is on" },
    { "id": "is_off", "title": "Device is off" },
    { "id": "is_online", "title": "Device is online" },
    
    // Motion/Occupancy
    { "id": "has_motion", "title": "Motion detected" },
    { "id": "is_occupied", "title": "Room is occupied" },
    
    // Contact
    { "id": "is_open", "title": "Contact is open" },
    { "id": "is_closed", "title": "Contact is closed" },
    
    // Alarms
    { "id": "alarm_active", "title": "Alarm is active" }
  ]
}
```

#### C. ACTIONS (Then...)
**Actuellement**: Basique (turn on/off)

**À AJOUTER**:
```json
{
  "actions": [
    // Lights
    { "id": "set_brightness", "title": "Set brightness" },
    { "id": "set_color_temperature", "title": "Set color temperature" },
    { "id": "set_color", "title": "Set color" },
    { "id": "dim_by", "title": "Dim by percentage" },
    { "id": "brighten_by", "title": "Brighten by percentage" },
    
    // Thermostats
    { "id": "set_target_temperature", "title": "Set target temperature" },
    { "id": "set_mode", "title": "Set mode" },
    { "id": "increase_temperature", "title": "Increase temperature by" },
    { "id": "decrease_temperature", "title": "Decrease temperature by" },
    
    // Covers/Curtains
    { "id": "open_cover", "title": "Open cover" },
    { "id": "close_cover", "title": "Close cover" },
    { "id": "stop_cover", "title": "Stop cover" },
    { "id": "set_cover_position", "title": "Set cover position" },
    
    // Alarms
    { "id": "trigger_alarm", "title": "Trigger alarm" },
    { "id": "cancel_alarm", "title": "Cancel alarm" },
    
    // Advanced
    { "id": "send_custom_command", "title": "Send custom command", "args": [
      { "name": "cluster", "type": "number" },
      { "name": "command", "type": "text" },
      { "name": "payload", "type": "text" }
    ]},
    
    // Device management
    { "id": "identify_device", "title": "Identify device (flash/beep)" },
    { "id": "reset_device", "title": "Reset device to factory settings" }
  ]
}
```

---

### 2. ADVANCED FLOW CARDS - TOKENS

**Pattern**: Permettre aux flows d'utiliser les valeurs des devices

```json
{
  "triggers": [
    {
      "id": "temperature_changed",
      "tokens": [
        { "name": "temperature", "type": "number", "title": "Temperature" },
        { "name": "previous_temperature", "type": "number", "title": "Previous temperature" },
        { "name": "change", "type": "number", "title": "Change" }
      ]
    },
    {
      "id": "button_pressed",
      "tokens": [
        { "name": "button", "type": "string", "title": "Button number" },
        { "name": "press_type", "type": "string", "title": "Press type (single/double/long)" }
      ]
    }
  ]
}
```

**Implémentation**:
```javascript
// Dans device.js
async triggerTemperatureChanged(newTemp, oldTemp) {
  const change = newTemp - oldTemp;
  
  await this.homey.flow.getDeviceTriggerCard('temperature_changed')
    .trigger(this, {
      temperature: newTemp,
      previous_temperature: oldTemp,
      change: change
    })
    .catch(err => this.error('Trigger failed:', err));
}
```

---

### 3. APP FLOW CARDS - GLOBAL

**Actuellement**: Aucun

**À AJOUTER**:
```json
{
  "flow": {
    "triggers": [
      {
        "id": "any_device_offline",
        "title": "Any device went offline",
        "tokens": [
          { "name": "device_name", "type": "string" },
          { "name": "device_type", "type": "string" }
        ]
      },
      {
        "id": "new_device_paired",
        "title": "New device was paired"
      }
    ],
    "conditions": [
      {
        "id": "devices_count",
        "title": "Number of devices",
        "args": [
          { "name": "comparison", "type": "dropdown", "values": [
            { "id": "greater", "label": "Greater than" },
            { "id": "less", "label": "Less than" },
            { "id": "equal", "label": "Equal to" }
          ]},
          { "name": "count", "type": "number" }
        ]
      }
    ],
    "actions": [
      {
        "id": "identify_all",
        "title": "Identify all devices"
      },
      {
        "id": "reset_network",
        "title": "Reset Zigbee network"
      }
    ]
  }
}
```

---

### 4. SETTINGS PAGE - ENRICHISSEMENT

**Inspiré de gruijter/zigbee2mqtt**:

```html
<!-- settings/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Universal Tuya Zigbee Settings</title>
  <script type="text/javascript" src="/homey.js"></script>
</head>
<body>
  <h1>Network Status</h1>
  <fieldset>
    <legend>Zigbee Network</legend>
    <label>Total Devices: <span id="device_count">0</span></label>
    <label>Online: <span id="online_count">0</span></label>
    <label>Offline: <span id="offline_count">0</span></label>
  </fieldset>
  
  <h1>Debug Settings</h1>
  <fieldset>
    <legend>Logging</legend>
    <label>
      <input type="checkbox" id="enable_debug_logging">
      Enable debug logging
    </label>
    <label>
      <input type="checkbox" id="log_all_events">
      Log all Zigbee events
    </label>
  </fieldset>
  
  <h1>Advanced</h1>
  <fieldset>
    <legend>Device Management</legend>
    <button id="refresh_devices">Refresh All Devices</button>
    <button id="identify_all">Identify All Devices</button>
    <button id="export_config">Export Configuration</button>
  </fieldset>
  
  <script>
    function onHomeyReady(Homey) {
      Homey.ready();
      
      // Load device count
      Homey.api('GET', '/devices/count', (err, result) => {
        if (!err) {
          document.getElementById('device_count').innerText = result.total;
          document.getElementById('online_count').innerText = result.online;
          document.getElementById('offline_count').innerText = result.offline;
        }
      });
      
      // Button handlers
      document.getElementById('refresh_devices').addEventListener('click', () => {
        Homey.api('POST', '/devices/refresh', {}, (err, result) => {
          if (!err) {
            Homey.alert('Devices refreshed!');
          }
        });
      });
    }
  </script>
</body>
</html>
```

---

### 5. API - ENDPOINTS POUR SETTINGS

**api.js**:
```javascript
module.exports = {
  async getDeviceCount({ homey }) {
    const devices = homey.drivers.getDevices();
    
    return {
      total: devices.length,
      online: devices.filter(d => d.getAvailable()).length,
      offline: devices.filter(d => !d.getAvailable()).length
    };
  },
  
  async refreshAllDevices({ homey }) {
    const devices = homey.drivers.getDevices();
    
    for (const device of devices) {
      try {
        await device.onInit();
      } catch (err) {
        homey.app.error('Refresh failed for', device.getName(), err);
      }
    }
    
    return { success: true, count: devices.length };
  },
  
  async identifyAllDevices({ homey }) {
    const devices = homey.drivers.getDevices();
    
    for (const device of devices) {
      try {
        if (typeof device.identify === 'function') {
          await device.identify();
        }
      } catch (err) {
        // Continue with others
      }
    }
    
    return { success: true };
  }
};
```

---

### 6. DEVICE PAIR - WIZARD AMÉLIORÉ

**Inspiré de Philips Hue**:

```javascript
// drivers/my_driver/pair/start.html
module.exports = {
  async showView() {
    return {
      id: 'list_devices',
      template: 'list_devices',
      navigation: {
        prev: 'start'
      }
    };
  }
};

// pair/search.js
module.exports = {
  async onPairListDevices({ socket }) {
    // Scan for 30 seconds
    const devices = [];
    
    socket.on('list_devices', async () => {
      // Return found devices
      return devices;
    });
  }
};
```

---

### 7. CAPABILITIES DYNAMIQUES - PATTERN HOMEY

**Inspiré de Johan Bendz**:

```javascript
class DynamicDevice extends ZigBeeDevice {
  async onNodeInit() {
    // Add capabilities dynamically based on what device supports
    const supported = await this.discoverCapabilities();
    
    for (const cap of supported) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap);
        this.log(`Added capability: ${cap}`);
      }
    }
    
    // Remove unsupported
    const current = this.getCapabilities();
    for (const cap of current) {
      if (!supported.includes(cap)) {
        await this.removeCapability(cap);
        this.log(`Removed capability: ${cap}`);
      }
    }
  }
  
  async discoverCapabilities() {
    const caps = [];
    const endpoint = this.zclNode.endpoints[1];
    
    if (endpoint.clusters.onOff) caps.push('onoff');
    if (endpoint.clusters.levelControl) caps.push('dim');
    if (endpoint.clusters.colorControl) caps.push('light_hue', 'light_saturation');
    if (endpoint.clusters.msTemperatureMeasurement) caps.push('measure_temperature');
    
    return caps;
  }
}
```

---

### 8. ERROR HANDLING & RETRY LOGIC

**Pattern de gruijter**:

```javascript
class RobustDevice extends Device {
  async sendCommandWithRetry(command, args, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.log(`[ATTEMPT ${attempt}/${maxRetries}] Sending command:`, command);
        const result = await this.zclNode.endpoints[1].clusters[command.cluster][command.method](args);
        this.log(`[SUCCESS] Command completed`);
        return result;
      } catch (err) {
        this.error(`[ATTEMPT ${attempt}/${maxRetries}] Failed:`, err.message);
        
        if (attempt === maxRetries) {
          throw new Error(`Command failed after ${maxRetries} attempts: ${err.message}`);
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await this.sleep(delay);
      }
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

### 9. TRANSLATIONS - MULTILANGUE

**Structure complète**:

```
/locales/
  en.json
  fr.json
  nl.json
  de.json
  es.json
  it.json
```

**Exemple en.json**:
```json
{
  "pair": {
    "title": "Pair your device",
    "instructions": "Put your device in pairing mode..."
  },
  "settings": {
    "title": "Device Settings",
    "power_source": "Power Source",
    "battery_type": "Battery Type"
  },
  "flows": {
    "triggers": {
      "button_pressed": {
        "title": "Button pressed",
        "args": {
          "button": {
            "title": "Button number"
          }
        }
      }
    }
  }
}
```

---

## 📋 PLAN D'IMPLÉMENTATION

### Phase 1: Flow Cards (PRIORITÉ HAUTE)
- [ ] Ajouter 20+ triggers
- [ ] Ajouter 15+ conditions
- [ ] Ajouter 20+ actions
- [ ] Implémenter tokens pour chaque trigger
- [ ] Tests sur devices réels

### Phase 2: Settings Page
- [ ] Créer settings/index.html
- [ ] Ajouter api.js endpoints
- [ ] Network status display
- [ ] Device management tools

### Phase 3: Capabilities Dynamiques
- [ ] Auto-discovery system
- [ ] Add/remove capabilities runtime
- [ ] Fallback gracieux

### Phase 4: Error Handling
- [ ] Retry logic sur tous les commands
- [ ] Exponential backoff
- [ ] Better error messages

### Phase 5: Translations
- [ ] 6 langues complètes
- [ ] Flow cards translated
- [ ] Settings translated

---

## 🎯 RÉSULTAT ATTENDU

Après ces améliorations, l'app sera au niveau des **TOP apps Homey**:
- Flow cards aussi riches que Philips Hue
- Settings page aussi complète que zigbee2mqtt
- Error handling robuste
- Support multilingue complet
- Capabilities dynamiques

**Estimation**: 3-4 semaines de dev pour tout implémenter.

**Priorité immédiate**: Flow cards (utilisateur a testé flows qui ne marchent pas)
