#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..');
const DDIR=path.join(ROOT,'drivers');
const app=JSON.parse(fs.readFileSync(path.join(ROOT,'app.json'),'utf8'));
const dirs=fs.readdirSync(DDIR).filter(d=>fs.existsSync(path.join(DDIR,d,'driver.compose.json')));

// --- Gather stats ---
let totalFp=0,driverStats=[],classes={},capSet=new Set(),flowTotal=0;
for(const d of dirs){
  try{
    const c=JSON.parse(fs.readFileSync(path.join(DDIR,d,'driver.compose.json'),'utf8'));
    const fps=(c.zigbee&&c.zigbee.manufacturerName)||[];
    totalFp+=fps.length;
    driverStats.push({driver:d,fps:fps.length,cls:c.class||'other'});
    const cl=c.class||'other';classes[cl]=(classes[cl]||0)+1;
    (c.capabilities||[]).forEach(x=>capSet.add(x));
  }catch(e){}
  const ff=path.join(DDIR,d,'driver.flow.compose.json');
  if(fs.existsSync(ff)){try{const f=JSON.parse(fs.readFileSync(ff,'utf8'));flowTotal+=(f.triggers||[]).length+(f.conditions||[]).length+(f.actions||[]).length}catch(e){}}
}
const composeFlow=path.join(ROOT,'.homeycompose','flow');
if(fs.existsSync(composeFlow)){for(const t of['triggers','conditions','actions']){const dd=path.join(composeFlow,t);if(fs.existsSync(dd))flowTotal+=fs.readdirSync(dd).filter(f=>f.endsWith('.json')).length}}
driverStats.sort((a,b)=>b.fps-a.fps);
const zigbee=dirs.filter(d=>!d.startsWith('wifi_')).length;
const wifi=dirs.filter(d=>d.startsWith('wifi_')).length;
let cl={};try{cl=JSON.parse(fs.readFileSync(path.join(ROOT,'.homeychangelog.json'),'utf8'))}catch(e){}
const clKeys=Object.keys(cl).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
const date=new Date().toISOString().split('T')[0];

// Count SVG icons
let svgCount=0;
try{const assetsDir=path.join(ROOT,'assets');if(fs.existsSync(assetsDir)){const countSvg=(dir)=>{for(const f of fs.readdirSync(dir)){const fp=path.join(dir,f);if(fs.statSync(fp).isDirectory())countSvg(fp);else if(f.endsWith('.svg'))svgCount++}};countSvg(assetsDir)}
for(const d of dirs){const iconDir=path.join(DDIR,d,'assets');if(fs.existsSync(iconDir)){const countSvg2=(dir)=>{for(const f of fs.readdirSync(dir)){const fp=path.join(dir,f);if(fs.statSync(fp).isDirectory())countSvg2(fp);else if(f.endsWith('.svg'))svgCount++}};countSvg2(iconDir)}}
}catch(e){}

// Count unique productIds
const pidSet=new Set();
for(const d of dirs){try{const c=JSON.parse(fs.readFileSync(path.join(DDIR,d,'driver.compose.json'),'utf8'));((c.zigbee&&c.zigbee.productId)||[]).forEach(p=>pidSet.add(p))}catch(e){}}

const fmt=n=>n.toLocaleString('en-US');

// --- Build README ---
const top20=driverStats.slice(0,20);
const topTable=top20.map((s,i)=>`| ${i+1} | \`${s.driver}\` | ${fmt(s.fps)} |`).join('\n');

const clTable=clKeys.slice(0,15).map(v=>{
  const txt=(cl[v]&&(cl[v].en||cl[v]))||'';
  const short=typeof txt==='string'?(txt.length>120?txt.slice(0,117)+'...':txt):String(txt).slice(0,120);
  return `| **v${v}** | ${short} |`;
}).join('\n');

const classTable=Object.entries(classes).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`| ${c} | ${n} |`).join('\n');

