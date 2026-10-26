# FAQ — Tuya Wi-Fi devices on your local network

This app talks to Tuya Wi-Fi devices **directly on your LAN** (no cloud round-trip for
on/off, dimming, sensors…). The cloud is only used if *you* choose it to fetch the
device's local key once. Written in our own words; protocol background and credits are in
`docs/knowledge/WIFI_LOCAL_PROTOCOLS_P2930.md` and `CREDITS.md`.

## 1. What do I need before pairing?
Every Tuya Wi-Fi device needs three things: its **device ID**, its **local key** and its
**IP address** on your network. The pairing screen can get them for you in three ways:

| Way | When to use it |
|---|---|
| **Smart Life QR** (no developer account) | Easiest. In Smart Life / Tuya Smart open *Me → Settings → Account and Security → User Code*, type that code in the pairing screen, then scan the QR it shows with the app and confirm. |
| **IoT Platform keys** (Access ID / Secret) | If you already have a free Tuya IoT developer project linked to your app account. Keys can be stored once in the app *Settings* page. |
| **Local / ad hoc** | You already know device ID + local key (tinytuya wizard, tuya-cli, IoT API explorer). Paste them, or import a tinytuya `devices.json`. No cloud at all. |

Device in a white-label app (Lidl Home, Moes, Nedis, Gosund, Avatto, BlitzWolf, LSC…)?
Remove it from that app and add it again in Smart Life (same hardware, same Wi-Fi), then
use the QR way.

## 2. The device was found but stays "unavailable"
Check in this order:
1. **IP changed.** Give the device a fixed IP (DHCP reservation in your router), then
   *Repair → configure* and enter the new IP. Port suffixes like `:6668` and spaces are
   cleaned for you. Since P3072 the app also follows the device by itself when it announces
   a new IP on UDP (at most once a minute per device), and *Repair* shows a status line
   (connected, IP, protocol, when it was last heard, last error) with a **Find device on the
   network** button that wakes the device and saves the IP it answers from.
2. **Local key changed.** Removing and re-adding the device in Smart Life creates a **new
   local key**. Use *Repair → Fetch local key from linked account*, or paste the new key.
   Empty fields in Repair keep their current value, so you only type what changed.
3. **Another app holds the connection.** Most Tuya devices accept **one LAN client at a
   time**. Close Home Assistant / tinytuya scripts / a second Homey app using the same
   device. Closing the Smart Life app on your phone can also help during the first probe.
4. **Different VLAN / guest Wi-Fi.** Homey and the device must reach each other on TCP
   6668; discovery uses UDP 6666/6667/7000.

## 3. Which protocol version should I pick?
Leave **Auto** (tries 3.5 down to 3.1). Only force a version if the device log shows it
connects but every reply fails to decrypt. "3.22" is handled as 3.3; labels like 1.x/2.x
in the Tuya app are cloud/firmware numbers, not LAN versions.

## 4. State is shown but my commands are ignored
Common causes:
- The device is a **sub-device behind a Wi-Fi hub/gateway**: commands must go through the
  gateway with the sub-device's `cid` / node id. These are filled in when the device is
  found through the linked account (QR or IoT keys); a hand-typed device often lacks them,
  so pair it again through the account link.
- The device ID you entered is not the real one (some apps show a "virtual" ID).
- Fast firmware drops rapid commands: raise **Command Gap (ms)** in the device settings
  (e.g. 300–500 ms for protocol 3.4/3.5).

## 5. The device goes offline for a few seconds and my flows fire "disconnected"
Raise **Offline Grace (seconds)** (default 60). Pet feeders, dehumidifiers and heaters
often drop TCP briefly; within the grace delay the app reconnects silently.

## 6. Thermostat setpoint is wrong after changing mode
Many thermostats change the setpoint internally after a mode switch without reporting it
right away. Wait a few seconds for the next status report, or change the setpoint once more
from Homey after the mode change.

## 7. Is my local key safe?
Keys are stored in the device settings on your Homey only. Diagnostic reports and support
bundles strip any field whose name looks like a key, token, secret or password. Never post
your local key or Access Secret on the forum.

## 8. What should I send when asking for help?
The device type, the protocol shown in the device settings, what works (reading?) and what
does not (commands?), and a diagnostic report ID from the app. No keys, no passwords.

## 9. Sonoff / eWeLink LAN: pairing stopped at "configure"
Before P3072 the Sonoff Wi-Fi drivers (Basic R4, Dual R3, Mini R3/R4, Micro, POW Elite,
S-Mate 2, TX 1/2/3 gang) had no pairing handlers, so the pair screen could not finish. They
now share the eWeLink LAN pairing and repair: enter the device id, IP and (for encrypted
firmware) the device key, or let mDNS list it. Repair keeps empty fields unchanged.

---
Thanks to the Homey community thread "Tuya Local" (topic 154077, field reports by Andi and
others), tinytuya (jasonacox), tuya-local (make-all), tuyapi (codetheweb) and localtuya
(rospogrigio, xZetsubou) for the knowledge this FAQ is built on — see `CREDITS.md`.
