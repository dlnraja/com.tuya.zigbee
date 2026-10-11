# New driver ids rejected by Athom (AggregateError) — offline analysis 2026-10-11 (Paris)

No upload was made for this analysis. Sources: git history of master (version commits), committed
app.json at each version, config/publish-hold-drivers.json, docs/knowledge/ATHOM_LIMITS.md.

## Builds compared
| Build | Driver dirs | Held | Published drivers | committed app.json | Result |
|---|---|---|---|---|---|
| 9.0.1416 | 448 | 2 | 446 | — | Test |
| 9.0.1417 (#3536, valve_controller_5zone) | 449 | 2 | 447 | 4 448 892 B | AggregateError |
| 9.0.1418 (#3537, retry) | 449 | 2 | 447 | — | AggregateError |
| 9.0.1419 (valve held) | 449 | 3 | 446 | — | Test |
| 9.0.1420 | 449 | 3 | 446 | 4 448 172 B | Test |
| 9.0.1421 (#3540, remote_rgbcct_8zone) | 450 | 3 | 447 | 4 451 050 B | AggregateError |
| 9.0.1422 (#3541, retry) | 450 | 3 | 447 | — | AggregateError |

Over the whole history (v9.0.1300 → 1422) every build that reached Test published at most 446 drivers;
446 was first reached at 9.0.1330 (accepted). Every build publishing 447+ (1331..1361 with SPI,
1361 with spi held but whd02 in, 1417/1418, 1421/1422) failed with AggregateError.

## What is NOT different between passing and failing builds
- App-level flow cards: 61 triggers / 47 conditions / 93 actions on all four builds; 55 custom capabilities.
- app.json size: +0.7 KB (1417) / +2.9 KB (1421) vs 1420; K2 (#3487) added ~70 KB and passed → not size.
- Locales: unchanged.
- Assets: new drivers carry small 75×75 / large 500×500 PNG + icon.svg with the same sizes as passing
  drivers (remote_rgbcct_8zone images are byte-identical to switch_1gang's); no driver has xlarge.
- Archive: file count and total size change only by the new driver folder (≈30 KB).
- Driver id length < 41 chars, class/capabilities valid, `homey app validate --level publish` passes.

## Interpretation
- Pure correlation: "published driver count > 446 ⇒ AggregateError" fits every build on master.
- But ATHOM_LIMITS.md records two counter-signals: P1 #3495 (a 447th driver, deprecated, no
  manufacturerName) reached Test, and #3483 (deprecating one driver, i.e. fewer pairable drivers) failed.
  So the trigger is best described as **a change in the set of pairable driver ids** of this very large
  app (or a pairable-driver ceiling at 446), server-side at Athom. Not documented by Athom; peer apps'
  built manifests are not public, so no peer ceiling could be measured (JohanBendz upstream: 113 drivers).
- Changes inside existing drivers (couples, flow cards, settings, code) keep passing.

## Decision
Ship new devices as exact-couple profiles inside existing drivers (fold), as already done for SPI →
led_controller_rgb and WHD02 → switch_1gang:
- AutomatOn AUT000069 `_TZ3000_j0ktmul1`/TS011F → `switch_4gang`, 5 gangs via GangCountAdapter pattern.
- MiBoxer FUT089Z `_TZ3000_xwh1e22x`/TS1002 → `button_wireless_4` with an exact-couple zone profile
  and dedicated zone trigger cards.
The new driver folders stay in source, held from the payload.

## Bug found while analysing
remote_rgbcct_8zone triggers used the same name `zone` for an argument and a token (P2746 rule:
token ≠ arg). Fixed in the fold (`zone_filter` argument).

## Update 14:32 Paris — the theory is weakened: AggregateError is (at least partly) flaky
- Valve fold (no new driver id; payload diff vs 1420 = switch_4gang +j0ktmul1/+TS011F and 3 compaction
  pid swaps) → **9.0.1424 #3543 AggregateError**, then the same content re-dispatched → **9.0.1425 Test**.
- Earlier: 1385 Test / 1386 (near-identical) AggregateError. Same-content flips exist.
- Outcomes are now logged in `docs/knowledge/athom-publish-outcomes.jsonl` (40 builds reconstructed:
  14 Test, 13 AggregateError, 11 transient). New-driver builds failed 2/2 each (SPI, whd02, valve,
  rgbcct = 8/8), which still makes new driver ids look riskier than the base rate, but one failure alone
  proves nothing. Rule: treat a single AggregateError as possibly transient; conclude only after 2 failures.
