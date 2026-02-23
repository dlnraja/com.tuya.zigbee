# Contributing Guide

## How to Report a Device Issue

### 1. Get Device Interview
1. Open Homey Developer Tools: `https://developer.homey.app`
2. Go to Devices → Select your device
3. Copy the full interview JSON

### 2. Include Required Info
- `manufacturerName` and `modelId`
- Physical device type (sensor, switch, plug, etc.)
- Expected behavior vs actual behavior
- Homey app version

### 3. Submit Issue
Use the GitHub issue template with your device interview.

---

## How to Test

```bash
# Install dependencies
npm install

# Validate app
npx homey app validate

# Run locally
npx homey app run
```

---

## Driver Structure

```
drivers/
  my_device/
    driver.compose.json   ← Device fingerprints
    driver.js             ← Driver logic
    device.js             ← Device logic
    driver.flow.compose.json ← Flow cards
```

---

## Adding a New Device

1. Check if `manufacturerName` already exists in another driver
2. Add to correct `driver.compose.json` with UPPER + lowercase
3. Test with `npx homey app validate`
4. Submit PR

---

## Flow Card Guidelines

All Flow Cards must use `_safeDeviceHandler` wrapper:
```javascript
card.registerRunListener(this._safeDeviceHandler(async (args) => {
  // Your logic here
}, 'card_name', false));
```

## Project Stats

| Metric | Value |
|--------|-------|
| Version | v5.11.21 |
| Drivers | 138 |
| Fingerprints | 5 644 |
| Last Updated | 2026-02-23 |


## How to Add a Device

1. Get your device fingerprint from Homey Developer Tools
2. Find the matching driver in `drivers/` directory
3. Add the fingerprint to `driver.compose.json`
4. Test with `homey app run`
5. Submit a PR or open an issue


## Bug Reports

- Use the [Bug Report template](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=02_bug_report.yml)
- Include your device fingerprint (`_TZxxxx_xxxxx`)
- Include Homey developer tools diagnostic report
- Issues are auto-triaged and responses generated daily


## Device Finder

Check [Device Finder](https://dlnraja.github.io/com.tuya.zigbee/) to see if your device is already supported.
Each device card includes a bug report button that creates a pre-filled issue.

