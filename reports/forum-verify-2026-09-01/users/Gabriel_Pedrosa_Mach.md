# User impact — Gabriel_Pedrosa_Mach

Generated: 2026-09-01T06:17:26 · silent enrichment only

## Forum posts (actionable)

| Topic | Post | Date | Issues | Couples | Action |
|-------|------|------|--------|---------|--------|
| T140352 | #2188 | 2026-08-20 | — | _TZ3000_LWTHNP7J | request-diag-couple |
| T140352 | #2186 | 2026-08-20 | gang | _TZ3000_LWTHNP7J | request-diag-couple |
| T140352 | #2182 | 2026-08-18 | gang,rejoin | — | user-update-repair |
| T140352 | #2178 | 2026-08-17 | endpoint,gang,jitter,offline | — | user-update-repair |
| T140352 | #2173 | 2026-08-17 | gang | _TZ3000_OVYAISIP+TS0001; _TZ3000_OVYAISIP+TS0002; _TZ3000_OVYAISIP+TS0003; _TZ3000_OVYAISIP+TS0601; _TZ3000_PK8TGTDB+TS0001; _TZ3000_PK8TGTDB+TS0002; _TZ3000_PK8TGTDB+TS0003; _TZ3000_PK8TGTDB+TS0601; _TZ3000_YWUBFUVT+TS0001; _TZ3000_YWUBFUVT+TS0002; _TZ3000_YWUBFUVT+TS0003; _TZ3000_YWUBFUVT+TS0601; _TZ3000_KGXEJ1DV+TS0001; _TZ3000_KGXEJ1DV+TS0002; _TZ3000_KGXEJ1DV+TS0003; _TZ3000_KGXEJ1DV+TS0601; _TZ3000_JJDKHUEQ+TS0001; _TZ3000_JJDKHUEQ+TS0002; _TZ3000_JJDKHUEQ+TS0003; _TZ3000_JJDKHUEQ+TS0601; _TZ3000_YERVJNLJ+TS0001; _TZ3000_YERVJNLJ+TS0002; _TZ3000_YERVJNLJ+TS0003; _TZ3000_YERVJNLJ+TS0601; _TZ3000_VJHCENZO+TS0001; _TZ3000_VJHCENZO+TS0002; _TZ3000_VJHCENZO+TS0003; _TZ3000_VJHCENZO+TS0601; _TZ3000_QXCNWV26+TS0001; _TZ3000_QXCNWV26+TS0002; _TZ3000_QXCNWV26+TS0003; _TZ3000_QXCNWV26+TS0601; _TZ3000_EQSAIR32+TS0001; _TZ3000_EQSAIR32+TS0002; _TZ3000_EQSAIR32+TS0003; _TZ3000_EQSAIR32+TS0601; _TZ3000_F09J9QJB+TS0001; _TZ3000_F09J9QJB+TS0002; _TZ3000_F09J9QJB+TS0003; _TZ3000_F09J9QJB+TS0601; _TZ3000_FAWK5XJV+TS0001; _TZ3000_FAWK5XJV+TS0002; _TZ3000_FAWK5XJV+TS0003; _TZ3000_FAWK5XJV+TS0601; _TZ3000_OK0GGPK7+TS0001; _TZ3000_OK0GGPK7+TS0002; _TZ3000_OK0GGPK7+TS0003; _TZ3000_OK0GGPK7+TS0601; _TZE200_SHKXSGIS+TS0001; _TZE200_SHKXSGIS+TS0002; _TZE200_SHKXSGIS+TS0003; _TZE200_SHKXSGIS+TS0601; _TZE284_SHKXSGIS+TS0001; _TZE284_SHKXSGIS+TS0002; _TZE284_SHKXSGIS+TS0003; _TZE284_SHKXSGIS+TS0601; _TZE204_AAGRXLBD+TS0001; _TZE204_AAGRXLBD+TS0002; _TZE204_AAGRXLBD+TS0003; _TZE204_AAGRXLBD+TS0601; _TZE200_R731ZLXK+TS0001; _TZE200_R731ZLXK+TS0002; _TZE200_R731ZLXK+TS0003; _TZE200_R731ZLXK+TS0601; _TZE284_R731ZLXK+TS0001; _TZE284_R731ZLXK+TS0002; _TZE284_R731ZLXK+TS0003; _TZE284_R731ZLXK+TS0601 | lock-sacred-couple |
| T140352 | #2172 | 2026-08-17 | power restore,gang,burst,unavailable,rejoin | — | user-update-repair |
| T158757 | #10 | 2026-08-30 | dimmer,gang,button,flow,rejoin,timeout,battery | — | code-fix-stable-candidate |
| T158757 | #2 | 2026-08-25 | flow | _TZ3218_T9YNFZ4X+TS0225 | user-update-repair |
| T155646 | #1 | 2026-06-02 | gang,dimmer,rejoin,offline,timeout,power restore | — | user-update-repair |

