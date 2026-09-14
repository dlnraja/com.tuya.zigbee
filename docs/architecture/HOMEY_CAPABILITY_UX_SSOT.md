# Homey Capability UX SSOT (P2500)

Machine SSOT: [`config/architecture/homey-capability-ux-ssot.json`](../../config/architecture/homey-capability-ux-ssot.json)  
Gate: `npm run check:p2500` (folded into `check:p249x`)

## Why

Silent harvest from [Device Capabilities T43287](https://community.homey.app/t/app-pro-device-capabilities-enhance-the-capabilities-of-devices/43287) (READ-ONLY) + Athom capability docs + T140352 battery UI reports (Peter).

**Contre quoi:** `capabilitiesOptions.measure_battery.getable: false` hid Battery + Insights History while ZCL still painted % (P2499 / diag `77394256`).

## Athom rules we lock

| Option | Use | Never |
|--------|-----|-------|
| `getable: false` | Stateless `onoff` / `volume_mute`, `button.N` maintenance tiles (P2492) | Any `measure_*` / `meter_*` / `alarm_*` |
| `preventInsights` | High-churn debug only | Battery / temp / humidity / power / energy users care about |
| `setable: false` | Sensors (correct) | — |

Docs: [Capabilities](https://apps.developer.homey.app/the-basics/devices/capabilities) — `getable:false` changes UI + Flow cards; adding it later can break Flows.

## Device Capabilities lessons → our app

| DC pattern | Our implementation |
|------------|-------------------|
| Listen to any capability change | `capability_value_changed_generic` (`FeatureFlowCards`) — device picker = **all** app devices |
| Value N minutes ago | `capability_historical_value` (Insights + ring buffer) |
| AVD custom fields | **Do not clone** full AVD — MASTER_ONLY features only; no phantom DynCap climate/curtains |
| Parallel field spam crashes | BootBudget + L14 `safeSetCapabilityValue` anti-flood |
| Energy subtypes | Only when driver `class` / Energy schema supports — never invent |

## Button vs sensor (same device)

- Scene remotes: `button.N` → `getable: false` + charter titles (P2492) — OK.
- Same device `measure_battery` → **must stay getable** (P2499) — Homey shows Battery + History.

## Dual-app

Classify **BOTH** (UI/Insights reliability). No Stable→Test publish spam.

## Silent policy

T43287 / satellites = SHADOW read only (T157628). Scan → code/CI. Never forum POST.
