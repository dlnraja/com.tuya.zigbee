# Cursor Homey todos / waiting lists import — 2026-08-21

**Collected:** Friday 21 Aug 2026 ~22:35 PT (Europe/Paris, UTC+2).  
**Mode:** READ ONLY. No git commit, no forum post, no secrets / `state.vscdb` blobs / credential chats `73f0d460` `e1643c1e`.  
**Clone:** `C:\Users\Dell\Documents\homey\master` `package.json` **9.0.618** (HEAD `1f18cb336` TS0044 0xFD / skip 0x8004).  
**Doctrine:** never lock a driver on `manufacturerName` alone — identity is always **mfr + productId**.

Sources: `.cursor/plans/` (4 files), Homey Cursor project `c-Users-Dell-Documents-homey-master` (canvases + 18 parent transcripts TodoWrite), `docs/MASTER_TODO.md` + `docs/releases/FINAL_TODO_v4.9.321.md`, `.agents/workflows/maintenance.md`, already-extracted prompts in `cursor-prompts-import.md`. No `TODO.md` inside the Cursor project folder itself.

Status legend vs published master **9.0.618**: **yes** = files present and wired; **partial** = files exist but gap vs user ask; **no** = missing / cancelled / not Homey.

---

## 0. Cursor plan files (`C:\Users\Dell\.cursor\plans\`)

| Plan file | Session | Plan YAML status | User asked | 9.0.618 |
|-----------|---------|------------------|------------|---------|
| `energy_battery_button_flows_b56ca389.plan.md` | `6eb1e32a` 15 Aug 10:02 | **6/6 todos still `pending` in YAML** (UI waiting list) | Unify energy / battery / % / virtual+physical buttons / flow cards behind L14 `safeSetCapabilityValue` | **partial → yes in code** (transcript later marked all 6 **completed**; plan file never updated) |
| `unified_driver_i_o_layer_b4565117.plan.md` | `73f0d460` 11 Aug 03:21 | **5/5 completed** (P102) | One I/O façade on `TuyaZigbeeDevice`; migrate bare `ZigBeeDevice`; interview compensation; exotic IR/E00x; dual-app | **yes** (do not redo façade) |
| `spec_kit_improve_091bd3c6.plan.md` | `6eb1e32a` 17 Aug 00:04 | **5/5 cancelled** | GitHub Spec Kit constitution + P205 timers | **no — skip, do not revive** |
| `align_module_logic_552e2e18.plan.md` | `88ef5c70` | completed | **AscendOS** LocalStack façade | **n/a (not Homey)** |

---

## 1. PENDING waiting list (verbatim-distilled)

### 1.1 Plan YAML still pending — Energy Battery Button Flows (`b56ca389`)

User ask (`6eb1e32a` + `64b6992c` T000): *« il fauit faire de meme pour les eneirgie sles poruicentages et aussi la gestion des botons verison ux ivruels et antispam et les flwo et les flow card »* — every driver needs flow cards for values + virtual/physical actuators at every architectural layer; L14 `safeSetCapabilityValue`; 5-minute real-vs-phantom energy discovery; case-insensitive.

Plan overview (verbatim): *Unifier énergie / batterie / pourcentages / boutons derrière `safeSetCapabilityValue` (L14) et des flow cards app-level génériques, avec fallback physique→virtuel et codegen ciblé des triggers `physical_gang*` — sans générer 400 fichiers flow inutiles.*

