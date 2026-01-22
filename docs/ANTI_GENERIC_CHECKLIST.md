# Anti-Zigbee-Generic Checklist

> **Goal**: NO device should EVER pair as "zigbee generic" if it can belong to this app.

## Driver Audit Checklist

### ✅ Pairing Permissiveness
- [ ] Driver accepts devices with partial cluster support
- [ ] Driver does NOT require specific DP to be present at pairing
- [ ] Driver does NOT require time sync to succeed before pairing
- [ ] Driver does NOT require specific endpoint count
- [ ] Endpoints section only requires cluster 0 (basic)

### ✅ ManufacturerName Rules
- [ ] Same mfrName in multiple drivers ONLY if productId differs
- [ ] No mfrName removed to "fix" conflicts
- [ ] Tuya prefixes covered: `_TZE200_`, `_TZE204_`, `_TZE284_`, `_TZ3000_`, `_TZ3210_`

### ✅ universal_fallback Health
- [ ] Driver exists at `drivers/universal_fallback/`
- [ ] Has broad manufacturerName prefixes (not specific IDs)
- [ ] Has common productId patterns (TS0601, TS011F, etc.)
- [ ] Capabilities array is EMPTY (no assumptions at pairing)
- [ ] Listens to BOTH ZCL and Tuya DP after pairing

### ✅ Hybrid Device Support
- [ ] Drivers support ZCL clusters when present
- [ ] Drivers support Tuya DP (0xEF00) when present
- [ ] Data sources merged progressively
- [ ] No exclusive assumption (ZCL OR Tuya)

### ✅ Time Sync
- [ ] Handles explicit ZCL Time cluster requests
- [ ] Handles Tuya mcuSyncTime command
- [ ] Handles implicit sync (full state update)
- [ ] Never blocks pairing on time sync failure

### ✅ Flow Cards
- [ ] All IDs globally unique
- [ ] IDs namespaced with driver prefix
- [ ] No generic IDs like `turn_on`, `turn_off`

---

## Quick Audit Commands

```bash
# Run full driver audit
node scripts/audit_drivers.js

# Check for missing manufacturerName
grep -L "manufacturerName" drivers/*/driver.compose.json

# Check universal_fallback exists
ls drivers/universal_fallback/

# Validate app
homey app validate --level=publish
```

---

## Red Flags (Causes Zigbee Generic)

| Issue | Risk | Fix |
|-------|------|-----|
| Empty `manufacturerName[]` | HIGH | Add Tuya prefixes |
| Strict endpoint requirements | MEDIUM | Reduce to cluster 0 only |
| Required DP at pairing | HIGH | Move to post-pairing detection |
| Removed mfrName for conflicts | CRITICAL | Restore mfrName, split by productId |
| universal_fallback missing | CRITICAL | Restore driver |

---

## Monthly Automation Sources

1. **Homey Forum**: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/
2. **GitHub Issues**: dlnraja/com.tuya.zigbee
3. **Zigbee2MQTT**: https://github.com/Koenkk/zigbee2mqtt
4. **ZHA**: https://github.com/zigpy/zha-device-handlers
5. **SmartThings**: Edge drivers

---

*Last audit: 2026-01-22*
*Drivers: 105 | Issues: 0 | Conflicts: 719 (expected)*
