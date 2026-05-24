# COMPREHENSIVE IMPROVEMENT PLAN v7.5.0
## Generated: 2026-04-30

### STATUS: v5 STABLE FROZEN — Work on master (v7) ONLY

### 1. AUTO-ADAPTATION CAPABILITIES
- [ ] Detect manufacturer capability gaps (implemented but no data)
- [ ] Auto-remove capabilities that never receive data after 24h
- [ ] Smart value calibration per sensor type (temp ±0.5°C, humidity ±3%)
- [ ] Detect defective sensors (stuck values, NaN, out-of-range)
- [ ] Auto-adapt ranges per manufacturer (some report 0-100, others 0-1000)

### 2. WIFI DISCOVERY & MANAGEMENT
- [ ] Tuya WiFi direct device-to-Homey (no cloud)
- [ ] mDNS discovery for local Tuya devices
- [ ] DHCP IP change adaptation (auto-reconnect)
- [ ] Tuya magic link / QR code credential recovery
- [ ] Support all Tuya WiFi protocol versions (3.1-3.5)
- [ ] AP mode pairing support

### 3. ZIGBEE DRIVER COMPATIBILITY
- [ ] Test all drivers against ZCL clusters
- [ ] Verify endpoint mapping per manufacturer
- [ ] Handle multi-endpoint devices correctly
- [ ] Support Zigbee 3.0 + ZLL + ZHA stacks
- [ ] Retry logic for failed cluster reads

### 4. VALUE PROCESSING
- [ ] Smart dividers/multipliers per DP type
- [ ] Auto-detect calibration offsets
- [ ] Handle signed vs unsigned integers correctly
- [ ] Bitmap parsing for multi-state sensors
- [ ] Enum value mapping per manufacturer

### 5. FORUM = ZERO INTERACTION
- [x] All forum posting removed from YMLs
- [x] All forum posting removed from JS
- [x] Silent Operation doctrine enforced

### 6. DUAL APP STRATEGY
- [x] v7 Beta: com.dlnraja.tuya.zigbee (7.4.20) Build 2101
- [x] v5 Stable: com.dlnraja.tuya.zigbee.stable (5.11.209) Build 1 — FROZEN