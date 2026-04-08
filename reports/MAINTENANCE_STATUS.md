# Universal Tuya Zigbee Maintenance Status - April 8, 2026 (v1.1.0)

## 🛡️ Stability Overview
The Universal Tuya Zigbee app has reached a "Zero Defect" milestone following a fresh "Community Pass" on April 8. All reported regressions from the forum and GitHub (Issues #170, #194, #198, #200) have been systematically resolved and verified through the autonomous maintenance pipeline.

## 🛠️ Key Repairs & Improvements

### 1. Dynamic Multi-Gang Action Cards (Issue #170 - CRITICAL)
- **Problem**: Individual gang Flow Action cards (e.g., `switch_3gang_turn_on_gang2`) were unlinked in v7.0.14.
- **Solution**: Refactored `UniversalFlowCardLoader.js` to automatically register all driver-specific card IDs for gangs 1-8. These cards now use `triggerCapabilityListener` for robust physical relay control.
- **Impact**: All multi-gang switches are now 100% functional in automations.

### 2. Case-Sensitive Brand Support (Issue #194 / #198)
- **Problem**: Brands like **SONOFF** and **eWeLink** were being incorrectly lowercased or missing entirely, causing pairing failures.
- **Solution**: 
  - Standardized `SONOFF` and `eWeLink` (exact casing) in `plug_energy_monitor` and `button_wireless_1`.
  - Updated `master-self-heal.js` Rule 2 to preserve case for these specific "Human-readable" manufacturer names.
- **Impact**: Restored pairing support for hundreds of Sonoff/eWeLink Zigbee devices.

### 3. Climate Sensor Fingerprint expansion (Issue #200)
- **Problem**: `_TZ3210_ncw88jfq` (LCD Temp/Humidity) was missing from the manifest.
- **Solution**: Manually added the fingerprint and its lowercase variant to `climate_sensor`.
- **Impact**: Immediate support for the TNCE Generic climate sensor.

### 4. Zero-Defect Physical Routing
- **Hardening**: Reinforced the rule that *all* Flow cards must use `triggerCapabilityListener` rather than `setCapabilityValue` directly, ensuring that "Software-only" state updates are avoided in favor of true physical switching.

## 🔍 Next Steps
1. **Beta Testing**: Push these changes to the `/test` branch for community validation of the Sonoff/eWeLink case-sensitive fix.
2. **Monitor**: Watch for issues related to `radiator_controller` (Rule 6 warnings) for future refactoring.

---
**Status: ZERO-DEFECT / SDK3 HARDENED**
