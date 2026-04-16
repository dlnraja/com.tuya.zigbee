# Button Capability Guide - Universal Tuya Zigbee App

## Understanding Button Capabilities in Homey

### Why No GUI Button Widget?

If you're using a wireless button device and wondering why you don't see a clickable button widget in the Homey app, **this is by design and correct behavior**.

### Event-Only vs State Buttons

**Wireless buttons are EVENT devices, not STATE devices:**

- **EVENT device**: Generates events when pressed (like a doorbell) - NO visible widget
- **STATE device**: Has on/off state (like a light switch) - HAS visible widget

Physical wireless buttons (TS0041, TS0215A, scene switches, etc.) are **event-only** devices:
- They send press events (single, double, long, multi-press)
- They don't have an "on" or "off" state to display
- The `button.1` capability is configured with `maintenanceAction: true` which hides it from the main UI

### How to Use Wireless Buttons

#### ✅ Correct Usage: Flow Triggers

1. **Create a Flow**
2. **WHEN card**: Select your button device
3. **Choose trigger**:
   - "Button pressed" (single press)
   - "Button double-pressed"
   - "Button long-pressed"
   - "Button multi-pressed" (with click count)
4. **THEN card**: Add your desired action

**Example Flow:**
```
WHEN: Living Room Button pressed
THEN: Toggle Living Room Lights
```

#### ❌ Incorrect Expectation: Clickable Widget

You cannot click the button in the Homey app to trigger actions. The physical button must be pressed.

---

## Device Types with Event-Only Buttons

### Wireless Button Controllers
- `button_wireless_1` (1-gang)
- `button_wireless_2` (2-gang)
- `button_wireless_3` (3-gang)
- `button_wireless_4` (4-gang)
- `button_wireless_6` (6-gang)
- `button_wireless_8` (8-gang)

### Scene Switches
- `scene_switch_1` (1-gang)
- `scene_switch_2` (2-gang)
- `scene_switch_3` (3-gang)
- `scene_switch_4` (4-gang)
- `scene_switch_6` (6-gang)

### SOS/Emergency Buttons
- `sos_button` (TS0215A and similar)

---

## Battery Reporting

### Why Battery Shows Unknown

Wireless buttons are **sleepy devices** (end devices) that only wake up when:
1. Button is pressed
2. Periodic heartbeat (every 4 hours typically)

**Battery reporting behavior:**
- May show "unknown" for first few hours after pairing
- Updates automatically when device wakes up
- Press the button to force immediate wake and battery read

**If battery stays unknown after 24 hours:**
1. Press the button multiple times
2. Check device settings for battery threshold configuration
3. Re-pair the device (bindings are set during pairing)

---

## Flow Card Availability

All button drivers provide these flow triggers:

### Standard Triggers
- **Button pressed** - Single press detection
- **Button double-pressed** - Double-tap detection (if supported)
- **Button long-pressed** - Hold detection
- **Button multi-pressed** - Multiple rapid presses with click count token

### Additional Triggers (device-specific)
- **Battery level changed** - Fires when battery % updates
- **SOS button pressed** - For emergency buttons (TS0215A)

---

## Troubleshooting

### "No response through flows"

**Checklist:**
1. ✅ Is the flow trigger card configured correctly?
2. ✅ Did you select the correct button device in the WHEN card?
3. ✅ Is the button physically pressed (not clicked in app)?
4. ✅ Check flow execution logs in Homey app
5. ✅ Try re-pairing the device (bindings set during pairing)

**Common issues:**
- Wrong device selected in flow
- Button press not detected (needs re-pairing)
- Multiple button device - selected wrong button number
- Device not fully paired (timeout during pairing)

### "No GUI button in device settings"

**This is CORRECT behavior** - buttons are event-only, not widgets.

If you need a virtual button widget:
1. Use a **Virtual Device** from the Homey Virtual Devices app
2. Create flows linking physical button → virtual button
3. The virtual button will have a clickable widget

### "Battery not updating"

**Solutions:**
1. Press button to wake device
2. Wait 4 hours for automatic heartbeat
3. Check battery is correctly installed (check polarity)
4. Re-pair device if battery still shows unknown after 24h

---

## Technical Details

### Capability Configuration

```json
{
  "capabilities": ["button.1", "measure_battery"],
  "capabilitiesOptions": {
    "button.1": {
      "maintenanceAction": true,  // Hidden from main UI
      "getable": false,            // Cannot read current state
      "setable": false             // Cannot set state programmatically
    }
  }
}
```

### Why maintenanceAction: true?

- Prevents confusing UI with non-functional button widget
- Follows Homey SDK best practices for event-only devices
- Matches behavior of other Zigbee button apps

### Cluster Bindings

Wireless buttons use multiple detection methods:
- **Scenes cluster (0x0005)**: Scene recall commands
- **OnOff cluster (0x0006)**: On/off commands
- **MultistateInput cluster (0x0012)**: State value changes
- **IAS ACE cluster (0x0501)**: SOS/emergency buttons
- **Tuya DP commands**: Manufacturer-specific events

All bindings are configured during pairing. **Re-pairing is required** if button stops responding.

---

## Support

If your button still doesn't work after following this guide:

1. **Generate diagnostic report** from device settings
2. **Post on forum** with:
   - Device model/manufacturer ID
   - Diagnostic report ID
   - Description of issue
   - Flow configuration screenshot
3. **Check for app updates** - fixes are released regularly

---

**Last Updated**: v5.5.775
**Forum Thread**: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352
