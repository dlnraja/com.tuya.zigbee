# User impact — Graeme_Hindmarsh

Generated: 2026-09-05T07:54:37 · silent enrichment only

## Forum posts (actionable)

| Topic | Post | Date | Issues | Couples | Action |
|-------|------|------|--------|---------|--------|
| T150690 | #33 | 2026-06-24 | button,battery,flow,endpoint,gang | _TZ3000_KFU8ZAPD+TS0044; _TZ3000_ZGYZGDUA+TS0044; _TZ3000_WKAI4GA5+TS0044 | code-fix-stable-candidate |

## Impacted devices (cross-source)

| Tile / role | Driver | Device UUID | Couple | Symptoms | Fix shipped | User action |
|-------------|--------|-------------|--------|----------|-------------|-------------|
| Auto T150690 #33 | wall_dimmer_tuya | — | _TZ3000_KFU8ZAPD+TS0044 | button; battery; flow; endpoint; gang | ButtonDevice wake + deferred DataRecovery P2184; SOS battery spike guard; UnifiedBatteryHandler; endpoint jitter hardening; markAppCommand per-gang | Verify compose fingerprint; update Test |
| Auto T150690 #33 | wall_dimmer_tuya | — | _TZ3000_ZGYZGDUA+TS0044 | button; battery; flow; endpoint; gang | ButtonDevice wake + deferred DataRecovery P2184; SOS battery spike guard; UnifiedBatteryHandler; endpoint jitter hardening; markAppCommand per-gang | Verify compose fingerprint; update Test |
| Auto T150690 #33 | wall_dimmer_tuya | — | _TZ3000_WKAI4GA5+TS0044 | button; battery; flow; endpoint; gang | ButtonDevice wake + deferred DataRecovery P2184; SOS battery spike guard; UnifiedBatteryHandler; endpoint jitter hardening; markAppCommand per-gang | Verify compose fingerprint; update Test |

---
Regenerate: `npm run user:impact -- --user=Graeme_Hindmarsh`

