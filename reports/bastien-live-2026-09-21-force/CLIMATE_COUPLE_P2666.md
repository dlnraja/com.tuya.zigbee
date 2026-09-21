# P2666 — Bastien climate sacred couples + FP gate

## Live dump (sanitized)
- 8× HOBEIAN ZG-301Z ~5k TX → calmed by P2663/P2665 (≥1.0.40)
- Virtual: vsxvaj9i→button_wireless_3, ltt60asa→switch_4gang, fllyghyj→climate_sensor, eWeLink+7014→climate_sensor
- 2× Unknown Node → remove in Developer Tools

## Code
- climate_sensor owns `_TZ3000_fllyghyj` + eWeLink + SNZB-02 / CK-TLSR…(7014)
- stripped fllyghyj from temphumidsensor3; pruned climate productId bleed
- FP collision NEW=0

## User
1. Update Bastien Test ≥1.0.41
2. Restart app
3. Remove Unknown Nodes
4. Re-pair Virtual tiles under Bastien drivers
5. Rebuild Flows: button pressed → lights
