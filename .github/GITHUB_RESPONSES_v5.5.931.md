# GitHub Responses - v5.5.931

## Issue #117 - Longsam mini m3 Smart Curtain
**Author:** @elgato7
**Date:** Jan 27, 2026
**Device:** `_TZE204_xu4a5rhj` / `TS0601`
**Status:** Pairs but missing features

### Response to Post:

---

Hi @elgato7! 👋

Thank you for the detailed device report!

**Good news:** Your device fingerprint `_TZE204_xu4a5rhj` is **already supported** in the `curtain_motor` driver since v5.5.917! 🎉

Looking at your diagnostics, I can see the device IS paired and has capabilities:
- ✅ `windowcoverings_state` = idle
- ✅ `windowcoverings_set` = 0.77 (77% position)
- ✅ `windowcoverings_tilt_set` = 0.07

**However**, since it's a TS0601 device using the Tuya DP protocol, we need to verify the DP (DataPoint) mappings are correct for your specific curtain motor variant.

### Please try the following:

1. **RE-PAIR the device** (remove and add again) to get the latest driver version (v5.5.931)

2. **Test the controls:**
   - Try the Open/Close/Stop buttons in Homey
   - Try setting a specific position (e.g., 50%)

3. **If controls don't work**, please enable debug logging and send the Tuya DP logs:
   - Go to device settings → Advanced → Enable Debug Logging
   - Press the physical button on the curtain motor
   - Copy the logs from Homey Developer Tools → App → Universal Tuya Zigbee → Logs

4. **Check position direction:**
   - If position is inverted (100% = closed instead of open), try enabling "Reverse Direction" in device settings

### Standard TS0601 Curtain DP Mappings:
- DP1: Control (0=open, 1=stop, 2=close)
- DP2: Position (0-100%)
- DP3: Direction setting
- DP5: Motor reverse
- DP7: Mode (normal/position)

Let me know what you find! 🔍

---

## PR #118 - BSEED Switch Support (_TZ3000_ysdv91bk)
**Author:** @packetninja (Attilla)
**Date:** Jan 27, 2026

### Response to Post:

---

Hi @packetninja! 👋

**EXCELLENT work on this PR!** 🎉

Your BSEED switch implementation has been **MERGED** into the main branch in **v5.5.913**.

### What was integrated:
- ✅ Fingerprint `_TZ3000_ysdv91bk` added to `switch_1gang` driver
- ✅ Fingerprint `_TZ3000_blhvsaqf` (variant) also supported
- ✅ ZCL-only mode (no Tuya DP for these switches)
- ✅ Physical button detection via attribute reports
- ✅ 2000ms app command window
- ✅ Custom clusters 0xE000/0xE001 support
- ✅ `printNode()` debug call per your approach
- ✅ Your name credited in code comments and changelog

The technique you developed for detecting physical button presses via onOff attribute reports has been extended to ALL multi-gang switches (2-8 gang) in v5.5.922.

**Thank you for your valuable contribution to the community!** 🙏

I'm closing this PR as the changes have been integrated. If you encounter any issues with your device, please open a new issue.

Best regards,
Dylan

---

## Summary

| Item | Status | Action |
|------|--------|--------|
| Issue #117 (Longsam curtain) | ⏳ Waiting for user | Fingerprint supported, needs DP verification |
| PR #118 (BSEED switch) | ✅ Merged | Close PR with thanks |

## Actions Taken

1. Verified `_TZE204_xu4a5rhj` fingerprint present in `curtain_motor` driver ✅
2. PR #118 code already integrated in v5.5.913 ✅
3. Prepared response templates for both items ✅
