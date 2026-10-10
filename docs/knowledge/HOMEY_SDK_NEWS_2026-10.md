# Homey SDK, CLI and developer news — October 2026 (our summary)

Checked 2026-10-10 (Europe/Paris). Written in our own words; links and authors below.

| Topic | What changed | Impact for this app |
|---|---|---|
| homey CLI (npm `homey`) | 4.5.0 (2026-09-10) → 4.6.0 (2026-10-09). Since 4.5.0 it declares `engines.node >=24`. | Our CI runs `npx homey` on Node 20/22. Raise CI Node to 24 (CI only; the app runtime is Homey's). Weekly refresh proposes it via draft PR. |
| homey-lib (validator) | 2.52.3 (2026-09-29); ours ^2.51.4. | New validate rules land here; `validate --level publish/verified` in CI picks them up. |
| homey-zigbeedriver | 2.2.18; ours 2.2.17 pinned. | Kept on purpose (firmware 12.2–12.8). Port useful fixes. |
| zigbee-clusters | 3.8.0; ours ^2.6.0. | Major bump, needs newer firmware: proposal only. |
| Capability options (SDK docs) | `uiState` for tile state (Homey ≥ 13.5.0); `setOnDim`, `duration`, enum `values` (≥ 12.0.1), `zoneActivity`, `approximated`, `target_power` exclude range. | Lights: `onoff.setOnDim`, `dim.duration`. `uiState` needs compat ≥ 13.5, so only behind a compat raise. |
| Color UI component | Takes `light_hue`, `light_saturation`, `light_temperature`, `light_mode`. | RGBCCT drivers (e.g. Gledopto GL-SPI-206P) should expose `light_temperature` + `light_mode`. |

Sources: npm registry pages for homey, homey-lib, homey-zigbeedriver, zigbee-clusters (Athom B.V.);
https://apps.developer.homey.app/the-basics/devices/capabilities (Athom B.V.);
https://apps.developer.homey.app/app-store/publishing (Athom B.V.). Earlier news: HOMEY_NEWS_2026_AUDIT.md.
