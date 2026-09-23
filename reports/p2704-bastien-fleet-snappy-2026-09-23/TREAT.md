# P2704 — Bastien fleet full reactivity (2026-09-23 evening)

## Goal
All Bastien house devices fully functional, reactive, fast — lights HOBEIAN, 4-gang salon, climate SNZB-02/eWeLink, remotes TS004x.

## Live mesh (Chrome DevTools + prior MESH_LIVE)
| Couple | Driver | Status |
|--------|--------|--------|
| HOBEIAN+ZG-301Z | switch_1gang | OK routers — snappy TX |
| ltt60asa+TS0004 | switch_4gang | OK salon — snappy TX |
| fllyghyj+SNZB-02 | climate_sensor | Node15 Unknown → re-pair; Nodes 10/12 OK |
| eWeLink+CK-TLSR…7014 | climate_sensor | OK |
| axpdxqgu+TS0041 | button_wireless_1 | WRONG_APP Homey Node3 — remove+re-pair |
| vsxvaj9i+TS0043 | button_wireless_3 | WRONG_APP Homey Node7 — remove+re-pair |
| dzwgk7e2+TS0042 | button_wireless_2 | OK Node18 — P2702 snappy already |

## Fixes (tip **1.0.80**)
1. **Front-pin** Athom compose order: HOBEIAN/ZG-301Z, ltt60asa/TS0004, fllyghyj/SNZB-02 (+ eWeLink CK)
2. **snappyTx** profiles: HOBEIAN + ltt60asa/mmkbptmx/liygxtcq — skip 15–50ms pace jitter, retry 120ms
3. `UnifiedSwitchBase._setGangOnOff` honors `snappyTx`
4. Contre quoi: `test/critical/p2704-bastien-fleet-snappy-frontpin.test.js`
5. BOTH → master same reliability locks

## User actions after update
1. Update Zigbee Bastien Test → **≥1.0.80**
2. Remove Homey « Appareil Zigbee » Nodes **3** and **7** → re-pair Zigbee Bastien Bouton 1 / Bouton 3
3. Remove Unknown climate Node **15** if still Unknown → Climate Sensor
4. Repair HOBEIAN lights / salon 4-gang if UI still laggy (Maintenance → Repair)
5. Flows: remotes = **Bouton appuyé** (not Zigbee canaux)

## Dual-app
- Bastien tip 1.0.80 (publish)
- Master tip bump (front-pin + snappy BOTH)
- No forum POST
