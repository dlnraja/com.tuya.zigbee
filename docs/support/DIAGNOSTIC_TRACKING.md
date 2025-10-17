# Diagnostic Reports Tracking

**Purpose:** Track and respond to user diagnostic reports systematically

---

## 📊 Active Diagnostics

### 1. Cam - Button + Motion Sensor (PRIORITY)

**Log ID:** `5d3e1a5d-701b-4273-9fd8-2e8ffcfbf2ee`  
**Date:** Oct 16, 2025 @ 22:31  
**App Version:** v3.0.35  
**User Message:** "The whole app doesn't work"  
**Forum Post:** https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test  

**Issue:** Button + motion sensor not working  
**Analysis:** App initialization clean, no device activity captured  
**Status:** ⏳ Awaiting user response  
**Response:** `EMAIL_TO_CAM.txt` (complete) or `EMAIL_TO_CAM_SHORT.txt` (concise)

**Next Steps:**
- [ ] User provides manufacturer IDs
- [ ] User sends active diagnostic (testing devices)
- [ ] Verify device support in drivers/
- [ ] Add manufacturer ID if missing
- [ ] Test fix + release patch if needed

---

### 2. Generic Report (Log a063a142)

**Log ID:** `a063a142-b657-42f0-8f0a-622c8674e53f`  
**Date:** Oct 16, 2025 @ 22:13  
**App Version:** v3.0.35  
**User Message:** "Diagnostic report"  

**Issue:** Unknown (log truncated in email)  
**Analysis:** Incomplete - need full log  
**Status:** ⏳ Need user clarification  
**Response:** `TEMPLATE_GENERIC_DIAGNOSTIC.txt`

**Next Steps:**
- [ ] Request specific problem description
- [ ] Request manufacturer IDs
- [ ] Request new active diagnostic

---

## 📝 Response Templates Available

| Template | Use Case | Location |
|----------|----------|----------|
| **EMAIL_TO_CAM.txt** | Detailed response for Cam (button + motion) | `docs/support/` |
| **EMAIL_TO_CAM_SHORT.txt** | Concise version for Cam | `docs/support/` |
| **TEMPLATE_GENERIC_DIAGNOSTIC.txt** | Generic diagnostic response | `docs/support/` |

---

## 🔧 Common Diagnostic Patterns

### Pattern 1: "App doesn't work" but log shows clean init
**Cause:** User expects all devices to work, but specific device has issue  
**Response:** Request manufacturer IDs + device-specific symptoms  
**Fix:** Add manufacturer ID support or fix driver implementation

### Pattern 2: IAS Zone enrollment failures (motion/contact sensors)
**Symptoms:** Sensor paired but no events, `alarm_*` capability missing  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Fix:** Re-pair within 2m, wait 60s for enrollment

### Pattern 3: TS0601 devices not initializing
**Symptoms:** Gas/leak/multi-sensors don't report values  
**Response:** Confirm v3.0.35 installed, point to TS0601 fix  
**Fix:** Re-pair after update (handler fixed in v3.0.17/3.0.35)

### Pattern 4: Flow card warnings (cosmetic)
**Example:** `Warning: Run listener was already registered`  
**Response:** Explain these are non-critical (duplicate registrations)  
**Fix:** Low priority - code cleanup when refactoring

### Pattern 5: Truncated logs
**Symptoms:** Email shows incomplete stdout/stderr  
**Response:** Request full log or new diagnostic while testing  
**Fix:** N/A (user-side issue)

---

## 📊 Statistics

**Total Diagnostics Received:** 2 (Oct 15-16, 2025)  
**Pending Responses:** 2  
**Resolved:** 0  
**Common Issues:** IAS Zone enrollment, device-specific support gaps

---

## 🚀 Workflow

### When New Diagnostic Arrives

1. **Log it here** with:
   - Log ID
   - Date/time
   - User message
   - App/Homey version

2. **Analyze:**
   - Check for errors in stdout/stderr
   - Identify device type (if mentioned)
   - Look for patterns (init failures, IAS Zone, TS0601, etc.)

3. **Respond:**
   - Use appropriate template
   - Request manufacturer IDs (always)
   - Request active diagnostic if needed
   - Provide quick fixes

4. **Track:**
   - Mark status: ⏳ Awaiting / 🔧 In Progress / ✅ Resolved
   - Update when user responds
   - Document solution

5. **Fix (if needed):**
   - Add manufacturer ID to driver
   - Fix driver implementation
   - Release patch version
   - Notify user

---

## 📧 Email Best Practices

✅ **DO:**
- Always request manufacturer IDs
- Provide quick fixes first (restart, re-pair)
- Link to relevant documentation
- Be friendly and professional
- Request active diagnostics (testing while logging)

❌ **DON'T:**
- Assume device is supported without checking
- Guess at solutions without manufacturer ID
- Ignore truncated logs (ask for full version)
- Overcomplicate initial response

---

**Last Updated:** Oct 17, 2025 @ 01:56
