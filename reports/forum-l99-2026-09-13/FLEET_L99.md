# Forum / GH / Gmail L99 — 2026-09-13 evening (silent)

Athom Test tips: **Universal v9.0.914** (#3177) · **Stable v5.12.179** (#113).  
Forum POST: **never** (T157628). Stefan junk FP `_TZE2841000000_3MZB0SDZ` — **do not apply**.

## Hot queue

| Source | User / ID | Couple / tip | Symptom | Verdict | User action (silent) |
|--------|-----------|--------------|---------|---------|----------------------|
| T140352 **#2235** | Peter | tip **9.0.895** → then **9.0.908** | App crash loop; diags `375def7f`, `8278ec79` | **P2484** — heap OOM + MaxListeners (EF00 re-init). `8278ec79` @ **9.0.908** = SOS `button_emergency_sos` / ZBPB10BK listener storm. Not motionsensor-only. | Update **≥9.0.914** |
| T140352 #2234/#2233 | Peter | mrpevh8p+TS0041 | battery `?` / History | P2470 tip lag | Update ≥9.0.914; press once |
| T140352 #2228/#2229 | Eduard / MIAMO | fodv6bkr / icka1clh +TS0601 | curtain | LOCKED curtain_motor | Update + re-pair |
| T140352 VicHY | clrdrnya+TS0601 | curtain UI / phantom battery | P2472a | Update ≥9.0.914; re-pair if curtain tile |
| GH **#548** | Wuma68 | tip 9.0.908 diag `97413373` | Crash | Same **P2484** OOM | Update ≥9.0.914 |
| GH **#547** | HiepSVG | gkfbdvyx+TS0601 @ 9.0.908 | Unknown Zigbee | Compact dropped mfr → **P2484 sacred-keep** on tip **9.0.914** | Update ≥9.0.914 + re-pair **Presence Sensor Radar** |
| GH **#533** | salvagr | 5slehgeo+TS0601 | motor dead / mid-% | LOCKED curtain_motor + P2399 40s idle + P2478 mid DP2; sacred-keep survives compact | Update ≥9.0.914; no re-pair if Curtain Motor |
| Forum actionable (50) | multi | mostly tip lag / alreadyInCatalog | — | Soft MISSING_PID only — never invent | Update Test |
| Silent new FP | Stefan | `_TZE2841000000_3MZB0SDZ` | junk | **REJECT** | — |
| Gmail 2d | — | — | No new crash after **9.0.914** | builds OK | — |
| Forum PM | — | — | No local Discourse auth this session | Retry CI secrets | — |

## Code status (already on tip)

| Patch | Contre quoi |
|-------|-------------|
| P2484 | EF00 initialize idempotent + gkfbdvyx sacred-keep |
| P2481/P2482 | motionsensor preempt + own-driver carve-out |
| P2478/P2399 | Moes ZTS mid-% / idle cancel |
| P2470 | Smartbutton battery |

## Do not

- Forum / PM reply / AI paste
- Invent pid / apply Stefan junk
- Force Athom spam (tips healthy)

Artifacts: `reports/forum-verify-2026-09-13/`, diags `8278ec79` / `375def7f` / `97413373` under `.github/state/homey-app-diag/`
