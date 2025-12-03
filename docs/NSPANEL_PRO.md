# NSPanel Pro + Homey Pro Integration Guide

## Table of Contents
1. [Zigbee Devices (Sensors, Sirens)](#1-zigbee-devices-sensors-sirens)
2. [NSPanel Pro as Dashboard](#2-nspanel-pro-as-dashboard)
3. [NSPanel Pro Zigbee Router Mode](#3-nspanel-pro-zigbee-router-mode)
4. [Troubleshooting](#4-troubleshooting)

---

## 1. Zigbee Devices (Sensors, Sirens)

### Method: Pair **directly** to Homey Pro via "Universal Tuya Zigbee" app.

> **IMPORTANT**: Do NOT pair Sonoff Zigbee devices to NSPanel first. Pair them directly to Homey Pro for full integration with Homey Flows.

### Supported Sonoff Zigbee Devices:

| Device | Type | Homey Capabilities |
|--------|------|-------------------|
| SNZB-01/01P | Wireless Button | button, measure_battery |
| SNZB-02/02D/02P | Temp/Humidity | measure_temperature, measure_humidity, measure_battery |
| SNZB-03/03P | Motion Sensor | alarm_motion, measure_battery |
| SNZB-04/04P | Door/Window | alarm_contact, measure_battery |
| SNZB-05P | Water Leak | alarm_water, measure_battery |
| SNZB-06P | Presence (mmWave) | alarm_motion, measure_luminance |
| ZBMINI/ZBMINI-L/L2 | Relay Switch | onoff |
| BASICZBR3 | DIY Relay | onoff |
| S31ZB/S40ZB/S60ZB | Smart Plug | onoff, measure_power, meter_power |
| TRVZB | Radiator Valve | target_temperature, measure_temperature |
| ZBCurtain | Curtain Motor | windowcoverings_state |

### Pairing Steps:

1. Open **Homey App** → **Devices** → **+** (Add Device)
2. Select **Universal Tuya Zigbee**
3. Choose the driver matching your device (e.g., "SONOFF SNZB-02")
4. Put your Sonoff device in pairing mode:
   - **Sensors**: Press and hold button for 5 seconds until LED blinks rapidly
   - **Switches**: Press button 5 times rapidly
5. Device will pair to Homey. KPIs (battery, temperature, etc.) will auto-populate.

---

## 2. NSPanel Pro as Dashboard

The NSPanel Pro runs **Android 8**, making it possible to use as a **wall-mounted Homey dashboard**.

### Requirements:
- NSPanel Pro 86 or 120
- Computer with ADB installed
- NSPanel Pro connected to same network

### Step-by-Step Guide:

#### Step 1: Enable Developer Mode on NSPanel Pro

```
1. Open eWeLink app
2. Go to NSPanel Pro settings
3. Tap 8 times on "Device ID" field
4. Developer mode is now enabled
5. Note the IP address shown
```

#### Step 2: Connect via ADB

```bash
# Install ADB on your computer (if not installed)
# Windows: Download platform-tools from developer.android.com
# Mac: brew install android-platform-tools
# Linux: sudo apt install adb

# Connect to NSPanel Pro
adb connect <nspanel-ip-address>

# Example:
adb connect 192.168.1.100

# Verify connection
adb devices
```

#### Step 3: Download and Install Homey App

```bash
# Download Homey APK from Homey Developer Portal
# (You need a Homey account)

# Install APK to NSPanel Pro
adb install homey-pro-x.x.x.apk

# Or if updating:
adb install -r homey-pro-x.x.x.apk
```

#### Step 4: Launch and Configure

```bash
# Launch Homey app
adb shell am start -n com.athom.homey/.MainActivity

# Or use the NSPanel Pro launcher to find the Homey app
```

1. Log in with your Homey Cloud account
2. Select your Homey Pro from the list
3. The NSPanel Pro is now a **wall-mounted Homey dashboard**!

### Result:
- All your Homey devices (including Sonoff sensors) can be controlled from the panel
- Create custom dashboards
- View device states and trigger Flows

---

## 3. NSPanel Pro Zigbee Router Mode

Since firmware **V2.2.0**, NSPanel Pro can work as a **Zigbee Router** instead of a Coordinator.

### What does this mean?

| Mode | Description |
|------|-------------|
| **Coordinator** (default) | NSPanel creates its own Zigbee network. Sub-devices are NOT visible to Homey. |
| **Router** | NSPanel joins Homey's Zigbee network and acts as a signal repeater/extender. |

### Enable Router Mode:

1. Open **eWeLink app**
2. Go to **NSPanel Pro settings**
3. Navigate to **Device Settings** → **Pilot Features** → **Zigbee Mode**
4. Switch from **Gateway Mode** to **Router Mode**
5. NSPanel Pro will reboot

### After Enabling Router Mode:

- NSPanel Pro will extend your Homey Zigbee network range
- Any sensors previously paired to NSPanel need to be re-paired to Homey
- NSPanel Pro becomes invisible as a Zigbee device (it's infrastructure only)

---

## 4. Troubleshooting

### Devices not pairing to Homey

1. Ensure device is in pairing mode (LED blinking rapidly)
2. Move device closer to Homey Pro (< 2 meters during pairing)
3. If device was paired to NSPanel before:
   - Reset device (long press ~10 seconds)
   - Factory reset removes old network
4. Check Homey Developer Tools for pairing logs

### NSPanel Pro ADB connection issues

```bash
# If connection refused:
adb kill-server
adb start-server
adb connect <ip>

# If unauthorized:
# Check NSPanel Pro screen for authorization prompt
# Accept the connection on the panel
```

### Battery-powered sensors show old values

- Battery sensors only wake up periodically (every 1-4 hours)
- First values may take up to 1 hour to appear
- Trigger the sensor manually (open door, move in front of PIR) to force update

### Energy monitoring not working (S31ZB/S40ZB)

- Some regions have models without power metering (S31 Lite, S40 Lite)
- Check if model ends in "Lite" = no power metering
- Full models (S31ZB, S40ZB) have metering cluster 0x0702

---

## Useful Links

- [Sonoff Official Website](https://sonoff.tech/)
- [Zigbee Device Database](https://zigbee.blakadder.com/)
- [Zigbee2MQTT Sonoff Devices](https://www.zigbee2mqtt.io/supported-devices/#v=SONOFF)
- [Homey Developer Documentation](https://apps.developer.homey.app/)
- [eWeLink Community](https://ewelinkcommunity.net/)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 5.3.37 | 2025-12 | Initial SONOFF integration documentation |

---

*This documentation is part of the Universal Tuya Zigbee app for Homey Pro.*
*Author: Dylan Rajasekaram*
