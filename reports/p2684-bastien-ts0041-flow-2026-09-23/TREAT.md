# TREAT P2684 — Bastien TS0041 « not recognized / no Bouton 1 Flow » (2026-09-23)

Silent only. Dual-app **BOTH**.

## Report
- TS0041 not recognized by Dylan Zigbee / Bastien app
- No functionality; cannot create Flow « Bouton appuyé 1 »

## Root cause
| Symptom | Cause |
|---------|--------|
| Not recognized | Often **Homey Unknown Node** (ieee `7c:c6:b6:…`) — not paired under `button_wireless_1` |
| No Flow Bouton 1 | Cards filter `driver_id=button_wireless_1` only — Unknown has zero cards |
| Feels dead | Debounce 1500ms + late MFR before hybrid 0xFD |

Sacred couple Bastien live: **`_TZ3000_axpdxqgu`+`TS0041`** → `button_wireless_1` (P2630).

## Fix
- Snappy axpdxqgu debounce **400**
- Rehydrate `button.1`, strip dual `alarm_battery`, HomeyButtonUiCharter
- Learnmode: Flow « Bouton 1 appuyé » not Zigbee channels
- Gate `npm run check:p2684`

## User actions
1. Update Bastien ≥ **1.0.62** (Universal ≥9.0.1191)
2. Delete Unknown / wrong device
3. Pair **Zigbee Bastien → Bouton sans fil 1**
4. Flow: **Quand cet appareil → Bouton 1 appuyé**
