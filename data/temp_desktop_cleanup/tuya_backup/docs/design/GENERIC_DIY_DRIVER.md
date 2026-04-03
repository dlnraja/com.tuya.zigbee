# Generic DIY Zigbee Driver Design

## 📋 Overview

A universal driver for DIY Zigbee devices built with:
- **ESP32-C6** (Wi-Fi 6 + Zigbee + BLE)
- **ESP32-H2** (Zigbee + BLE, ultra-low power)
- **CC2530/CC2531** (classic Zigbee chips)
- **PTVO firmware** (popular DIY firmware)
- **Custom ZCL devices**

## 🎯 Goals

1. **Zero-config pairing** - Detect capabilities from ZCL clusters
2. **Dynamic capabilities** - Add/remove based on available clusters
3. **Future-proof** - Support Matter bridge devices
4. **Community-driven** - Easy to add new DIY fingerprints

---

## 🔧 Implementation

### Phase 1: Fingerprint Patterns

```javascript
// drivers/generic_diy/driver.compose.json
{
  "zigbee": {
    "manufacturerName": [
      // ESP32 variants
      "ESP32", "ESP32-C6", "ESP32-H2", "Espressif",
      // DLNRaja DIY
      "DLN-DIY", "DLNRAJA", "dlnraja",
      // Popular DIY firmwares
      "PTVO", "ptvo.info", "ptvo",
      "zigfred", "zig-a-zig-ah",
      // Generic DIY markers
      "DIY", "OpenSource", "Custom", "Maker",
      // CC253x based
      "lumi.router", "ROUTER", "router"
    ],
    "productId": [
      // Wildcard patterns
      "*", "DIY", "ESP32", "PTVO",
      "CC2530", "CC2531", "CC2652",
      "Router", "Sensor", "Switch"
    ]
  }
}
```

### Phase 2: Cluster Autodiscovery

```javascript
// lib/devices/GenericDIYDevice.js

const CLUSTER_CAPABILITY_MAP = {
  // ═══════════════════════════════════════════════════════════════
  // ACTUATORS
  // ═══════════════════════════════════════════════════════════════
  0x0006: {  // genOnOff
    capability: 'onoff',
    type: 'actuator',
    deviceClass: 'socket',
    multiEndpoint: true  // Support multiple switches
  },
  0x0008: {  // genLevelCtrl
    capability: 'dim',
    type: 'actuator',
    deviceClass: 'light',
    requires: [0x0006]  // Usually paired with onOff
  },
  0x0300: {  // lightingColorCtrl
    capability: 'light_hue',
    type: 'actuator',
    deviceClass: 'light',
    additionalCaps: ['light_saturation', 'light_mode']
  },
  0x0102: {  // closuresWindowCovering
    capability: 'windowcoverings_set',
    type: 'actuator',
    deviceClass: 'blinds',
    additionalCaps: ['windowcoverings_state']
  },

  // ═══════════════════════════════════════════════════════════════
  // SENSORS
  // ═══════════════════════════════════════════════════════════════
  0x0402: {  // msTemperatureMeasurement
    capability: 'measure_temperature',
    type: 'sensor',
    deviceClass: 'sensor',
    attribute: 'measuredValue',
    divisor: 100  // ZCL uses centidegrees
  },
  0x0405: {  // msRelativeHumidity
    capability: 'measure_humidity',
    type: 'sensor',
    deviceClass: 'sensor',
    attribute: 'measuredValue',
    divisor: 100
  },
  0x0400: {  // msIlluminanceMeasurement
    capability: 'measure_luminance',
    type: 'sensor',
    deviceClass: 'sensor',
    attribute: 'measuredValue',
    transform: (v) => Math.pow(10, (v - 1) / 10000)  // ZCL lux formula
  },
  0x0403: {  // msPressureMeasurement
    capability: 'measure_pressure',
    type: 'sensor',
    deviceClass: 'sensor',
    attribute: 'measuredValue'
  },
  0x0500: {  // ssIasZone
    capability: 'alarm_motion',  // or alarm_contact, alarm_water, etc.
    type: 'sensor',
    deviceClass: 'sensor',
    zoneTypeMap: {
      0x000D: 'alarm_motion',     // Motion sensor
      0x0015: 'alarm_contact',    // Contact switch
      0x002A: 'alarm_water',      // Water sensor
      0x0028: 'alarm_smoke',      // Smoke detector
      0x002B: 'alarm_gas',        // Gas detector
      0x002C: 'alarm_co',         // CO detector
      0x002D: 'alarm_heat'        // Heat detector
    }
  },
  0x0406: {  // msOccupancySensing
    capability: 'alarm_motion',
    type: 'sensor',
    deviceClass: 'sensor',
    attribute: 'occupancy'
  },

  // ═══════════════════════════════════════════════════════════════
  // BUTTONS / INPUTS
  // ═══════════════════════════════════════════════════════════════
  0x0012: {  // genMultistateInput
    capability: 'button',
    type: 'input',
    deviceClass: 'button',
    attribute: 'presentValue'
  },
  0x0005: {  // genScenes
    capability: 'button',
    type: 'input',
    deviceClass: 'button'
  },

  // ═══════════════════════════════════════════════════════════════
  // POWER / ENERGY
  // ═══════════════════════════════════════════════════════════════
  0x0702: {  // seMetering
    capability: 'meter_power',
    type: 'sensor',
    deviceClass: 'sensor',
    attribute: 'currentSummDelivered'
  },
  0x0B04: {  // haElectricalMeasurement
    capability: 'measure_power',
    type: 'sensor',
    deviceClass: 'sensor',
    attribute: 'activePower',
    additionalCaps: ['measure_voltage', 'measure_current']
  },

  // ═══════════════════════════════════════════════════════════════
  // POWER CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  0x0001: {  // genPowerConfiguration
    capability: 'measure_battery',
    type: 'sensor',
    attribute: 'batteryPercentageRemaining',
    divisor: 2  // ZCL uses 0-200 range
  }
};
```

