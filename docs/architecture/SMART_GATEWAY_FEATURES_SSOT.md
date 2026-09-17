# Smart Gateway Features (P2563)

Branding-free Homey reimplementations of common Zigbee hub smart features.

**Machine SSOT:** [`config/architecture/world-zigbee-smart-features-ssot.json`](../../config/architecture/world-zigbee-smart-features-ssot.json)  
**Catalog:** [`config/architecture/smart-features-ssot.json`](../../config/architecture/smart-features-ssot.json)  
**Classify:** `MASTER_ONLY` (engines) · brand-scrub titles `BOTH`-safe  
**Gate:** `npm run check:p2563`

## Generic ↔ commercial (internal map only)

| UI name | Module | Homey feasibility |
|---------|--------|-------------------|
| Soft Daylight Fade | `lib/features/SoftDaylightFade.js` | full — continuous CCT/dim toward Daylight Atmosphere |
| Lamp Mesh Occupancy | `lib/features/LampMeshOccupancy.js` | partial — LQI/RSSI (+ optional PIR); not closed-PHY parity |
| Daylight Atmosphere / Solar Sync / Path Light / Dawn / Dusk | existing | full |
| Entertainment RGB stream | — | skip (BootBudget / mesh flood) |

Hub: `lib/features/SmartGatewayFeatureHub.js` (boot via BootBudget heavy pass in `app.js`).

## Flow cards (brand-free titles)

- `soft_daylight_fade_start` / `soft_daylight_fade_stop`
- `lamp_mesh_occupancy_enroll` + trigger `lamp_mesh_occupancy_changed`

Legacy `hue_*` action IDs remain for Path Light / Solar Sync / Dawn / Dusk so existing flows do not break — UI titles stay scrubbed.

## Lamp occupancy note

Proprietary hubs may use dedicated Zigbee PHY sensing in lamps. Homey Pro exposes coarse link quality / last-seen. Lamp Mesh Occupancy fuses that with optional real motion sensors and AdvancedPresenceEngine — soft estimate only.
