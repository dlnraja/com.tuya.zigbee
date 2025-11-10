# ⚡ QUICK RESPONSE GUIDE - Support Requests

**Version**: v4.9.260  
**Last Updated**: 2 Novembre 2025

---

## 🎯 COMMON SUPPORT ISSUES - QUICK ANSWERS

### 1. BSEED 2-Gang Switch Issue

**Problem**: Both gangs activate together instead of independently

**Quick Answer**:
```
✅ SOLVED!

This is a known BSEED firmware bug (_TZ3000_l9brjwau).
A dedicated driver with automatic workaround is available.

SOLUTION:
1. Update to Tuya Zigbee app v4.9.260+
2. Re-pair your BSEED switch
3. Select "BSEED 2-Gang Wall Switch"
4. Gangs will work independently ✅

Success rate: 95%+

Full doc: docs/support/BSEED_2GANG_ISSUE_RESPONSE.md
```

**Detailed Response**: `docs/support/BSEED_2GANG_ISSUE_RESPONSE.md`

---

### 2. Device Not Pairing

**Quick Answer**:
```
TROUBLESHOOTING STEPS:

1. Reset device (check device manual)
2. Enable pairing mode in Homey (Add Device → Zigbee)
3. Bring device close to Homey (< 1m)
4. Wait 60 seconds
5. Check if device appears in pairing list

If still fails:
- Check app is latest version
- Try resetting device again
- Check Zigbee network not full (max 40-50 devices)
- Check device is Zigbee 3.0 compatible

Provide:
- Device brand/model
- Manufacturer ID (from device or box)
- App version
```

---

### 3. Battery Not Reporting

**Quick Answer**:
```
BATTERY REPORTING SETUP:

1. Open device settings in Homey app
2. Enable "Battery Reporting" if available
3. Set report interval (default: 24h)
4. Wait 24-48h for first report

NOTE: Some devices only report battery:
- When battery is low (< 20%)
- On wake-up events
- Every 7-14 days (manufacturer setting)

If still no reports after 48h:
- Check device has battery capability
- Try removing and re-pairing device
- Check app logs for battery data
```

---

### 4. Device Works but No Data Updates

**Quick Answer**:
```
DATA UPDATE ISSUES:

Common causes:
1. Device in sleep mode (battery devices)
2. Report interval set too long
3. Zigbee network congestion
4. Device out of range

FIXES:
1. Wake device (press button)
2. Check device settings → report intervals
3. Add Zigbee router/repeater
4. Move device closer to Homey
5. Check Zigbee network quality

For motion sensors:
- May have cooldown period (30-60s)
- Check sensitivity settings
```

---

### 5. How to Add New Device Support

**Quick Answer**:
```
ADD DEVICE SUPPORT:

OPTION 1 - Request (Easy):
1. Open GitHub Issue
2. Provide:
   - Device brand/model
   - Manufacturer ID (_TZ...)
   - Product ID (TS...)
   - Capabilities needed

OPTION 2 - Contribute (Advanced):
1. Fork repository
2. Find similar driver
3. Add manufacturer ID to driver.compose.json
4. Test locally
5. Submit Pull Request

AUTO-ENRICHMENT:
App automatically adds new devices weekly from:
- Zigbee2MQTT database
- ZHA integration
- Community contributions
```

---

### 6. Multi-Gang Switch Specific Gang Not Working

**Quick Answer**:
```
MULTI-GANG TROUBLESHOOTING:

1. Check capabilities in Homey app:
   - Should see: onoff, onoff.gang2, onoff.gang3, etc.
   
2. If missing capabilities:
   - Remove device
   - Re-pair
   - Select correct driver (e.g., "3-Gang" not "1-Gang")

3. If BSEED brand:
   - See BSEED specific guide
   - Use dedicated BSEED driver

4. Test each gang individually:
   - Gang 1: onoff capability
   - Gang 2: onoff.gang2 capability
   - Gang 3: onoff.gang3 capability
```

---

### 7. Device Paired but Shows "Unavailable"

**Quick Answer**:
```
DEVICE UNAVAILABLE:

IMMEDIATE CHECKS:
1. Device powered? (check batteries / power)
2. In Zigbee range? (< 10m direct, < 30m with routers)
3. Zigbee interference? (WiFi, microwave, etc.)

FIXES:
1. Wake device (press button)
2. Move closer to Homey
3. Add Zigbee router between device and Homey
4. Check Homey Zigbee network status
5. Re-pair if persists

TIP: Battery devices may appear "unavailable" 
when sleeping. This is normal - they wake on events.
```

---

### 8. Flow Not Triggering

