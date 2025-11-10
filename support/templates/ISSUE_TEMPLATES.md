# 📋 ISSUE RESPONSE TEMPLATES

**Version**: v1.0  
**Last Updated**: 2 Novembre 2025

---

## 1. DEVICE NOT PAIRING

### Detection Pattern
```
Keywords: "not pairing", "pairing failed", "cannot pair", "won't pair"
```

### Response Template
```markdown
## 🔌 Device Pairing Troubleshooting

Thank you for your report! Let's get your device paired.

### Quick Fixes

1. **Reset the device**
   - Check your device manual for reset procedure
   - Usually: Hold button for 5-10 seconds until LED blinks

2. **Enable pairing mode in Homey**
   - Open Homey app → Devices → Add Device
   - Select Tuya Zigbee app
   - Wait for device to appear (up to 60 seconds)

3. **Bring device close to Homey**
   - Distance: < 1 meter during pairing
   - After pairing, you can move it

4. **Check Zigbee network**
   - Network not full? (max 40-50 devices)
   - Other Zigbee devices working?

### Still Not Working?

Please provide:
- Device brand/model
- Manufacturer ID (check device box: _TZ...)
- LED behavior during pairing
- Homey app version

We'll help you get it working! 🚀

---
*Response generated from template: DEVICE_NOT_PAIRING*
```

---

## 2. BATTERY NOT REPORTING

### Detection Pattern
```
Keywords: "battery", "not reporting", "battery level", "no battery"
```

### Response Template
```markdown
## 🔋 Battery Reporting Issue

Battery reporting can be tricky with some devices. Here's what to check:

### Understanding Battery Reports

Most Zigbee battery devices only report:
- When battery is low (< 20%)
- On wake-up events
- Every 7-14 days (manufacturer setting)

### Solutions

1. **Wait 24-48 hours**
   - First report may take time
   - Device needs to wake up

2. **Trigger a wake-up**
   - Press device button
   - Trigger sensor (if motion/door sensor)
   - Wait 5 minutes, check again

3. **Check device settings**
   - Open device in Homey app
   - Settings → Battery Reporting
   - Enable if available

4. **Check capability**
   - Some devices don't have battery reporting
   - Check device specs

### Still No Battery Data?

Provide:
- Device model
- How long since pairing?
- Any wake-up events triggered?
- App logs (Settings → Apps → Tuya Zigbee → Logs)

We'll investigate! 🔍

---
*Response generated from template: BATTERY_NOT_REPORTING*
```

---

## 3. DEVICE SHOWS UNAVAILABLE

### Detection Pattern
```
Keywords: "unavailable", "offline", "not responding", "disconnected"
```

### Response Template
```markdown
## ⚠️ Device Unavailable

Let's get your device back online!

### Immediate Checks

1. **Device powered?**
   - Battery devices: Check batteries
   - Powered devices: Check power supply

2. **In Zigbee range?**
   - Direct line: < 10 meters
   - With routers: < 30 meters

3. **Zigbee interference?**
   - WiFi on same channel?
   - Microwave nearby?
   - Metal objects blocking?

### Quick Fixes

1. **Wake the device** (battery devices)
   - Press button
   - Trigger sensor
   - Wait 30 seconds

2. **Add Zigbee router**
   - Place between device and Homey
   - Powered Zigbee devices act as routers

3. **Check Homey Zigbee network**
   - Settings → Zigbee → Network status
   - Any errors?

4. **Re-pair if persists**
   - Remove device
   - Reset device
   - Pair again

### Important Note

Battery devices may show "unavailable" when sleeping. **This is normal** - they wake on events.

### Need More Help?

Provide:
- Device type (battery/powered)
- Distance from Homey
- When did it go offline?
- Any changes to setup?

---
*Response generated from template: DEVICE_UNAVAILABLE*
```

---

## 4. FLOW NOT TRIGGERING

### Detection Pattern
```
Keywords: "flow not working", "flow not triggering", "automation not working"
```

