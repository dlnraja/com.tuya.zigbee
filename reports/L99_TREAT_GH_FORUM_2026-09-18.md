# L99 TREAT — GH issues + discussions + forum — 2026-09-18

Silent only (T157628). Dual-app: BOTH reliability.

## GitHub open

| ID | Couple / symptom | Verdict | Action |
|----|------------------|---------|--------|
| **#533** salvagr | `_TZE204_5slehgeo`+`TS0601` Moes ZTS-EUR-C paired as radiator | Already `curtain_motor` + misattribution + sacred-keep | Tip-lag → update Test + **remove/re-pair** |
| **#547** HiepSVG | `_TZE204_gkfbdvyx`+`TS0601` virtual driver, 0 caps, left mesh | Already `presence_sensor_radar` + magic + EF00-only | **P2583**: dual-scale range DP3/4, soft poll 2min, magic retry, TZE284 sacred-keep |
| **#548** Wuma68 | Crash loop @ **9.0.908** diag `97413373` | **P2484** MaxListeners/EF00 re-entry — tip ≥9.0.914 | Tip-lag only |
| Discussion **#100** | `_TZ3000_pjb1ua0m`+`TS0203` pressure band | Already `contact_sensor` | Done (prior replies) |

## PRs

Open PRs: **0**

## Forum NEED_ACTION (51)

Auto-investigate 48 → almost all `fixShipped` / `alreadyInCatalog` (tip update + re-pair). Top: VicHY radar (P2581/P2582 tip), Gabriel T158757, buttons T150690, presence T156967.

## Publish

Athom flaky (`processing_failed` 1048/1050). Healthy Test was **9.0.1046**. Ship **P2583** tip republish.

## Contre quoi

`npm run check:p2583`
