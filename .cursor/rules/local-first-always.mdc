---
description: Local-first apps doctrine — Zigbee mesh + WiFi LAN before cloud (P2660)
alwaysApply: true
---

# Local-first apps — ALWAYS ON (P2660)

**Mandate:** Every Homey app in this repo (Universal, Stable, Bastien) is **local-first by priority**. Cloud is never the default control path.

## Priority order (do not invert)

1. Homey Zigbee mesh (ZCL / EF00) — no Tuya account
2. WiFi LAN (TuyAPI + `device_id`/`local_key` in settings/store)
3. Hub `gwID`+`cid` only as fallback for Zigbee-behind-WiFi-gateway
4. Cloud — optional pairing / key export when user sets `cloudFallback=true`

## Forbidden without explicit user opt-in

- Default `cloudFallback: true` or cloud-first WiFi strategy
- Requiring `TuyaCloudAPI` / `openapi.tuya*` for Zigbee `onNodeInit` / capability TX
- Homey-runtime remote/paid AI for device IO
- Forcing Zigbee end-devices through WiFi hub LAN when Homey mesh works

## Agent checklist

```
[ ] Zigbee path = Homey mesh first
[ ] WiFi = LAN credentials persist across reboot (LocalCredentialPersist)
[ ] cloudFallback stays false unless user asks
[ ] OSS peers (TinyTuya/TuyAPI/tuya-local/…) = data sources, not cloud control
[ ] Gate: npm run check:p2660 (+ check:p2525 / check:wifi-local)
```

## SSOT

- Machine: `config/architecture/local-first-ssot.json`
- Human: `docs/architecture/LOCAL_FIRST_SSOT.md`
- WiFi: `docs/WIFI_LOCAL_FIRST_ARCHITECTURE.md`
- T146735 lessons: `config/architecture/t146735-local-first-lessons.json`