**Quick Answer**:
```
FLOW TROUBLESHOOTING:

1. Check Flow is enabled (not paused)
2. Check WHEN conditions:
   - Device available?
   - Correct capability selected?
   - Trigger values correct?

3. Check AND conditions:
   - All conditions met?
   - Time/day correct?

4. Test Flow manually:
   - Use "Test Flow" button
   - Check if THEN actions execute

5. Check app logs:
   - Settings → Apps → Tuya Zigbee → Logs
   - Look for trigger events

COMMON ISSUES:
- Motion sensor cooldown period
- Battery device sleeping
- Zigbee message not received
```

---

### 9. App Crashes / Errors

**Quick Answer**:
```
APP STABILITY ISSUES:

IMMEDIATE FIXES:
1. Restart app:
   - Settings → Apps → Tuya Zigbee → Restart

2. Clear cache:
   - Settings → Apps → Tuya Zigbee → Clear cache

3. Update app:
   - Check for latest version
   - Install updates

4. Check Homey memory:
   - Too many apps?
   - Restart Homey if needed

PROVIDE FOR DEBUGGING:
- App version
- Homey firmware version
- Number of devices
- App logs (Settings → Apps → Logs)
- Specific error message
```

---

### 10. Validation Errors (For Contributors)

**Quick Answer**:
```
PR VALIDATION FAILED:

COMMON ISSUES:

1. JSON Formatting:
   ✅ "manufacturerName": ["_TZ3000_xxx"]
   ❌ "manufacturerName": ['_TZ3000_xxx']

2. Invalid Manufacturer ID:
   ✅ _TZ3000_abcd1234 (format correct)
   ❌ TZ3000_abcd1234 (missing underscore)

3. Missing Files:
   Required:
   - driver.compose.json
   - device.js
   - assets/images/

4. Validation Command:
   npx homey app validate --level publish

FIX PROCESS:
1. Review validation output
2. Fix issues
3. Test locally
4. Push changes
5. Validation runs again automatically
```

---

## 📧 EMAIL TEMPLATES

### Response to User Issue

```
Subject: Re: [Issue Description]

Hello [Name],

Thank you for reaching out!

[SPECIFIC ANSWER BASED ON ISSUE TYPE]

If this doesn't solve your issue, please provide:
- Device brand/model
- Manufacturer ID (if known)
- App version
- Homey firmware version
- Steps to reproduce

I'll be happy to help further!

Best regards,
Dylan Rajasekaram
Tuya Zigbee App Developer
```

---

### Response to Device Support Request

```
Subject: Re: Add support for [Device Name]

Hello [Name],

Thank you for your device support request!

GOOD NEWS: Adding device support is straightforward.

Please provide these details:
1. Manufacturer ID: _TZ... (find in Homey developer tools)
2. Product ID: TS... (on device or box)
3. Device type: Switch / Sensor / Dimmer / etc.
4. Number of gangs/endpoints (if switch)

Once I have this info, I can:
- Add support in next release
- Or guide you to submit a PR

NOTE: App has auto-enrichment that adds new devices 
weekly from Zigbee2MQTT and ZHA databases automatically!

Best regards,
Dylan
```

---

### Response to Pull Request

```
[AUTOMATED BY GITHUB ACTIONS]

See: .github/workflows/auto-pr-handler.yml

Manual response if needed:
"Thank you for your contribution! 
The automated validation will run and provide feedback shortly."
```

---

## 🔗 RESOURCE LINKS

### Documentation

- Main README: `README.md`
- Discoveries: `docs/DISCOVERIES_CONSOLIDATED.md`
- Scripts: `scripts/README_SCRIPTS.md`
- Automation: `docs/AUTOMATION_COMPLETE.md`

### Support Files

- BSEED Issue: `docs/support/BSEED_2GANG_ISSUE_RESPONSE.md`
- Email Templates: `docs/support/EMAIL_RESPONSE_LOIC.md`
- This Guide: `docs/support/QUICK_RESPONSE_GUIDE.md`

### External Links

- GitHub Repo: `https://github.com/dlnraja/com.tuya.zigbee`
- Homey App Store: `https://homey.app/a/com.tuya.zigbee/`
- Community Forum: `https://community.homey.app/`

---

## 📊 RESPONSE TIME TARGETS

```
Automated:        < 1 minute    (GitHub Actions)
Email:            < 24 hours    (human)
Issue:            < 48 hours    (human)
PR Review:        < 1 hour      (automated) / < 48h (manual)
Forum:            < 72 hours    (human)
```

---

## 🎯 ESCALATION

### When to Escalate

1. **Complex firmware issues** → Document thoroughly
2. **New device categories** → Research needed
3. **SDK/Homey platform bugs** → Contact Athom
4. **Security issues** → Immediate attention

### Escalation Contact

- Email: dylan.rajasekaram@gmail.com
- Phone: 0695501021
- GitHub: @dlnraja

---

**Document Version**: 1.0  
**Status**: ✅ PRODUCTION READY  
**Maintainer**: Dylan Rajasekaram
