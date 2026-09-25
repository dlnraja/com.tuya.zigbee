# Bastien L99 MAX — 2026-09-25 (P2733–P2736)

Silent. No forum POST. No invent pid.

## Verdict
| Layer | Status |
|-------|--------|
| Code remotes TS0041/42/43 | **FIXED** tip ≥1.0.104 (P2721→P2736) |
| Athom Test | **1.0.103** landed; **1.0.104** re-dispatched (prior push cancelled by concurrency) |
| Homey box Bastien | Often **TIP_LAG** (was stuck 1.0.93) — **#1 remaining risk** |
| LCD vvmbj46n nwk10 | FP in tip — **user re-pair** only |
| Mesh nwk18 | Offline interview — re-pair vsxvaj9i with wake-taps |

## Couples locked (house)
| Couple | Driver | Code tip |
|--------|--------|----------|
| `_TZ3000_axpdxqgu`+TS0041 | button_wireless_1 | snappy |
| `_TZ3000_dzwgk7e2`+TS0042 | button_wireless_2 | snappy + soft UI |
| `_TZ3000_vsxvaj9i`+TS0043 | button_wireless_3 | snappy + soft UI |
| `HOBEIAN`+ZG-301Z | switch_1gang | P2632 heal |
| `_TZ3000_ltt60asa`+TS0004 | switch_4gang | snappyTx |
| `_TZE284_vvmbj46n`+TS0601 | lcdtemphumidsensor | FP OK — re-pair |

## Patches this wave
- P2733 wake listen-only
- P2734 bi-dir softPulse + complementary soft-arm
- P2735 famkxci2 snappy parity
- P2736 exact DEVICE_PROFILES match no longer skips snappy floor

## Plan
See canvas `bastien-l99-improvement-plan` + `bastien-house-ssot.json` improvementPlanP2736.

### P0 (owner phone on Bastien Homey)
1. Apps → Zigbee Bastien → Installer Test **≥1.0.104** (wait Athom if 1.0.103 only visible yet)
2. Restart once
3. Press each remote (wake)
4. LCD Unknown → remove + re-pair as LCD Temp/Humidity
5. Optional: nwk18 dead node remove + re-pair 3-btn with wake every 2–3s

### Contre quoi
`npm run check:p2733` … `check:p2736`
