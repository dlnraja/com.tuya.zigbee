# Contributing — Universal Tuya Zigbee

Canonical guide: **[`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md)**

Quick rules:
- Sacred couple = `manufacturerName` + `productId` (never mfr alone).
- `zb_model_id` / `zb_manufacturer_name` (snake_case settings).
- Capability writes: `safeSetCapabilityValue()` · timers: `safeSetTimeout` · battery: no linear `(V-2.5)/0.5`.
- Dual-app: `master` (Test soak) ≠ `stable-v5` (reliability only).
- Forum: silent by default (T157628).

Bug reports: `.github/ISSUE_TEMPLATE/` · include Homey diagnostic Log ID + `_TZxxxx` + `TSxxxx`.

Architecture map: [`docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md`](docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md)  
User troubleshooting: [`docs/guides/USER_TROUBLESHOOTING.md`](docs/guides/USER_TROUBLESHOOTING.md)
