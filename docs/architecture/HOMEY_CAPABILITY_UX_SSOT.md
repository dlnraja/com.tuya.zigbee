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
| Value N minutes ago | `capability_historical_value` (Insights + ring buffer) — **no** `capabilities=onoff` filter (P2687) |
| List actions + interaction history | P2687 `list_device_*` / `list_*_interactions` / `device_interaction` — MASTER_ONLY SoftFeature UX |
| AVD custom fields | **Do not clone** full AVD — MASTER_ONLY features only; no phantom DynCap climate/curtains |
| Parallel field spam crashes | BootBudget + L14 `safeSetCapabilityValue` anti-flood |
| Energy subtypes | Only when driver `class` / Energy schema supports — never invent |

Human detail: [`INTERACTION_FLOW_CARDS_SSOT.md`](./INTERACTION_FLOW_CARDS_SSOT.md) · machine `config/architecture/interaction-flow-cards-ssot.json` · tips [`THREE_APP_RECENT_TIPS.md`](./THREE_APP_RECENT_TIPS.md).

## Button vs sensor (same device)

- Scene remotes: `button.N` → `getable: false` + charter titles (P2492) — OK.
- Same device `measure_battery` → **must stay getable** (P2499) — Homey shows Battery + History.

## P2553 — Intelligent History fleet

- **Enable** History on priority sensor readables (`measure_battery`, climate, energy, alarms…) via compose + boot heal.
- **Silence** Insights only when intelligent: `alarm_motion` if `alarm_human` exists (VicHY dual spam); `measure_luminance.distance*` (mmWave flood).
- Tool: `npm run history:fleet` / `history:fleet:apply` · gate `npm run check:p2553`.
- **Already-paired devices (Peter #2238/#2239):** if compose already has `getable: true` and `preventInsights: false` on `measure_battery` but the History tab is still missing, Homey may need **one** remove + re-add so Insights enrollment refreshes. Boot heal restores options; it cannot re-create the Insights series after the fact.

## Dual-app

Classify **BOTH** (UI/Insights reliability). No Stable→Test publish spam.

## Silent policy

T43287 / satellites = SHADOW read only (T157628). Scan → code/CI. Never forum POST.

## P3362 - Standard units, official app.json, flow ids, startup JSON

- Every `measure_*` / `meter_*` / `target_temperature` capability must declare its standard
  unit (`config/architecture/standard-capability-units.json`). Missing units hide Insights
  History and break Apple Home coherence (P3361 battery, then climate and energy).
- Runtime healer: `standardUnitFor` in `lib/utils/HomeyCapabilityUx.js`. Already-paired
  devices get a bounded one-shot recycle (`p3362_units_insights_recycle`).
- Ratchet: `npm run check:p3362`. Weekday free GitHub Actions workflow
  `.github/workflows/apple-home-coherence.yml` auto-adds missing units, ports anonymized
  Bastien learnings (`config/ci/bastien-anon-learnings.json`) as checks, commits with
  `[skip ci]` only when tests pass, and opens no PR. Kill switch:
  `vars.APPLE_HOME_COHERENCE_DISABLED` or `config/ci/apple-home-coherence.json`.
  `GITHUB_TOKEN` only, no paid services, no Grok Bot routine.
- Committed `app.json` is the official compose rebuild (P3079). Never a `normalise()` rewrite.
- App-level flow card ids (`home_mode_changed`, `capability_value_changed_generic`,
  `device_interaction`) must never be dropped by consolidation.
- Startup must not eagerly parse large JSON catalogs.
- The degree sign `°` (U+00B0) is Latin-1 and is allowed in unit strings.

