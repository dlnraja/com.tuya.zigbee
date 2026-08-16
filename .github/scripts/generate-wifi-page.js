#!/usr/bin/env node
'use strict';
/**
 * generate-wifi-page.js
 * Generates .github/pages-build/wifi.html — the "WiFi Devices" page of the
 * GitHub Pages site, from REAL repository data:
 *   - drivers/wifi_* (driver.compose.json + device.js connectivity detection)
 *   - data/scanners/tuya-local-results.json (tuya-local catalog summary)
 *   - data/mfs_db.json (manufacturer database stats)
 *   - app.json (version)
 * Called by generate-device-finder.js on every Pages deploy, or standalone:
 *   node .github/scripts/generate-wifi-page.js
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DDIR = path.join(ROOT, 'drivers');
const OUT = path.join(ROOT, '.github', 'pages-build');
const collectDrivers = require('./device-finder-collect');

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

function collectWifi() {
  const app = readJson(path.join(ROOT, 'app.json')) || {};
  const drivers = collectDrivers(DDIR);
  const wifi = drivers.filter(d => d.id.startsWith('wifi_')).map(d => {
    let conn = 'other';
    const df = path.join(DDIR, d.id, 'device.js');
    if (fs.existsSync(df)) {
      const c = fs.readFileSync(df, 'utf8');
      if (c.includes('TuyaLocalDevice') || c.includes('TuyaLocalClient')) conn = 'tuya';
    }
    if (conn === 'other') {
      if (d.id.includes('ewelink')) conn = 'ewelink';
      else if (d.id.includes('sonoff')) conn = 'sonoff';
      else if (d.id.includes('camera')) conn = 'camera';
    }
    return { ...d, conn };
  });
  const tl = readJson(path.join(ROOT, 'data', 'scanners', 'tuya-local-results.json'));
  const mfs = readJson(path.join(ROOT, 'data', 'mfs_db.json'));
  return {
    version: app.version || '?',
    drivers,
    wifi,
    tuyaLocal: tl && tl.summary ? tl.summary : null,
    tuyaLocalDevices: tl && Array.isArray(tl.devices) ? tl.devices.length : 0,
    mfsEntries: mfs && mfs.stats ? mfs.stats.totalEntries : (mfs && mfs.devices ? Object.keys(mfs.devices).length : 0),
    totalFPs: drivers.reduce((s, d) => s + d.fpCount, 0),
  };
}

const CONN_LABEL = {
  tuya: ['Tuya LAN', '#a78bfa', '#7c3aed'],
  ewelink: ['eWeLink', '#6ee7b7', '#10b981'],
  sonoff: ['Sonoff DIY', '#6ee7b7', '#10b981'],
  camera: ['Camera', '#fca5a5', '#ef4444'],
  other: ['Other', '#94a3b8', '#334155'],
};

function badge(conn) {
  const [label, fg, brd] = CONN_LABEL[conn] || CONN_LABEL.other;
  return '<span class="badge" style="background:' + brd + '20;color:' + fg + ';border:1px solid ' + brd + '40">' + label + '</span>';
}

function driverCard(d) {
  const caps = d.caps.slice(0, 6).map(c => '<span class="cap">' + c + '</span>').join('');
  return '<div class="card"><div style="display:flex;justify-content:space-between;align-items:start">'
    + '<h3>' + d.name + '</h3>' + badge(d.conn) + '</div>'
    + '<div class="meta"><code>' + d.id + '</code> · ' + d.caps.length + ' capabilities</div>'
    + '<div>' + caps + '</div></div>';
}

function page(data) {
  const v = data.version;
  const nTuya = data.wifi.filter(d => d.conn === 'tuya').length;
  const nOther = data.wifi.length - nTuya;
  const tl = data.tuyaLocal || { totalDevices: 0, totalDpMappings: 0, uniqueManufacturers: 0 };
  const R = 'https://github.com/dlnraja/com.tuya.zigbee';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WiFi Devices — Universal Tuya v${v}</title>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2/dist/tailwind.min.css" rel="stylesheet">
<style>
:root{--bg:#0f172a;--card:#1e293b;--accent:#3b82f6;--green:#10b981;--text:#e2e8f0;--muted:#94a3b8}
*{box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--text);margin:0}
.hero{background:linear-gradient(135deg,#1e3a5f,#0f172a);padding:2rem;text-align:center}
.hero h1{font-size:2rem;margin:0}.hero p{color:var(--muted);margin:.5rem 0}
.stats{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin:1rem 0}
.stat{background:var(--card);border-radius:.5rem;padding:.75rem 1.5rem;text-align:center}
.stat b{font-size:1.5rem;color:var(--accent);display:block}
.section{max-width:1400px;margin:0 auto;padding:1.5rem 1rem}
.section h2{font-size:1.5rem;border-bottom:2px solid var(--accent);padding-bottom:.5rem;margin-bottom:1rem}
.section h3{color:var(--accent);font-size:1.1rem;margin:1.25rem 0 .5rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem}
.card{background:var(--card);border-radius:.75rem;padding:1.25rem;border:1px solid #334155}
.card h3{margin:0 0 .5rem;font-size:1.05rem;color:var(--text)}
.card .meta{color:var(--muted);font-size:.8rem;margin:.25rem 0}
.card ul{margin:.5rem 0;padding-left:1.25rem;font-size:.85rem;color:var(--muted)}
.card li{margin:.2rem 0}
.badge{display:inline-block;padding:.125rem .5rem;border-radius:9999px;font-size:.7rem;font-weight:600}
.cap{display:inline-block;background:#1e293b;border:1px solid #334155;padding:.125rem .375rem;border-radius:.25rem;font-size:.7rem;margin:1px;color:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:.85rem;margin:.5rem 0}
th,td{border:1px solid #334155;padding:.5rem .75rem;text-align:left;vertical-align:top}
th{background:var(--card);color:var(--accent)}
td code,li code,p code{font-family:monospace;font-size:.8rem;background:#0f172a;padding:.0625rem .375rem;border-radius:.25rem;border:1px solid #334155}
pre.schema{background:#0f172a;border:1px solid #334155;border-radius:.5rem;padding:1rem;overflow-x:auto;font-size:.78rem;line-height:1.35;color:#6ee7b7}
.faq details{background:var(--card);border:1px solid #334155;border-radius:.5rem;padding:.75rem 1rem;margin:.5rem 0}
.faq summary{cursor:pointer;font-weight:600}
.faq p{color:var(--muted);font-size:.875rem;margin:.5rem 0 0}
.steps{counter-reset:s;list-style:none;padding:0}
.steps li{counter-increment:s;background:var(--card);border:1px solid #334155;border-radius:.5rem;padding:.75rem 1rem;margin:.5rem 0;font-size:.9rem}
.steps li::before{content:counter(s);display:inline-block;background:var(--accent);color:#fff;border-radius:9999px;width:1.5rem;height:1.5rem;line-height:1.5rem;text-align:center;margin-right:.75rem;font-weight:700}
.note{background:#3b82f615;border:1px solid #3b82f640;border-radius:.5rem;padding:.75rem 1rem;font-size:.85rem;color:var(--muted);margin:1rem 0}
.footer{text-align:center;padding:2rem;color:var(--muted);font-size:.875rem}
.footer a{color:var(--accent);text-decoration:none}
.nav{max-width:1400px;margin:0 auto;padding:1rem 1rem 0;font-size:.875rem}
.nav a{color:var(--accent);text-decoration:none}
</style></head><body>
<div class="hero"><h1>WiFi Devices</h1>
<p>Universal Tuya v${v} — local-first Tuya WiFi (no cloud required in operation)</p>
<div class="stats">
<div class="stat"><b>${data.wifi.length}</b>WiFi Drivers</div>
<div class="stat"><b>${nTuya}</b>Tuya LAN (local-first)</div>
<div class="stat"><b>${(tl.totalDevices || 0).toLocaleString()}</b>tuya-local devices catalogued</div>
<div class="stat"><b>${(tl.totalDpMappings || 0).toLocaleString()}</b>DP mappings</div>
</div>
<p><a href="index.html" style="color:var(--accent)">Device Finder (${data.drivers.length} drivers, ${data.totalFPs.toLocaleString()} fingerprints)</a></p>
</div>

<div class="section" id="user">
<h2>👤 For Users</h2>
<h3>Which WiFi devices are supported?</h3>
<p>${data.wifi.length} WiFi drivers ship with the app: <b>${nTuya} speak the Tuya LAN protocol</b> (local-first,
AES-encrypted TCP on port 6668) and ${nOther} use other local protocols (eWeLink, Sonoff DIY, camera).
Every Tuya LAN driver below works <b>entirely on your local network</b> once paired.</p>
<div class="grid">${data.wifi.map(driverCard).join('')}</div>

<h3>How does local-first work?</h3>
<div class="note">🏠 <b>Local-first, cloud-optional.</b> After pairing, your WiFi devices are controlled over your
LAN only — no Tuya cloud round-trip, no internet dependency, no subscription. If the Tuya cloud goes down or you
block it on your firewall, your devices keep working.</div>

<h3>How to pair a Tuya WiFi device</h3>
<ol class="steps">
<li>Put the device in pairing mode and add it once in the <b>Smart Life / Tuya Smart</b> mobile app (this provisions it on your WiFi).</li>
<li>In Homey, add the device with the matching <code>wifi_*</code> driver and choose a pairing method: <b>QR code</b> (Smart Life), <b>Tuya IoT API</b>, or <b>manual</b> entry.</li>
<li>The app retrieves the device's <code>local_key</code> <b>once</b> from the Tuya cloud (opt-in) and stores it locally on Homey.</li>
<li>From then on, all communication is <b>local TCP</b>. Cloud credentials can be removed from the app settings — control stays local.</li>
</ol>

<h3>FAQ</h3>
<div class="faq">
<details><summary>Do WiFi devices need the Tuya cloud to work?</summary>
<p>No. The cloud is only used once during pairing to fetch the <code>local_key</code>. Daily operation
(on/off, dimming, telemetry, automations) is 100% LAN via <code>TuyaLocalClient</code> (TCP 6668, AES).</p></details>
<details><summary>Why does pairing need the cloud at all?</summary>
<p>Tuya devices encrypt local traffic with a per-device <code>local_key</code> that is only issued by the Tuya
cloud at provisioning time. Fetching it is a one-time, explicit opt-in step — you can also enter it manually
if you extracted it yourself.</p></details>
<details><summary>What happens if my device gets a new IP address?</summary>
<p><code>TuyaUDPDiscovery</code> listens on UDP 6666/6667/6668 for device broadcasts and re-resolves the IP
automatically (IP self-healing). No re-pairing needed.</p></details>
<details><summary>What happens when a device is offline?</summary>
<p>Commands are buffered in a bounded offline queue (50 commands, 5-minute expiry) and the client reconnects
with exponential backoff (5 s → 60 s) plus a 15 s heartbeat. The device shows as unavailable in Homey instead
of failing silently.</p></details>
<details><summary>Can I enable the cloud as a fallback?</summary>
<p>Yes — <code>wifi_connection_policy.cloudFallback</code> (default <code>false</code>, local-first). Even then,
the cloud is only queried for a <b>diagnostic status snapshot</b> (rate-limited, never applied to capabilities):
control always stays local. Every transport decision is logged with its reason.</p></details>
</div>
</div>

<div class="section" id="technical">
<h2>🔧 Under the Hood</h2>
<p>The WiFi stack follows the <b>tuya-local</b> pattern: pure decision logic first, I/O second, and every
transport decision explainable from the logs.</p>
<div class="grid">
<div class="card"><h3>TuyaLocalClient</h3><div class="meta"><code>lib/tuya-local/TuyaLocalClient.js</code></div>
<ul><li>TCP 6668, AES-encrypted Tuya LAN protocol</li>
<li>Auto protocol negotiation: 3.3 → 3.4 → 3.5 → 3.2 → 3.1</li>
<li>Heartbeat every 15 s; reconnect backoff 5 s → 60 s</li>
<li>Command queue: 200 ms spacing, 10 s timeout, 2 retries</li>
<li>Offline queue: 50 commands, 5-minute expiry</li></ul></div>
<div class="card"><h3>LocalFirstResolver</h3><div class="meta"><code>lib/wifi/LocalFirstResolver.js</code></div>
<ul><li>Pure decision logic, zero I/O — fully unit-tested</li>
<li>Priority: <b>LAN</b> (device_id + local_key present) → <b>cloud</b> (only if LAN impossible AND
<code>cloudFallback=true</code> AND credentials present) → <b>none</b></li>
<li>Returns a human-readable <code>reason</code> for every decision, logged as
<code>[LOCAL-FIRST] Transport decision: …</code></li></ul></div>
<div class="card"><h3>TuyaUDPDiscovery</h3><div class="meta"><code>lib/tuya-local/TuyaUDPDiscovery.js</code></div>
<ul><li>UDP 6666/6667/6668 broadcast listener</li>
<li>IP self-healing: re-resolves devices after DHCP changes</li>
<li>IP resolution order: settings → UDP cache → <code>find()</code> scan on connect</li></ul></div>
<div class="card"><h3>WiFiConnectionPolicy</h3><div class="meta"><code>lib/wifi/WiFiConnectionPolicy.js</code></div>
<ul><li>Per-device policy store, strategy <code>local_first</code></li>
<li><code>cloudFallback</code> defaults to <b>false</b> (opt-in)</li>
<li><code>localDiscovery</code> enables dynamic IP self-healing</li></ul></div>
<div class="card"><h3>Cloud fallback (opt-in)</h3><div class="meta"><code>lib/tuya-local/TuyaLocalDevice.js</code></div>
<ul><li>On LAN failure: diagnostic cloud snapshot only, rate-limited to 1 / 10 min</li>
<li>Snapshot is <b>never applied</b> to capabilities — control stays local</li>
<li>Device set unavailable, LAN retried after 5 min (<code>connection-timeout</code> handler)</li></ul></div>
<div class="card"><h3>LocalWiFiTuyaBridge</h3><div class="meta"><code>lib/tuya/LocalWiFiTuyaBridge.js</code></div>
<ul><li>Local-first facade over discovery + client</li>
<li><code>resolveTransport(id)</code> with decision logging</li>
<li>Clean session lifecycle: register → connect → sendCommand → destroy</li></ul></div>
</div>
</div>

<div class="section" id="architecture">
<h2>🏗 Architecture</h2>
<h3>Data flow</h3>
<pre class="schema">
                     UDP 6666 / 6667 / 6668 (broadcasts)
              ┌──────────────────────────────────────────┐
              │                                          ▼
┌───────────────┐   TCP 6668, AES        ┌────────────────────────────┐
│  Tuya WiFi    │ ◄────────────────────► │  TuyaLocalClient           │
│  device       │   proto 3.1/3.3/3.4/3.5│  heartbeat 15s · backoff    │
│               │                        │  5s→60s · queues            │
└───────────────┘                        └─────────────┬──────────────┘
       ▲                                               │
       │ LAN (default)                    ┌─────────────▼──────────────┐
       │                                  │  LocalFirstResolver        │
┌──────┴───────────────────────┐          │  pure decision + reason    │
│  Homey app                   │          │  lan → cloud? → none       │
│  wifi_* drivers (Tuya LAN)   │          └─────────────┬──────────────┘
│  TuyaLocalDevice             │                        │ only if cloudFallback=true
└──────────────────────────────┘          ┌─────────────▼──────────────┐
        ▲ TuyaUDPDiscovery                │  Tuya Cloud (opt-in)       │
        └── IP self-healing ─────────────►│  diagnostic snapshot only, │
                                          │  never applied, rate-      │
                                          │  limited 1/10min           │
                                          └────────────────────────────┘
</pre>

<h3>Components</h3>
<table>
<tr><th>Component</th><th>File</th><th>Role</th></tr>
<tr><td>TuyaLocalClient</td><td><code>lib/tuya-local/TuyaLocalClient.js</code></td><td>Encrypted LAN session: protocol auto-negotiation, heartbeat, backoff, command &amp; offline queues</td></tr>
<tr><td>TuyaLocalDevice</td><td><code>lib/tuya-local/TuyaLocalDevice.js</code></td><td>Base class for the ${nTuya} Tuya LAN drivers; wires resolver decisions, <code>connection-timeout</code> fallback, LAN retry</td></tr>
<tr><td>LocalFirstResolver</td><td><code>lib/wifi/LocalFirstResolver.js</code></td><td>Pure transport decision (lan/cloud/none) with a logged, user-diagnosable reason</td></tr>
<tr><td>WiFiConnectionPolicy</td><td><code>lib/wifi/WiFiConnectionPolicy.js</code></td><td>Per-device policy store — <code>local_first</code> strategy, <code>cloudFallback</code> opt-in (default off)</td></tr>
<tr><td>TuyaUDPDiscovery</td><td><code>lib/tuya-local/TuyaUDPDiscovery.js</code></td><td>UDP 6666/6667/6668 listener, dynamic IP self-healing</td></tr>
<tr><td>LocalWiFiTuyaBridge</td><td><code>lib/tuya/LocalWiFiTuyaBridge.js</code></td><td>Local-first facade (discovery + sessions) for unified WiFi handling</td></tr>
<tr><td>TuyaCloudAPI</td><td><code>lib/tuya-local/TuyaCloudAPI.js</code></td><td>Pairing-time <code>local_key</code> retrieval and opt-in diagnostic snapshots</td></tr>
</table>

<h3>DP mappings (tuya-local catalog)</h3>
<p>The data-point mappings are cross-checked against the <b>tuya-local</b> project catalog:
<b>${(tl.totalDevices || 0).toLocaleString()} devices</b> catalogued across
<b>${(tl.uniqueManufacturers || 0).toLocaleString()} manufacturers</b> with
<b>${(tl.totalDpMappings || 0).toLocaleString()} DP mappings</b>
(snapshot ${data.tuyaLocalDevices} devices exported in <code>data/scanners/tuya-local-results.json</code>).
Conservative additions land in driver <code>dpMappings</code> only when attested across multiple devices —
ambiguous generic DP names ("switch", "sensor", "value") are annotated, never guessed.</p>
</div>

<div class="footer">
<p>Generated ${new Date().toISOString().split('T')[0]} | <a href="index.html">🔍 Device Finder</a> | <a href="${R}">GitHub</a> | <a href="${R}/tree/master/lib/tuya-local">tuya-local stack</a> | <a href="https://community.homey.app/t/140352">Forum</a></p>
<p>Data auto-regenerated from the repository on every Pages deploy</p>
</div>
</body></html>`;
}

function generate() {
  const data = collectWifi();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'wifi.html'), page(data));
  console.log('WiFi page generated: ' + data.wifi.length + ' wifi drivers ('
    + data.wifi.filter(d => d.conn === 'tuya').length + ' Tuya LAN), '
    + (data.tuyaLocal ? data.tuyaLocal.totalDevices : 0) + ' tuya-local devices, '
    + data.mfsEntries + ' mfs_db entries');
  return data;
}

if (require.main === module) generate();
module.exports = generate;
