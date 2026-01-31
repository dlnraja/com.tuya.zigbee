# User Response Templates - v5.6.0

## GitHub Issues

### Issue #113 - Ernst02507 (TS004F Smart Knob)

```markdown
@Ernst02507 

**v5.6.0 Fix Applied** for your TS004F Smart Knob (`_TZ3000_gwkzibhs`):

✅ **Changes made:**
1. OnOff cluster heartbeat reports are now **filtered** for TS004F (no more false button triggers every 10min)
2. Enhanced **Scenes cluster** handling to capture real button events
3. Raw frame interceptor for scene commands

**Please test and confirm:**
- [ ] Does the device still trigger flows randomly every 10 minutes?
- [ ] Do button presses (single/double/hold) trigger correctly now?
- [ ] Any errors in Homey developer logs?

To test: Update to v5.6.0, re-pair the device if needed, and create a simple flow with "When button pressed" trigger.

Thanks for your patience! 🙏
```

---

### Issue #121 - DAVID9SE (Button _TZ3000_an5rjiwd)

```markdown
@DAVID9SE

Your button issue was fixed in v5.5.989 - the `_TZ3000_an5rjiwd` fingerprint was moved to the correct driver (button_wireless_1 instead of button_wireless_4).

**Please confirm:**
- [ ] Does the button pair correctly now?
- [ ] Do all button actions (single/double/long press) trigger flows?

If still having issues, please provide:
1. Homey Developer Tools > Zigbee interview (text, not screenshot)
2. Which button actions are not working

Thanks!
```

---

### Issue #122 - elgato7 (Longsam Curtain _TZE204_xu4a5rhj)

```markdown
@elgato7

**v5.5.998 Fix Applied** for Longsam Mini M3 curtain motor (`_TZE204_xu4a5rhj`):

✅ Position is now **INVERTED** correctly (DP2: 100-value)

**Please test:**
- [ ] Does 0% = fully closed and 100% = fully open?
- [ ] Does the position slider work correctly?
- [ ] Any issues with open/close commands?

If position is still inverted, let me know the exact behavior you observe.
```

---

## Forum Responses

### Forum #1297 - Peter_van_Werkhoven (ZG-204ZV Disco Lights)

```markdown
@Peter_van_Werkhoven

**v5.6.0 Fix for Disco Lights** on your HOBEIAN ZG-204ZV:

✅ **Added motion throttle:**
- 5 second minimum between motion state changes
- 3 second debounce before clearing motion
- Prevents rapid on/off triggering your lights

**Please test:**
1. Update to v5.6.0
2. Monitor for 24h - do lights still go "disco"?
3. Check humidity reading - should show 90% not 9%

**Diagnostic ID for reference:** `9b3495bb-16c7-4e90-8ee6-335b0f2fdec6`

Let me know the results! 🙏
```

---

### Forum #1289 - tlink (_TZE204_ztqnh5cg Presence Sensor)

```markdown
@tlink

**v5.6.0 Fix Applied** for your presence sensor (`_TZE204_ztqnh5cg`):

✅ Added to **ZCL_ONLY_RADAR** config with permissive mode:
- Uses IAS Zone for motion (not Tuya DP)
- Uses ZCL illuminance cluster for lux
- Uses ZCL power config for battery

**Please test:**
1. Update to v5.6.0
2. Remove and re-pair the device
3. Check if presence detection works
4. Check if flows trigger correctly

**Need from you if still not working:**
- Full Zigbee interview (Homey Developer Tools > Devices > Your device > Zigbee tab)
- Copy the TEXT, not screenshot

Thanks!
```

---

### Forum #1297 - Patrick_Van_Deursen (_TZE200_kb5noeto Radar)

```markdown
@Patrick_Van_Deursen

**v5.6.0 Fix Applied** for your radar sensor (`_TZE200_kb5noeto`):

✅ This is a **ZCL-only variant** (no Tuya DP cluster 61184) - now supported!

**Added ZCL_ONLY_RADAR config:**
- Motion via IAS Zone cluster 1280
- Lux via illuminanceMeasurement cluster 1024  
- Battery via powerConfiguration cluster 1
- Permissive mode enabled

**Please test:**
1. Update to v5.6.0
2. Remove and re-pair the device
3. Check: Motion, Lux, Battery - do they work?

**Your diagnostic ID:** `33677378-eb74-437d-9ab6-35e8e4168a47`

Let me know results!
```

---

### Forum #1290 - blutch32 (Contact Sensor, Soil Sensor, Energy Meter)

```markdown
@blutch32

J'ai besoin des **fingerprints texte** de vos appareils pour les supporter:

**Comment obtenir les fingerprints:**
1. Ouvrir Homey Developer Tools: https://developer.athom.com/tools/
2. Aller dans "Devices" 
3. Trouver votre appareil
4. Cliquer sur l'onglet "Zigbee"
5. **Copier le texte** (pas screenshot!) avec:
   - `manufacturerName`
   - `productId` (ou `modelId`)
   - Liste des clusters

**Appareils nécessaires:**
- [ ] Contact Sensor (alarm toujours "no")
- [ ] Soil Sensor (nouveau)
- [ ] Energy Meter (nouveau)

Les drivers existent déjà (`contact_sensor`, `soil_sensor`, `power_meter`) - j'ai juste besoin des fingerprints pour les ajouter!

Merci! 🙏
```

---

## Quick Copy Templates

### Request Zigbee Interview
```
Please provide your Zigbee interview data:
1. Go to https://developer.athom.com/tools/
2. Find your device under "Devices"
3. Click the "Zigbee" tab
4. Copy and paste the TEXT here (not screenshot)

I need: manufacturerName, productId, and cluster list.
```

### Confirm Fix Working
```
Fix applied in v5.6.0. Please:
1. Update the app
2. Re-pair device if needed
3. Test and confirm:
   - [ ] Device pairs correctly
   - [ ] Functions work as expected
   - [ ] Flows trigger properly
```
