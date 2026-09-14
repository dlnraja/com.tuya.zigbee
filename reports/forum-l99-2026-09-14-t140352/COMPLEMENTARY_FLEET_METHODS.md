# Fleet complementary methods — VicHY / Eduard / MIAMO / Peter / PresentSky

**Date:** 2026-09-15 · **Classify:** BOTH · **Forum:** SHADOW only (no POST)  
**SSOT:** `config/architecture/fleet-complementary-methods-ssot.json` · parent `forum-complementary-failover-ssot.json`  
**Gates:** `npm run check:p2502` · `check:p2490` · `check:p2484`

## Verdict

Stack **all** failover / fallback / alternative / complementary layers. Do not stop at one patch. Tip prefer **≥9.0.930**.

| User | Couple | Status | Primary + complementary |
|------|--------|--------|-------------------------|
| VicHY | `_TZE204_clrdrnya`+TS0601 | treat tip | P2472a / DynCap + P2490 staleCaps curtains |
| Eduard | `_TZE284_fodv6bkr`+TS0601 | treat tip | EF00 tubular + sacred-keep |
| MIAMO | `_TZE200_icka1clh`+TS0601 | treat tip | P2461 EF00 + **P2490 sacred-keep** (compact dropped FP) |
| Peter battery | `_TZ3000_mrpevh8p`+TS0041 | treat tip | P2470 / P2488 / P2490 rehydrate / P2499 getable |
| Peter crash `375def7f` | @ **9.0.895** | tip-lag | **heap OOM + MaxListeners** → P2484 (+ P2502 SMART ADAPT BootBudget) |
| Peter crash `8278ec79` | @ **9.0.908** | tip-lag | same OOM class → P2484 |
| PresentSky | `_TZE284_m1cvyneb`+TS0601 | **RESOLVED** | re-add after tip — P2138 dimmer 0–1000 |

## Peter crashes — correct class

Not “motionsensor only”. Sanitized diags show FATAL heap OOM + `MaxListenersExceededWarning` (~51) on `TuyaSpecificCluster`. Treat = **P2484** EF00 `initialize` idempotent (`_ef00ListenersBound`). Complementary = **P2502** defer SMART ADAPT when BootBudget heap critical.

## Method stack order

1. lock couple (mfr+pid)  
2. sacred-keep compact  
3. runtime RX/TX  
4. adapter DynCap heal  
5. battery keep / rehydrate / getable  
6. EF00 OOM idempotent  
7. foreign-driver preempt (parallel class)  
8. BootBudget heap (SMART ADAPT)  
9. tip soft-expect  
10. user update tip + re-pair when needed  

## User action (silent — do not forum-post)

Peter: update Homey Test to tip ≥9.0.930, reboot Homey; if still crash send **new** diag UUID.  
PresentSky: already confirmed working after re-add — no further action.
