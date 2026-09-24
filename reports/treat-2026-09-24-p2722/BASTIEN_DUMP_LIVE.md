# Bastien dump 2026-09-24 ~23:15 (Chrome WebBridge)

## Athom / Gmail
| Build | Version | State |
|-------|---------|-------|
| #105 | 1.0.95 | **processing_failed** socket hang up |
| #104 | 1.0.94 | **processing_failed** socket hang up |
| #103 | **1.0.93** | **test** (healthy — what Homey installs) |

Universal #3362 testing OK. Bastien tip-lag = Athom reject, not Homey UI.

## App settings (`my.homey.app/.../com.dlnraja.tuya.zigbee.bastien`)
Page was slow ("Chargement...") — cloud path. Expect installed **1.0.93** Test until 1.0.96 lands.

## Zigbee tools (Homey Pro de Bastien)
| Node | Device | Couple | Last seen | TX Err |
|------|--------|--------|-----------|--------|
| 3 | Bouton 1 | axpdxqgu+TS0041 | **2 hours** | 64 (40%) |
| 7 | Bouton 3 | vsxvaj9i+TS0043 | 7 min | 83 (56%) |
| 18 | 2-Boutons | dzwgk7e2+TS0042 | **2 hours** | 146 (59%) |
| 5–17 | HOBEIAN ZG-301Z | switch_1gang | 2 min | ~0% |
| 20 | Eclairage salon | ltt60asa+TS0004 | 6 min | 0% |
| 10/12 | SNZB-02 | fllyghyj | 11–17 min | ~10% |
| 14/15/19 | Unknown | — | active RX | orphans |

→ Remotes 1+2 **dead window** (2h) while switches OK = “reconnu mais rien ne marche”.

## Fix P2724
House-fleet prune at prepare-publish: ~431 → ~76 drivers, app.json ~7.9 → ~1.7 MB.
Tip **1.0.96** republish to clear Athom hang.

## User actions after Test 1.0.96
1. Update Zigbee Bastien → 1.0.96 + **Redémarrer**
2. Press each remote (wake) → Flow → lights
3. If still dead: replace CR2032 / Repair device
