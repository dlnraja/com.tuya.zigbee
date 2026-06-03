# Acknowledgements & Credits

Building and maintaining a local, unified Zigbee application for the massive and heavily fragmented Tuya ecosystem is an enormous challenge. This app, **com.tuya.zigbee**, would not be possible without the groundbreaking reverse-engineering efforts and open-source contributions from the wider smart home community.

We extend our deepest gratitude to the following projects, developers, and communities:

## Major Open-Source Ecosystems

### 1. Zigbee2MQTT (Z2M) & zigbee-herdsman-converters
**Repository:** [Koenkk/zigbee-herdsman-converters](https://github.com/Koenkk/zigbee-herdsman-converters)
- **Contribution:** Zigbee2MQTT is the gold standard for device compatibility. The massive database of DataPoint (DP) mappings for the Tuya `0xEF00` cluster found in their `tuya.ts` file is the primary reference for deciphering unknown devices.
- **Thanks to:** Koenkk and the thousands of contributors who relentlessly decode Tuya's magic packets and undocumented behaviors.

### 2. Home Assistant ZHA (Zigbee Home Automation)
**Repository:** [zigpy/zha-device-handlers (zha-quirks)](https://github.com/zigpy/zha-device-handlers)
- **Contribution:** ZHA's implementation of quirks provides incredible insight into fixing physically buggy devices. Their object-oriented decoding of Tuya payloads and time-sync procedures heavily influenced the robustness of our own Tuya MCU Manager.
- **Thanks to:** The zigpy maintainers and the Home Assistant community.

### 3. deCONZ & Phoscon (dresden-elektronik)
**Repository:** [dresden-elektronik/deconz-rest-plugin](https://github.com/dresden-elektronik/deconz-rest-plugin)
- **Contribution:** Their JSON-based Device Description Files (DDFs) and their fantastic Wiki on the "Tuya Data Point Protocol" have provided excellent, human-readable structural references for Tuya device integration.

### 4. ZigbeeForDomoticz
**Repository:** [zigbeefordomoticz](https://github.com/zigbeefordomoticz/wiki)
- **Contribution:** Their extensive, well-written Wiki explaining the exact byte-by-byte structure of Tuya payloads (Status, TransID, DP_ID, DP_Type, Length, Data) is a treasure trove of technical knowledge.

## Hardware & Specification Resources

### 5. Zigbee Device Compatibility Repository
**Website:** [zigbee.blakadder.com](https://zigbee.blakadder.com/)
- **Contribution:** Blakadder's repository is invaluable for cross-referencing white-labeled and OEM Tuya devices (like Moes, Zemismart, Lonsonho) to their actual `_TZE` manufacturer names.

### 6. Tuya Developer Platform
**Website:** [developer.tuya.com](https://developer.tuya.com/)
- **Contribution:** While Tuya does not officially document their Zigbee gateway implementation for open-source hubs, their "MCU SDK UART Communication Protocol" documentation is identical to the Zigbee `0xEF00` payload structure. Reading their MCU docs allowed us to perfect the Heartbeat and Time Synchronization logic.

## Original Authors & Community

### 7. Johan Bendz
- **Contribution:** Johan created the foundation of this Homey application. His initial architecture and early Tuya drivers paved the way for this massive community-driven overhaul.

### 8. The Homey Community
- **Contribution:** To the hundreds of users on the Homey Community Forums and GitHub who patiently test experimental builds, provide Zigbee interview logs, and capture diagnostic reports. Your testing across thousands of unique device fingerprints makes this app universal.

---

*This project stands on the shoulders of giants. If you use this app and love it, consider supporting the open-source projects listed above.*