## Impacted devices (cross-source)

| Tile / role | Driver | Device UUID | Couple | Symptoms | Fix shipped | User action |
|-------------|--------|-------------|--------|----------|-------------|-------------|
| 4-gang ZCL touch (NovaDigital) | wall_switch_4gang_1way | — | _TZ3000_lwthnp7j+TS0004 | gang jitter; offline after rejoin; pid often ABSENT in #2186/#2188 | sacred-keep + compose; endpoint jitter hardening; P2347 SK pin | Update Test ≥9.0.741; re-pair if still on switch_4gang; send interview if pid absent |
| Zemismart/NovaDigital wall_switch_1gang_1way | wall_switch_1gang_1way | — | _TZ3000_OVYAISIP+TS0001 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_1gang_1way | wall_switch_1gang_1way | — | _TZ3000_PK8TGTDB+TS0001 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_2gang_1way | wall_switch_2gang_1way | — | _TZ3000_YWUBFUVT+TS0002 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_2gang_1way | wall_switch_2gang_1way | — | _TZ3000_KGXEJ1DV+TS0002 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_2gang_1way | wall_switch_2gang_1way | — | _TZ3000_JJDKHUEQ+TS0002 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_3gang_1way | wall_switch_3gang_1way | — | _TZ3000_YERVJNLJ+TS0003 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_3gang_1way | wall_switch_3gang_1way | — | _TZ3000_VJHCENZO+TS0003 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_3gang_1way | wall_switch_3gang_1way | — | _TZ3000_QXCNWV26+TS0003 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_3gang_1way | wall_switch_3gang_1way | — | _TZ3000_EQSAIR32+TS0003 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_3gang_1way | wall_switch_3gang_1way | — | _TZ3000_F09J9QJB+TS0003 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_3gang_1way | wall_switch_3gang_1way | — | _TZ3000_FAWK5XJV+TS0003 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_3gang_1way | wall_switch_3gang_1way | — | _TZ3000_OK0GGPK7+TS0003 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_4_gang_tuya | wall_switch_4_gang_tuya | — | _TZE200_SHKXSGIS+TS0601 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_4_gang_tuya | wall_switch_4_gang_tuya | — | _TZE284_SHKXSGIS+TS0601 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_4_gang_tuya | wall_switch_4_gang_tuya | — | _TZE204_AAGRXLBD+TS0601 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_6_gang_tuya | wall_switch_6_gang_tuya | — | _TZE200_R731ZLXK+TS0601 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Zemismart/NovaDigital wall_switch_6_gang_tuya | wall_switch_6_gang_tuya | — | _TZE284_R731ZLXK+TS0601 | #2173 Cartesian dump — only this pid verified (HS/Z2M/BA) | P2347 sacred-keep verified couple; compose wall_switch_* | Update Test; re-pair only if wrong driver class |
| Forum T158757 #2 | motion_sensor_radar_mmwave | — | _TZ3218_T9YNFZ4X+TS0225 | flow |  | Update Universal Tuya Test to latest soak build; re-pair only if driver/EP changed |

## Do not invent

- Do NOT lock mfr×{TS0001,TS0002,TS0003,TS0601} Cartesian from #2173
- Only one verified pid per mfr (HomeSuite / Z2M / Blakadder)
- Do not invent TS0004 onto #2186 posts when pid ABSENT — lock is compose-side only
- Do not route Gabriel wall family to switch_Ngang or wall_dimmer_tuya

---
Regenerate: `npm run user:impact -- --user=Gabriel_Pedrosa_Mach`

