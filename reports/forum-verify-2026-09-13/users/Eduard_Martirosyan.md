# User impact — Eduard_Martirosyan

Generated: 2026-09-13T21:56:05 · silent enrichment only

## Forum posts (actionable)

| Topic | Post | Date | Issues | Couples | Action |
|-------|------|------|--------|---------|--------|
| T140352 | #2228 | 2026-09-05 | blind,unknown,curtain,cover,gang,battery,endpoint | _TZE284_FODV6BKR+TS0601; _TZE284_LIBHT6UA+TS0601 | code-fix-stable-candidate |

## Impacted devices (cross-source)

| Tile / role | Driver | Device UUID | Couple | Symptoms | Fix shipped | User action |
|-------------|--------|-------------|--------|----------|-------------|-------------|
| Auto T140352 #2228 | curtain_motor | — | _TZE284_FODV6BKR+TS0601 | blind; unknown; curtain; cover; gang; battery; endpoint | endpoint jitter hardening; markAppCommand per-gang; SOS battery spike guard; UnifiedBatteryHandler | Update Universal Tuya Test to latest soak build; re-pair only if driver/EP changed |
| Auto T140352 #2228 | curtain_motor | — | _TZE284_LIBHT6UA+TS0601 | blind; unknown; curtain; cover; gang; battery; endpoint | endpoint jitter hardening; markAppCommand per-gang; SOS battery spike guard; UnifiedBatteryHandler | Update Universal Tuya Test to latest soak build; re-pair only if driver/EP changed |

## Inbox snippets

- **Eduard_Martirosyan** (2026-09-05) :  Hi @dlnraja , Thanks a lot for your work on this app. I have a tubular roller blind motor with a built-in Tuya Zigbee receiver that is not

---
Regenerate: `npm run user:impact -- --user=Eduard_Martirosyan`

