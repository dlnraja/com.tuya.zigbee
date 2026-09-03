# P2409 — WiFi pairing & auth multi-version cascade (2026-09-03)

## Classification
**BOTH** — pairing reliability (local_key retrieval + LAN match + probe)

## Research sources
TinyTuya Cloud endpoints, make-all/tuya-local `tuya_sharing` (QR + schemas), Tuya OpenAPI device list versions.

## Shipped
| Area | Change |
|------|--------|
| Regions | eu, we, us, ue, cn, in, sg (+ aliases) with auto-fallback |
| App schemas | smartlife / tuyaSmart / alts — QR retry chain |
| Device APIs | sharing HA + home, iot-03 v1.3/v1.0, associated, users/{uid}/devices |
| Orchestrator | `collectLanDevices` + `matchCloudToLan` + `probeLocalCredentials` (3.5→3.1) |
| Pair UI | regions + auto-region + protocol Auto synced to Tuya `wifi_*` |
| Settings | region dropdown expanded |

## Local-first reminder
Cloud auth = **pairing / key refresh only**. Runtime control stays LAN.
