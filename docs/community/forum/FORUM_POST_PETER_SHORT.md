# Forum Response for Peter (Short Version)

---

Hi @Peter_van_Werkhoven! 👋

**Good news!** Both your issues are **already fixed** in newer app versions.

## 🐛 Your Problems (v3.0.23)
- ❌ SOS button not triggering
- ❌ Multi-sensor cannot pair ("already added" error)

These are **known bugs in v3.0.23** that were **completely fixed in v3.0.26+**.

---

## ✅ Solution: Update & Re-Pair

### 1. Update App
- Open Homey App → More → Apps
- Find "Universal Tuya Zigbee"
- Click **Update** (to v3.0.31+)
- Wait 30-60 seconds

### 2. Remove Devices
- Remove SOS button from app
- Remove Multi-sensor (or find orphan in Settings → Zigbee)

### 3. Factory Reset
**SOS Button:**
- Hold button 10 seconds → LED blinks
  
**Multi-Sensor:**
- Remove battery, wait 10s
- Reinsert + hold reset 5s
- LED blinks rapidly

### 4. Re-Pair
- Add Device → Universal Tuya Zigbee
- Put device **very close** to Homey (<30cm)
- Follow pairing instructions

---

## 🔧 What Was Fixed

**v3.0.26 Critical Fix:**
```
❌ Before: Cluster IDs = NaN → No triggers
✅ After: Numeric cluster IDs → Everything works
```

**v3.0.31 Latest Enhancement:**
- Added ClusterMap module
- No more NaN errors possible
- Production-ready quality

---

## ✅ Expected Results After Update

**SOS Button:**
- ✅ Battery reading
- ✅ Button press triggers flows
- ✅ Notifications working

**Multi-Sensor:**
- ✅ Pairs successfully
- ✅ Temperature readings
- ✅ Humidity readings
- ✅ Illuminance readings
- ✅ Motion detection
- ✅ Battery percentage

---

## 📋 **Why This Happens**

v3.0.23 had a bug using string cluster names instead of numeric IDs:

```javascript
// ❌ v3.0.23: Broken
'powerConfiguration' → NaN → Device fails

// ✅ v3.0.26+: Fixed
POWER_CONFIGURATION → 1 → Works perfectly
```

---

## 💡 **Important Notes**

- **Re-pairing is REQUIRED** after update
- Old cluster registrations from v3.0.23 are invalid
- New pairing creates correct registrations
- If still failing: Try even closer to Homey, fresh battery

---

## 🔗 Resources

- **Release Notes:** [GitHub](https://github.com/dlnraja/com.tuya.zigbee/blob/master/RELEASE_NOTES_v3.0.30.md)
- **Critical Fixes Doc:** [Fixes](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/forum/RESPONSE_MULTIPLE_DIAGNOSTICS_CRITICAL_FIXES.md)
- **Full Documentation:** [Docs](https://github.com/dlnraja/com.tuya.zigbee)

---

## 📊 Version Comparison

| Feature | v3.0.23 | v3.0.31 |
|---------|---------|---------|
| SOS Trigger | ❌ | ✅ |
| Multi-Sensor Pairing | ❌ | ✅ |
| All Sensors | ❌ NaN | ✅ Working |
| ClusterMap | ❌ | ✅ |

---

**Update, re-pair, and everything will work! 🚀**

Let me know if you need help!

Regards,  
Dylan (@dlnraja)