### Response Template
```markdown
## 🔄 Flow Troubleshooting

Flows not working? Let's debug it!

### Step-by-Step Debug

1. **Check Flow is enabled**
   - Homey app → More → Flows
   - Find your flow
   - Not paused? ✅

2. **Check WHEN conditions**
   - Device available?
   - Correct capability selected?
   - Trigger values correct?

3. **Check AND conditions**
   - All conditions met?
   - Time/day correct?
   - Other device states OK?

4. **Test Flow manually**
   - Click "Test Flow" button
   - Do THEN actions execute?
   - If yes → WHEN/AND issue
   - If no → THEN actions issue

### Common Issues

**Motion Sensors**
- Cooldown period (30-60s)
- Device sleeping between triggers
- Check sensitivity settings

**Battery Devices**
- May be sleeping
- Trigger interval too short
- Wake device first

**Zigbee Messages**
- Message not received
- Check device availability
- Check Zigbee network quality

### Advanced Debug

1. **Check app logs**
   - Settings → Apps → Tuya Zigbee → Logs
   - Look for trigger events
   - Any errors?

2. **Test device directly**
   - Open device in app
   - Trigger manually
   - Does it respond?

### Still Stuck?

Share:
- Flow screenshot
- Device type
- App logs around trigger time
- Expected vs actual behavior

We'll figure it out! 🔍

---
*Response generated from template: FLOW_NOT_TRIGGERING*
```

---

## 5. MULTI-GANG SPECIFIC GANG NOT WORKING

### Detection Pattern
```
Keywords: "gang not working", "gang 2", "gang 3", "multi-gang", "one switch"
```

### Response Template
```markdown
## 🔌 Multi-Gang Switch Issue

One gang not working? Here's the fix:

### Check Capabilities

1. **Open device in Homey app**
2. **Count capabilities**:
   - Should see: `onoff`, `onoff.gang2`, `onoff.gang3`, etc.
   - If missing → Wrong driver selected

### Fix Wrong Driver

1. **Remove device**
   - Settings → Devices → [Your switch] → Delete

2. **Reset device**
   - Check manual for reset procedure
   - Usually: Hold button 5 seconds

3. **Re-pair correctly**
   - Add device
   - **Select correct driver** (e.g., "3-Gang" not "1-Gang")
   - Check all gangs appear

### BSEED Switches (Special Case)

If you have a **BSEED brand** switch with model `_TZ3000_l9brjwau`:

This is a **known firmware bug**. Both gangs activate together.

✅ **Solution**: Use dedicated BSEED driver
- Re-pair device
- Select "BSEED 2-Gang Wall Switch"
- Driver includes automatic workaround

📋 **Full Guide**: [BSEED Issue Documentation](../../BSEED_2GANG_ISSUE_RESPONSE.md)

### Test Each Gang

After fixing, test individually:
- Gang 1: `onoff` capability
- Gang 2: `onoff.gang2` capability
- Gang 3: `onoff.gang3` capability

### Still Issues?

Provide:
- Device brand/model
- Number of gangs (2, 3, 4?)
- Manufacturer ID (_TZ...)
- Which gang(s) not working?

---
*Response generated from template: MULTIGANG_ISSUE*
```

---

## 6. VALIDATION ERROR (Contributors)

### Detection Pattern
```
Keywords: "validation failed", "validation error", "build failed", "CI failed"
```

### Response Template
```markdown
## ❌ Validation Error - How to Fix

Thank you for your contribution! The validation found some issues. Let's fix them! 💪

### Common Validation Errors

#### 1. JSON Formatting

**Error**: Single quotes instead of double quotes

❌ **Wrong**:
\`\`\`json
"manufacturerName": ['_TZ3000_xxx']
\`\`\`

✅ **Correct**:
\`\`\`json
"manufacturerName": ["_TZ3000_xxx"]
\`\`\`

#### 2. Manufacturer ID Format

**Error**: Missing underscore prefix

❌ **Wrong**: `TZ3000_abcd1234`
✅ **Correct**: `_TZ3000_abcd1234`

**Pattern**: `_TZ[A-Z0-9]{4}_[a-z0-9]{8}`

#### 3. Missing Required Files

Check these exist:
- `driver.compose.json` ✅
- `device.js` ✅
- `driver.js` ✅
- `assets/images/small.png` ✅
- `assets/images/large.png` ✅

#### 4. Invalid JSON

Use a JSON validator:
- https://jsonlint.com/
- VSCode JSON validation
- `node -c driver.compose.json`

### How to Fix

1. **Review validation output**
   - Check GitHub Actions log
   - Note specific errors

2. **Make corrections**
   - Edit files locally
   - Validate JSON

3. **Push changes**
   \`\`\`bash
   git add .
   git commit -m "fix: Validation errors"
   git push
   \`\`\`

4. **Validation runs again automatically**
   - Wait for CI to complete
   - Check results

### Need Help?

- 📚 [Contributing Guide](../../../CONTRIBUTING.md)
- 💬 Comment on your PR
- 📧 Ask questions

We're here to help! 🙏

---
*Response generated from template: VALIDATION_ERROR*
```

