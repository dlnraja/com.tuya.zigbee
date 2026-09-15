# P2519 — Anti-regression audit (enrich ≠ overwrite)

## Verdict
Recent enrich was **mostly append-only**. Audit found **real degradations** → **restored/fixed**. Sacred user couples from forum/GitHub remain locked.

## Degradations found & corrected
| Issue | Cause | Fix |
|-------|-------|-----|
| `climate_sensor` re-painted `8eazvzo6` (6-gang) + `krwtzhfd` + invent `TS004F` | fleet/case-variant after market rollback | Strip + registry `p2519-8eazvzo6-not-climate` |
| `plug` / irrigation / `usb_dongle_triple` mfr lists shrunk | prune/collision | Union-restore with HEAD |
| `energy_meter_3phase` phase B/C thrashed primary V/A | over-aggressive DP enrich | Phase A only → primary; B/C internal |
| Curtain dual-claim `shkxsgis` / `npj9bug3` / `jfw0a4aa` | market/fleet onto wrong driver | Removed from curtain; registry forbid |
| `water_valve_garden` lost `mq4wujmp` (Kai T26439) | prune/collision | Union-restore from HEAD |

## Confirmed safe enrich (kept)
- `power_scale` **appended** on 59 drivers (caps untouched)
- `energy_meter_3phase` DP1 `onoff`→`meter_power` (Z2M a14rjslz bugfix)
- Market bulbs / TS130F curtains (mfr append, no dual-claim left)
- BSEED `l9brjwau` couple-correct on wall 2/3gang

## User-report locks re-verified (forum/GH)
Peter `mrpevh8p`, VicHY `clrdrnya`, MIAMO `icka1clh`, Eduard `fodv6bkr`, PresentSky `m1cvyneb`, salvagr Moes, Kai irrigation `mq4wujmp`, leak `k4ej3ww2`, meter91 `zgyzgdua`, Joep `fhvpaltk`, knob `uri7ongn`, 6gang `8eazvzo6`

## Gates green
`check:p2519` · `p2510`–`p2514` · `p2517`–`p2518` · sacred audit `failures: 0` · P2138

## Doctrine
Enrich = **union/append**. Never shrink mfr/pid/settings/capabilities/clusters unless same couple is in the **wrong** driver.
