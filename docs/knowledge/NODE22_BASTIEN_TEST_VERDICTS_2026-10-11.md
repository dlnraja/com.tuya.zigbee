# Node 22 — bastien-home per-file test verdicts (2026-10-11)

For the master worker: most of these files are identical on master. REGRESSION = code/data restored from history; ALIGN = test updated to an intended change (commit cited); OPEN = needs a W4 decision. Never skip a test.

| Test file | Verdict | Cause / fix (commit) |
|---|---|---|
| `test/adaptive-data-parser.test.js` | ALIGN | P110 a535479353 default divisor ÷10 (Tuya ×10); test used ÷100 values |
| `test/ai-billing-guard.test.js` | ALIGN | 8ce5ab18eb forfait: included cap 0 for paid providers + 70% soft-stop |
| `test/anti-purge-guard.test.js` | DATA+ALIGN | pruned stale mfs rows whose sibling ids were deliberately removed (c31b02a49c nuenzetq→_TZ3210, 854f563005 P2761 rxqls8v0→_TZ3210, J1XL73IW TZE200 sibling not in Z2M) + test-pollution dummy/xxxxxxxx keys (master already pruned); P2605 forbid-only rows exempt in test |
| `test/backlog-cross-source.test.js` | ALIGN | c44466b3fe moved circadian curve to CircadianEngine/DaylightAtmosphere (still SolarElevation) |
| `test/battery-sos-scaling.test.js` | ALIGN | 231e82f7d1 SOS voltage unit detection moved to lib/battery/zcl-percent (behaviour test: 100mV/V/mV equal) |
| `test/button-cross-source-enrichment.test.js` | ALIGN | P2721 04e3cc5f6a snappy-capped profile debounce; 14725cf4ad/P2685 magic-packet guard moved to TuyaMagicPacket; b2b65d7675/P2381 _tryCard via safeGetFlowCard (device+app cards) |
| `test/button-flow-runtime-routing.test.js` | ALIGN | P2461 f961963bbe tryOnce wrapper for app cards; P2455 68de05268b wired wall relays (no button.N tiles, 2-gang primary ignores presses) |
| `test/button-press-types.test.js` | ALIGN | P2328 2aa00a7f6e wrapHandleFrame chain (next(...args)) |
| `test/case-variants.test.js` | REGRESSION+ALIGN | Restored missing canonical/lowercase forms on 36 drivers (ensure-case-variants --apply; lost in P2703 edc9ee9fc5 front-pin rewrite + W4 single-form adds), app.json synced; test aligned to P99 692d86e669 doctrine (canonical+lower required, UPPER/4-combos optional, P2252 budget) superseding P92.62 |
| `test/critical/p2252-athom-combo-budget.test.js` | ALIGN | 8e9914e2ee tightened combo caps (14000/1500 ≤ old 20000/2000) |
| `test/button-subsystem-fixes.test.js` | ALIGN | P2235 771bb01668/P2721 extra tokens + non-blocking remote fire; P2733 86a7df1e00 longer onEndDeviceAnnounce (super still awaited); P2332 587f3b09b6 hold-release declared-only (mid-form raw card removed) |
| `test/central-guards.test.js` | ALIGN | P2308 109f7f80ba depth cap + P2403 ghost-cap refusal wrap the safe setter (still routed) |
| `test/compact-zigbee-identifiers.test.js` | ALIGN | 103a3575d9/P2252 pass2 trims to total budget (afterTotal ≤ max) |
| `test/critical/p2251-interview-enrich-gate.test.js (+p2295)` | ALIGN | P2368/P2692 one mfs key per spelling (HOBEIAN→Hobeian merge 2026-10-11): caseless read |
| `test/critical/p-device-peculiarity-compound.test.js` | REGRESSION+ALIGN | DeviceFingerprintDB still sent _TZE200_mja3fuja to air_quality_comprehensive after P2541 moved it to air_quality_co2 → fixed (master has the same bug); test skips canonicalDriver:null forbid-only rows (P2509/P2517/P2605) |
| `test/critical/p2182-tb25-settings.test.js` | ALIGN | P2455 68de05268b 2-gang single device (onoff.gang2, legacy secondSwitch in code); P2464/P2465 ff11815887 Moes Star Feather 3-gang TS0601 (Z2M) on wall_switch_3gang_1way |
| `test/critical/p2184-diag-1cf775a2.test.js` | ALIGN | P2499 fbd06d9059/P2507 c9d0095a3e measure_battery getable:true (UI+History) supersedes P2184 |
| `test/critical/p2253-ts004x-hybrid-scene.test.js` | ALIGN | P2554 317c0aa868 hybrid magic range TS0041–46 (+TS0215A) |
| `test/critical/p2432-forum-media-sweep-fixes.test.js` | REGRESSION(data) | mja3fuja still pinned to air_quality_comprehensive in DeviceFingerprintDB, publish-sacred-keep and driver-mapping-database (_tze204 even → humidifier) after P2541 moved the couple to air_quality_co2 → all three SSOTs fixed; test expectations follow P2541 |
| `test/critical/p2550-peter-vichy-history-presence.test.js` | ALIGN | P2555 bumped recycle key p2550→p2555 (same one-shot recycle); WHY comment restored in button_wireless_1 |
| `test/critical/p2347-gabriel-atas-cam-peter-batch.test.js` | ALIGN | P2461 f961963bbe Smartbutton tile diag-locked mrpevh8p+TS0041; others stay couple-absent |
| `test/critical/p2352-l99-inbox-intelligence.test.js` | ALIGN | P2542 dc0174c3ab forfait cron thinning (45 3,11,19) |
| `test/critical/p2542-local-auto-improve.test.js` | REGRESSION(config) | 6 workflows (incl. bastien-promote-upstream, draft-to-test-fleet, open-code-review cron) lacked forfait env → tools/ci/inject-forfait-env-workflows.js --apply (P2542/P2562 SSOT) |
| `test/critical/p2604-gh550-551-552-residual.test.js` | ALIGN | P2722 6e45a07734 DP9 radarDistanceScale/preferDivisor 10 + DP10 nudge (superset), wider config window |
| `test/critical/p2622-ewelink-ck-tlsr-climate.test.js` | OPEN (decision) | eWeLink brand stripped from button_wireless/water_leak_sensor (P2692 16b15bb45d 'heal publish collisions') and motion_sensor (P2750 82a1a581b8) because eWeLink×TS0601 collided with climate_sensor → lost Z2M couples eWeLink+CK-TLSR8656-SS5-01(7000/7002/7019). master same. Not restored (would re-create collisions); needs W4 choice, e.g. drop eWeLink×TS0601 from climate_sensor then restore the 3 brand forms |
| `test/critical/p2623-bastien-settings-ready.test.js` | ALIGN | P2717 d34cb767b0 zigbee-map.js lazy-loaded after Homey.ready (no static tag) |
| `test/critical/p2623-bastien-settings-ready.test.js` | ALIGN | P2717 d34cb767b0 lazy zigbee-map + onHomeyReady replaces __tuyaSettingsBoot |
| `test/critical/p2629-vsxvaj9i-interview-clusters.test.js` | REGRESSION | EP4 {clusters [1,6], no bindings} dropped from button_wireless_3 by P2758 780df1cf66 (unrelated JohanBendz sync) → restored (compose + app.json); master same |
| `test/critical/p2634-ltt60asa-ts0004-switch-module.test.js` | ALIGN | P2652 6451928621 ZCL-safe 4-gang endpoints (no Tuya/metering cluster declaration) |
| `test/critical/p2636-dzwgk7e2-ts0042-button-2.test.js` | ALIGN | 1e301a5fcc/9c32d98180 (2026-10-11 W4) moved misplaced couples out of button_wireless_2; floor 566→550 |
| `test/critical/p2668-bastien-couple-research.test.js` | ALIGN | 3831b47716 learnmode min tip bumped to ≥1.0.49 (accept ≥1.0.43) |
| `test/critical/p2673-bastien-intelligent-max-benefit.test.js` | REGRESSION | P2673/P2701 IntelligentEnergyAdapter boot-first block in TuyaZigbeeDevice.initSmartManagers dropped by P2758 780df1cf66 sync → restored (apply() cached, idempotent) |
| `test/critical/p2703-bastien-l99-timeline-mesh.test.js + p2704-bastien-fleet-snappy-frontpin.test.js` | REGRESSION | P2703/P2704 front-pin order (house mfr + pid at index 0 on button_wireless_1/2/3, switch_1gang, switch_4gang, climate_sensor) lost to a later array re-sort → restored order only (no couple added/removed), app.json synced. Automation guard does not check order yet |
| `test/critical/p2727-bastien-early-overlay-purge-remote-tx.test.js` | REGRESSION+ALIGN | P2727 bastien_skip_battery_tx gate dropped by P2755 d7bd17d0f0 rewrite of shouldSkipSleepyRemoteBatteryTx → restored (mains still never skipped); caller regex accepts {device, homey} |
| `test/critical/zcl-cluster-lexicon.test.js` | ALIGN | P2757 76192fff18 no proactive PowerCfg poll on coin climate sensors |
| `test/critical/p2328-button-forum-rx.test.js` | REGRESSION+ALIGN | fleet-enrich bot 877fd3b0de (P2372) added Z2M model name ZG-101ZS as a productId on scene_switch_4 (real device reports TS0044 + _TZ3000_bgtzm4ny; whitelabel name is not a modelID) → removed; test compares pids caseless (P99 lower forms) |
| `test/critical/p2328 (cont.)` | REGRESSION | same bot 877fd3b0de added HOBEIAN brand forms to scene_switch_4 (P2328 forbids) → removed + curated removal |
| `test/critical/p2334-verdict-residual-flows.test.js` | ALIGN | P2644 turned-flow candidates centralised in FlowCardHeuristics.buildOnOffTurnedFlowCandidates (behaviour asserted) |
| `test/critical/p2359-homey-device-updates-fusion.test.js` | ALIGN | P2435c 7d47f7b412 contact/soil OTA refs dropped; wake list driven by SSOT (TRVs) |
| `test/critical/p2387-button-raw-wrap-gate.test.js` | ALIGN | P2714 5fa3177a28 TS004 fallback retagged; P2609 d1db89bc1a wall/scene remotes via installWallSceneRemoteHybrid (installs E000 interceptor) |
| `test/critical/p2391-vichy-mains-battery-flood.test.js` | ALIGN | P2511/P2599 6a84f01bf3 multi-line phantoms.push also strips tuya_battery_low |
| `test/critical/p2450-kaflzta4-stuck-dimmer.test.js` | ALIGN | P2453 707c2f8fa1 an5rjiwd removed from scene-knob re-arm regex |
| `test/critical/p2457-switch-4gang-no-button-clutter.test.js` | ALIGN | P2670 1353010bbf metering caps on switch_4gang (still no button.*) |
| `test/critical/presence-mtg-relay-routing.test.js` | ALIGN | P2603 be96dcb59f no compose onoff; relay radars add onoff at runtime (P2576) and P2575 never strips it |
| `test/flow-cards-integrity.test.js` | ALIGN | P2251/P2295 multiCouple brand rows use driverId 'multi' sentinel → validate byPid targets instead (surfaced by the 2026-10-11 HOBEIAN→Hobeian one-key merge) |
| `test/fingerprint-matcher.test.js` | ALIGN | P146/P2571 registry lock on vvmbj46n wins before heuristics → scoring-tier fixtures use a synthetic registry-free id; runtime variant accepts registry matchType (same driver) |
| `test/flow-card-ids.test.js` | REGRESSION+ALIGN | P2722 6e45a07734 code fires presence_sensor_radar_motion_cleared but the card was never declared → added trigger (compose + app.json, 4 langs); P2654 3b486847c3 dropped truncated hashed ids on purpose → test ignores _xxxxx ids |
| `test/cross-source-deep-fixes.test.js` | ALIGN | .github/state/** is gitignored → test generates z2m-gap/backport reports itself (backport exits 0 without stable clone); P2542 dc0174c3ab self-improve runs local orchestrator instead of the old resume step |
| `test/i18n-coherence.test.js` | ALIGN | multi sentinel (P2251/P2295, surfaced by HOBEIAN one-key merge); Bastien app id *.bastien versions on its own 1.x line |
| `test/gang-index-magic-packet.test.js` | ALIGN | P2685 force honours 6 h cooldown; forceAlways re-sends |
| `test/live-data-updater.test.js` | REGRESSION(exporter)+ALIGN | export-live-data-feed.js shipped 25 mfr-only rows + 'multi' brand rows that LiveDataUpdater (3d9553ae0d couple doctrine) rejects as a whole → exporter now emits couples only; fixtures carry modelIds; test re-exports (pages-build is gitignored). master has the same exporter bug |
| `test/critical/p2753-hobeian-vibration-tilt-late-dp-ci.test.js (+ IntelligentLazyLoad, P2223, P2267 in full mocha)` | TEST-POLLUTION | p2753 stubbed Module._load (fake zigbee-clusters) and never restored it → later files got Cluster=undefined; now restores loader + evicts stub-built cache. master has the same leak |
| `specs/010 golden (perf tools test)` | ALIGN(data) | scene_switch_4 lost bot-added HOBEIAN + ZG-101ZS (fleet-enrich, removed by hand, in curated removals) → snapshot re-written |
| `test/ci/intelligent-infra.test.js + p2751 (full-run only)` | CODE-FIX | lazyRequire ignored its heapBytes probe in the pressure gate → read host heap (>40 MB in a long mocha run) and returned null; probe now drives both gates (no prod caller passes heapBytes → no runtime change) |
| `test/critical/p2801-p2802-cover-tahoma.test.js` | FLAKE (no change) | 100 ms timer assert under full-run load; passed on rerun + 3/3 isolated |
