# Session full reflection — 2026-08-17

Re-walk of every major step with **why / how / for whom / when**, then cross-validation
against internal catalogs/gates and external sources (Z2M, HA, GitHub, Google by mfr+pid).

Forum policy: **silent** (T157628). Dual-app: classify BOTH | MASTER_ONLY.

## 1. Gab forum #2172 / #2173

| Q | A |
|---|---|
| Why | Pairing table wrong; power-restore dump overwrites Homey settings |
| How | ZclSwitchConfigPolicy + ReconnectBurstCoalescer; EP242 not a gang |
| For whom | Multi-gang ZCL wall switches (NovaDigital / Zemismart / Gab) |
| When | Pair + power restore |
| Cross | INT-2172/2173 in `docs/data/DEVICE_INTERVIEWS.json` — status fixed |
| Verdict | Keep; MASTER_ONLY flavor for coalescer extras if any |

## 2. HomeSuite (gpmachado)

| Q | A |
|---|---|
| Why | Reliability patterns proven on another Homey app |
| How | Ideas only (GPL-3.0) → MIT reimplementation |
| For whom | Fleet stability on both tracks |
| When | Soak on master; surgical backport BOTH |
| Cross | CREDITS.md / NOTICE; dual-app table in handoff |
| Verdict | Correct classification; do not dump feature managers onto stable |

## 3. P2138 PresentSky BSEED Click dimmer

| Q | A |
|---|---|
| Why | Device paired as climate → on/off/dim dead |
| How | Sacred couple lock; refuse invent TS0201; brightness clamp; re-pair |
| For whom | PresentSky + any `_TZE*_*m1cvyneb`+TS0601 owners |
| When | After tip on Test + remove/re-add |
| Cross external | **Z2M #28658** same interview (clusters 0,4,5,61184,60672, appVersion 78); converter DP1/2/6/21; HA external converter identical |
| Cross internal | Gates P2138 + anti-bot pass; `getDriverId(…,TS0201)=null` |
| Gap found | Settings not exposed vs Z2M (backlight / power-on / light type) |
| Fix now | `driver.settings.compose.json` + `onSettings` DP4/14/21 (strings for backlight) |

## 4. Workflows + rules

| Q | A |
|---|---|
| Why | Enrich bots re-pollute climate/soil/universal |
| How | Matrix gate + anti-bot in syntax/unified/pr/enrich/publish |
| For whom | CI + future agents |
| When | Every push/PR/enrich |
| Verdict | Keep hard-fail on invent regressions |

## 5. P214 intelligent ZCL ↔ EF00

| Q | A |
|---|---|
| Why | “All drivers must adapt dynamically” — detectors disagreed |
| How | Single `IntelligentProtocolDetect`; bootstrap soft-attach; BSEED never forced to DP |
| For whom | Every `TuyaZigbeeDevice` lineage |
| When | `onNodeInit`; optimizer learns ~15 min |
| Cross | Router sacred guard; detect dimmer=TUYA_DP, BSEED=zcl_only |
| Verdict | Correct; no mega new engine |

## 6. Open leftovers

- Peter SOS / smartbutton #2137/#2167 — still no press reports
- Do not Publish Stable→Test while 9.0 soaks
- No forum auto-post for #2138 unless human draft requested

## Commands re-run

```bash
node tools/ci/p2138-sacred-couple-matrix-gate.js
node tools/ci/p214-intelligent-protocol-gate.js
node tools/ci/anti-bot-regression-gate.js
node --test test/critical/p2138-bseed-wall-dimmer.test.js test/critical/p214-intelligent-protocol-detect.test.js
```
