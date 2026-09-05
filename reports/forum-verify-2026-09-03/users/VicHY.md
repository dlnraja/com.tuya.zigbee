# User impact — VicHY

Generated: 2026-09-03T10:34:10 · silent enrichment only

## Forum posts (actionable)

| Topic | Post | Date | Issues | Couples | Action |
|-------|------|------|--------|---------|--------|
| T140352 | #2227 | 2026-09-02 | curtain,battery | — | code-fix-stable-candidate |
| T140352 | #2224 | 2026-09-02 | — | _TZE204_CLRDRNYA+TS0601 | user-update-repair |
| T140352 | #2222 | 2026-09-02 | presence,blind | — | user-update-repair |
| T140352 | #2219 | 2026-09-01 | curtain,button,presence | — | user-update-repair |
| T140352 | #2211 | 2026-08-31 | gang,presence,button | — | user-update-repair |
| T140352 | #2208 | 2026-08-30 | presence | _TZE204_CLRDRNYA | request-diag-couple |

## Diagnostic lineage

| Log ID | Date | App | Notes |
|--------|------|-----|-------|
| `undefined` | undefined | undefined | undefined |
| `undefined` | undefined | undefined | undefined |

## Impacted devices (cross-source)

| Tile / role | Driver | Device UUID | Couple | Symptoms | Fix shipped | User action |
|-------------|--------|-------------|--------|----------|-------------|-------------|
| Presencia baño principal | presence_sensor_radar | — | _TZE204_clrdrnya+TS0601 | blind/curtain UI after update; stuck presence; Homey flood timeline ~196 msg/min; phantom low battery on mains MTG | P2340 sacred-keep force-inject clrdrnya; P2379/P2386 phantom curtain strip; P2389/P2401 radar flood calm (no Homey alert); P2391 mains battery heal + energy clear | Update Test ≥9.0.802 + restart app; re-pair only if still curtain UI |

## Inbox snippets

- **VicHY** (2026-09-02) :  Thanks a lot for the quick response and the explanations. I’ll give it a try and let you know. Regards.
- **VicHY** (2026-09-02) :  Hi @dlnraja I had version 9.0.791 installed, and it was working correctly as a mmWave PIR sensor; however, after the version updated, the s

---
Regenerate: `npm run user:impact -- --user=VicHY`

