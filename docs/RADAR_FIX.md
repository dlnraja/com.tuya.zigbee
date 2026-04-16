## CRITICAL BUG ANALYSIS: #97 _TZ321C_fkzihaxe8 NO VALUES

### ROOT CAUSES IDENTIFIED:

**Bug #1: TIMING ISSUE** (Line 2392-2400)
- Magic packet sent at line 2395
- DP listeners setup at line 2400 (AFTER magic packet)
- **PROBLEM:** Initial DP reports after magic packet are MISSED
- **FIX:** Setup listeners BEFORE magic packet, add 3s wait after packet

**Bug #2: NO FORCED DP POLLING**
- Device expects gateway to poll DPs after magic packet
- Current code waits for device to report (device never does)
- **FIX:** Force poll DPs 1,101,102,103,104,106,107 after magic packet

**Bug #3: IAS ZONE ENROLLMENT VERIFICATION MISSING**
- Enrollment verified at line 3608 but no retry if failed
- Device stuck in notEnrolled state = NO motion detection
- **FIX:** Add aggressive re-enrollment every 30s for first 5 min

**Bug #4: TUYA CLUSTER DETECTION FAILS**
- Magic packet makes cluster 61184 appear dynamically
- Current code checks cluster BEFORE magic packet (line 3847)
- **FIX:** Re-scan for Tuya cluster 3s after magic packet

### IMPLEMENTATION PLAN:

1. **driver.js lines 2388-2400**: Reorder init sequence
2. **driver.js lines 3780-3827**: Add post-magic-packet DP polling
3. **driver.js lines 3604-3615**: Add enrollment retry loop
4. **new script**: Auto-healing diagnostic responder

### FILES TO MODIFY:
- `drivers/presence_sensor_radar/device.js`
- `.github/scripts/diagnostic-auto-heal-radar.js` (NEW)
- `.github/workflows/diagnostic-scan.yml` (ADD radar healing)
