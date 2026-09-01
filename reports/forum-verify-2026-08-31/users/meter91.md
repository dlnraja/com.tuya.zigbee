# User impact — meter91

Generated: 2026-08-31T23:15:44 · silent enrichment only

## Forum posts (actionable)

| Topic | Post | Date | Issues | Couples | Action |
|-------|------|------|--------|---------|--------|
| T140352 | #2213 | 2026-08-31 | unknown | _TZ3000_ZGYZGDUA+TS0044 | user-update-repair |
| T140352 | #2207 | 2026-08-30 | unknown,button | — | user-update-repair |
| T140352 | #2189 | 2026-08-21 | — | _TZ3000_ZGYZGDUA+TS0044 | user-update-repair |

## Diagnostic lineage

| Log ID | Date | App | Notes |
|--------|------|-----|-------|
| `undefined` | undefined | undefined | undefined |

## Impacted devices (cross-source)

| Tile / role | Driver | Device UUID | Couple | Symptoms | Fix shipped | User action |
|-------------|--------|-------------|--------|----------|-------------|-------------|
| Moes 4-way scene remote | scene_switch_4 | — | _TZ3000_zgyzgdua+TS0044 | unknown at pairing (diag 9.0.714 pre-P2336); physical 0xFD dead on stale tile | P2336 pairing clusters; P2337 sacred routing; P2338 migration nag skip; PhysicalButtonMixin 0xFD skip 0x8004 | Update Test ≥9.0.738 + remove + re-pair Scene Switch 4-Gang |

---
Regenerate: `npm run user:impact -- --user=meter91`