| id | content (verbatim) | YAML | Transcript `6eb1e32a` last | 9.0.618 | Files |
|----|--------------------|------|----------------------------|---------|-------|
| `l14-writers` | Router SmartBatteryManager + Energy/Virtual energy writers via `safeSetCapabilityValue` | pending | **completed** | **yes** | `lib/managers/SmartBatteryManager.js` `_safeSet` → `safeSetCapabilityValue` (fallback raw only if absent); `SmartEnergyManager.js`; `VirtualEnergyManager.js`; `EnergyManager.js`; `lib/battery/UnifiedBatteryHandler.js` `_safeSetCap`; `lib/utils/safe-capability.js` |
| `button-parity` | Fallback app-level `button_pressed` + `virtual_button_pressed` depuis Physical/Virtual/ButtonDevice | pending | **completed** | **yes** | `lib/mixins/PhysicalButtonMixin.js` `_triggerAppLevelButtonFlows` (`button_pressed` / `_double_press` / `_long_press`, 12 hits); `lib/mixins/VirtualButtonMixin.js` `_recordVirtualButtonEvent`; `lib/tuya/TuyaZigbeeDevice.js` `_registerButtonCapabilityListeners` |
| `feature-flow-cards` | Ajouter conditions/actions batterie % + `virtual_press_button` dans FeatureFlowCards + homeycompose | pending | **completed** | **yes** | `lib/flow/FeatureFlowCards.js`; `.homeycompose/flow/conditions/battery_percent_below.json`; `triggers/battery_percent_changed.json`; `actions/virtual_press_button.json`; `triggers/button_pressed.json`; `triggers/virtual_button_pressed.json`; `conditions/energy_power_above.json` |
| `codegen-physical` | Script CI `ensure-physical-flow-cards` (mixin drivers manquants, dry-run puis apply) | pending | **completed** | **yes** | `tools/ci/ensure-physical-flow-cards.js` (P205, dry-run default, no `[[device]]`); `tools/ci/add-button-flow-cards.js` (legacy) |
| `virtual-energy` | Brancher `VirtualEnergyMeterMixin` sur plugs mains sans metering réel | pending | **completed** | **yes** | `lib/mixins/VirtualEnergyMeterMixin.js` (estimate only after 5-min audit + 15 min silence); `lib/devices/UnifiedSwitchBase.js` `_initVirtualEnergy` / `_cleanupVirtualEnergy`; `lib/managers/VirtualEnergyEstimator.js` defers until audit |
| `tests-gates` | Tests critiques + gate anti-régression L14/flow fallback | pending | **completed** | **yes** | `test/critical/energy-battery-button-flows.test.js` (wired in `.github/workflows/syntax-check.yml`) |

**Still partial vs user (not the YAML todos):** leftover `device.setCapabilityValue` fallbacks remain in those managers if `safeSet` is missing; historical `de0ddb67` audit listed **42** raw battery/energy writes in `lib/` bypassing L14 (scan interrupted — treat as residual); `titleFormatted [[device]]` still a known flow bug; phantom mains-battery strip is case-by-case not proven on every plug; app-level cards exist but not every mixin driver has `physical_gang*` until `--apply` is run on current tree.

### 1.2 Same session — 5-minute energy discovery (transcript todos, not in plan YAML)

User (`6eb1e32a` 15 Aug 10:06): determine **before 5 minutes** which energy capabilities are *really* reported; parallel energies; eliminate phantom caps; box-calculated vs native must not conflict.

| Transcript todo | Last status | 9.0.618 | Files |
|-----------------|-------------|---------|-------|
| Audit SmartEnergy/Virtual/estimated vs real measurement paths | completed | **yes** | `SmartEnergyManager.js` header: “First 5 minutes: observe real DP/ZCL; mark `telemetry_*_source=direct`” |
| Add 5-min energy capability discovery + refine-over-time | completed | **yes** | `SmartEnergyManager.js` `AUDIT_MS = 5 * 60 * 1000`; `EnergyManager.js` prefers SmartEnergy for the audit; `VirtualEnergyMeterMixin.js` waits 300000 ms |
| Mark/store real vs estimated telemetry | completed | **partial** | store `telemetry_*_source`; `LayerSignalFusion` estimated cannot overwrite fresh ZCL; Homey-computed vs MCU DP still a stated residual (`64b` T060) |
| Tests + wire destroy into device bases | completed | **yes** | cleanup on UnifiedSwitchBase; energy-battery-button-flows test asserts mixin wiring |

