# User impact — Cam

Generated: 2026-08-31T07:13:37 · silent enrichment only

## Forum posts (actionable)

| Topic | Post | Date | Issues | Couples | Action |
|-------|------|------|--------|---------|--------|
| T146735 | #8 | 2025-12-11 | button | — | user-update-repair |

## Diagnostic lineage

| Log ID | Date | App | Notes |
|--------|------|-----|-------|
| `4d7b45a5` | historical | undefined | Cam #1160 smart button — TREAT summary empty / access blocked; couple not re-proven |

## Impacted devices (cross-source)

| Tile / role | Driver | Device UUID | Couple | Symptoms | Fix shipped | User action |
|-------------|--------|-------------|--------|----------|-------------|-------------|
| HOBEIAN ZG-204ZL motion | presence_sensor_radar | — | HOBEIAN+ZG-204ZL | LED flashes but flows dead; HOBEIAN mfr stripped by compact | P2340 sacred-keep HOBEIAN+ZG-204ZL | Update Test ≥9.0.741 + re-pair presence_sensor_radar |
| Smart button (T146735 #8) | button_wireless_1 | — | **ABSENT** | pairing no devices found; couple ABSENT in post | soft sacred-keep 5bpeda8u+TS0041 (NEED_DIAG); compose button_wireless_1 | Send Homey diag + interview with zb_manufacturer_name + zb_model_id while pressing button |

## Do not invent

- Do not hard-lock 5bpeda8u from expectations alone onto T146735 #8

---
Regenerate: `npm run user:impact -- --user=Cam`

