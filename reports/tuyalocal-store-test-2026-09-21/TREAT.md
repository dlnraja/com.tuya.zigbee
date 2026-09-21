# P2647 — Homey Store Test com.tuyalocal complementary (2026-09-21)

Source: [Tuya Local Test](https://homey.app/fr-fr/app/com.tuyalocal/Tuya-Local/test/) tip **1.0.237** (Andi Wirz, MIT).

## Dual-app
**MASTER_ONLY** WiFi LAN UX/flows. No Zigbee sacred-couple invent. P2520 UNION only.

## Absorbed this pass
| Idea | Landing |
|------|---------|
| Fix It Open vs Both closed | `WifiFixIt` TCP 6668/6667 |
| Cloud Lookup + IoT trial note + case tokens | settings + `OemEnumTokens` |
| AQI level changed + PM0.3 threshold | `wifi_air_quality` |
| EV session finished | `wifi_ev_charger_session_finished` |
| Keep generic DP changed | already present — no wipe |

## Gate
`npm run check:p2647`

## Not copied
SafeTuyAPI, bilingual 15k settings wall, wholesale pair HTML.
