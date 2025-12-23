# Button Interview Wake-up Guide - Sleepy Device Solutions

## Problem
Button interviews take extremely long time or fail completely due to sleepy device behavior.

## Root Cause Analysis
**Wireless buttons are "End Devices"** that sleep most of the time to conserve battery:
- Only wake on button press or periodic heartbeat (typically 4+ hours)
- ZCL interview requires device to be awake for extended period
- Default interview timeout may be insufficient

## Solutions (In Order of Effectiveness)

### Method 1: Battery Reset + Immediate Interview
1. **Remove battery** completely for 30+ seconds
2. **Reinstall battery** - device will wake briefly
3. **Immediately start interview** while device is initializing
4. **Press button repeatedly** during interview to keep awake

### Method 2: Force Wake-up Sequence
1. **Press and hold button** for 10+ seconds until LED changes
2. **Release and immediately press** 5 times rapidly
3. **Device should enter pairing mode** (rapid LED blinking)
4. **Start interview immediately** in this mode

### Method 3: MOES Gateway Method (Cyril's Success)
Some users report success by:
1. **Add to MOES gateway** first (forces full wake-up)
2. **Remove from MOES** (device stays partially awake)
3. **Immediately add to Homey** and start interview

### Method 4: Extended Interview with Keep-Alive
1. Start interview normally
2. **Press button every 30 seconds** during interview
3. **Be patient** - can take 1+ hours for sleepy devices
4. **Don't cancel** - let it complete naturally

## Device-Specific Wake-up Methods

### TS0041/TS0042/TS0043/TS0044 Buttons
- **Triple-click** rapidly to enter pairing mode
- **Hold for 8+ seconds** then release for reset mode
- Some variants require **5 quick presses** after long hold

### Scene Switches (4-gang)
- **Hold multiple buttons** simultaneously for 5+ seconds
- **Press corner buttons** in sequence: 1-2-3-4-1
- **Factory reset**: Hold button 1+4 for 10+ seconds

### TS0215A SOS Buttons
- **Remove from back casing** to access hidden reset button
- **Press hidden reset** while installing battery
- **SOS button + small button** simultaneously for 8 seconds

## Troubleshooting Extended Interviews

### If Interview Stalls at 90%+
- **Don't cancel** - often completes after 10+ minute delay
- **Keep pressing button** every 60 seconds
- **Check Zigbee mesh strength** - weak signal causes timeouts

### If Interview Fails Completely
- **Factory reset device** (see method 2 above)
- **Move closer to Homey** during interview (< 2 meters)
- **Remove other Zigbee traffic** during interview
- **Try generic Zigbee first**, then switch to Tuya driver

### Error: "Interview timeout" or "Device not responding"
- Device went back to sleep mid-interview
- **Restart interview** and press button immediately
- **Use Method 3** (MOES gateway) if repeatedly fails

## Prevention Tips

### For Future Interviews
- **Schedule during device active periods** (right after button press)
- **Prepare wake-up method** before starting interview
- **Clear Zigbee network** of other activities
- **Use strong coordinator** (Homey Pro close to device)

### Battery Management
- **Fresh batteries** respond better to wake-up commands
- **Low battery devices** may not stay awake long enough
- **Replace battery** if device is >1 year old

## Success Indicators

### Good Signs During Interview
- LED blinks regularly (device awake)
- Interview progress advances every 30-60 seconds
- Device responds to button presses with LED feedback

### Warning Signs
- LED goes dark for >2 minutes (sleeping)
- Interview stuck at same % for >5 minutes
- No LED response to button presses (battery/connection issue)

## Community Solutions

**Cyril's Method** (Proven Success):
1. MOES gateway pairing first
2. Remove from MOES
3. Immediate Homey pairing
4. Works consistently for stubborn devices

**Alternative Methods**:
- Multiple short interviews (let device sleep between attempts)
- Interview during device "chatty period" (first hour after battery install)
- Use Zigbee sniffer to identify optimal wake windows

## Technical Background

### Why Buttons Sleep
- **Battery conservation**: 2-year battery life requirement
- **Zigbee End Device role**: No routing, minimal wake periods
- **Tuya optimization**: Extra aggressive power saving

### Interview Requirements
- **Multiple cluster reads**: Basic, PowerConfig, OnOff, Scenes, etc.
- **Binding setup**: For proper event reporting
- **Attribute configuration**: Button press reporting setup
- **Total time needed**: 5-15 minutes of awake time

Contact: Dylan Rajasekaram for additional support
