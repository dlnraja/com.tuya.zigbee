# User impact — SunBeech

Generated: 2026-09-03T10:34:10 · silent enrichment only

## Forum posts (actionable)

| Topic | Post | Date | Issues | Couples | Action |
|-------|------|------|--------|---------|--------|
| T26439 | #5476 | 2026-05-26 | battery | — | code-fix-stable-candidate |
| T43287 | #2202 | 2026-08-14 | flow | — | user-update-repair |
| T43287 | #2197 | 2026-08-12 | flow | — | user-update-repair |
| T43287 | #2191 | 2026-08-12 | flow | — | user-update-repair |
| T106779 | #1147 | 2025-12-18 | flow | — | user-update-repair |
| T156967 | #47 | 2026-08-01 | gang | — | user-update-repair |
| T156967 | #38 | 2026-07-29 | battery | — | code-fix-stable-candidate |
| T156967 | #36 | 2026-07-29 | gang,button | — | user-update-repair |
| T156967 | #32 | 2026-07-29 | gang | — | user-update-repair |
| T156967 | #30 | 2026-07-29 | gang | — | user-update-repair |
| T156967 | #28 | 2026-07-29 | button,gang | — | user-update-repair |
| T156967 | #26 | 2026-07-29 | gang,unavailable,button,flow,battery | _TZ3000_4UPL1FCJ+TS0041 | code-fix-stable-candidate |
| T156967 | #22 | 2026-07-29 | button | — | user-update-repair |
| T156967 | #20 | 2026-07-29 | button | — | user-update-repair |
| T156967 | #18 | 2026-07-29 | battery,button,gang | — | code-fix-stable-candidate |
| T156967 | #15 | 2026-07-29 | gang | — | user-update-repair |
| T156967 | #14 | 2026-07-29 | gang,button | — | user-update-repair |
| T156967 | #12 | 2026-07-28 | gang | _TZ3000_WKAI4GA5+TS0044; _TZ3000_WKAI4GA5+TS0042; _TZ3000_DFGBTUB0+TS0044; _TZ3000_DFGBTUB0+TS0042 | lock-sacred-couple |
| T120477 | #10 | 2025-04-09 | button | — | user-update-repair |
| T156967 | #9 | 2026-07-27 | gang | _TZ3000_4UPL1FCJ+TS0041 | user-update-repair |

## Impacted devices (cross-source)

| Tile / role | Driver | Device UUID | Couple | Symptoms | Fix shipped | User action |
|-------------|--------|-------------|--------|----------|-------------|-------------|
| Auto T156967 #26 | wall_dimmer_tuya | — | _TZ3000_4UPL1FCJ+TS0041 | gang; unavailable; button; flow; battery | endpoint jitter hardening; markAppCommand per-gang; ButtonDevice wake + deferred DataRecovery P2184; SOS battery spike guard; UnifiedBatteryHandler | Verify compose fingerprint; update Test |
| Forum T156967 #12 | wall_dimmer_tuya | — | _TZ3000_WKAI4GA5+TS0044 | gang |  | Verify compose fingerprint; update Test |
| Forum T156967 #12 | wall_dimmer_tuya | — | _TZ3000_WKAI4GA5+TS0042 | gang |  | Verify compose fingerprint; update Test |
| Forum T156967 #12 | wall_dimmer_tuya | — | _TZ3000_DFGBTUB0+TS0044 | gang |  | Verify compose fingerprint; update Test |
| Forum T156967 #12 | wall_dimmer_tuya | — | _TZ3000_DFGBTUB0+TS0042 | gang |  | Verify compose fingerprint; update Test |

---
Regenerate: `npm run user:impact -- --user=SunBeech`