**Clock split (user asked 5 min; protocol optimizer still 15 min):** `HybridProtocolManager.js` `PROTOCOL_OPTIMIZATION_DELAY = 15 * 60 * 1000`; `IntelligentDPAutoDiscovery.js` `DEFAULT_LEARNING_WINDOW_MS` 15 min; `IntelligentDriverHotSwap.js` `COHERENCE_INTERVAL` 15 min. Two clocks, not unified. **partial**.

### 1.3 IR blaster (P102 Phase 4 exotic — plan marked completed)

User/plan: Zosung IR `0xE004` / `0xED00` → IR drivers subscribe to binder events; not per-driver DynBound.

| Item | 9.0.618 | Files |
|------|---------|-------|
| IR drivers | **yes** | `drivers/ir_blaster/` (TS1201 ZS06 / UFO-R11, learn+send), `drivers/ir_remote/`, `drivers/blaster_remote/`, `drivers/wifi_ir_remote/` |
| Zosung clusters | **yes** | `lib/clusters/ZosungIRTransmitCluster.js` (`0xED00`), `ZosungIRControlCluster.js` (`0xE004`), `ZosungIRTransmitBoundCluster.js`, `ZosungIRControlBoundCluster.js` |
| Façade subscribe | **partial** | `lib/io/DeviceIOFacade.js` `subscribeIrBinder` (~L1924) + `applyExoticProfile` action `subscribeIrBinder` (~L2002). **Profile opt-in**, not automatic on every IR driver. `ir_blaster/device.js` implements the full Z2M learn/send sequence itself (extends `TuyaZigbeeDevice`). |
| Protocol catalog includes IR clusters | **yes** | `lib/layers/ProtocolRxTxChain.js` `PROTOCOL_PATHS.tuya_bound.clusters` = `[0xE000, 0xE001, 0xE002, 0xED00, 0xE004]` |
| `UnifiedIRBase` | **no** | file does not exist — IR stays driver-local + façade helper |

### 1.4 Protocol parallel paths / UNSUPPORTED_CLUSTER

User (`6eb1e32a` 15 Aug 10:20): *« quand tu a un UNSUPPORTED_CLUSTER bah gere le et supporte le a plus bas niveau et ou aved des protocomes et methodes paralliles »*. Also 17 Aug 01:03: cross raw Zigbee TX/RX, Tuya DP, ZCL, bound cluster, raw MCU.

Transcript todos (`6eb1e32a` L202): `writeCommandWithFallbacks (ZCL→raw→DP)` + wire into bases + tests — **completed in-session**.

| Piece | 9.0.618 | Files |
|-------|---------|-------|
| Path catalog | **yes** | `ProtocolRxTxChain.js` (P208): `tuya_dp`, `zcl`, `tuya_bound`, `cluster_bound`, `raw_frame`, `raw_value`, `mcu`, `ias`, `magic`, `query_all` |
| Fallback RX order | **yes** | `lib/io/ProtocolFallbackChain.js` `DEFAULT_RX_ORDER`: capability_listener → zcl_attr_report → tuya_dp_report → tuya_bound_report → ias_zone → raw_frame_parse → raw_cluster_fallback → cluster_data_query → mcu_report → poll_heuristic |
| Fusion (who wins same cap) | **yes** | `lib/layers/LayerSignalFusion.js` `SOURCE_PRIORITY` zcl=1, tuya-dp=2, ias=2, tuya-bound=3, raw=5 (P211). Estimated cannot clobber fresh ZCL. IAS and DP **tied** — bogus DP1 can still pulse contact |
| Intercept vs fusion | **partial** | Intercept order is RAW-first (`layer-priority.md`); fusion trusts named ZCL over raw — opposite tables, easy to misuse |
| Bare ZigBeeDevice leftovers | **partial** | P102-3 migrated 9 IAS; `de0ddb67` still listed ~49 bare bases after that. Do not redo façade; leftover migrate is residual |

### 1.5 Dynamic ZCL + EF00 (P214)

