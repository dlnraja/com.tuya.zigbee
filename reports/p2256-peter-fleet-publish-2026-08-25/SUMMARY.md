# P2256 — Unblock publish + Peter fleet soak

**Date:** 2026-08-25  
**Track:** MASTER (publish) · reliability BOTH candidates for SOS/water/contact already shipped

## Recent problems (cross-source)

| Problem | Status |
|---------|--------|
| Auto-Publish P2250–55 blocked | Sacred-couple audit: HOBEIAN climate multi-driver conflict + missing ZG-204Z + SergeP doNotTouch |
| Athom processing_failed #2977 | P2252 RAW combo budget (in tip; needs successful publish) |
| TS004x hybrid / 0x8004 | P2253/54 in tip |
| Peter SOS battery nervous | Spike guard + **P2256 jitter/hysteresis** |
| Peter contact / water | **OK on diag `f647d35b` (9.0.636)** |
| Peter smartbutton | Still dead; couple **ABSENT** — re-pair after soak; do not invent |

## Peter fleet (`f647d35b` 2026-08-24 @ 9.0.636)

| Device | Verdict | Action |
|--------|---------|--------|
| Door/Window contact | OK | Keep IAS coerce / skip leftover EF00 |
| Waterdetector | OK | Keep IAS-only skip EF00 TX |
| SOS | Works; battery glitchy | P2256 hysteresis + 60s jitter filter |
| Smartbutton | No presses; D101/D102 blank | Update Test + re-pair while pressing; wait `[BUTTON-WAKE]` |

Do **not** invent: k4ej3ww2, mrpevh8p, TS0207 from other users.

## Code changes

1. Strip HOBEIAN/ZG-227 from climate siblings → only `climate_sensor`
2. Add `ZG-204Z` to `presence_sensor_radar`
3. `mfs_db` HOBEIAN `modelIds` = soil only; `byPid` keeps multi-couple map
4. `audit-sacred-couple --from-registry` skips `doNotTouch`
5. SOS: ignore Δ≤5 within 60s; latch `battery_low` until clear > threshold+5

## User path

After Homey Test updates: **Update app → re-pair smartbutton (press during pair) → send new diag**. No forum reply.
