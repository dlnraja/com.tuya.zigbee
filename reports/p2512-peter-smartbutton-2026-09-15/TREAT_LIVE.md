# P2512 — Peter Smartbutton #2233/#2234 (battery + History)

**Classify:** BOTH  
**Couple:** `_TZ3000_mrpevh8p` / `_TZ3000_5bpeda8u` + `TS0041` → `button_wireless_1` (SH-SC07 siblings)  
**Diags:** `8afffc76` · `1e071a86` (@9.0.881) · **`b8b78521` (confirm @ 9.0.939)**  
**Forum:** T140352 SHADOW only

## Confirmed 2026-09-15 (Peter)

| Item | Status |
|------|--------|
| Battery readings | **FIXED** on Test **9.0.939** (user + diag `b8b78521`) |
| History tab | Still absent — **Homey UX** for `class: button`, not a remaining app defect |
| Interview in diag | `_TZ3000_5bpeda8u` + `TS0041` (sibling of mrpevh8p; locked) |

**History:** Homey does not give button remotes a press-activity History tab. Battery Insights can fill under Insights after enough `%` samples; presses stay in Flow cards / timeline.

## Gate

`npm run check:p2512`
