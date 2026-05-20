# Tuya Unified Zigbee App for Homey

<!-- AUTO-UPDATED: Do not edit badges manually - updated by GitHub Actions -->
[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdlnraja%2Fcom.tuya.zigbee%2Fmaster%2Fapp.json&query=%24.version&label=version&color=blue)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Fingerprints](https://img.shields.io/badge/fingerprints-10,938+-green)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Drivers](https://img.shields.io/badge/drivers-228-brightgreen)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Flow Cards](https://img.shields.io/badge/flow%20cards-2,453-blue)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![SDK](https://img.shields.io/badge/SDK-3-orange)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![License](https://img.shields.io/badge/license-GPL--3.0-red)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/LICENSE)
[![Homey](https://img.shields.io/badge/Homey-Pro-blueviolet)](https://homey.app/a/com.dlnraja.tuya.zigbee/)

A community-driven Homey app that brings local control to Tuya Zigbee devices — no cloud, no internet needed. Covers switches, sensors, lights, thermostats, covers, locks, and more across **228 drivers** and **10,938+ device fingerprints**.

**Key features:**
- **Local-only** — everything runs on your Homey, nothing goes to the cloud
- **Hybrid mode** — auto-detects whether a device speaks Tuya DP or standard ZCL
- **Smart battery** — voltage-based fallback when devices don't report percentage
- **2,453+ flow cards** — triggers, conditions & actions in EN, FR, NL, DE
- **SDK3** — built on the latest Homey platform

---

## Installation

| Method | Link |
|--------|------|
| **Homey App Store** | [Install from Homey App Store](https://homey.app/a/com.tuya.zigbee/) |
| **Test Version** | [Install Test Version](https://homey.app/a/com.tuya.zigbee/test/) |
| **GitHub Releases** | [View Releases](https://github.com/dlnraja/com.tuya.zigbee/releases) |

---

## 🚀 Latest Updates

<!-- CHANGELOG_START - Auto-updated from .homeychangelog.json -->
### ✨ Recent Changes (May 2026)

| Version | Feature |
|---------|---------|
| **v7.5.48** | Fix clamp ammeter incoherent watt/voltage scaling, add SONOFF wireless button... |
| **v7.5.47** | v7.5.46: No changes. |
| **v7.5.46** | v7.5.46 - Maintenance release. No new devices or fixes. |
| **v7.5.45** | Bug fixes across 7 drivers including humidifier, motion_sensor_2, dimmer_dual... |
| **v7.5.44** | Bug fixes for wireless buttons, remote buttons, and scene switches. Critical ... |
| **v7.5.43** | Bug fixes: wall flow cards on multi-gang switches, wireless button reliabilit... |
| **v7.5.42** | v7.5.41: Fixed battery endpoint scan handling for better battery device detec... |
| **v7.5.41** | v7.5.41 - 3,202 new fingerprints from ZHA, Z2M, Z-Link and ZCT. Battery endpo... |
| **v7.5.40** | Bug fix: Empty battery reports on sleepy devices resolved with adaptive batte... |
| **v7.5.39** | Updated 3202 fingerprints across 228 drivers. Added new device support and mi... |
<!-- CHANGELOG_END -->



## Statistics

| Metric | Value |
|--------|-------|
| **App Version** | v7.5.49 |
| **Device Fingerprints** | 10,938+ |
| **Unique Product IDs** | 560 |
| **Drivers** | 228 (178 Zigbee + 50 WiFi) |
| **Flow Cards** | 2,453 |
| **Unique Capabilities** | 135 |
| **SVG Icons** | 388 |
| **Languages** | EN, FR, NL, DE |
| **SDK Version** | 3 |
| **Homey Compatibility** | >=12.2.0 |
| **Last Updated** | 2026-05-19 |

### Top 20 Drivers by Fingerprint Count

| # | Driver | Fingerprints |
|---|--------|-------------|
| 1 | `climate_sensor` | 2,029 |
| 2 | `switch_1gang` | 986 |
| 3 | `radiator_valve` | 524 |
| 4 | `plug_energy_monitor` | 444 |
| 5 | `dimmer_wall_1gang` | 384 |
| 6 | `curtain_motor` | 361 |
| 7 | `generic_tuya` | 352 |
| 8 | `presence_sensor_radar` | 298 |
| 9 | `contact_sensor` | 264 |
| 10 | `bulb_rgbw` | 259 |
| 11 | `switch_2gang` | 255 |
| 12 | `motion_sensor` | 251 |
| 13 | `switch_4gang` | 236 |
| 14 | `diy_custom_zigbee` | 206 |
| 15 | `thermostat_tuya_dp` | 201 |
| 16 | `switch_3gang` | 184 |
| 17 | `bulb_tunable_white` | 138 |
| 18 | `water_leak_sensor` | 136 |
| 19 | `generic_diy` | 129 |
| 20 | `bulb_dimmable` | 120 |

### Drivers by Device Class

| Class | Count |
|-------|-------|
| sensor | 60 |
| socket | 53 |
| light | 24 |
| other | 19 |
| thermostat | 18 |
| remote | 17 |
| fan | 10 |
| windowcoverings | 5 |
| doorbell | 4 |
| lock | 4 |
| heater | 4 |
| garagedoor | 3 |
| button | 2 |
| curtain | 2 |
| camera | 1 |
| vacuumcleaner | 1 |
| speaker | 1 |

---

## Latest Updates

<!-- CHANGELOG_START - Auto-updated from .homeychangelog.json -->

| Version | Changes |
|---------|---------|
| **v7.5.49** | v7.5.48: clamp_meter: corrected incoherent watt/voltage scaling using safeDivide instead of safeMultiply, Integrated ... |
| **v7.5.48** | Bug fix: clamp meter watt/voltage scaling corrected. New fingerprints added across multiple drivers. Flow repair tool... |
| **v7.5.47** | v7.5.46: No changes. |
| **v7.5.46** | v7.5.46 - Maintenance release. No new devices or fixes. |
| **v7.5.45** | Bug fixes across 7 drivers including humidifier, motion_sensor_2, dimmer_dual_channel, smart_button_switch, and pet_f... |
| **v7.5.44** | Bug fixes for wireless buttons, remote buttons, and scene switches. Critical runtime errors resolved in button devices. |
| **v7.5.43** | Bug fixes: wall flow cards on multi-gang switches, wireless button reliability, climate sensor battery/pressure, part... |
| **v7.5.42** | v7.5.41: Fixed battery endpoint scan handling for better battery device detection, Fixed Fingerbot capability registr... |
| **v7.5.41** | v7.5.41 - 3,202 new fingerprints from ZHA, Z2M, Z-Link and ZCT. Battery endpoint scan fix, Fingerbot capability timin... |
| **v7.5.40** | Bug fix: Empty battery reports on sleepy devices resolved with adaptive battery listeners and ZCL/IAS fallbacks. |
| **v7.5.39** | Updated 3202 fingerprints across 228 drivers. Added new device support and minor fixes. |
| **v7.5.38** | No user-facing changes in this release. |
| **v7.5.37** | Fix all runtime syntax errors, resolve unclosed braces, add support for wall_remote_2_gang assets and validate SDK3 c... |
| **v7.5.35** | v7.5.34: Fixed condition card registration in `air_quality_comprehensive` and `din_rail_meter` drivers (resolved runt... |
| **v7.5.34** | v7.5.34: Fixed condition card registration in air_quality_comprehensive and din_rail_meter drivers. Standardized butt... |

<!-- CHANGELOG_END -->

---

## Key Features

### Dual Protocol Support
- **Tuya DP Protocol** (Cluster 0xEF00) - For Tuya-specific devices
- **Standard ZCL** - For native Zigbee 3.0 devices
- **Auto-Detection** - Observes device for 15 min, then picks the best protocol

### Smart Battery Management
- 8 battery chemistries supported
- 4 calculation algorithms
- Voltage-based fallback when percentage unavailable

### Energy Monitoring
- Full kWh, W, V, A support
- Configurable ZCL energy divisors
- Auto-removal of unused energy capabilities after 15 min

### Physical Button Detection
- 2000ms timeout-based detection
- Flow triggers for physical button presses per gang
- Deduplication to prevent duplicate triggers

---

## Supported Device Categories

| Category | Examples | Protocol |
|----------|---------|----------|
| **Switches** (1-8 gang) | Wall switches, smart relays, BSEED, Zemismart | ZCL + Tuya DP |
| **Dimmers** | Wall dimmers, LED dimmers, rotary knobs | ZCL + Tuya DP |
| **Lights** | RGB, RGBW, CCT bulbs, LED strips | ZCL |
| **Plugs & Sockets** | Smart plugs, energy monitors, power strips | ZCL + Tuya DP |
| **Sensors** | Temp/humidity, motion, contact, water leak, smoke, air quality | ZCL + Tuya DP |
| **Presence Radars** | mmWave, PIR+radar hybrid, HOBEIAN ZG-204ZM | ZCL + Tuya DP |
| **Thermostats & TRVs** | Radiator valves, floor heating, AVATTO, Moes | Tuya DP |
| **Covers** | Curtain motors, roller blinds, garage doors | Tuya DP + ZCL |
| **Buttons & Remotes** | Scene switches (1-4 button), SOS buttons, rotary | ZCL |
| **Locks** | Smart door locks, fingerprint locks | Tuya DP |
| **Climate** | Air purifiers, fans, IR blasters, humidifiers | Tuya DP |
| **Water** | Valves, tank monitors, garden timers | Tuya DP |
| **WiFi Devices** | Tuya WiFi switches, plugs, sensors (via cloud API) | WiFi/Cloud |

### Supported Brands

> BSEED, Zemismart, Moes, AVATTO, Lonsonho, HOBEIAN, Lidl/Silvercrest, eWeLink/SONOFF, Girier, Benexmart, Owon, and **hundreds more** via Tuya OEM fingerprints.

---

## Architecture

```
Homey Pro
  └─ Tuya Unified Zigbee App (SDK3)
       ├─ Hybrid Protocol Engine
       │    ├─ Tuya DP (Cluster 0xEF00) ─ DP1-DP255 data points
       │    └─ Standard ZCL ─ onOff, levelControl, colorControl, etc.
       ├─ DeviceProfileRegistry (149 profiles)
       │    └─ Per-fingerprint: DP mappings, quirks, timing
       ├─ BatteryManager (8 chemistries, voltage fallback)
       ├─ PhysicalButtonMixin (2000ms detection)
       └─ 228 Drivers ─ 10,938+ fingerprints
```

---

## Data Sources

| Source | Usage |
|--------|-------|
| **[Zigbee2MQTT](https://www.zigbee2mqtt.io)** | Device discovery, DP mappings, manufacturer names |
| **[Blakadder](https://zigbee.blakadder.com)** | Cross-checking rebranded Tuya devices |
| **[ZHA / zigpy](https://github.com/zigpy/zha-device-handlers)** | Device signatures, custom quirks |
| **[deCONZ](https://github.com/dresden-elektronik/deconz-rest-plugin)** | REST plugin device data |
| **[CSA](https://csa-iot.org)** | Zigbee 3.0 certified products |
| **[Homey Community Forum](https://community.homey.app)** | User reports, device interviews |
| **[JohanBendz Fork](https://github.com/JohanBendz/com.tuya.zigbee)** | Community contributions |

---

## Automation Workflows

| Workflow | Schedule | Description |
|----------|----------|-------------|
| **Daily Everything** | Daily 2 AM UTC | Forum + GitHub auto-response with AI |
| **Forum Responder** | Every 6h | Monitors topics 140352, 26439 |
| **GitHub Scanner** | Mon/Thu | Issues, PRs, forks analysis |
| **Enrichment Scanner** | Mon/Thu | Z2M, ZHA, deCONZ, Blakadder sync |
| **Sunday Master** | Sunday 7 AM | Full triage, fork scan, forum scan |
| **Monthly Comprehensive** | 1st of month | Deep scan all sources |

---

## Known Firmware Limitations

| Issue | Affected Devices | Status |
|-------|-----------------|--------|
| **TS0601 Time Sync** | LCD climate sensors (_TZE284_*) | Some firmwares ignore Zigbee time responses |
| **Battery 0%** | TS0044 buttons (_TZ3000_wkai4ga5) | Reports 0% always - firmware bug |
| **Cloud-only devices** | Some TS0601 variants | MCU ignores local Zigbee commands |

> **Re-pairing required** after driver updates to apply new mappings.

---

## Development

### Prerequisites
- Node.js 18+
- Homey CLI: `npm install -g homey`

### Quick Start
```bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
homey app run
```

### Build & Validate
```bash
homey app build
homey app validate --level publish
homey app run
```

---

## Links

| | |
|---|---|
| **App Store** | [Tuya Unified Zigbee](https://homey.app/a/com.dlnraja.tuya.zigbee/) |
| **Test Version** | [Install Test](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) |
| **Forum** | [Community Thread](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352) |
| **Device Finder** | [Smart Device Finder](https://dlnraja.github.io/com.tuya.zigbee/) |
| **GitHub** | [github.com/dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) |
| **Issues** | [Report a Bug](https://github.com/dlnraja/com.tuya.zigbee/issues) |

---

## FAQ

<details>
<summary><strong>My device shows as "unknown Zigbee device"</strong></summary>

Your device's fingerprint (manufacturerName + productId) is not yet in the app. Open a GitHub issue with your device interview from [Homey Developer Tools](https://tools.developer.homey.app/tools/zigbee).
</details>

<details>
<summary><strong>Device paired but doesn't respond to commands</strong></summary>

1. Try re-pairing the device (remove and add again)
2. Check if it's a Tuya DP device (TS0601) — these need specific DP mappings
3. For BSEED/Zemismart: these are ZCL-only, ensure explicit binding is working
</details>

<details>
<summary><strong>Battery always shows 0%</strong></summary>

Some devices (e.g., TS0044 _TZ3000_wkai4ga5) have a firmware bug that always reports 0%. The app uses voltage-based fallback when available, but some devices don't report voltage either.
</details>

<details>
<summary><strong>Temperature/humidity values are wrong (divided by 10 or 100)</strong></summary>

This is usually a double-division bug. The app auto-detects divisors from Tuya DP values. If values are still wrong after re-pairing, open an issue with your exact manufacturerName.
</details>

<details>
<summary><strong>How to get the test version?</strong></summary>

Install from: [Test Version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) — this is auto-promoted from draft builds daily.
</details>

---

## Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feat/my-device`)
3. **Validate**: `homey app validate --level publish`
4. **Submit** a pull request with description

### Report a New Device
1. Get a **device interview** from [Homey Developer Tools](https://tools.developer.homey.app/tools/zigbee)
2. Check [Zigbee2MQTT](https://www.zigbee2mqtt.io/supported-devices/) for DP mappings
3. Check [Blakadder](https://zigbee.blakadder.com) for cross-references
4. Open an [issue](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=01_device_request.yml) with: **manufacturerName**, **modelId**, and **interview data**

### Report a Bug
1. Go to **Settings > Apps > Tuya Unified Zigbee > Send Diagnostics**
2. Open a [bug report](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=02_bug_report.yml) with: device model, error messages, and diagnostics code

---

## Support This Project

This app is developed in my free time, powered by passion and coffee!

| Method | Link |
|--------|------|
| **PayPal** | [@dlnraja](https://paypal.me/dlnraja) |
| **Revolut** | [Revolut.Me](https://revolut.me/dylanoul) |

100% optional - Your feedback and bug reports are equally valuable!

---

## Credits & Thanks

A massive thank you to the maintainers and contributors of:
- **[Koenkk](https://github.com/Koenkk)** and all contributors to **Zigbee2MQTT**
- **[blakadder](https://github.com/blakadder)** and the Zigbee Device Compatibility Repository
- The **zigpy / ZHA / zha-device-handlers** maintainers
- The **CSA (Connectivity Standards Alliance)** for the Zigbee specifications
- All developers and testers who share device logs, diagnostics, and fingerprints

---

## License

**GPL-3.0** - See [LICENSE](./LICENSE) file

| Project | License |
|---------|---------|
| Zigbee2MQTT | GPL-3.0 |
| ZHA | Apache-2.0 |
| Blakadder | MIT |
| deCONZ | BSD-3-Clause |

---

**Made with love by Dylan Rajasekaram & the Zigbee community**

*Last updated: 2026-05-19*
### Tuya Zigbee
Adds support for Tuya Zigbee devices

Some of the supported White Label Brands:
- Alecto
- Alice
- Avatto
- Benexmart
- BSEED
- Blitzwolf
- eWeLight
- GiEX
- GIRIER
- Hangzlou
- Inmax
- Lidl
- Livarno LUX
- Lonsonho
- LoraTap
- Luminea
- Malmbergs
- Melinera
- MOES
- Nedis
- Neo
- Nous
- ONENUO
- Samotech
- Silvercrest
- Smart9
- Tenky
- Tongou
- UseeLink
- Woox
- YANDHI
- Zemismart
and many more..

Supported devices:

**Sensors**
- Temperature and Humidity Sensor
    TUYATEC-g3gl6cgy / RH3052
    TUYATEC-Bfq2i2Sy / RH3052
    TUYATEC-abkehqus / RH3052
    TUYATEC-yg5dcbfu / RH3052
    TUYATEC-prhs1rsd / RH3052
    TUYATEC-gqhxixyk / RH3052
    TUYATEC-vmgh3fxd / RH3052
    TUYATEC-ojmxeikg / RH3052
    TUYATEC-1g3tawnp / RH3052
    _TZ3000_i8jfiezr / TS0201
    TUYATEC-v3uxbuxy / RH3052
    _TZ3000_bguser20 / TS0201
    _TZ3000_dowj6gyi / TS0201
    _TZ3000_fllyghyj / TS0201
    _TZ3000_8ybe88nf / TS0201
    _TZ3000_fie1dpkm / TS0201
    _TZ3000_0s1izerx / TS0201
    TUYATEC-ojmxeikq / RH3052
    TUYATEC-riuj5xzs / RH3052
    _TZ3000_xr3htd96 / TS0201 (Tenky)
    _TZ3000_saiqcn0y / TS0201
    TUYATEC-1uxx9cci / RH3052
    _TZE200_a8sdabtg / TS0601
    _TZ3000_utwgoauk / TS0601
    _TZE200_9yapgbuv / TS0601
    _TZ3000_f2bw0b6k / TS0201
    _TZ3000_zl1kmjqx / TS0201
    TUYATEC-HaoiuWzy / RH3052
    TUYATEC-qun7vq14 / RH3052
    _TZE200_yjjdcqsq / TS0601
    _TZE200_utkemkbs / TS0601
    _TZ3000_6uzkisv2 / TS0601

- LCD Temperature and Humidity Sensor
    _TZ2000_a476raq2 / TS0201
    _TZ2000_xogb73am / TS0201
    _TZ2000_avdnvykf / TS0201
    _TZ2000_hjsgdkfl / TS0201
    _TYZB01_a476raq2 / TS0201
    _TYZB01_hjsgdkfl / TS0201
    _TYZB01_iuepbmpv / TS0201
    _TZ3000_rusu2vzb / TS0201
    _TYZB01_cbiezpds / SM0201
    _TZE200_bjawzodf / TS0601
    _TZE200_zl1kmjqx / TS0601
    _TZE200_locansqn / TS0601
    _TZE204_yjjdcqsq / TS0601
    _TZ3000_yd2e749y / TS0201
    _TZ3000_ywagc4rj / TS0201
    _TZ3000_itnrsufe / TS0201
    _TZ3000_bjawzodf / TY0201
    _TZ3210_ncw88jfq / TY0201
    _TZE200_vvmbj46n / TY0201
    _TZE204_upagmta9 / TS0601
    _TZE200_cirvgep4 / TS0601
    _TZE200_bq5c8xfe / TS0601
    _TZE200_qyflbnbj / TS0601
    _TZE200_vs0skpuc / TS0601
    _TZE200_44af8vyi / TS0601

- LCD Temperature, Humidity and Luminance Sensor
    _TZ3000_qaaysllp / TS0201 (NEO)
    _TYZB01_ftdkanlj / TS0222
    _TYZB01_kvwjujy9 / TS0222
    _TZ3210_huzkzqyk / TS0201

- PIR Sensor
    TUYATEC-lha8pbwd / RH3040
    TUYATEC-zn9wyqtr / RH3040
    TUYATEC-53o41joc / RH3040
    TUYATEC-deetibst / RH3040
    TUYATEC-dgtxmihe / RH3040
    _TYZB01_jytabjkb / TS0202
    _TYZB01_dl7cejts / TS0202
    _TZ3000_mmtwjmaq / TS0202
    _TZ3000_kmh5qpmb / TS0202
    _TZ3000_msl6wxk9 / TS0202
    _TZ3000_mcxw5ehu / TS0202
    _TZ3000_otvn3lne / TS0202
    _TZ3000_6ygjfyll / TS0202
    _TZ3040_6ygjfyll / TS0202
    _TZ3040_bb6xaihh / TS0202
    TUYATEC-b5g40alm / RH3040
    _TZ3000_nss8amz9 / TS0202
    _TZ3000_lf56vpxj / TS0202
    TUYATEC-dxnohkpd / RH3040
    _TZ3000_bsvqrxru / TS0202
    _TYZB01_dr6sduka / TS0202 (TESLA)

- Motion Sensor
    TUYATEC-bd5faf9p / RH3040 (Nedis)
    _TZ1800_fcdjzz3s / TY0202 (Silvercrest / Lidl)
    _TZE200_3towulqd / TS0601
    _TZ3000_lf56vpxj / TS0202
    TUYATEC-zw6hxafz / RH3040
    _TZE200_bh3n6gk8 / TS0601
    _TZE200_1ibpyhdc / TS0601
    _TZE200_ttcovulf / TS0601
    _TZE200_kb5noeto / TS0601

- Door/Windows Sensor
    TUYATEC-g3gl6cgy / RH3001
    TUYATEC-Bfq2i2Sy / RH3001
    TUYATEC-abkehqus / RH3001
    TUYATEC-sb6t7ett / RH3001
    TUYATEC-rkqiqvcs / RH3001
    TUYATEC-crr8qb0p / RH3001
    _TZ3000_ebar6ljy / TS0203
    TUYATEC-kbqf60nt / RH3001
    TUYATEC-r9hgssol / RH3001
    TUYATEC-0l6xaqmi / RH3001
    TUYATEC-trhrga6p / RH3001
    TUYATEC-ip9ganvw / RH3001
    _TYZB01_xph99wvr / RH3001
    _TZ3000_2mbfxlzr / RH3001
    _TZ3000_402jjyro / RH3001
    _TZ3000_6jeesvrt / TS0203
    _TZ3000_26fmupbb / TS0203
    _TZ3000_bmg14ax2 / TS0203
    _TZ3000_oxslv1c9 / TS0203
    _TZ3000_bzxlofth / TS0203
    _TZ3000_bzxloft / TS0203
    _TZ3000_7tbsruql / TS0203
    _TZ3000_osu834un / TS0203
    _TZ3000_n2egfsli / TS0203
    _TZ3000_7d8yme6f / TS0203
    _TZ3000_rgchmad8 / TS0203
    _TZ3000_au1rjicn / TS0203
    _TZ3000_4ugnzsli / TS0203
    TUYATEC-7qunn4gq / RH3001
    _TZ3000_zgrffiwg / TS0203
    Immax / DoorWindow-Sensor-ZB3.0
    Visonic / MCT-340 E
    zbeacon / DS01
    _TZ3000_decxrtwa / TS0203
    _TZ3000_hkcpblrs / TS0203 (Avatto)
    _TZ3000_yxqnffam / TS0203 (Immax Neo)
    _TZ3000_9eeavbk5 / TS0203
    _TZ3000_bpkijo14 / TS0203
    _TZ3000_a33rw7ou / TS0203 (Zemismart)
    _TZ3000_6zvw8ham / TS0203
    _TZ3000_yfekcy3n / TS0203
    _TZ3000_cea5xugq / TS0203
    _TZ3000_rcuyhwe3 / TS0203
    _TZ3000_1bwpjvlz / TS0203
    _TZ3000_au2o5e6q / TS0203
    _TZ3000_uvti8nkd / TS0203
    _TZ3000_v7chgqso / TS0203
    _TZ3000_8yhypbo7 / TS0203
    _TZ1800_ejwkn2h2 / TY0203 (Silvercrest / Lidl)
    _TZ3000_cqlnswn0 / TY0203 (TESLA)
    _TZ3000_qrldbmfn / TS0203
    _TZ3000_gntwytxo / TS0203
    _TZ3000_c8zfad4a / TS0203 (GIRIER)

- Water Detector
    _TYZB01_sqmd19i1 / TS0207
    _TYST11_qq9mpfhw / q9mpfhw (Neo)
    _TZ3000_fxvjhdyl / TS0207
    _TZ3000_eit7p838 / TS0207 (Blitzwolf)
    _TZ3000_t6jriawg / TS0207
    _TZ3000_85czd6fy / TS0207
    _TZ3000_kyb656no / TS0207 (Meian)
    _TZ3000_0s9gukzt / TS0207 (Nous)
    _TZ3000_kstbkt6a / TS0207 (Hangzlou / IH-K655 / Aubess)
    _TZ3000_mugyhz0q / TS0207 (ONENUO)
    _TZ3000_upgcbody / TS0207 (ONENUO / Aubess)
    _TZ3000_k4ej3ww2 / TS0207 (Aubess)
    _TZ3000_6oabgtzv / TS0207
    _TZ3000_ocjlo4ea / TS0207
    _TZ3000_awvmkayh / TS0207 (Niceboy)

- Water Leak Sensor
    _TZE200_qq9mpfhw / TS0601
    _TZE200_jthf7vb6 / TS0601

- Flood Sensor
    TUYATEC-3tipnsrx / RH3001
    _TZ3000_4uvovz4r / TS0207
    _TZ3000_3dfewsk1 / TS0207
    _TZ3000_ww9i3e0y / TS0207
    _TZ3000_wuep9zng / TS0207

- Smoke Sensor
    _TYZB01_dsjszp0x / TS0205
    _TZE200_ntcy3xu1 / TS0601
    _TZE200_m9skfctm / TS0601
    _TZ3210_up3pngle / TS0205
    _TZE200_rccxox8p / TS0601
    _TZE200_vzekyi4c / TS0601
    _TYZB01_wqcac7lo / TS0205
    _TZE204_ntcy3xu1 / TS0601
    _TZE200_t5p1vj8r / TS0601
    _TZE200_uebojraa / TS0601
    _TZE200_yh7aoahi / TS0601

- Soil humidity sensor
    _TZE200_myd45weu / TS0601 (GiEX)
    _TZE200_ga1maeof / TS0601
    _TZE200_9cqcpkgb / TS0601
    _TZE204_myd45weu / TS0601
    _TZE284_aao3yzhs / TS0601
    _TZE284_sgabhwa6 / TS0601
    _TZE200_2se8efxh / TS0601
    _TZE284_g2e6cpnw / TS0601

- Radar Sensor
    _TZE200_ztc6ggyl / TS0601
    _TZE201_ztc6ggyl / TS0601
    _TZE202_ztc6ggyl / TS0601
    _TZE203_ztc6ggyl / TS0601
    _TZE204_ztc6ggyl / TS0601
    _TZE204_qasjif9e / TS0601
    _TZE204_ijxvkhd0 / TS0601
    _TZE204_sxm7l9xa / TS0601
    _TZE200_2aaelwxk / TS0225
    _TZE200_sgpeacqp / TS0601
    _TZE204_xsm7l9xa / TS0601
    _TZE200_wukb7rhc / TS0601
    _TZE200_xpq2rzhq / TS0601
    _TZE200_holel4dk / TS0601
    _TZE200_jva8ink8 / TS0601
    _TZE200_lyetpprm / TS0601
    _TZE200_ikvncluo / TS0601
    _TZE204_ztqnh5cg / TS0601
    _TZE204_7gclukjs / TS0601

- Air Detection Box
    _TZE200_yvx5lh6k / TS0601
    _TZE200_8ygsuhe1 / TS0601
    _TZE200_mja3fuja / TS0601
    _TZE200_ryfmq5rl / TS0601
    _TZE200_c2fmom5z / TS0601

- Rain sensor
    _TZ3210_tgvtvdoc / TS0207

**Plugs, Sockets and Socket Strips**
- Smart Plug, with metering
    _TZ3000_3ooaz3ng / TS0121
    _TYZB01_iuepbmpv / TS0121
    _TZ3000_g5xawfcq / TS0121
    _TZ3000_vtscrpmw / TS0121
    _TZ3000_rdtixbnu / TS0121
    _TZ3000_8nkb7mof / TS0121
    _TZ3000_mraovvmm / TS011F (Blitzwolf)
    _TZ3000_cphmq0q7 / TS011F
    _TZ3000_ew3ldmgx / TS011F
    _TZ3000_dpo1ysak / TS011F
    _TZ3000_w0qqde0g / TS011F (Neo)
    _TZ3000_u5u4cakc / TS011F (Blitzwolf)
    _TZ3000_typdpdpg / TS011F
    _TZ3000_ksw8qtmt / TS011F
    _TZ3000_zloso4jk / TS011F
    _TZ3000_cehuw1lw / TS011F
    _TZ3000_5f43h46b / TS011F
    _TZ3000_fqoynhku / TS0121
    _TZ3000_ynmowqk2 / TS011F (Silvercrest)
    _TZ3000_kx0pris5 / TS011F
    _TZ3000_hdopuwv6 / TS011F
    _TZ3000_bfn1w0mm / TS011F
    _TZ3000_0zfrhq4i / TS011F
    _TZ3000_gznh2xla / TS011F
    _TZ3000_ss98ec5d / TS011F
    _TZ3000_gnjozsaz / TS011F
    _TZ3000_gjnozsaz / TS011F
    _TZ3000_gvn91tmx / TS011F
    _TZ3000_1h2x4akh / TS011F
    _TZ3000_r6buo8ba / TS011F
    _TZ3000_2putqrmw / TS011F
    _TZ3000_5ity3zyu / TS0121
    _TZ3000_okaz9tjs / TS011F
    _TZ3000_eyzb8yg3 / TS0121
    _TZ3000_dksbtrzs / TS011F (Lonsonho)
    _TZ3000_j1v25l17 / TS011F (Silvercrest / Lidl)
    _TZ3000_nkcobies / TS011F
    _TZ3000_waho4jtj / TS011F
    _TZ3000_3uimvkn6 / TS011F
    _TZ3000_pjcqjtev / TS011F

- Smart Plug, without metering
    _TZ3000_kdi2o9m6 / TS011F (Silvercrest / Lidl)
    _TZ3000_ew31dmgx / TS011F
    _TZ3000_dpo1ysak / TS011F
    _TZ3000_plyvnuf5 / TS011F (Silvercrest / Lidl)
    _TZ3000_hyfvrar3 / TS011F (Zemismart)
    _TZ3000_cymsnfvf / TS011F
    _TZ3000_upjrsxh1 / TS011F (Silvercrest / Lidl)
    _TZ3000_wamqdr3f / TS011F (Silvercrest / Lidl)

- Outdoor Plug, without metering
    _TZ3000_pnzfdr9y / TS0101 (Silvercrest / Lidl)
    _TZ3000_br3laukf / TS0101

- Outdoor Plug, with metering
    _TZ3000_uwkja6z1 / TS011F (Nous)

- 3 Socket Power Strip
    _TZ3000_1obwwnmq / TS011F (Silvercrest / Lidl)
    _TZ3000_vzopcetz / TS011F (Silvercrest / Lidl)
    _TZ3000_4uf3d0ax / TS011F (Silvercrest / Lidl)
    _TZ3000_wzauvbcs / TS011F (Silvercrest / Lidl)
    _TZ3000_vmpbygs5 / TS011F (Silvercrest / Lidl)

- 4 Socket Power Strip + USB
    _TYZB01_vkwryfdr / TS0115
    _TZ3000_o005nuxx / TS011F (UseeLink)
    _TZ3000_cfnprab5 / TS011F
    LELLKI / JZ-ZB-004

- Double Socket Smart Plug
    _TZ3000_jak16dll / TS011F

- Double Power Point
    _TYZB01_hlla45kx / TS011F

- Double Power Point, with metering
    _TZ3210_7jnk7l3k / TS011F

- Wall Socket with metering
    _TZ3000_b28wrpvx / TS011F (BSEED)
    _TZ3000_4ux0ondb / TS011F (BSEED)
    _TZ3000_y4ona9me / TS011F (Alice)

- DIN-rail relay with metering
    _TZ3000_qeuvnohg / TS011F
    _TZ3000_cayepv1a / TS011F (Tongou)
    _TZ3000_lepzuhto / TS011F
    _TZ3000_qystbcjg / TS011F

**In-Wall**
- 1 Gang Switch Module
    _TYZB01_ncutbjdi / TS0003
    _TYZB01_aneiicmq / TS0003
    _TZ3000_zmy1waw6 / TS011F
    _TZ3000_pmvbt5hh / TS0011
    _TZ3000_sjpl9eg3 / TS0011
    _TZ3000_m9af2l6g / TS000F
    _TZ3000_ji4araar / TS0011
    _TZ3000_qmi1cfuq / TS0011
    _TZ3000_npzfdcof / TS0001
    _TZ3000_tqlv4ug4 / TS0001
    _TZ3000_rmjr4ufz / TS0001
    _TZ3000_mx3vgyea / TS000F
    _TZ3000_46t1rvdu / TS0001
    _TZ3000_majwnphg / TS0001
    _TZ3000_6axxqqi2 / TS0001

- 1 Gang Switch Module with metering
    _TZ3000_prits6g4 / TS0001

- 2 Gang Switch Module
    _TYZB01_zsl6z0pw / TS0003
    _TZ3000_4js9lo5d / TS0012
    _TZ3000_pmz6mjyu / TS011F
    _TYZB01_digziiav / TS0003
    _TZ3000_fisb3ajo / TS0002
    _TZ3000_bvrlqyj7 / TS0002
    _TZ3000_jl7qyupf / TS0013
    _TZ3000_7ed9cqgi / TS0002
    _TZ3000_18ejxno0 / TS0012
    _TZ3000_llfaquvp / TS0012
    _TZ3000_lmlsduws / TS0002
    _TZ3000_qaa59zqd / TS0002
    _TZ3000_qcgw8qfa / TS0002 (Zemismart)
    _TZ3000_jcfje0kb / TS0002
    _TZ3000_ruxexjfz / TS0002

- 2 Gang Switch Module with metering
    _TZ3000_zmy4lslw / TS0002
    _TZ3000_cayepv1a / TS011F

- 3 Gang Switch Module
    _TZ3000_odzoiovu / TS0003
    _TZ3000_lvhy15ix / TS0003
    _TZ3000_4o16jdca / TS0003

- 1 Gang Dimmer Module
    _TYZB01_qezuin6k / TS110F
    _TZ3210_ngqk6jia / TS110E
    _TZ3000_ktuoyvt5 / TS110F
    _TZ3210_zxbtub8r / TS110E
    _TZE200_la2c2uo9 / TS0601
    _TZ3210_weaqkhab / TS110E
    _TZ3210_k1msuvg6 / TS110E
    _TZE204_hlx9tnzb / TS0601
    _TZ3000_mgusv51k / TS0052
    _TZE200_ip2akl4w / TS0601
    _TZE200_1agwnems / TS0601
    _TZE200_579lguh2 / TS0601
    _TZE200_vucankjx / TS0601
    _TZE200_4mh6tyyo / TS0601
    _TZE204_n9ctkb6j / TS0601
    _TZE204_9qhuzgo0 / TS0601
    _TZE204_dcnsggvz / TS0601
    _TZE204_5cuocqty / TS0601

- 2 Gang Dimmer Module
    _TYZB01_v8gtiaed / TS110F
    _TZ3000_92chsky7 / TS110F
    _TZE200_e3oitdyu / TS0601
    _TZ3210_wdexaypg / TS110E
    _TZ3210_3mpwqzuu / TS110E
    _TZE204_zenj4lxv / TS0601 (MOES)
    _TZE204_bxoo2swd / TS0601
    _TZ3210_pagajpog / TS110E
    _TZ3210_4ubylghk / TS110E
    _TZE200_gwkapsoq / TS0601
    _TZE200_fjjbhx9d / TS0601

**On-Wall**
- 1 Gang Wall Switch
    _TYZB01_xfpdrwvc / TS0011
    _TZ3000_9hpxg80k / TS0011
    _TZ3000_f8tmviy0 / TS0001
    _TZ3000_gidy6sjs / TS0001
    _TYZB01_qeqvmvti / TS0011 (MOES)
    _TYZB01_seqwasot / TS0001
    _TZ3000_hktqahrq / TD0001
    _TZ3000_yl3zuyaw / TS0001
    _TZ3000_3wkqni6o / TS0011
    _TZ3000_oex7egmt / TS0001
    _TZ3000_hafsqare / TS0011
    _TZ3000_oaq83gqc / TS0011
    _TZ3000_6eyydfyg / TS0001
    _TZE200_gbagoilo / TS0601
    _TZ3000_hhiodade / TS0011
    _TZ3000_ysdv91bk / TS0001
    _TZ3000_7jx5ypra / TS0001
    _TZ3000_3u4hripk / TS0011

- 2 Gang Wall Switch
    _TYZB01_mtlhqn48 / TS0012
    _TYZB01_6sadkhcy / TS0002
    _TZ3000_fvh3pjaz / TS0012
    _TZ3000_owgcnkrh / TS0042
    _TZ3000_svoqrno4 / TS0002
    TUYATEC-O6SNCwd6 / TS0012
    _TYZB01_vzrytttn / TS0012 (MOES)
    _TZ3000_nta0gb8h / TS0002
    _TZ3000_lupfd8zu / TS0012
    _TZ3000_yhagrqmd / TS0002
    _TZ3000_5vujyute / TS0002
    _TYZB01_2athzhfr / TS0012
    _TZ3000_56bdyj21 / TS0002
    _TZ3000_e98krvvk / TS0012
    _TZ3000_atp7xmd9 / TS0002
    _TZ3000_mrqea2uu / TS0002
    _TZ3000_mklgayek / TS0002
    _TZ3000_p8alo7qa / TS0012
    _TYZB01_6g8b7at8 / TS0012
    TUYATEC-nzrrvgco / TS0012
    _TZ3000_qn8qvk9y / TS0002
    _TZ3000_s8r1qoyq / TS0012

- 3 Gang Wall Switch
    _TYZB01_xiuox57i / TS0013
    _TZ3000_a7ouggvs / TS0043
    _TYZB01_b8cr31hp / TS0003
    _TZ3000_wyhuocal / TS0013
    _TZ3000_cdamjqm9 / TS0003 (Zemismart ZM-L03E-Z)
    TYZB01_mqel1whf / TS0013
    _TZ3000_hlwm8e96 / TS0013
    _TZ3000_thhxrept / TS0003
    _TZ3000_2dlwlvex / TS0003
    _TZ3000_qcdqw8nf / TS0003
    _TZ3000_vvlivusi / TS0003
    _TZ3000_5e5ptb24 / TS0013
    _TZ3000_lrgccsxm / TS0013
    _TZ3000_w05exif3 / TS0003
    _TZ3000_qewo8dlz / TS0013
    _TZ3000_aezbqpcu / TS0013

- 4 Gang Wall Switch
     _TZ3000_r0pmi2p3 / TS0014
     _TZ3000_dku2cfsc / TS0044
     _TZ3000_fjt5218m / TS0044
     _TYZB01_bagt1e4o / TS0014 (Oz Smart Things)
    _TZE200_shkxsgis / TS0601
    _TZE204_aagrxlbd / TS0601
    _TZE200_aqnazj70 / TS0601
    _TZE200_di3tfv5b / TS0601
    _TZE200_mexisfik / TS0601
    _TZE204_6wi2mope / TS0601
    _TZE204_iik0pquw / TS0601

- 5 Gang Wall Switch
    _TZE200_jwsjbxjs / TS0601

- 6 Gang Wall Switch
    _TZE200_r731zlxk / TS0601
    _TZE200_9mahtqtg / TS0601

- Wall Dimmer
    _TZE200_3p5ydos3 / TS0601
    _TZE200_whpb9yts / TS0601
    _TZE200_ebwgzdqq / TS0601
    _TZE200_ctq0k47x / TS0601
    _TZE200_9i9dt8is / TS0601
    _TZE200_dfxkcots / TS0601
    _TZE200_w4cryh2i / TS0601
    _TZE200_ojzhk75b / TS0601
    _TZE200_9cxuhakf / TS0601
    _TZE200_a0syesf5 / TS0601
    _TZE200_swaamsoy / TS0601
    _TZE200_p0gzbqct / TS0601

**Lights**
- Christmas Tree Lights
    _TZE200_s8gkrkxk / TS0601 (Melinera / Lidl)

- Dimmable Recessed LED
    _TZ3210_zdrhqmo0 / TS0502B

- Dimmable LED Strip
    _TZ3210_invesber / TS0502B

- RGB LED Bar Light
    _TZ3000_gek6snaj / TS0505A (LIVARNO LUX / Lidl)
    _TZ3210_iystcadi / TS0505B (LIVARNO LUX / Lidl)

- RGB Bulb E14
    _TZ3000_odygigth / TS0505A (LIVARNO LUX / Lidl)

- RGB Bulb E27
    _TZ3000_dbou1ap4 / TS0505A (LIVARNO LUX / Lidl)
    _TZ3000_keabpigv / TS0505A (Woox)
    _TZ3000_12sxjap4 / TS0505B (YANDHI)
    _TZ3000_hlijwsai / TS0505A
    _TZ3000_qd7hej8u / TS0505B (LIVARNO LUX / Lidl)
    _TZ3210_mja6r5ix / TS0505B
    _TZ3000_q50zhdsc / TS0505B
    eWeLight / ZB-CL01 (Lonsonho)

- RGB Ceiling LED Light
    _TZ3210_x13bu7za / TS0505B (LIVARNO LUX / Lidl)

- RGB Floor LED Light
    _TZ3000_8uaoilu9 / TS0502A (LIVARNO LUX / Lidl)

- RGB Mood Light
    _TZ3000_9cpuaca6 / TS0505A (LIVARNO LUX / Lidl)
    _TZ3210_r0xgkft5 / TS0505B (LIVARNO LUX / Lidl)

- RGB LED Strip
    _TZ3000_riwp3k79 / TS0505A (LIVARNO LUX / Lidl)

- RGB LED Strip Controller
    _TZ3000_obacbukl / TS0503A
    _TZ3000_dl4pxp1r / TS0503A
    _TZ3000_qqjaziws / TS0505B
    _TZ3000_i8l0nqdu / TS0503B
    _TZ3000_ukuvyhaa / TS0504B
    _TZ3210_k1pe6ibm / TS0505B

- RGB Spot GU10
    _TZ3000_kdpxju99 / TS0505A (LIVARNO LUX / Lidl)
    _TZ3210_bfwvfyx1 / TS0505B (Benexmart) 

- RGB Spot GardenLight
   _TZ3000_h1jnz6l8 / TS0505A (LIVARNO LUX / Lidl)

- RGB Wall LED Light
    _TZ3000_utagpnzs / TS0505A
    _TZ3000_5bsf8vaj / TS0505A

- Tunable Bulb E14
    _TZ3000_oborybow / TS0502A (LIVARNO LUX / Lidl)

- Tunable Bulb E27
    _TZ3000_49qchf10 / TS0502A (LIVARNO LUX / Lidl)

- Tunable Spot GU10
    _TZ3000_el5kt5im / TS0502A (LIVARNO LUX / Lidl)

**Remotes**
- 1 Gang Wall Remote
    _TYZB02_keyjqthh / TS0041
    _TZ3000_tk3s5tyg / TS0041
    _TZ3000_fkp5zyho / TS0041
    _TZ3000_axpdxqgu / TS0041
    _TZ3000_peszejy7 / TS0041
    _TZ3000_pzui3skt / TS0041
    _TZ3000_f97vq5mn / TS0041
    _TZ3000_fa9mlvja / TS0041
    _TZ3000_itb0omhv / TS0041
    _TZ3000_8rppvwda / TS0041
    _TZ3000_4upl1fcj / TS0041
    _TZ3000_q68478x7 / TS0041

- 2 Gang Wall Remote
    _TZ3000_owgcnkrh / TS0042
    _TYZB02_keyjhapk / TS0042
    _TZ3000_oikiyf3b / TS0042
    _TZ3000_dfgbtub0 / TS0042
    _TZ3000_h1c2eamp / TS0042
    _TZ3400_keyjhapk / TS0042
    _TZ3000_5e235jpa / TS0042
    _TZ3000_fkvaniuu / TS0042

- 3 Gang Wall Remote
    _TZ3000_a7ouggvs / TS0043
    _TYZB02_key8kk7r / TS0043
    _TZ3000_qzjcsmar / TS0043
    _TZ3000_rrjr1q0u / TS0043
    _TZ3000_w8jwkczz / TS0043 (MOES)
    _TZ3000_gbm10jnj / TS0043 (MOES)
    _TZ3000_yw5tvzsk / TS0043
    _TZ3000_sj7jbgks / TS0043

- 4 Gang Wall Remote
    _TZ3000_vp6clf9d / TS0044
    _TZ3000_xabckq1v / TS004F (MOES)
    _TZ3000_wkai4ga5 / TS0044
    _TZ3000_ufhtxr59 / TS0044
    _TZ3000_ee8nrt2l / TS0044
    _TZ3000_uaa99arv / TS0044
    _TZ3000_a4xycprs / TS0044 (MOES)
    _TZ3000_jcspr0tp / TS0044

- 6 Gang Wall Remote
    _TZ3000_iszegwpd / TS0046

- 1 Button Smart Remote Controller
    _TZ3000_kjfzuycl / TS004F
    _TZ3000_rco1yzb1 / TS004F (Silvercrest / Lidl)
    _TZ3000_yirp2pgd / TS004F
    _TZ3000_fa9mlvja / TS0041
    _TZ3000_yj6k7vfo / TS0041
    _TZ3000_ja5osu5g / TS004F
    _TZ3000_qgwcxxws / TS0041

- 4 Button Smart Remote Controller
    _TZ3000_fsiepnrh / TS0215A (Nedis)
    _TYZB01_qm6djpta / TS0215A
    _TZ3000_p6ju8myv / TS0215A
    _TZ3000_u3nv1jwk / TS0044
    _TZ3000_eo3dttwe / TS0215A

- Knob Switch
    _TZ3000_abrsvsou / TS004F
    _TZ3000_4fjiwweb / TS004F
    _TZ3000_qja6nq5z / TS004F
    _TZ3000_ixla93vd / TS004F
    _TZ3000_uri7ongn / TS004F

**Curtains**
- Curtain Module
    _TZ3000_vd43bbfq / TS130F
    _TZ3000_ke7pzj5d / TS130F
    _TZ3000_fccpjz5z / TS130F
    _TZ3000_4uuaja4a / TS130F
    _TZ3000_zirycpws / TS130F
    _TZ3000_femsaaua / TS130F
    _TZ3000_e3vhyirx / TS130F (LoraTap SC500ZB)
    _TZ3000_1dd0d5yi / TS130F (MOES MS-108ZR)
    _TZ3000_jwv3cwak / TS130F
    _TZ3210_dwytrmda / TS130F (GIRIER)
    _TZ3210_ol1uhvza / TS130F (Lonsonho)
    _TZ3000_eg7awg6a / TS130F
    _TZ3000_eafaa66e / TS130F

- 2 Channel Curtain Module
    _TZ3000_j1xl73iw / TS130F
    _TZ3000_l6iqph4f / TS130F

- Curtain Module (2 channel)
    _TZ3000_j1xl73iw / TS130F

- Curtain Motor
    _TZE200_5zbp6j0u / TS0601
    _TZE200_nkoabg8w / TS0601
    _TZE200_xuzcvlku / TS0601
    _TZE200_4vobcgd3 / TS0601
    _TZE200_nogaemzt / TS0601
    _TZE200_r0jdjrvi / TS0601
    _TZE200_pk0sfzvr / TS0601
    _TZE200_fdtjuw7u / TS0601
    _TZE200_zpzndjez / TS0601
    _TZE200_wmcdj3aq / TS0601
    _TZE200_cowvfni3 / TS0601
    _TZE200_rddyvrci / TS0601
    _TZE200_nueqqe6k / TS0601
    _TZE200_xaabybja / TS0601
    _TZE200_rmymn92d / TS0601
    _TZE200_3i3exuay / TS0601
    _TZE200_nogaemzt / TS0601
    _TZE200_zah67ekd / TS0601
    _TZE200_cowvfni3 / TS0601
    _TZE200_hsgrhjpf / TS0601
    _TZE200_pw7mji0l / TS0601
    _TZE200_68nvbio9 / TS0601
    _TZE200_bjzrowv2 / TS0601
    _TZE200_uj3f4wr5 / TS0601
    _TZE204_1fuxihti / TS0601
    _TZE200_axgvo9jh / TS0601
    _TZE200_gaj531w3 / TS0601
    _TZE200_yia0p3tr / TS0601
    _TZE200_nw1r9hp6 / TS0601
    _TZE200_cf1sl3tj / TS0601
    _TZE200_9p5xmj5r / TS0601

- Wall mounted Curtain Switch
    _TZ3000_dph3rpss / TS130F
    _TZ3000_8kzqqzu4 / TS130F
    _TZ3000_ltiqubue / TS130F
    _TZ3000_dbpmpco1 / TS130F (Loratap, Model No SC400ZB, SC420ZB)
    _TZ3000_fvhunhxb / TS130F
    _TZ3000_ctbafvhm / TS130F
    _TZ3000_qqdbccb3 / TS130F
    _TZ3000_wptayaqr / TS130F (BSEED)
    _TZ3000_qa8s8vca / TS130F (Loratap)

**Other**
- Thermostatic Radiator Valves
    _TZE200_sur6q7ko / TS0601 (LSC Smart Connect)
    _TZE200_hue3yfsn / TS0601
    _TZE200_husqqvux / TS0601 (Tesla Smart)
    _TZE200_lnbfnyxd / TS0601 (Tesla Smart)
    _TZE200_lllliz3p / TS0601
    _TZE200_mudxchsu / TS0601
    _TZE200_7yoranx2 / TS0601 (MOES)
    _TZE200_e9ba97vf / TS0601 (MOES)
    _TZE200_kds0pmmv / TS0601 (MOES)
    _TZE200_kly8gjlz / TS0601
    _TZE200_py4cm3he / TS0601

- Wall Thermostat
    _TZE200_aoclfnxz / TS0601
    _TZE204_aoclfnxz / TS0601
    _TZE200_2ekuz3dz / TS0601

- Valve Controller
    _TYZB01_ymcdbl3u / TS0111
    _TZ3000_o4cjetlm / TS0001
    _TYZB01_4tlksk8a / TS0001
    _TZ3000_tvuarksa / TS011F
    _TZ3000_j9568h44 / TS0001
    _TZ3000_iedbgyxt / TS0001
    _TZ3000_w0ypwa1f / TS0001
    _TZ3000_5ucujjts / TS0001

- Smart Garden Irrigation Controller
    _TZ3210_eymunffl / TS0101 (Woox)
    _TZ3000_cjfmu5he / TS0049
    _TZ3000_kz1anoi8 / TS0049
    _TZ3000_mq4wujmp / TS0049

- Zigbee Repeater
    _TZ3000_m0vaazab / TS0207
    _TZ3000_5k5vh43t / TS0207
    _TZ3000_gszjt2xx / TS0207
    _TZ3000_ufttklsz / TS0207
    _TZ3000_nkkl7uzv / TS0207
    _TZ3000_nlsszmzl / TS0207
    _TZ3000_misw04hq / TS0207
    _TZ3000_wlquqiiz / TS0207

- 1 Channel Relay Board
    _TZ3000_g8n1n7lg / TS0001

- 2 Channel Relay Board
    _TZ3000_nuenzetq / TS0002

- 4 Channel Relay Board
    _TZ3000_hdlpifbk / TS0004
    _TZ3000_excgg5kb / TS0004
    _TZ3000_u3oupgdy / TS0004
    _TZ3000_wkr3jqmr / TS0004
    _TZ3000_imaccztn / TS0004

- Smart Switch
    _TYZB01_phjeraqq / TS0001

- Siren
    _TZE200_d0yu2xgi / TS0601
    _TZE204_t1blo2bj / TS0601

- Finger Bot
    _TZ3210_j4pdtz9v / TS0001 (MOES)

To request additional devices, please use Github issue tracking: https://github.com/JohanBendz/com.tuya.zigbee/issues
To get support from the community please use Athom Homey Community Forum: https://community.athom.com/t/tuya-zigbee-app/26439

Major Code Contributors:
- Martijn Aben, Christmas Lights
- Jurgen Heine, color issues on RGB lights
- Tim Koos and Tom van der Geer, 4 Channel Relay Board
- Raffaele De Lauri, Smart Garden Irrigation Controller
- Bert van Hoekelen, Curtain Motors, Zy m100 Radar Sensor
- Łukasz Krutul, better measuring functionality for plugs and Tuya specific reporting
- Jesper Bach, Smart Remote 1 Button
- Patrick van der Poel, Soil sensor
- Ben Grohbiel, Wall Thermostat
- Jérôme Revillard, Neo Siren alarm
- Thomas Ha, Thermostatic Radiator Valve
- Julian M, Outdoor Smart Plug
- Roelof Oomen, Rain sensor
(Did you contribute with code and I forgot to name you? Give me a friendly reminder! )


I would also like to thank everyone who contributes with device information, testing and beer!
# Universal Tuya Unified Engine v7.4.6

[![Homey Test Install](https://img.shields.io/badge/Homey-Test_Install-00E6A0?style=for-the-badge&logo=homey)](https:
[![SDK 3](https://img.shields.io/badge/SDK-3-blue?style=for-the-badge)](https:
[![Zero Defect](https://img.shields.io/badge/Zero-Defect-black?style=for-the-badge)](https:

A high-performance, unified, local-first engine for Tuya Zigbee and WiFi devices on Homey Pro. Supporting over **22,400+ device variants** through autonomous behavioral analysis and adaptive protocol translation.

##  Key Features

- **Unified Hybrid Driver**: One driver handles thousands of device variations across ZCL and Tuya DP protocols.
- **Resilient Identity Engine**: Case-insensitive manufacturer and product ID resolution for absolute pairing reliability.
- **Standardized 10-Byte Time Sync**: Robust synchronization for LCD clocks (TZE284 series) with sequence-echoing support.
- **Autonomous Error Correction**: Self-healing flow card links and NaN-hardened sensor reporting.
- **Green Power Support**: Minimalist integration for ultra-low power Zigbee switches.
- **Zero-Conf WiFi Bridge**: Local-first control for Tuya WiFi devices.

##  Installation

1. Install the [Test Version](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) for the latest stability fixes.
2. Pair your device using the "Search for my device" option.
3. If your device is not recognized, please provide a diagnostic report on the [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues).

##  Architectural Standard

This project adheres to the **"Zero-Defect Architectural Shield"**:
- **Rule 21**: Interoperable flow cards via capability filtering.
- **Rule 24**: Case-insensitive identity resolution.
- **Rule 25**: Standardized 10-byte time sync protocol.

---
© 2026 Dylan Rajasekaram | [Donate via PayPal](https://paypal.me/dlnraja)
