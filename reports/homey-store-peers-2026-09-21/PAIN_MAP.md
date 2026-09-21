# Pain map — Homey peers + OSS → our complementary landings (P2657)

Generated 2026-09-21. Silent enrich only — no forum POST.

## Homey / forum / GitHub themes

| Pain (users) | Where heard | Our solution (already or P2656/P2657) | Dual-app |
|--------------|-------------|----------------------------------------|----------|
| Device unknown / wrong class | T26439, T140352, GitHub issues | Sacred couple `(mfr,pid)`; NEED_INTERVIEW; never invent pid | BOTH |
| Buttons look like toggles / no scene | T140352 | PhysicalButtonMixin + HomeyButtonUiCharter; re-pair | BOTH |
| Battery `?` / strip on buttons | Gmail / T140352 | P2488/P2490 keep+rehydrate `measure_battery` | BOTH |
| LCD / MCU time wrong | Forum / Z2M | `TuyaTimeSyncFormats` multi-format | BOTH |
| WiFi “unavailable” after re-pair | T154077 | Fix It + Cloud Lookup + wizard re-key notes | MASTER_ONLY |
| Closed TCP 6668 but device exists | T154077 / TinyTuya | UDP 6666/6667/7000 discovery notes | MASTER_ONLY |
| BLE lock / BLE behind gateway | T154077 | LAN_LIMITATION_NOTES — cloud-only | MASTER_ONLY |
| Zigbee behind Tuya WiFi hub | HA / localtuya | Prefer Homey Zigbee; hub cid + `node_id` fallback | MASTER_ONLY |
| One TCP session — phone app open | rebtor readme | WifiFixIt note (P2657) | MASTER_ONLY |
| Lidl strip all outlets switch together | T63828 / T26439 | Interview / multi-EP `socket_power_strip` | BOTH |
| Cloud API / Drenso broken | T146735 / Athom notices | Stay local-first; cloud contrast only | MASTER_ONLY |
| Official Tuya private / API revoke | Store / forums | Document peer; do not copy | — |
| Dimmer brightness reboot | Z2M #32305 | `TuyaBrightnessScale` 0–1000 | BOTH |
| Double division sensors | Forum | SmartDivisorManager | BOTH |

## OSS themes (Z2M / ZHA / HA)

| Theme | Source | Our landing |
|-------|--------|-------------|
| Converter couples | Z2M herdsman | `johan-dump` / sacred-couple / mfs |
| Quirks / clusters | ZHA | compose clusters + Ef00OnlyInterview |
| Hub `node_id` / session limits | make-all tuya-local | `TuyaZigbeeBridge` |
| Protocol 3.1–3.5 | TinyTuya / tuyapi | `UdpDiscoveryKeys` + pairing order |
| No local_key for Zigbee on coordinator | community writeups | `CONTROL_PATH_DOCTRINE` |

## Explicitly not done

- No Bastien publish for catalog-only
- No wholesale YAML / Python / Go runtime
- No auto-reply on peer forum topics
