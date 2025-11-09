# 🔧 Complete Troubleshooting Guide

## 🐛 Common Issues & Solutions

### Issue 1: "No sensor data (lux, presence, etc.)"

**Check device type FIRST:**

```bash
# Open device in Homey → Advanced Settings → Zigbee Info
Model: TS0043    → Button (no sensors!)
Model: TS0044    → Button (no sensors!)
Model: TS0601    → Sensor (has sensors!)
```

**Solution:**
- **If TS0043/TS0044:** This is NORMAL! They're buttons, not sensors.
- **If TS0601:** Update to v4.9.322, restart app, wait 5 min for data.

---

### Issue 2: "Battery not displayed"

**Check version:**
- v4.9.320 or older: Update to v4.9.322
- v4.9.321: Upgrade to v4.9.322 (battery reader fixed)

**Check device type:**
- **Standard Zigbee (_TZ3000_*):** Battery reports on wake (press button)
- **Tuya DP (TS0601):** Battery via TuyaEF00Manager (auto)

**Solution:**
```
1. Update to v4.9.322
2. Restart app
3. For buttons: Press any button (wake device)
4. Wait 5 minutes
5. Check battery % in device card
```

---

### Issue 3: "[MIGRATION-QUEUE] Invalid homey instance"

**Status:** ✅ Fixed in v4.9.322

**If still seeing this:**
```
1. Update to v4.9.322 or newer
2. Restart Homey app
3. Clear migration queue: Settings → Advanced → Clear queue
```

---

### Issue 4: "Pairing is slow (>60 seconds)"

**Status:** ✅ Normal! See PAIRING_OPTIMIZATION.md

**Expected times:**
- Standard Zigbee: 30-50s
- Tuya DP: 40-70s
- Complex sensors: up to 90s

**If >90s consistently:**
```
1. Check battery (replace if <80%)
2. Reduce distance (<5m during pairing)
3. Check Zigbee network (routers, interference)
4. Factory reset device
5. Restart Homey
```

---

### Issue 5: "Data only updates every 5-6 hours"

**Check device type:**

**Standard Zigbee:**
- Polling: 5 min (temp/humidity), 6h (battery)
- This is NORMAL (battery conservation)

**Tuya DP (TS0601):**
- Live updates: Instant (via TuyaEF00Manager)
- If not working: Update to v4.9.321+

**Solution:**
```
# For TS0601 devices:
1. Update to v4.9.322
2. Restart app
3. Open device in Homey → Check logs
4. Look for: [TUYA] dataReport received
5. Should see data within 5 minutes
```

---

### Issue 6: "Smart Adapt says 'No adaptation needed' but device incomplete"

**Check what driver selected:**

```
Device → Advanced Settings → Driver: button_wireless_3
Capabilities: measure_battery, onoff

This is CORRECT for TS0043!
```

**If driver wrong:**
```
1. Remove device
2. Re-pair
3. Let auto-detection run
4. Check again
```

**If capabilities missing:**
```
# For TS0601 sensors only:
1. Update to v4.9.322
2. TuyaEF00Manager will auto-add capabilities
3. Wait 5 minutes
4. Check device card
```

---

### Issue 7: "[BATTERY-READER] Trying Tuya DP... No data"

**Status:** ✅ Fixed in v4.9.322

**Cause:** _TZ3000_* devices incorrectly detected as Tuya DP

**Solution:**
```
1. Update to v4.9.322
2. Restart app
3. Battery will read via genPowerCfg cluster
```

---

## 🔍 Diagnostic Report Guide

### When to send diagnostic:

1. ✅ After updating to latest version
2. ✅ After testing for 2+ hours
3. ✅ With specific issue description
4. ✅ Include device model (TS0601, TS0043, etc.)

### How to send:

```
Homey App → Settings → Submit Diagnostic Report
Message: "TS0601 soil sensor - no data after v4.9.322"
```

### What to include:

```
- Version number (e.g., v4.9.322)
- Device model (TS0601, TS0043, etc.)
- Manufacturer (_TZE200_*, _TZ3000_*, etc.)
- Specific issue (no battery, no sensors, etc.)
- What you tested (updated, restarted, waited X hours)
```

---

## 📊 Version-Specific Fixes

### v4.9.320 → v4.9.321
- ✅ Energy-KPI crashes (20 → 0)
- ✅ Zigbee retry mechanism
- ✅ TuyaEF00Manager live updates
- ✅ Battery reader (4 fallback methods)
- ✅ Migration queue

### v4.9.321 → v4.9.322
- ✅ Battery reader false Tuya DP detection
- ✅ Migration queue parameter fix

---

## ✅ Quick Checklist

Before reporting an issue:

- [ ] Updated to latest version (v4.9.322+)
- [ ] Restarted Homey app
- [ ] Waited 5 minutes for initialization
- [ ] Checked device type (button vs sensor)
- [ ] Read diagnostic in Homey Dev Tools
- [ ] Tested with fresh batteries (if battery device)
- [ ] Checked distance to Homey (<10m)

---

## 🎯 Get Help

1. **GitHub Issues:** https://github.com/dlnraja/com.tuya.zigbee/issues
2. **Homey Community:** https://community.athom.com
3. **Diagnostic Reports:** Via Homey app Settings

Include:
- App version
- Device model
- Logs from Developer Tools
- What you already tried
