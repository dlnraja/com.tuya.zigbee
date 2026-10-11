# Port round 2026-10-11 (master → stable-v5 / bastien-home)

What we checked, what was ported, and what we left out. All times are Paris time.

| Master fix | stable-v5 | bastien-home |
|---|---|---|
| Serialized uploads (c25f077831) | Not needed: on stable-v5 only publish-stable uploads the stable ID (auto-fix-and-publish never publishes on stable-v5) | Not needed: every bastien publisher already shares `athom-developer-api-publish` |
| Idle wait before upload (c25f077831/45a2d8f1a9/516c83444c) | Ported (wait-athom-idle.js, step before "Publish to Draft", 25-min step, job 65 min) | Ported (before "Publish Bastien draft → Test", job 75 min) |
| Never re-send an uploaded version (5087da3ce1) | Ported (SAME-VERSION GUARD in direct-api-publish.js) | Ported |
| False-green final gate (9cfe3f5d08) | Ported: assert-athom-final.js in the promote job, plus exit 1 once processing_failed re-uploads are exhausted. The P2325 soft-continue is kept | Ported (final step) |
| Flow-card cache per Homey (fdf841524a) | Already there (stronger version from the N22 audit) | Already there |
| P2698 radar mfrs off curtain_motor + curated removal | No bleed here; curated removal added so it cannot come back | Same |
| couple-guard intended-shrink + mfs_db modelIdPattern | Ported (guard + test + mfs_db scope entry) | Ported |
| Junk modelIds prune (4b4b118912) | Already clean (0 junk) | Already clean |
| mja3fuja data files → air_quality_co2 (P2541) | Ported (DeviceFingerprintDB, driver-mapping-database, sacred-keep); P2432 test now matches P2541 | Remaining upper-case route fixed |
| AI cost / forfait env (c9789f61d9) | 4 workflows injected | Already complete |
| Switcher timer / time-left / on-for-minutes cards (89c7da80e0, 13c4ff2eef) | NOT ported: on master since 2026-10-11 01:30, soak window is 7 days | NOT ported (same) |
| GangCountAdapter P2794/P2797 (on master since 10-02) | Ported (runtime adapter, gang-patterns, dual-couple-adapt) | Ported |
| _TZ3210_a2erlvb8 | Single owner switch_2gang like master; TS0002=2 / TS000F=1 gang patterns | Same |

Lost couples placed with two sources: `_TZE200_p6fuhvez` TS0225 → gas_sensor (Z2M ZG-225Z + sprut/Hub#4328 IAS zoneType 0x2B); on stable also `_TZ3000_j1xl73iw` → curtain_module_2_gang and `_TZ3000_gazjngjl` → switch_usb_dongle (sprut/Hub#4960 shows 2 plug endpoints).
Credit: Zigbee2MQTT/zigbee-herdsman-converters (Koen Kanters and contributors), sprut/Hub device reports, romasku/tuya-zigbee-switch.

## Later same day (one-source + HOBEIAN)

| Master fix | stable-v5 | bastien-home |
|---|---|---|
| `COUPLE_SOURCE_POLICY.md` (one reliable source) | Ported | Ported |
| One-source couples (aj0oxo1i gas, 6oabgtzv water, fa9mlvja bw1, kjfzuycl remote, fdxihpp7/qezuin6k pins) | Ported | Ported |
| HOBEIAN ZG-101ZS + `_TZ3000_bgtzm4ny`/TS0044 → `scene_switch_4` (off `button_wireless_4`) | Ported (38552dc854); publish CI unblocked by P2605 align (`TZE200_nkjintbl` → `switch_2gang`) | Ported (43c6105b2d); Publish Zigbee Bastien success |
| AutomatOn 5-zone valve fold → `switch_4gang` (j0ktmul1) | Via earlier W4 ports | Via earlier W4 ports |
| FUT089Z fold → `button_wireless_4` | Check soak / port separately if missing | Check soak / port separately if missing |

Still held on purpose: `_TZE600_ogyg1y6b`/TS0105 (no TS0105 driver — would cross-product); Johan mfrs with ambiguous pid.

## Improve pass (same day, Grok hand-off)

| Item | stable-v5 | bastien-home |
|---|---|---|
| AutomatOn `_TZ3000_j0ktmul1`/TS011F → `switch_4gang` + gang-pattern 5 | Ported (off `usb_dongle_triple`) | Ported (off `usb_dongle_triple`) |
| HOBEIAN ZG-101ZS decision doc | Copied | Already present |
| FUT089Z / HOBEIAN / one-source couple matrix | Parity Y | Parity Y |
| Golden refresh after j0ktmul1 / xwh1e22x shrink | PR #564 (`fix/stable-golden-j0kt-xwh`) | `f1f76d5968` (also P2640 famkxci2 front-pin + Flow id dedupe) |
| Node22 unblock (golden LOST) | Same PR #564 | Same commit; workflow_dispatch Node22 |

## Close-out (Athom tips, Paris 2026-10-11 ~22:00)

| App | Tip / channel | Evidence |
|---|---|---|
| Universal (master) | **9.0.1433 Test** | Auto-Publish `[athom-final] OK` |
| Bastien | **1.0.148 Test** (git tip still 1.0.122 line + P2640 `f1f76d5968`) | Publish Zigbee Bastien + Node22 green |
| Stable | **5.12.399 Test** (#307) | Draft→Test promoted; Node22 green; PRs #564–#566 merged |

Held on purpose: `_TZE600_ogyg1y6b`/TS0105; ambiguous Johan mfrs. No invented couples.

## Resume Grok/IDE (Paris ~22:30)

| Item | Result |
|---|---|
| HOBEIAN + one-source + FUT089Z/j0kt parity | OK on all 3 tips (récit tip numbers were stale) |
| `_TZE200_wrmhp6b3` → `soil_sensor` (one-source Z2M COOLO CS-201Z; was curtain) | Master commits `cfe44898ba`+`efbbf34659` |
| P2761 Fantem/contact/PIR off climate+dimmer | Was missing on `origin/stable-v5` → PR **#567** merged → tip **5.12.400** |
| Publish Stable failure on #566 | Race: 5.12.399 still draft; fixed by Draft→Test (#307) |
| Fleet Enrich cron | Soft failure (enrich step); not blocking tips |
| Still held | TS0105 `ogyg1y6b`; 7 Johan mfrs with ambiguous pid |