User (`64b6992c` T020 / T056): *« il faut que tout les dirvers s'adpement a ZCL et EF00 inteligment et dynqiuemnet »* / *« Drivers must adapt dynamically »*.

Transcript todos (`64b` L708): detect-helper / wire-bases / bare-ef00 / gate-test — **all completed**.

Canvas `canvases/session-reflection-zcl-ef00.canvas.tsx`: Phase 5 “P214 ZCL↔EF00 hybrid — Single detect + bootstrap EF00 — BSEED zcl_only wins”.

| Piece | 9.0.618 | Files |
|-------|---------|-------|
| Single detector | **yes** | `lib/protocol/IntelligentProtocolDetect.js` — sacred `zcl_only` → HYBRID → TUYA_DP → ZCL → TS0601 escape → default HYBRID listen 15 min |
| Bootstrap | **yes** | `lib/layers/UniversalLayerBootstrap.js` — detect + soft-attach EF00; `_bootDynamicAdaptation` hooks `dpReport` |
| CI | **yes** | `tools/ci/p214-intelligent-protocol-gate.js`; `test/critical/p214-intelligent-protocol-detect.test.js` |
| Router BSEED | **yes** | `IntelligentProtocolRouter` no longer forces BSEED → Tuya DP |
| Late DP after pair | **partial** | `DPAdaptationEngine` logs `new_dp` **does not map**; `DynamicCapabilityManager` needs 3 samples score≥8; generic `tuya_dp_{id}` **not added** as Homey cap; if no `tuyaEF00Manager` at boot `_bootDynamicAdaptation` **returns immediately** (`dynamic-adapt-code.md`) |
| `EnrichedDPMappings` | **partial** | **mfr-only** exact string — violates sacred couple if used as identity |
| `SmartDriverAdaptation` | **no** for late DP | `diagnostic_only` default; disables itself when `isTuyaDP` |
| `universal_atlas` | **no** | not in tree |

### 1.6 Intelligent hot-swap / box-calculated vs native (`64b` T057–T060)

User asked true driver hot-swap. SDK3 has **no `setDriver()`**. Transcript built 4 overlay strategies — **completed**.

| Piece | 9.0.618 | Files |
|-------|---------|-------|
| Engine | **yes** (simulated only) | `lib/dynamic/IntelligentDriverHotSwap.js` — cap add/remove ≥0.75; DP override after 5 consistent unknown dpId; protocol renegotiate after 50 frames; profile overlay. Coherence 15 min. **Wrong-driver devices still need re-pair.** |
| Coherence computed vs native | **partial** | fusion + telemetry source tags; residual Homey-derived kWh / % / phantom alarms vs MCU DP (`64b` T060) |

### 1.7 Other transcript waves (last status completed unless noted)

These are **not** sitting in plan YAML. Parent `6eb1e32a` (187 TodoWrite lines) and live parent `64b6992c` (90 TodoWrite lines) marked almost every wave completed before the next. Distilled unique **work items** the user actually asked, with 9.0.618 verdict:

| Theme | User / todo gist | Last transcript | 9.0.618 |
|-------|------------------|-----------------|---------|
| Case-insensitive mfr/pid | « supportyet rn mode case less et case insensitive » | completed | **yes** `lib/utils/CaseInsensitiveMatcher.js` |
| Peter SOS/water/smartbutton | « #2134 … diag Homey, pas un fingerprint » | completed later as P2203; canvas Aug 17 still “open” | **partial** `_ensureIasBound` + skip leftover EF00 on IAS water; needs Test ≥9.0.615 **and re-pair**. Diag `1cf775a2` |
| Zemismart 3-btn battery % Zigbee-only | `64b` T011 TS0043 | completed | **partial** moved to `button_wireless_3`; % via PowerCfg vs Tuya 0–100 soak |
| Time cluster 0x000A chatter | Gabriel | completed | **yes** policy: battery remotes answer if asked, do not poll |
| Sacred couple overlay | one MFS = thousands of variants | completed waves + T082 366 FPs | **partial** overlay (`mfs_db` / `new_fingerprints.json` / compound DB) can still re-inject; `getDriverId(mfr,pid)` refuses mfr-only |
| Fork FP apply | T082 | completed | **partial** dummy filtered; keep p2138 gate |
| Scene mode | T009 | completed | **partial** `lib/devices/DeviceOperatingMode.js`; TS004F vs wall `0x8004` trap; HEAD skips 0x8004 for TS0044 |
| HomeSuite / packet_ninja | ideas + credits | completed classify | **yes** BOTH teardown/IAS/FP; MASTER_ONLY availability managers. No GPL copy |
| Dual-app / silent forum / P139 | never post; never Stable→Test while 9.0 soaks | completed last wave 21 Aug | **yes** soak-guard skipped stable; Test **9.0.618** |
| FLOW-layer audit `b47e9d9b` | 4959 cards; 35 undeclared refs | read-only, no TodoWrite | **partial** app-level cards added later; 35-unwired list not re-proven on 9.0.618 |
| Regression `de0ddb67` | 42 raw setCapabilityValue; titleFormatted; bare ZigBeeDevice; P139 | read-only | **partial** L14 writers fixed; residual bypasses + `[[device]]` |
| Spec Kit | cancelled plan | cancelled | **no** |
| meter91 TS0044 | no Cursor composer todo | n/a | **yes** HEAD commit is the 0xFD / skip-0x8004 fix; compose still may miss `_TZ3000_zgyzgdua` |

Last live parent todos (`64b` 20–21 Aug): forum-scan / why-audit / enrich-fix / validate / push-publish — **all completed**. Nothing left in-progress in that jsonl.

### 1.8 Stale markdown TODOs in the clone (not Cursor waiting lists)

