# User impact — Eduard_Martirosyan

Generated: 2026-10-13T12:19:59 · silent enrichment only

## Forum posts (actionable)

| Topic | Post | Date | Issues | Couples | Action |
|-------|------|------|--------|---------|--------|
| T140352 | #2228 | 2026-09-05 | blind,unknown,curtain,cover,gang,battery,endpoint | _TZE284_FODV6BKR+TS0601; _TZE284_LIBHT6UA+TS0601 | code-fix-stable-candidate |

## Impacted devices (cross-source)

| Tile / role | Driver | Device UUID | Couple | Symptoms | Fix shipped | User action |
|-------------|--------|-------------|--------|----------|-------------|-------------|
| Auto T140352 #2228 | curtain_motor | — | _TZE284_FODV6BKR+TS0601 | blind; unknown; curtain; cover; gang; battery; endpoint | endpoint jitter hardening; markAppCommand per-gang; SOS battery spike guard; UnifiedBatteryHandler | Update Universal Tuya Test to latest soak build; re-pair only if driver/EP changed |
| Auto T140352 #2228 | curtain_motor | — | _TZE284_LIBHT6UA+TS0601 | blind; unknown; curtain; cover; gang; battery; endpoint | endpoint jitter hardening; markAppCommand per-gang; SOS battery spike guard; UnifiedBatteryHandler | Update Universal Tuya Test to latest soak build; re-pair only if driver/EP changed |

---
Regenerate: `npm run user:impact -- --user=Eduard_Martirosyan`

