# GAP map — OSS LAN Tuya investigation (2026-09-21)

## Verdict

Our stack already covers the main LAN WiFi path (TinyTuya/tuyapi parity + com.tuyalocal complementary). Gaps were **hub Zigbee cid heuristics**, **gateway category UNION**, **gwID hub parent options**, **three-path doctrine** (Homey Zigbee vs WiFi LAN vs hub cid), and **catalog credits** for newer OSS peers — filled under **P2656** without wiping existing WiFi reliability.

## Already strong (no degrade)

| Area | Status |
|------|--------|
| Protocol cascade 3.3→3.4→3.1→3.5→3.2 | P2619 `PAIRING_PROTOCOL_ORDER` |
| UDP 55AA/6699 + key normalize | `UdpDiscoveryKeys` |
| Offline grace / command gap / stale reconnect | P2619–P2642 |
| Fix It TCP 6668/6667 Open vs closed | P2647 |
| SmartLife QR + IoT keys | `TuyaSmartLifeAuth` |
| Homey Zigbee native (ZCL/EF00) | Primary for Zigbee end-devices |
| TuyAPI as Homey runtime | `TuyaLocalClient` / wifi_* |

## Gaps found → complementary fill

| Gap | Source | Fill |
|-----|--------|------|
| Hub child cid prefers `node_id` | make-all + tuya-mqtt | `resolveSubDeviceCid` |
| Gateway categories only `wg`/`zgwz` | TinyTuya / HA | UNION `GATEWAY_CATEGORIES` |
| parent_id / gateway_id link | hass-localtuya | `identifySubDevices` filter |
| Hub LAN session cap ~1–3 | make-all discussion | soft warn constant |
| Hub TuyAPI missing explicit `gwID` | tuyapi + localtuya PR#318 | `buildGatewayTuyApiOptions` |
| Fix It silent on UDP 7000 | TinyTuya | `LAN_LIMITATION_NOTES` append |
| No path doctrine (Zigbee vs WiFi vs hub) | Z2M/ZHA + community | `CONTROL_PATH_DOCTRINE` + Fix It notes |
| cid confused with cloud deviceId | tuyadump / localtuya #318 | docs + resolveSubDeviceCid |
| Missing OSS credits | vineet / xZet / lehan / sharing-sdk / tuyapi / GoTuya | SourceCredits + SSOT |

## Explicitly NOT done (anti-degrade)

- No wholesale HA YAML import
- No Python TinyTuya / GoTuya runtime in Homey bundle
- No invent Zigbee productId from WiFi categories
- No forcing Tuya hub instead of Homey Zigbee coordinator
- No MQTT broker as Homey default
- No forum POST

## Tip users

Zigbee: pair to Homey Zigbee (Universal / Stable / Bastien) — **no local_key**.  
WiFi LAN: update Universal Test; use Fix It if ports closed; re-wizard keys after re-pair.
