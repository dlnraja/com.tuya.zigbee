# WiFi vs Zigbee Separation Standard & Architectural Guidelines
**Universal Tuya Engine for Homey Pro**

To prevent protocol amalgamation, architectural mix-ups, or regressions during development, this document defines the absolute boundaries, structures, and coding standards separating **WiFi (Local TuyAPI)** and **Zigbee (ZCL/EF00)** devices in the `com.tuya.zigbee` ecosystem.

---

## 1. 🌐 Core Architectural Distinction

| Feature | 📶 Zigbee Device (802.15.4) | 🔌 WiFi Device (TuyAPI) |
| :--- | :--- | :--- |
| **Base Class** | `TuyaZigbeeDevice` (extends `ZigBeeDevice`) | `TuyaLocalDevice` (extends `Homey.Device`) |
| **Protocol Layer** | 802.15.4, ZCL (Zigbee Cluster Library) | TCP/IP over LAN (TuyAPI on TCP 6668 / UDP 6666/6667) |
| **Addressing** | IEEE Address, Endpoint ID, Node ID | IP Address, Device ID (UUID), Local Key (32-char hex) |
| **Data Format** | Clusters (OnOff, LevelControl, Tuya custom 0xEF00) | DP (Data Point) ID-Value pairs (JSON payload) |
| **Local Discovery** | Zigbee Mesh coordinator routing (Homey) | LAN UDP Broadcast parsing (`TuyaDeviceDiscovery`) |
| **Authentication** | Over-the-air network key exchange (during pairing) | Static 16-character local key handshake (during pairing) |

---

## 2. 📁 File System & Directory Standards

### A. Driver Directory Nomenclature
* **Zigbee Drivers**: Named by device class directly or with `_advanced` suffix.
  * *Examples*: `switch_1gang`, `climate_sensor`, `radiator_valve`, `soil_sensor`, `presence_sensor`.
* **WiFi Drivers**: Always prefixed with `wifi_` to clearly isolate them in the file system.
  * *Examples*: `wifi_switch`, `wifi_plug`, `wifi_heater`, `wifi_cover`, `wifi_camera`, `wifi_air_purifier`.

### B. Library Files Isolation
* **Zigbee Libs**: Located under `lib/tuya/` (e.g., `TuyaZigbeeDevice.js`, `TuyaHybridDevice.js`).
* **WiFi Libs**: Located under `lib/tuya-local/` (e.g., `TuyaLocalDevice.js`, `TuyaLocalClient.js`, `TuyaDeviceDiscovery.js`).

**CRITICAL RULE**: Never import or mix libraries across these two domains. Under no circumstances should a `wifi_` driver reference `TuyaZigbeeDevice` or use a ZCL cluster listener.

---

## 3. 🛡️ Programming Patterns & Coding Rules

### A. Zigbee Programming Guidelines (ZCL & Tuya Cluster 0xEF00)
1. **Endpoint Routing**: Use `registerCapability` with explicit endpoints where necessary.
2. **Raw Frame Fallback**: Rely on the standardized `onZigBeeMessage` (uppercase B) to intercept frames from clusters `6` (OnOff) and `8` (LevelControl) before SDK routing.
3. **Tuya DP over Zigbee**: Handle via `0xEF00` custom cluster bindings using classes like `TuyaHybridDevice`.
4. **Settings keys**: Must use `zb_manufacturer_name` and `zb_model_id` for matching.

### B. WiFi Programming Guidelines (TuyAPI LAN Protocol)
1. **DP-Capability Mappings**: Mapped via `this.dpMappings` inside the device class, generating the `capabilityMap` dynamically:
   ```javascript
   get dpMappings() {
     return {
       1: { capability: 'onoff', type: 'boolean' },
       2: { capability: 'dim', divisor: 10 }
     };
   }
   ```
2. **Socket Handling**: UDP sockets must bind using `{ exclusive: false }` to avoid address-in-use conflicts across multi-process discovery loops.
3. **Local Key Protection**: Local keys and Device IDs are confidential and must never be exposed or logged in plain text.
4. **Dynamic IP Healing**: Clients must implement cached-IP bypass and UDP-LAN discovery fallback to auto-correct dynamic IP shifts on home routers.

---

## 4. 🎛️ Integration with CI/CD Pipelines & Manifests

* **Manifest Isolation**: In `app.json`, WiFi devices use discovery strategy `ewelink_mdns` or other network discovery protocols, while Zigbee devices declare active `zigbee` cluster and fingerprint objects.
* **YML Validation**: Workflows (e.g., `auto-publish-on-push.yml` and `daily-promote-to-test.yml`) run decoupled validation tasks for Zigbee assets and WiFi assets separately, preventing image or metadata amalgamations.
* **Auto-Discovery Badges**: Pairings for WiFi and Zigbee are kept in separate wizards, with WiFi pairings using brand-badge formatting and native Android Intents for Easy Mode configuration.
