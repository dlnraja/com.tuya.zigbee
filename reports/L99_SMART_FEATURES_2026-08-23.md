# L99 — Smart features / Daylight Atmosphere (2026-08-23)

## Verdict

Hub-class lighting & presence features already existed but were **fragmented** (4 circadian curves) and **branded in UI** (Hue / IKEA / Aqara / Natural Light). This pass consolidates math under **Daylight Atmosphere**, renames UI to community generics, and improves Path Light / Dawn / Dusk with solar + lux **Room Balance** — without copying commercial products or naming them in the app.

## Naming (OSS / Universal Tuya)

| Concept (generic) | Our UI name | Legacy flow id (kept) |
|-------------------|-------------|------------------------|
| Adaptive white / ambient CT | **Daylight Atmosphere** / **Solar Sync** / **Room Balance** | `hue_circadian_apply`, `natural_light_*` |
| Motion lighting | **Path Light** | `hue_motion_lighting` |
| Wake / sleep ramps | **Dawn Ramp** / **Dusk Fade** | `hue_wakeup`, `hue_sleep` |
| All off | **All Lights Off** | `hue_all_off` |
| Presence mimic | **Lived-In Shuffle** | `presence_simulation_*` |
| Scene cycle | **Scene Slots** | `scene_cycle` |
| Blind position | **Cover Setpoint** | `cover_set_position` |

IDs stay `hue_*` so existing Homey flows do not break. Titles/hints are brand-free.

## Architecture

```
DaylightAtmosphere.compute({ solar, lux })
        ↑
 CircadianEngine / AdaptiveLighting / SmartBiorhythm / app Path Light
```

- Pure compute (no timers) → Homey 64MB friendly
- Solar elevation when `SolarElevation` ready; clock fallback otherwise
- Lux bias = **Room Balance** (cool when bright, warmer when dark)

## Track

**MASTER_ONLY** for heavy engines (already deferred via BootBudget). Brand-scrub of flow titles is safe for both tracks when backported surgically.

## Gates / tests

```bash
node tools/ci/smart-features-brand-scrub-gate.js
node test/critical/l99-daylight-atmosphere.test.js
```

SSOT: `config/architecture/smart-features-ssot.json`

## Anti-slop

- No Entertainment / RGB flood stream
- No second circadian timer stack
- No commercial names in `.homeycompose/flow` UI strings
- Manufacturer catalogs may still list Zigbee vendors (protocol truth)

## Follow-ups

- Optional: wire `DeviceGroupSceneManager` under BootBudget (group scenes)
- Soft-migrate settings labels `adaptive_lighting` → Solar Sync in device settings if any remain branded
