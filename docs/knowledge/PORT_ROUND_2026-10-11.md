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
