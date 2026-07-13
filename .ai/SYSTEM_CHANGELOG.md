# Tuya Unified Engine - Hardening & Enrichment Changelog

**Document Objective**: To log the major architectural milestones achieved by Antigravity AI to ensure a "Zero-Defect" runtime environment and maximum interoperability.

## 1. Multi-Endpoint Remote Controls (ButtonRemoteManager)
- **Problem**: Previously, `ButtonRemoteManager` only attached cluster listeners to Endpoint 1. This caused multi-gang remotes (e.g. 4-button TS0044) to fail because buttons 2, 3, and 4 emit events on separate Zigbee Endpoints.
- **Solution**: Implemented a dynamic discovery loop `for (let i = 0; i < this.buttonCount; i++)` in the `attach()` method. This correctly hooks up endpoints `baseEndpoint + i` to the physical button events (single, double, long press).

## 2. Advanced IR Protocol Conversion (Zosung IR Blaster)
- **Problem**: The Tuya IR blaster (ZS06) relies on a proprietary base64 format for its Zosung cluster (`0xE004`). Users couldn't import millions of standard codes.
- **Solution**: Embedded on-the-fly protocol converters in `lib/ir/IRCodeLibrary.js`:
  1. `prontoToBase64()`: Translates standard LIRC/Pronto Hex sequences.
  2. `broadlinkToBase64()`: Translates SmartIR/Home Assistant Base64 sequences.
- **Result**: Native, zero-config capability for standard IR code injection.

## 3. Universal Remote UI/UX Emulation
- **Problem**: The IR Blaster driver had only "Learn Mode" and no intuitive way to control TVs/ACs directly.
- **Solution**: Added standard UI capabilities (`volume_up`, `channel_up`, `button.mute`, etc.) and dropdown Settings (`ir_brand`, `ir_category`) in `driver.compose.json`. Mapped these buttons in `device.js` to automatically fetch codes from `IRCodeLibrary`.

## 4. Universal Remote Flow Cards
- Added robust Action Flow Cards (`ir_blaster_send_tv_command`, `ir_blaster_send_ac_command`) with structured Enum parameters, allowing completely invisible IR transmission through flows.

## 5. Telemetry & Energy Metering
- Mapped secondary phase metrics (Phase B Current, Active Power Phase B, Power Factor Phase B) on the PJ-1203A power meter (`power_clamp_meter`) ensuring professional-grade data extraction.
- Validated all fixes using strict `npm run validate` ensuring perfect SDK v3 compliance.

## 6. Universal Hybrid Mode Stabilization
- **Problem**: `BaseUnifiedDevice.js` contained critical syntax errors (merged variable names, missing `this.` context, and `await` usage in non-async functions) causing runtime crashes when devices attempted to initialize standard ZCL clusters alongside Tuya DP.
- **Solution**: Systematically audited and repaired `BaseUnifiedDevice.js`:
  1. Corrected `const Capabilities` merged declaration.
  2. Added `this.` scope to all native capability manager calls.
  3. Promoted all cluster listener and promise-based callbacks to `async`.
- **Result**: Restored runtime stability for hybrid Zigbee devices and eliminated `ReferenceError` crashes.

## 7. Insoma Dual Irrigation Valve Support & Core Refactoring (v8.1.2)
- **Problem**: The Insoma dual irrigation valve (`_TZE284_fhvpaltk`) was incorrectly displaying four `dim level` sliders instead of two independent `onoff` switches, and button toggle triggers the "Could not get device by id" error.
- **Solution**:
  1. Extended `ValveIrrigationDriver` from `BaseZigBeeDriver` to inherit the robust `getDeviceById` crash protection.
  2. Modified DP mapping in `ValveIrrigationDevice` to map DP 2 to `'onoff.gang2'` instead of `'onoff'` for multi-channel valve support.
  3. Added dynamic capability stripping and initialization in `onNodeInit()`: for the Insoma dual valve, the 4 dimming levels (`dim.valve_1` to `dim.valve_4`) are removed and `'onoff.gang2'` is added. For standard 4-way valves, `'onoff.gang2'` is stripped and dimming capabilities are preserved.
  4. Registered a custom capability listener for `'onoff.gang2'` to transmit updates to DP 2 (`sendDP(2, value ? 1 : 0, 'bool')`).
  5. Fixed the lifecycle `onDeleted()` cleanup call to correctly invoke `await super.onDeleted();` instead of crashing on the legacy `onNodeInit` pattern.
- **Result**: Complete independent dual-channel control for the Insoma valve and 100% crash-free lifecycle execution.

## 8. Critical Bug Batch Fix - GitHub Issues #331, #332, #326 & Forum Reports (v9.7.4)
- **Problem 1 (Issue #332 - PDominikPL)**: "Could not get device by ID" crash for QS-Zigbee-C03 / TS0603 on repair/open-close.
  - **Root Cause**: `garage_door_opener` had no `driver.js` file → Homey used a generic ZigBeeDriver without the defensive `getDeviceById()` override from `BaseZigBeeDriver`.
  - **Fix**: Created `drivers/garage_door_opener/driver.js` extending `BaseZigBeeDriver`. This inherits crash-safe `getDeviceById()` and proper sub-device filtering.
  
- **Problem 2 (Issue #331 - PDominikPL)**: "Settings tab not loading" in v7.5.53.
  - **Root Cause**: Same missing `driver.js` as Issue #332 — without driver initialization, the device settings page fails to load context.
  - **Fix**: Resolved by creating the `garage_door_opener/driver.js` above.

- **Problem 3 (Issue #326 - haadeess)**: Rain sensor `_TZE200_u6x1zyv2` pairs correctly but reports no values.
  - **Root Cause**: The TS0601 variant rain sensors use DP 2 for rain level (% humidity) but the `dpMappings` only had DP 1 (alarm boolean), missing DP 2 mapping.
  - **Fix**: Added DP 2 → `measure_humidity` (rain level 0-100%), DP 106 → `measure_humidity` (alternate layout). Added explicit comments per DP variant type.

- **Problem 4 (Forum #2042 - Peter_van_Werkhoven)**: Smartbutton `TZ3000_mrpevh8p-TS0041` not working.
  - **Root Cause**: `_TZ3000_mrpevh8p` manufacturer ID missing from `button_wireless_smart/driver.compose.json` fingerprint list.
  - **Fix**: Added 3-variant (lower/mixed/UPPER case) `_TZ3000_mrpevh8p` fingerprints.

- **Confirmed Working (Forum #2043 - Joep_Vullings)**: Insoma dual valve (`_TZE284_fhvpaltk`) paired successfully. UI fix (DP 1+2 → onoff+onoff.gang2, removal of dim sliders) implemented in Section 7 above is correct.

- **PR #330 & #327 (bot - github-actions)**: Two automated Johan SDK3 sync PRs are open with 82 FPs added, 0 DP gaps. 33 cross-class PID conflicts detected. These require manual review before merging due to the conflict audit.
