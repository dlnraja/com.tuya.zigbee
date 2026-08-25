# User impact — Peter_van_Werkhoven

Generated: 2026-08-24T21:33:18 · silent enrichment only

## Forum posts (actionable)

| Topic | Post | Date | Issues | Couples | Action |
|-------|------|------|--------|---------|--------|
| T140352 | #2190 | 2026-08-21 | sos,button,battery,luminance | — | code-fix-stable-candidate |
| T140352 | #2184 | 2026-08-19 | sos,flow | — | code-fix-stable-candidate |
| T140352 | #2183 | 2026-08-18 | flow,sos | — | code-fix-stable-candidate |
| T140352 | #2167 | 2026-08-16 | flow,sos | — | code-fix-stable-candidate |
| T140352 | #2164 | 2026-08-16 | crash | — | user-update-repair |

## Diagnostic lineage

| Log ID | Date | App | Notes |
|--------|------|-----|-------|
| `634f7b19` | 2026-08-15 | 5.12.70 | Crash auditCapabilities; SOS dead; smartbutton shown as contact — stable era |
| `96c19859` | 2026-08-16 | 9.0.537 | Heap OOM LiveData segments — fixed LiveDataUpdater P148 |
| `1cf775a2` | 2026-08-19 | 9.0.596 | SOS OK after re-pair; water leftover 11 DP; smartbutton HYBRID silent |
| `0cea6870` | 2026-08-21 | 9.0.617 | Contact pulse IAS; lux DP101; SOS battery spike; water/button dead |
| `f647d35b` | 2026-08-24 | 9.0.636 | Door/Window + Waterdetector OK; Smartbutton still no response; couple ABSENT |

## Impacted devices (cross-source)

| Tile / role | Driver | Device UUID | Couple | Symptoms | Fix shipped | User action |
|-------------|--------|-------------|--------|----------|-------------|-------------|
| SOS Peter | button_emergency_sos | 5814761c… | **ABSENT** | SOS OK; battery nervous 11↔20%; battery_low flow spam | spike guard + P2256 jitter/hysteresis | Update Test after publish |
| SOS Fariba | button_emergency_sos | — | **ABSENT** | battery flip low↔OK on timeline | same SOS battery debounce | Update + re-pair if still glitchy |
| Raam onze slpkamer / Raam Computerkamer / Raam Slpkamer voor | contact_sensor | 53c35301… | **ABSENT** | pulse not latch; lux plateau; IAS object | IAS coerce; LayerSignalFusion | **OK on f647d35b** — keep Test updated |
| Waterdetector | water_leak_sensor | 61bc597b… | **ABSENT** | no wet/dry historically | skip EF00 TX; _ensureIasBound | **OK on f647d35b** |
| Smartbutton | button_wireless_1 | 28c1e9fd… | **ABSENT** | no presses; HYBRID silent; D101/D102 blank | wake + 0xFD + no DCM onoff | **Re-pair while pressing** after Test update; need interview |

## Drivers seen in local diag excerpts

- **contact_sensor**: `53c35301…`, `37f88e53…`, `d10c36b7…`
- **water_leak_sensor**: `61bc597b…`
- **button_wireless_1**: `28c1e9fd…`
- **button_emergency_sos**: `5814761c…`

## Inbox snippets

- **Peter_van_Werkhoven** (2026-08-18) :  Hi Dylan Good afternoon, is the app using to much memory, because Flow’s don’t run and device’s are difficult to start I noticed since yest
- **Peter_van_Werkhoven** (2026-08-19) :  Hi Dylan Good afternoon you achieved it the SOS buttons finally work again, great job 1000040782 1220×2712 202 KB Before I had to disable t
- **Peter_van_Werkhoven** (2026-08-21) :  Hi Dylan Good evening, SOS button’s still working fine, only Battery is very Nervous/Glitchy 1000041136 1220×2712 248 KB 1000041137 1220×27

## Do not invent

- Do not glue k4ej3ww2
- Do not glue mrpevh8p
- Do not use TS0207 from other Peter-era posts

---
Regenerate: `npm run user:impact -- --user=Peter_van_Werkhoven`