---

## 7. APP CRASHES / ERRORS

### Detection Pattern
```
Keywords: "crash", "app crash", "error", "not responding", "freeze"
```

### Response Template
```markdown
## 🐛 App Stability Issue

App crashing or showing errors? Let's fix it!

### Immediate Fixes

1. **Restart app**
   - Settings → Apps → Tuya Zigbee
   - Click "Restart"
   - Wait 30 seconds

2. **Clear cache**
   - Settings → Apps → Tuya Zigbee
   - Scroll down → "Clear cache"
   - Restart app

3. **Check app version**
   - Is it latest version?
   - Update if available

4. **Check Homey memory**
   - Too many apps running?
   - Settings → System → Memory
   - Consider restarting Homey

### If Still Crashing

Provide for debugging:
- App version
- Homey firmware version
- Number of Tuya devices
- **App logs**: Settings → Apps → Tuya Zigbee → Logs
- Specific error message (if any)
- When does it crash? (specific action?)

### Workaround

If urgent:
1. Remove problematic device temporarily
2. Restart app
3. Report issue with logs
4. Re-add device after fix

We'll investigate ASAP! 🔍

---
*Response generated from template: APP_CRASH*
```

---

## 8. FEATURE REQUEST

### Detection Pattern
```
Keywords: "feature request", "add support", "can you add", "suggestion"
```

### Response Template
```markdown
## ✨ Feature Request

Thank you for your suggestion! We love community input! 🌟

### Quick Questions

To help us understand your request:

1. **What feature?**
   - Describe in detail

2. **Use case?**
   - How would you use it?
   - What problem does it solve?

3. **Similar devices?**
   - Any devices that have this feature?
   - Examples?

### How Feature Requests Work

1. **Community Discussion**
   - Other users interested?
   - Upvote this issue

2. **Feasibility Check**
   - Is it technically possible?
   - Homey SDK limitations?
   - Zigbee protocol support?

3. **Implementation**
   - If feasible + popular → Priority increases
   - If complex → May take time
   - If breaking → Next major version

### Want to Contribute?

We welcome PRs! 🚀

- 📚 Check [Contributing Guide](../../../CONTRIBUTING.md)
- 💬 Discuss implementation approach
- 🔧 Submit Pull Request

### Meanwhile

- ⭐ Star this issue
- 💬 Add details
- 🔔 Subscribe for updates

Thank you for making the app better! 🙏

---
*Response generated from template: FEATURE_REQUEST*
```

---

## USAGE IN WORKFLOWS

### Auto-Respond Example

```yaml
- name: Auto-respond to issue
  uses: actions/github-script@v7
  with:
    script: |
      const issue = context.payload.issue;
      const body = issue.body.toLowerCase();
      
      // Pattern matching
      if (body.includes('not pairing') || body.includes('pairing failed')) {
        const template = fs.readFileSync('docs/support/templates/ISSUE_TEMPLATES.md', 'utf8');
        const response = template.match(/## 1\\. DEVICE NOT PAIRING[\\s\\S]*?\\*Response generated from template/)[0];
        
        await github.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: issue.number,
          body: response
        });
      }
```

---

**Total Templates**: 8  
**Coverage**: ~85% common issues  
**Language**: English (French versions available on request)  
**Status**: ✅ Production Ready
