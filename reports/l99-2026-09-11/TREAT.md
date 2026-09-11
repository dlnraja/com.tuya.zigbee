# L99 harvest treat — 2026-09-11 evening

**Classify:** BOTH (siren IAS routing + BSEED CI + Moes curtain already shipped)  
**Forum POST:** none

## Sources
- Gmail diags thread `1a09051e67db8ee3` — tip still **9.0.874** in mail; Athom tip now **9.0.880+**
- Forum silent processor: 208 posts / 47 need-action (mostly update+re-pair)
- GH open: #544 #543 #533 (dlnraja); Johan #1455 Cleverio siren gap

## Code this pass (P2466)
1. `_TZ3000_vdfwjopk`+`TS0219` → `siren` (IAS 1280/1282), strip from `handheld_remote_4_buttons`
2. Flow `siren_turn_on/off` → `safeSetCapabilityValue` → IAS WD `startWarning`
3. Mains strip phantom battery for vdfwjopk
4. CI: P2429/P2438 solver align BSEED → `wall_switch_1gang_1way`

## Already on tip ≥880 (prior)
- P2464 Moes DP2 extreme TX
- P2465 Star Feather 3-gang / FrankEver valve
- Idle guard 40s Moes

## NEED_INTERVIEW
- Frankever diags without mfr+pid
- Joep irrigation
- VicHY #2232
