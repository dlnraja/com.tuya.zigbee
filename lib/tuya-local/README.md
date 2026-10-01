# Tuya Wi-Fi Local Integration (local-first)

Local LAN control of Tuya-based Wi-Fi devices (Tuya / Smart Life and white-label
brands such as Lidl Silvercrest, Moes, Nedis, Gosund, Avatto, BlitzWolf, LSC, Zemismart).
The cloud is only used **once** to fetch `device_id` + `local_key`; afterwards Homey talks
to the device directly over TCP 6668. Cloud control is never used unless the user opts in.

## Architecture
```
Smart Life / Tuya Smart ── User Code + QR ──> TuyaSharingClient ─┐
IoT Platform (Access ID/Secret) ─────────────> TuyaSmartLifeAuth ─┼─> devices + local_key
Easy Login (email/phone + IoT creds) ────────> TuyaCloudAPI ──────┘
Manual entry (device_id + local_key [+ IP]) ───────────────────────> (no cloud)
                                   │
            LAN discovery: TuyaUDPDiscovery (UDP 6666/6667/6668/7000, 3.1 plain,
            3.3 55AA/ECB, 3.5 6699/GCM + 0x25 solicitation) + mDNS + TCP/6668 scan
                                   │
            TuyaPairingOrchestrator: cloud ↔ LAN match, credential probe (3.1–3.5)
                                   │
            TuyaLocalDevice → TuyaLocalClient (tuyapi): 3.1 / 3.2 / 3.3 / 3.4 / 3.5
            (3.4/3.5 session-key negotiation inside tuyapi), heartbeat, stale-data
            watchdog, exponential reconnect backoff, offline command queue,
            protocol auto-cascade, dynamic IP self-heal
```

## Key retrieval methods
| Method | Needs | Notes |
|---|---|---|
| **Smart Life QR** (recommended) | Smart Life / Tuya Smart account **User Code** (app: Me → Settings → Account and Security → User Code) | No developer account. Same flow as Home Assistant's Tuya integration / make-all tuya-local. Session saved in Homey app settings (`tuya_sharing_session`) for later key refresh. |
| IoT Platform | Access ID/Secret of a Tuya IoT project linked to the Smart Life / Tuya Smart account | Regions eu / we / us / ue / cn / in / sg with auto-region fallback. |
| Easy Login | IoT credentials in App Settings + app email/phone + password | Uses `associated-users/actions/authorized-login`. |
| Manual / ad hoc | device_id + local_key | Probe tries 3.1–3.5; **"add anyway"** creates the device even if it is offline right now. |

White-label apps (Lidl Home, MOES, Nedis SmartLife, Gosund, …) use separate Tuya account
spaces, so the QR link does not see them: move the device into Smart Life (no flashing) or use
manual entry. See `TuyaWhiteLabelCatalog.js`.

## Security
- Access Secret, sharing tokens and local keys live only in Homey settings / device settings.
- They are never logged, never echoed back to pairing/repair webviews, never committed.
- CI tests use in-memory mock transports only (no real accounts, no network).

## Components
| File | Purpose |
|------|---------|
| `TuyaSharingClient.js` | Smart Life User Code + QR login and encrypted customer API (port of tuya-device-sharing-sdk, MIT) |
| `TuyaSmartLifeAuth.js` | Auth façade: sharing QR, IoT Platform token, device list cascade |
| `TuyaCloudAPI.js` | Tuya OpenAPI client (Easy Login, device info / key refresh) |
| `TuyaAuthCatalog.js` | Regions, schemas, sharing client id, device-list APIs |
| `TuyaWhiteLabelCatalog.js` | White-label brand → key-retrieval advice |
| `UdpDiscoveryKeys.js` | UDP discovery crypto (55AA ECB / 6699 GCM / plaintext), key normalization, protocol chain |
| `TuyaUDPDiscovery.js` | Persistent app-level UDP listener + active 3.5 solicitation |
| `TuyaDeviceDiscovery.js` | On-demand pairing scan |
| `TuyaTcpForceScan.js` | TCP/6668 sweep for silent devices |
| `TuyaPairingOrchestrator.js` | Max discovery + cloud↔LAN match + credential probe |
| `TuyaLocalClient.js` | tuyapi wrapper: reconnect, heartbeat, watchdog, queues |
| `TuyaLocalDevice.js` / `TuyaLocalDriver.js` | Homey device/driver base classes for all `wifi_*` Tuya drivers |
| `WiFiDPRegistry.js` | DP maps per category (reuses the app's DP tables) |

## Protocol support
- **3.1** plaintext JSON + MD5 signature, **3.2/3.3** AES-128-ECB, **3.4** AES-ECB + HMAC with
  session-key negotiation, **3.5** AES-128-GCM (6699 frames) with session-key negotiation.
- UDP: 6666 plaintext (3.1), 6667 ECB with key `MD5("yGAdlopoPVldABfn")`, 6699/GCM 3.5 broadcasts,
  0x25 discovery solicitation on UDP/7000.

## Sources (consulted / used — see CREDITS.md and NOTICE)
- [tuya/tuya-device-sharing-sdk](https://github.com/tuya/tuya-device-sharing-sdk) — MIT — ported (sharing login + request signing/encryption)
- [make-all/tuya-local](https://github.com/make-all/tuya-local) — MIT — QR flow, client id / schema, cloud device fields
- [home-assistant/core Tuya integration](https://github.com/home-assistant/core/tree/dev/homeassistant/components/tuya) — Apache-2.0 — client id / schema constants (facts)
- [codetheweb/tuyapi](https://github.com/codetheweb/tuyapi) — MIT — runtime dependency (LAN protocol 3.1–3.5)
- [jasonacox/tinytuya](https://github.com/jasonacox/tinytuya) — MIT — protocol notes (6699 framing, retcode, UDP keys, scanner)
- [tuya/tuya-connector-nodejs](https://github.com/tuya/tuya-connector-nodejs) — OpenAPI signature format (consulted, no code copied)
- [andiwirz/com.tuyalocal](https://github.com/andiwirz/com.tuyalocal) — MIT — Homey Tuya-local patterns (protocol order, command gap, stale-data watchdog)
- [Drenso/com.tuya2](https://github.com/Drenso/com.tuya2), [jurgenheine/com.tuya.cloud](https://github.com/jurgenheine/com.tuya.cloud) (MIT), [rebtor/nl.rebtor.tuya](https://github.com/rebtor/nl.rebtor.tuya) (MIT) — earlier Homey Tuya app patterns
