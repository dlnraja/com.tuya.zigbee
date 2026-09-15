# User impact — SunBeech

Generated: 2026-09-15T09:29:06 · silent enrichment only

## Forum posts (actionable)

| Topic | Post | Date | Issues | Couples | Action |
|-------|------|------|--------|---------|--------|
| T26439 | #5476 | 2026-05-26 | battery | — | code-fix-stable-candidate |
| T43287 | #2223 | 2026-09-14 | thermostat | — | user-update-repair |
| T43287 | #2202 | 2026-08-14 | flow | — | user-update-repair |
| T43287 | #2197 | 2026-08-12 | flow | — | user-update-repair |
| T43287 | #2191 | 2026-08-12 | flow | — | user-update-repair |
| T106779 | #1147 | 2025-12-18 | flow | — | user-update-repair |
| T156967 | #47 | 2026-08-01 | gang | — | user-update-repair |
| T156967 | #20 | 2026-07-29 | button | — | user-update-repair |
| T156967 | #18 | 2026-07-29 | battery,button,gang | — | code-fix-stable-candidate |
| T156967 | #15 | 2026-07-29 | gang | — | user-update-repair |
| T156967 | #14 | 2026-07-29 | gang,button | — | user-update-repair |
| T156967 | #12 | 2026-07-28 | gang | _TZ3000_WKAI4GA5+TS0044; _TZ3000_WKAI4GA5+TS0042; _TZ3000_DFGBTUB0+TS0044; _TZ3000_DFGBTUB0+TS0042 | user-update-repair |
| T120477 | #10 | 2025-04-09 | button | — | user-update-repair |
| T157859 | #8 | 2026-08-06 | flow | — | user-update-repair |

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