| File | Vintage | Treat as |
|------|---------|----------|
| `docs/MASTER_TODO.md` | **2026-07-10** (v9.0.190 / PR #508–510) | **stale**. P0 merge/publish done long ago. Residual themes still conceptually live: PID-conflict hygiene (sacred couple), empty `manufacturerName` arrays, mains-with-battery inconsistency, `titleFormatted [[device]]`, flow issues. Do **not** merge those old PRs. |
| `docs/releases/FINAL_TODO_v4.9.321.md` | v4.9 era | **stale**. Energy-KPI / DP parser / configureReporting retry — superseded by 9.0.x L14 + P102. |
| `.agents/workflows/maintenance.md` | 2026-07-05 | Not a todo list. Self-heal loop: ingest intel → GH backlog → `master-self-heal.js` → SDK3 audit → validate. PII gates. |

### 1.9 Canvas (not a plan, but a waiting snapshot)

`C:\Users\Dell\.cursor\projects\c-Users-Dell-Documents-homey-master\canvases\session-reflection-zcl-ef00.canvas.tsx` (Aug 17): P214 + P2138 + HomeSuite classify = done; **Peter SOS #2137/#2167 “still open — not this pass”** at canvas time. Later P2203 (20 Aug) landed IAS bind-on-enrolled. **partial** until Peter soaks on ≥9.0.615 + re-pair.

---

## 2. Especially-asked map (energy / buttons / L14 / IR / parallel / ZCL+EF00)

| Ask | 9.0.618 | Verdict | Named files |
|-----|---------|---------|-------------|
| Energy / battery / % unification | writers through `_safeSet` / `commitBatteryPercent` / SmartEnergy 5-min audit | **yes** (plan YAML stale pending) | `SmartBatteryManager.js`, `UnifiedBatteryHandler.js`, `MultiProtocolBatteryPercent.js`, `SmartEnergyManager.js` (`AUDIT_MS` 5 min) |
| Virtual + physical buttons + antispam | mixin fallback + 280 ms ZCL+DP echo suppress + `markAppCommand` | **yes** | `PhysicalButtonMixin.js`, `VirtualButtonMixin.js`, `TuyaZigbeeDevice.js` |
| Flow cards | app-level battery % / virtual press / button_pressed + physical_gang codegen | **yes** | `.homeycompose/flow/**`, `FeatureFlowCards.js`, `ensure-physical-flow-cards.js` |
| L14 `safeSetCapabilityValue` | battery/energy managers prefer it; fallback raw if missing | **partial** | same + residual `de0ddb67` 42 bypasses elsewhere in `lib/` |
| IR blaster | full `ir_blaster` + Zosung 0xE004/0xED00 + façade subscribe (opt-in) | **partial** | `drivers/ir_blaster/device.js`, `ZosungIR*Cluster.js`, `DeviceIOFacade.subscribeIrBinder` |
| Protocol parallel paths | catalog + fallback chain + fusion | **yes** / intercept-vs-fusion **partial** | `ProtocolRxTxChain.js`, `ProtocolFallbackChain.js`, `LayerSignalFusion.js` |
| Dynamic ZCL+EF00 | P214 detect + bootstrap + hybrid 15 min | **yes** detect; **partial** late-DP mapping | `IntelligentProtocolDetect.js`, `UniversalLayerBootstrap.js`, `HybridProtocolManager.js`, `DPAdaptationEngine.js`, `DynamicCapabilityManager.js` |
| 5-min energy vs 15-min protocol | energy audit 5 min; protocol optimizer 15 min | **partial** (two clocks) | `SmartEnergyManager.js` vs `HybridProtocolManager.js` |
| True driver hot-swap | impossible SDK3 | **no** (overlay only) | `IntelligentDriverHotSwap.js` |

---

## 3. Explicit non-goals recovered with the todos

- Do **not** post on Homey Community.
- Do **not** Publish Stable→Test while 9.0.x occupies the shared App ID (soak-guard already skipped 21 Aug).
- Do **not** revive Spec Kit.
- Do **not** redo DeviceIOFacade / P102.
- Do **not** generate 400 per-driver energy flow cards (natives once L14 is OK).
- Do **not** invent pids / lock mfr-only.
- Do **not** harvest credentials.
- Do **not** copy HomeSuite/packet_ninja code.

---

## 4. What is still actually waiting (honest backlog)

Plan **UI** still shows Energy Battery Button Flows as pending — update YAML or ignore; **code already shipped**. Real remaining work:

1. **Residual L14 bypasses** in `lib/` writers not on the SmartBattery/Energy path (`de0ddb67` 42).  
2. **Late DP → Homey cap** still conservative (3 samples, generic cap not added, bootstrap bails without EF00).  
3. **15 min protocol optimizer** vs user **5 min** energy clock — not unified.  
4. **IR** façade is profile-opt-in; no `UnifiedIRBase`.  
5. **Fusion vs intercept** priority mismatch; IAS/DP tied.  
6. **Overlay re-injection** after T082 366 FPs — keep sacred-couple gate.  
7. **Peter water/smartbutton** soak + re-pair; not a fingerprint.  
8. **Phantom mains battery** strip not proven fleet-wide.  
9. **`titleFormatted [[device]]`**.  
10. **Wrong-driver devices** still need **re-pair**.

---

## 5. Sources touched (read-only)

- `C:\Users\Dell\.cursor\plans\*.plan.md` (4)
- `C:\Users\Dell\.cursor\projects\c-Users-Dell-Documents-homey-master\agent-transcripts\{6eb1e32a,64b6992c}\*.jsonl` TodoWrite (no credential sessions)
- `...\canvases\session-reflection-zcl-ef00.canvas.tsx`
- `C:\Users\Dell\Documents\homey\master` greps vs 9.0.618
- `docs/MASTER_TODO.md`, `docs/releases/FINAL_TODO_v4.9.321.md`, `.agents/workflows/maintenance.md`
- Box: `cursor-prompts-import.md`, `dynamic-adapt-code.md`, `layer-priority.md`, `harvest.md`
