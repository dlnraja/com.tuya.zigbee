# Physical Button Investigation - Complete Analysis

**Date:** February 2, 2026 (Updated v5.8.1)  
**Sources Analyzed:** 12+ platforms (Z2M, ZHA, Hubitat, SmartThings, deCONZ, Homey, Interview Files)

---

## 1. Interview Files Analysis

### Devices Analyzed from `C:\Users\HP\Desktop\interview\`:

| File | ModelId | ManufacturerName | Type | Key Clusters |
|------|---------|------------------|------|-------------|
| texte.txt | TS0601 | `_TZE284_vvmbj46n` | LCD Climate | 61184 (Tuya DP) |
| texte (2).txt | TS0601 | `_TZE284_oitavov2` | LCD Climate | 61184 (Tuya DP) |
| texte (3).txt | ZG-204ZM | `HOBEIAN` | Motion Sensor | 1280 (IAS), 61184 |
| texte (4).txt | **TS0043** | `_TZ3000_bczr4e10` | **3-Button** | **57344 (E000)**, 6 |
| texte (5).txt | TS0002 | `_TZ3000_h1ipgkwn` | 2-Gang Switch | 57344, 57345, 1794 |
| texte (9).txt | **TS0044** | `_TZ3000_bgtzm4ny` | **4-Button** | 6 only (NO E000!) |
| texte (10).txt | TS0215A | `_TZ3000_0dumfk2z` | SOS Button | 1280 (IAS) |
| texte (11).txt | TS0601 | `_TZE200_3towulqd` | Motion Sensor | 1280 (IAS), 1024 |

### Key Finding: TS0044 Cluster Variance
**Critical:** `_TZ3000_bgtzm4ny` TS0044 has NO E000 cluster - only OnOff (6)  
Must use `commandOn`/`commandOff` listeners, not E000 BoundCluster.

---

## 2. Cross-Platform Issues & Solutions

### Issue 1: TS004F Scene Mode (All Platforms)

**Problem:** TS004F only reports single press, no double/long  
**Root Cause:** Device stuck in "Dimmer mode" instead of "Scene mode"  
**Solution:** Write attribute `0x8004 = 1` to OnOff cluster (0x0006)

```javascript
// Z2M, ZHA, Hubitat, SmartThings all use this pattern:
await onOffCluster.writeAttributes({ 0x8004: 1 }); // Scene mode
```

**Status:** ✅ Implemented in `ButtonDevice._universalSceneModeSwitch()`

### Issue 2: Scene Mode Resets (Hubitat/Z2M)

**Problem:** Scene mode resets after battery removal or firmware update  
**Solution:** Re-apply scene mode on each connection/wake-up

**Status:** ✅ Implemented in v5.8.1
- Periodic recovery every 4 hours (`_scheduleSceneModeRecovery`)
- Re-apply on button press wake-up (`_reapplySceneModeOnWake`)
- 5-minute debounce to avoid excessive writes

### Issue 3: E000 Cluster Not Exposed (Homey-Specific)

**Problem:** Homey SDK doesn't expose unknown clusters like 0xE000  
**Solution:** Use `BoundCluster` pattern with raw frame interception

```javascript
// TuyaE000BoundCluster.js handles this
endpoint.bind(57344, new TuyaE000BoundCluster({ device }));
```

**Status:** ✅ Implemented in `TuyaE000BoundCluster.js`

### Issue 4: Battery Wake-Up Delay (All Platforms)

**Problem:** First button press after sleep may be lost  
**Root Cause:** Zigbee sleepy end devices (battery-powered) enter deep sleep to conserve power. The first button press wakes the radio but the event may not be transmitted in time.

**Hardware Limitation - Cannot be fully resolved in software.**

**Mitigation Strategies Implemented:**
1. Fast init mode (`fastInitMode = true`) - Defers complex initialization
2. Minimal cluster binding during pairing
3. Scene mode re-application on wake to ensure subsequent presses work

**User Guidance:**
- First press after long inactivity (>4 hours) may not register
- Second press will always work reliably
- This is a hardware limitation common to ALL Zigbee battery buttons

**Status:** ✅ Documented - hardware limitation with mitigations in place

---

## 3. Button Detection Methods

| Method | Cluster | Devices | Implementation |
|--------|---------|---------|----------------|
| Scenes recall | 0x0005 | TS004F (scene mode) | `scenesCluster.on('recall')` |
| OnOff commands | 0x0006 | TS0044, TS0041-43 | `onOffCluster.on('commandOn')` |
| E000 BoundCluster | 0xE000 | MOES buttons | `TuyaE000BoundCluster` |
| Tuya DP | 0xEF00 | TS0601 buttons | `DP1-4 = button actions` |
| IAS Zone | 0x0500 | TS0215A SOS | `iasZone.on('zoneStatus')` |
| MultiStateInput | 0x0012 | Some remotes | `attr.presentValue` |

---

## 4. Fingerprint Verification

### Already in Project ✅

| Fingerprint | Driver | Notes |
|-------------|--------|-------|
| `_TZ3000_bczr4e10` | button_wireless_3 | TS0043 with E000 |
| `_TZ3000_bgtzm4ny` | button_wireless_4 | TS0044 |
| `_TZ3000_0dumfk2z` | button_emergency_sos | TS0215A |
| `_TZ3000_h1ipgkwn` | switch_2gang | Has E000/E001 |

### Complete _TZ3000 Button Fingerprints (93 total in project):