### Phase 3: Dynamic Capability Registration

```javascript
async onNodeInit({ zclNode }) {
  const discoveredCaps = [];
  
  // Scan all endpoints
  for (const [epId, endpoint] of Object.entries(zclNode.endpoints)) {
    const clusters = Object.keys(endpoint.clusters || {});
    
    for (const clusterId of clusters) {
      const clusterNum = parseInt(clusterId);
      const mapping = CLUSTER_CAPABILITY_MAP[clusterNum];
      
      if (mapping) {
        // Build capability name (with endpoint suffix for multi-endpoint)
        const capName = epId > 1 
          ? `${mapping.capability}.${epId}` 
          : mapping.capability;
        
        // Register capability if not exists
        if (!this.hasCapability(capName)) {
          await this.addCapability(capName);
          this.log(`[DIY] ✅ Added capability: ${capName} (cluster ${clusterNum})`);
        }
        
        discoveredCaps.push({ epId, clusterId: clusterNum, capability: capName });
      }
    }
  }
  
  // Store discovered configuration
  await this.setStoreValue('diy_discovered_caps', discoveredCaps);
  
  // Setup listeners for each discovered capability
  for (const cap of discoveredCaps) {
    await this._setupCapabilityListener(cap);
  }
}
```

---

## 📦 ESP32 Firmware Template

### Example: Temperature + Humidity Sensor

```cpp
// ESP32-C6 Zigbee Sensor Example
// Compatible with Universal Tuya Zigbee (dlnraja)

#include "esp_zigbee_core.h"

#define MANUFACTURER_NAME "DLN-DIY"
#define MODEL_ID "ESP32-TH"

// Clusters to expose
esp_zb_cluster_list_t *cluster_list;
esp_zb_attribute_list_t *basic_cluster;
esp_zb_attribute_list_t *temp_cluster;
esp_zb_attribute_list_t *humidity_cluster;

void app_main() {
    // Initialize Zigbee stack
    esp_zb_cfg_t config = ESP_ZB_ZED_CONFIG();
    esp_zb_init(&config);
    
    // Create endpoint with standard clusters
    esp_zb_ep_list_t *ep_list = esp_zb_ep_list_create();
    
    // Add Temperature Measurement cluster (0x0402)
    temp_cluster = esp_zb_temperature_meas_cluster_create(NULL);
    
    // Add Humidity Measurement cluster (0x0405)
    humidity_cluster = esp_zb_humidity_meas_cluster_create(NULL);
    
    // Add Basic cluster with our manufacturer info
    esp_zb_basic_cluster_cfg_t basic_cfg = {
        .manufacturer = MANUFACTURER_NAME,
        .model = MODEL_ID
    };
    basic_cluster = esp_zb_basic_cluster_create(&basic_cfg);
    
    // Register endpoint
    esp_zb_endpoint_config_t endpoint_config = {
        .endpoint = 1,
        .app_profile_id = ESP_ZB_AF_HA_PROFILE_ID,
        .app_device_id = ESP_ZB_HA_TEMPERATURE_SENSOR_DEVICE_ID
    };
    
    esp_zb_cluster_list_add_basic_cluster(cluster_list, basic_cluster, ESP_ZB_ZCL_CLUSTER_SERVER_ROLE);
    esp_zb_cluster_list_add_temperature_meas_cluster(cluster_list, temp_cluster, ESP_ZB_ZCL_CLUSTER_SERVER_ROLE);
    esp_zb_cluster_list_add_humidity_meas_cluster(cluster_list, humidity_cluster, ESP_ZB_ZCL_CLUSTER_SERVER_ROLE);
    
    esp_zb_ep_list_add_ep(ep_list, cluster_list, endpoint_config);
    esp_zb_device_register(ep_list);
    
    // Start Zigbee
    esp_zb_start(false);
}
```

---

## 🚀 Roadmap

### v5.7.0 - Basic DIY Support
- [ ] Create `generic_diy` driver
- [ ] Implement cluster autodiscovery
- [ ] Support ESP32/PTVO fingerprints
- [ ] Dynamic capability registration

### v5.8.0 - Advanced Features
- [ ] Multi-endpoint support (onoff.1, onoff.2, etc.)
- [ ] Custom cluster handlers (0xE000, 0xE001)
- [ ] Flow card auto-generation
- [ ] Device settings auto-discovery

### v5.9.0 - Builder Tool
- [ ] Web-based firmware generator
- [ ] YAML configuration (like ESPHome)
- [ ] Pre-built firmware binaries
- [ ] Documentation & tutorials

---

## 📚 Resources

- [ESP-Zigbee-SDK](https://github.com/espressif/esp-zigbee-sdk)
- [PTVO Firmware](https://ptvo.info/zigbee-configurable-firmware-features/)
- [Zigbee Cluster Library (ZCL)](https://zigbeealliance.org/solution/zigbee/)
- [ZHA Device Handlers](https://github.com/zigpy/zha-device-handlers)

---

*Design document created: 2026-01-31*
*Project: Universal Tuya Zigbee (dlnraja)*
