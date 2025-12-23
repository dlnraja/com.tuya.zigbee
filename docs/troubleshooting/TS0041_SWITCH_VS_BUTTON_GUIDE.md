# TS0041 Switch vs Button - Troubleshooting Guide

## Problem
Some TS0041 devices are recognized as **virtual devices** instead of functional switches or buttons, making them uncontrollable.

## Root Cause
TS0041 devices can function as either:
- **Wall Switch** (1-gang switch with relay)
- **Wireless Button** (battery-powered remote)

The manufacturer ID determines the correct driver assignment.

## Solution Steps

### 1. Identify Your TS0041 Type

**Physical Identification:**
- **Switch**: Wired installation, controls lights/loads directly
- **Button**: Battery-powered, wireless remote control

### 2. Get Device Information

1. Uninstall from Universal Tuya app
2. Add as **Generic Zigbee** device
3. Go to [Homey Developer Tools](https://tools.developer.homey.app/tools/zigbee)
4. Run device interview
5. Note the `manufacturerName` ID

### 3. Check Driver Support

**Switch Driver** (`switch_1gang`):
- Supported IDs: `_TZ3000_yj6k7vfo`, `_TZ3000_...` (50+ variants)
- Function: Controls connected load via relay

**Button Driver** (`button_wireless`):
- Supported IDs: `_TZ3000_arfwfgoa`, `_TZ3000_fkvaniuu`, `_TZ3000_yj6k7vfo`, etc.
- Function: Sends button press events (single/double/long)

### 4. Manual Device Assignment

If device installs as virtual:

1. **Remove device** from Homey
2. **Disable** Universal Tuya app temporarily
3. **Re-pair** device as Generic Zigbee
4. **Enable** Universal Tuya app
5. **Force driver selection**:
   - Switch: Choose "Wall Switch 1-Gang"
   - Button: Choose "Wireless Button"

### 5. Missing Manufacturer ID

If your manufacturer ID is missing:

1. **Get interview data** (step 2)
2. **Report to developer** with:
   - Manufacturer ID: `_TZ3000_xxxxxxxx`
   - Device type: Switch or Button
   - Physical description
   - Interview JSON data

## Common Manufacturer IDs

### Switch (wall-mounted, wired)
- `_TZ3000_yj6k7vfo`
- `_TZ3000_w0qqde0g`
- `_TZ3000_xkap8wtb`
- `_TZ3000_npzfdcd8`

### Button (wireless, battery)
- `_TZ3000_arfwfgoa`
- `_TZ3000_fkvaniuu`
- `_TZ3000_lq01`
- `_TZ3000_wqxwpita`

## Advanced Troubleshooting

### Force Wake-up (Buttons)
If button interview fails:
1. **Remove battery** for 30 seconds
2. **Reinstall battery**
3. **Press and hold** button for 10+ seconds
4. **Retry interview** immediately

### Reset Device
1. **Hold button** for 10 seconds until LED flashes
2. **Release and quickly press** 5 times
3. **Device should blink rapidly** (reset mode)
4. **Re-pair** with Homey

### Alternative Method
Some users report success by:
1. **Pairing with MOES gateway** first
2. **Removing from MOES**
3. **Re-pairing with Homey**

## Support

If issues persist, provide:
- Device interview JSON
- Manufacturer ID
- Physical device photos
- Detailed error description

Contact: Dylan Rajasekaram via Homey Community Forum