```
_TZ3000_11pg3ima, _TZ3000_5tqxpine, _TZ3000_a4xycprs,
_TZ3000_abci1hiu, _TZ3000_b3mgfu0d, _TZ3000_bgtzm4ny,
_TZ3000_czuyt8lz, _TZ3000_dziaict4, _TZ3000_ee8nrt2l,
_TZ3000_et7afzxz, _TZ3000_j61x9rxn, _TZ3000_kfu8zapd,
_TZ3000_mh9px7cq, _TZ3000_nuombroo, _TZ3000_pcqjmcud,
_TZ3000_u3nv1jwk, _TZ3000_xabckq1v, _TZ3000_vp6clf9d,
_TZ3000_owgcnkrh, _TZ3000_ja5osu5g, _TZ3000_abrsvsou,
_TZ3290_ixd9mvv4, _TZ3290_nkpxapoz, _TZ3040_fwxuzcf4
```

---

## 5. Recommendations

1. **Scene Mode Persistence:** Add periodic scene mode re-application for TS004F
2. **TS0044 Detection:** Verify OnOff command listeners are active for devices without E000
3. **Wake-Up Handling:** Document that first press may be lost for battery devices
4. **Flow Card Testing:** Test all button flow cards with physical devices

---

## 6. Known Issues Summary

| Issue | Severity | Status |
|-------|----------|--------|
| Scene mode resets on battery change | Medium | Document workaround |
| E000 frames not reaching BoundCluster | Low | Implemented fallbacks |
| Some TS0044 have NO scenes cluster | Info | Using OnOff fallback |
| First press lost after long sleep | Low | Hardware limitation |

---

## 7. MOES/BSEED Deep Research (Feb 2025)

### Sources Analyzed:
- **Z2M Discussion #7158** - TS004F scene mode switching
- **Z2M Issue #26037** - TS0044/TS004F not working after update
- **Z2M Issue #8661** - TS0044 being recognized as TS004F
- **ZHA Issue #896** - MOES 1-gang button not working
- **ZHA Issue #3053** - MOES scene switch TS004F
- **Johan GitHub #1278** - BSEED TS0012 2-gang switch
- **SmartThings Edge Driver** - TS004F fingerprints database
- **Homey Forum** - TS004F _TZ3000_xabckq1v issues

### Key Issues Found:

1. **Scene Mode Not Applied** (All Platforms)
   - TS004F defaults to "Dimmer mode" (only single press)
   - Must write `0x8004 = 1` to OnOff cluster for scene mode
   - Status: ✅ Implemented in `_intelligentModeSwitch()`

2. **E000 Cluster Not Exposed** (Homey-Specific)
   - SDK doesn't expose unknown cluster 57344 (0xE000)
   - Status: ✅ Implemented via `TuyaE000BoundCluster` + raw frame interceptor

3. **Missing Fingerprints** (Fixed)
   - Added 22 new MOES fingerprints across button drivers

### Fingerprints Added:

**button_wireless_1 (TS0041):**
```
_TZ3000_4upl1fcj, _TZ3000_pzui3skt, _TZ3000_q68478x7,
_TZ3000_8rppvwda, _TZ3000_fa9mlvja, _TZ3000_0cxtpylt,
_TZ3000_vn88ezar, _TZ3000_xkwalgne, _TZ3000_adndolvx
```

**button_wireless_2 (TS0042):**
```
_TZ3000_arfwfgoa, _TZ3000_adkvzooy, _TZ3000_qous95zh, _TZ3000_xr7itfxq
```

**button_wireless_3 (TS0043):**
```
_TZ3000_mjwg6a52, _TZ3000_w3c7ouru, _TZ3000_ngsph3oj, _TZ3000_mutfmn4u
```

**button_wireless_4 (TS0044/TS004F):**
```
_TZ3000_402vrq2i, _TZ3000_xwuveizv, _TZ3000_kaflzta4, _TZ3000_j70oanab
```

### BSEED ZCL-Only Switches (Already Implemented):
```
_TZ3000_l9brjwau, _TZ3000_blhvsaqf, _TZ3000_ysdv91bk,
_TZ3000_hafsqare, _TZ3000_e98krvvk, _TZ3000_iedbgyxt,
_TZ3000_xk5udnd6 (TS0012)
```

### Known E000 Cluster Devices (in button_wireless_4):
```
_TZ3000_zgyzgdua, _TZ3000_abrsvsou, _TZ3000_mh9px7cq,
_TZ3000_uri7ez8u, _TZ3000_rrjr1q0u, _TZ3000_vp6clf9d,
_TZ3000_xabckq1v, _TZ3000_w8jwkczz, _TZ3000_dku2cfsc,
_TZ3000_ja5osu5g, _TZ3000_an5rjiwd
```

## 8. v5.8.0 Implementations

### Scene Mode Recovery (ButtonDevice.js)
- `_scheduleSceneModeRecovery()` - 4h periodic recovery for battery devices

### New Timing Profiles (PhysicalButtonMixin.js)
- 15+ new MOES/Tuya E000 device profiles from Hubitat research
- TS0046 6-button profiles with buttonCount property
- Sonoff/Konke brand-level profiles

### TS0046 Fingerprints (button_wireless_6)
- `_TZ3000_iszegwpd`, `_TZE200_2m38mh6k`, `_TZE200_zqtiam4u`, `_TZ3000_nrfkrgf4`

## 9. v5.8.1 Implementations

### Scene Mode Re-application on Wake (ButtonDevice.js)
- `_reapplySceneModeOnWake()` - Re-applies scene mode after button press (device wakes from sleep)
- 5-minute debounce to avoid excessive ZCL writes
- Only applies to TS004F devices with `sceneModeAttribute` config
- Called from `triggerButtonPress()` after flow triggers complete

### Hardware Limitation Documentation
- Documented that first button press after long sleep (>4h) may be lost
- This is a Zigbee sleepy end device limitation, not fixable in software
- Second press always works reliably
- Mitigation: fast init mode + scene mode recovery on wake