const readme = `# Universal Tuya Zigbee App for Homey

<!-- AUTO-UPDATED: Do not edit badges manually - updated by GitHub Actions -->
[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdlnraja%2Fcom.tuya.zigbee%2Fmaster%2Fapp.json&query=%24.version&label=version&color=blue)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Fingerprints](https://img.shields.io/badge/fingerprints-${fmt(totalFp)}+-green)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Drivers](https://img.shields.io/badge/drivers-${dirs.length}-brightgreen)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Flow Cards](https://img.shields.io/badge/flow%20cards-${fmt(flowTotal)}-blue)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![SDK](https://img.shields.io/badge/SDK-3-orange)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![License](https://img.shields.io/badge/license-GPL--3.0-red)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/LICENSE)
[![Homey](https://img.shields.io/badge/Homey-Pro-blueviolet)](https://homey.app/a/com.dlnraja.tuya.zigbee/)

> **Control your Tuya Zigbee devices locally without cloud!** The most comprehensive Tuya Zigbee app for Homey with **${dirs.length} drivers**, **${fmt(totalFp)}+ device fingerprints**, and **${fmt(flowTotal)}+ flow cards**.

| | |
|---|---|
| **100% Local Control** | No Cloud, No Internet Required |
| **Smart Battery** | Accurate readings with voltage fallback |
| **Hybrid Mode** | Auto-detect Tuya DP vs Standard ZCL |
| **SDK3** | Latest Homey Standards |
| **Open Source** | Community-driven development |
| **${dirs.length} Drivers** | Switches, sensors, lights, thermostats, covers, locks & more |
| **${fmt(flowTotal)} Flow Cards** | Complete triggers, conditions & actions in 4 languages |

---

## Installation

| Method | Link |
|--------|------|
| **Homey App Store** | [Install from Homey App Store](https://homey.app/a/com.tuya.zigbee/) |
| **Test Version** | [Install Test Version](https://homey.app/a/com.tuya.zigbee/test/) |
| **GitHub Releases** | [View Releases](https://github.com/dlnraja/com.tuya.zigbee/releases) |

---

## Statistics

| Metric | Value |
|--------|-------|
| **Device Fingerprints** | ${fmt(totalFp)}+ |
| **Unique Product IDs** | ${pidSet.size} |
| **Drivers** | ${dirs.length} (${zigbee} Zigbee + ${wifi} WiFi) |
| **Flow Cards** | ${fmt(flowTotal)} |
| **Unique Capabilities** | ${capSet.size} |
| **SVG Icons** | ${svgCount} |
| **Languages** | EN, FR, NL, DE |
| **SDK Version** | 3 |
| **Homey Compatibility** | ${app.compatibility||'>=12.2.0'} |
| **Last Updated** | ${date} |

### Top 20 Drivers by Fingerprint Count

| # | Driver | Fingerprints |
|---|--------|-------------|
${topTable}

### Drivers by Device Class

| Class | Count |
|-------|-------|
${classTable}

---

## Latest Updates

<!-- CHANGELOG_START - Auto-updated from .homeychangelog.json -->

| Version | Changes |
|---------|---------|
${clTable}

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

\`\`\`
Homey Pro
  \u2514\u2500 Universal Tuya Zigbee App (SDK3)
       \u251c\u2500 Hybrid Protocol Engine
       \u2502    \u251c\u2500 Tuya DP (Cluster 0xEF00) \u2500 DP1-DP255 data points
       \u2502    \u2514\u2500 Standard ZCL \u2500 onOff, levelControl, colorControl, etc.
       \u251c\u2500 DeviceProfileRegistry (149 profiles)
       \u2502    \u2514\u2500 Per-fingerprint: DP mappings, quirks, timing
       \u251c\u2500 BatteryManager (8 chemistries, voltage fallback)
       \u251c\u2500 PhysicalButtonMixin (2000ms detection)
       \u2514\u2500 ${dirs.length} Drivers \u2500 ${fmt(totalFp)}+ fingerprints
\`\`\`

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
- Homey CLI: \`npm install -g homey\`

### Quick Start
\`\`\`bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
npm install
homey app run
\`\`\`

### Build & Validate
\`\`\`bash
homey app build
homey app validate --level publish
homey app run
\`\`\`

---

## Links

| | |
|---|---|
| **App Store** | [Universal Tuya Zigbee](https://homey.app/a/com.dlnraja.tuya.zigbee/) |
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
2. **Create** a feature branch (\`git checkout -b feat/my-device\`)
3. **Validate**: \`homey app validate --level publish\`
4. **Submit** a pull request with description

### Report a New Device
1. Get a **device interview** from [Homey Developer Tools](https://tools.developer.homey.app/tools/zigbee)
2. Check [Zigbee2MQTT](https://www.zigbee2mqtt.io/supported-devices/) for DP mappings
3. Check [Blakadder](https://zigbee.blakadder.com) for cross-references
4. Open an [issue](https://github.com/dlnraja/com.tuya.zigbee/issues/new?template=01_device_request.yml) with: **manufacturerName**, **modelId**, and **interview data**

### Report a Bug
1. Go to **Settings > Apps > Universal Tuya Zigbee > Send Diagnostics**
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

*Last updated: ${date}*
`;

fs.writeFileSync(path.join(ROOT,'README.md'), readme);
console.log('README.md generated: '+dirs.length+' drivers, '+totalFp+' fps, '+flowTotal+' flows, '+capSet.size+' caps');

// Also save stats JSON for other scripts
const S={version:app.version,drivers:dirs.length,zigbee,wifi,fps:totalFp,flow:flowTotal,caps:capSet.size,date,
  top20:driverStats.slice(0,20).map(s=>s.driver+':'+s.fps),classes,
  clKeys:clKeys.slice(0,10),clEntries:Object.fromEntries(clKeys.slice(0,10).map(k=>[k,cl[k]&&(cl[k].en||cl[k])||'']))};
fs.writeFileSync(path.join(__dirname,'_stats.json'),JSON.stringify(S));
