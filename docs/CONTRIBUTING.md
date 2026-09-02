# Contributing Guide

Full rules: **[`.github/CONTRIBUTING.md`](../.github/CONTRIBUTING.md)**  
Troubleshooting: **[`guides/USER_TROUBLESHOOTING.md`](guides/USER_TROUBLESHOOTING.md)**  
Layers: **[`architecture/LAYERS_CAPABILITY_PROTOCOL.md`](architecture/LAYERS_CAPABILITY_PROTOCOL.md)**

## How to report a device issue

1. Homey diagnostic **Log ID** (Apps → Universal Tuya → Diagnostics).
2. Sacred couple: `manufacturerName` (`_TZxxxx…`) + `productId` / modelId (`TSxxxx`).
3. Expected vs actual (wrong driver, missing cap, crash, battery).
4. App version (prefer Homey **Test** tip).

Use `.github/ISSUE_TEMPLATE/` — do not paste unchecked AI walls.

## Thanks

[gpmachado/com.gpm.homesuite](https://github.com/gpmachado/com.gpm.homesuite) (GPL-3.0) was studied for field behaviour (availability, rejoin, Poll Control skip, settings-as-labels, no dead settings, jitter). We reimplement under MIT — no HomeSuite sources in this tree. See `CREDITS.md` and `NOTICE`. Knowledge cache: `.ai/KNOWLEDGE_CACHE.json` → `recentDiscoveries`.

BSEED wall dimmer (`_TZE284_m1cvyneb`+TS0601): `reports/P2138_BSEED_WALL_DIMMER_2026-08-17.md` · troubleshooting: `guides/USER_TROUBLESHOOTING.md`.

## Local checks

```bash
npm ci
node --check drivers/**/device.js   # or targeted paths
node tools/ci/gmail-crash-pattern-gate.js --json
```

Push runs pre-commit / pre-push gates (mandatory files, publish size, security).

## Driver layout

```
drivers/<id>/
  driver.compose.json   # zigbee fingerprints + capabilities (static pairing)
  device.js             # thin — prefer mixins / BatteryMasterEngine / safeSetCapabilityValue
  driver.flow.compose.json
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
| Version | v9.0.795 |
| Drivers | 431 |
| Fingerprints | 16,213 |
| Last Updated | 2026-09-02 |


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
Identity is always **mfr + productId**. See dual-app rules in `.github/CONTRIBUTING.md`.
