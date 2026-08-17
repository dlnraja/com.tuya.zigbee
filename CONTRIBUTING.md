# Contributing — Universal Tuya Zigbee

Canonical guide: **[`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md)**

Quick rules:
- Sacred couple = `manufacturerName` + `productId` (never mfr alone).
- Fingerprint locks: compose + `DeviceFingerprintDB` + `mfs_db` + `new_fingerprints` + misattribution registry (together).
- `zb_model_id` / `zb_manufacturer_name` (snake_case settings).
- Capability writes: `safeSetCapabilityValue()` · timers: `safeSetTimeout` · battery: no linear `(V-2.5)/0.5`.
- Tuya MCU dimmers: `TuyaBrightnessScale` clamp 0–1000 (writes >1000 can reboot MCU).
- Dual-app: `master` (~9.0.583 Test soak) ≠ `stable-v5` (~5.12.85 reliability only).
- Forum: silent by default (T157628).

Thanks (study-only, no code copied): `gpmachado/com.gpm.homesuite` — see `CREDITS.md`.  
Knowledge: `.ai/KNOWLEDGE_CACHE.json` → `recentDiscoveries` · BSEED dimmer: `reports/P2138_BSEED_WALL_DIMMER_2026-08-17.md`.

Bug reports: `.github/ISSUE_TEMPLATE/` · include Homey diagnostic Log ID + `_TZxxxx` + `TSxxxx`.

Architecture map: [`docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md`](docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md)  
User troubleshooting: [`docs/guides/USER_TROUBLESHOOTING.md`](docs/guides/USER_TROUBLESHOOTING.md)
