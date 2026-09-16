# Zigbee + Tuya evolution SSOT (P2537–P2539)

Machine: [`config/architecture/zigbee-tuya-evolution-ssot.json`](../../config/architecture/zigbee-tuya-evolution-ssot.json)  
Runtime helper: `lib/utils/zigbee-tuya-evolution.js` → `zigbeeTuyaEvolutionBrief()` / `classifyHomeyRadioCapability()` / `getDiagnosticsRfBrief()`  
Gates: `npm run check:p2537` · `npm run check:p2538` · `npm run check:p2539`  
Dual-app: **BOTH** (knowledge / Contre quoi — no forum POST).

## Intelligent integration (P2539)

Homey **today** = 2.4 GHz Zigbee + Tuya ZCL/EF00. Zigbee 4.0 / Suzi are **awareness + soft classifier**:

| Capability | Homey Tuya app today |
|------------|----------------------|
| Zigbee 2.4 GHz ZCL+EF00 | Yes |
| Suzi sub-GHz (800/900 MHz) | **No** — needs dual-band bridge hardware |
| Zigbee Direct BLE onboarding | Hub/stack — not this app’s DP invent |
| Matter | Homey OS bridge — not Tuya EF00 couples |

Runtime: `applyIntelligentProtocol` attaches `device._radioCapability` via `classifyHomeyRadioCapability` (soft log only — never invent compose fingerprints).

## WHY (P215)

| | |
|--|--|
| **Pourquoi** | Articles / CSA news (Zigbee PRO 2023 → 4.0 / Suzi / Direct / Green Power) + Tuya MCU UART/EF00 évoluent ; agents inventent sinon des couples ou confondent Matter/Suzi avec ce app |
| **Comment** | SSOT JSON + classifier + protocol/diag hooks ; MCU time reste `TuyaTimeSyncFormats` ; P2538 soft mesh-TX tips + airbox couple lock |
| **Pour qui** | Homey users (troubleshooting) + CI/agents |
| **Quand** | Enrich silencieux ; pas de change compose sans interview |
| **Contre quoi** | Invent pid Suzi/GP ; forcer EF00 ; abandonner plan canaux 2.4 GHz Homey ; airbox (`8b9zpaav`/`it9utkro`) mispaired as climate |

## Operational risks (P2538)

- **Tuya TX mesh flood** — aggressive EF00 dataQuery / configureReporting / 0x10 version spam can starve sleepy nodes on Homey Pro. Mitigate via BootBudget, MCUVersionHelper dataQuery-only, soft power_report modes, RF 15/20/25.
- **Airbox mispair** — `_TZE284_8b9zpaav` / `_TZE284_it9utkro` + `TS0601` → `air_quality_co2` only (Z2M airbox DP map).


## Zigbee lineage (condensé)

| ID | Year | Status |
|----|------|--------|
| Zigbee 2004/2006 | 2004–06 | historic |
| Zigbee PRO 2007 | 2007 | historic baseline |
| **Zigbee 3.0** | 2016 | **majority deployed** (Homey/Tuya fleet) |
| Zigbee PRO 2017 | 2017 | pro update |
| **Zigbee PRO 2023** | 2023 | DLK, Device Interview, TC swap-out, Zigbee Direct, sub-GHz groundwork |
| **Zigbee 4.0** | 2025-11 | Pro R23.2 / BDB 3.1 / ZCL 8 ; backward compatible with 3.0 |

## Derivatives

- **Zigbee Direct** — BLE path for onboard/control (2023+)
- **Suzi** — branded Zigbee **sub-GHz** mesh (EU ~800 MHz / NA ~900 MHz); cert program open **2026-09-02**; **does not replace** 2.4 GHz; needs dual-band bridge hardware
- **Green Power (ZGP)** — energy-harvesting / kinetic; proxy required; some Tuya/Moes appear as `GreenPower_2` — **not** sacred-couple invent
- **Matter** — interop layer over Thread/Wi-Fi/Ethernet — not a radio swap for EF00 drivers
- **Thread** — alternate 802.15.4 IP mesh; same channel-numbering family as Zigbee at 2.4 GHz

## Tuya overlays (this app)

- Radio: Zigbee 3.0-class **2.4 GHz** on Homey
- Overlay: private cluster **0xEF00** DP + hybrid ZCL
- Prefix families (hints only — always lock **mfr+pid**): `_TZ3000_`, `_TZ3210_`, `_TZ3218_`, `_TZE200_`, `_TZE204_`, `_TZE284_`, `_TZB210_`, …
- MCU UART: header `0x55AA`; versions **v3.1–v3.5** (v3.3+ seq 10-byte time) — `lib/tuya/TuyaTimeSyncFormats.js`
- PID families `TS0601`, `TS000x`, `TS004x`, `TS011F`, … — multi-driver per mfr is **NORMAL**

## Homey implications (enforced)

| # | Rule | Enforcement |
|---|------|-------------|
| 1 | RF: Wi-Fi **1/6/11** ↔ Zigbee/Thread **15/20/25** @ **20 MHz** | `assertHomeyImplications` + `rf-channel-coexistence` |
| 2 | Do **not** invent Suzi / Green Power productIds | compose mfr/pid regex scan |
| 3 | Never hardcode a single MCU time format | `guessFormat` + `getFallbackChain` + engine source check |
| 4 | Zigbee 4.0 / Suzi awareness ≠ new compose clusters without interview | forbid awareness tags in `driver.compose.json` |

```bash
npm run check:p2537
# → tools/ci/p2537-zigbee-tuya-evolution-gate.js + test/critical/p2537-*.test.js
```

Cursor rule: `.cursor/rules/zigbee-tuya-evolution-implications.mdc`

## Related

- `docs/guides/RF_CHANNEL_COEXISTENCE.md`
- `docs/architecture/TIME_SYNC_SSOT.md`
- `docs/guides/DP_INTERPRETATION.md`
- Harvest: `reports/source-enrich-2026-09-16/`
