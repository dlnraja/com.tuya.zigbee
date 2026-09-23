# Bastien mesh live — 2026-09-23 (Developer Tools Zigbee)

**Source:** Homey Pro Bastien · Channel **20** · FW 9.1.0 · App tip target **≥1.0.69**  
**Sanitized:** network key **NOT** stored (was pasted in chat — rotate if this dump left a private channel).

## Verdict

| Item | Status |
|------|--------|
| `_TZ3000_vsxvaj9i`+TS0043 (3-btn) | **OFF MESH** — IEEE `a4:c1:38:f6:3d:2d:c9:79` absent |
| `_TZ3000_dzwgk7e2`+TS0042 (2-btn) | **ON MESH** Node 17 — last seen **3h**, LQI 80, route via NodOn |
| Unknown Nodes | 4 — 3 mapped, 1 NEED_INTERVIEW |
| HOBEIAN ZG-301Z fleet | Healthy routers (lights) |
| Channel 20 | OK (Wi-Fi coexistence friendly) |

## Why TS0043 “canaux morts”

The 3-button remote is **not on the Zigbee network** right now (no IEEE match). Developer Tools Zigbee channels never drive scene remotes anyway — use **Homey Flow → Button pressed**.

## Why TS0042 slow / ghost other lamp

Node 17 (`a4:c1:38:e6:69:60:4a:6f`):
- Sleepy enddevice, **last seen 3 hours** → presses must wake + climb path `0→NodOn→remote`
- Weak LQI (80) via **Radiateur Cuisine** (NodOn), not a nearby HOBEIAN ZG-301Z
- Tip **≥1.0.69** (P2693) kills phantom-gang + LevelControl invent; mesh path still needs re-pair closer to a light router

## Unknown Nodes (IEEE SSOT — no invent)

| Nwk | IEEE | Couple | Driver | Action |
|-----|------|--------|--------|--------|
| 3 | `7c:c6:b6:ff:fe:a3:e1:58` | `_TZ3000_axpdxqgu`+TS0041 | `button_wireless_1` | Remove → re-pair Bastien 1-btn |
| 13 | `a4:c1:38:bb:8f:37:ee:17` | stale ghost of old TS0042 | — | **Remove orphan only** (live remote = Node 17) |
| 14 | `a4:c1:38:c1:17:76:42:f4` | `_TZ3000_fllyghyj`+SNZB-02 | `climate_sensor` | Remove → re-pair Climate |
| 18 | `a4:c1:38:e6:74:3a:00:da` | **NEED_INTERVIEW** | — | Do not invent — open node → copy mfr+pid after wake |

## Healthy (no action)

| Nwk | Name | Couple | Driver |
|-----|------|--------|--------|
| 5–8,10,12,15,16 | Lights / switches | HOBEIAN+ZG-301Z | `switch_1gang` |
| 9,11 | Sous sol / chambre | fllyghyj+SNZB-02 | `climate_sensor` |
| 4 | salon/cuisine | eWeLink+7014 | `climate_sensor` |
| 19 | Eclairage salon | ltt60asa+TS0004 | `switch_4gang` |
| 1–2 | Radiateurs | NodOn | external app |

## User checklist

1. Update **Zigbee Bastien ≥ 1.0.69** + restart app  
2. **Remove** Unknown Nodes 3, 13, 14 (and 18 after interview)  
3. Re-pair **3-btn** as Bastien → Bouton sans fil 3 (`vsxvaj9i`+TS0043) — wake-tap every 2s  
4. Re-pair / Repair **2-btn** near a HOBEIAN light (not only via NodOn)  
5. Flows: **When → Button pressed → Button N** — never Developer Tools canaux  
6. Never paste **Network Key** into chats / screenshots  

Code: `lib/zigbee/BastienIeeeIdentity.js` (P2694) · Contre quoi `npm run check:p2667`
