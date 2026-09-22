# Bastien Homey — actions bloquantes (tip ≥1.0.44 Test #50)

1. **Apps → Zigbee Bastien → Update ≥1.0.44 → redémarrer** l’app (ou Homey).
2. **Repair** les **8× HOBEIAN** `switch_1gang` (pid fill + class light + energy approx + mesh calm).
3. **Supprimer** les **5 tuiles Homey Virtual** → re-appairer **uniquement** sous Zigbee Bastien:
   - `_TZ3000_vsxvaj9i` → `button_wireless_3`
   - `_TZ3000_ltt60asa` → `switch_4gang`
   - `_TZ3000_fllyghyj` (×2) → `climate_sensor`
   - `eWeLink` → `climate_sensor`
4. **Supprimer** les **2 Unknown Nodes** → re-pair:
   - ieee `7c:c6:b6:…` → `button_wireless_1` (`_TZ3000_axpdxqgu`+TS0041)
   - ieee `a4:c1:38:bb:8f:…` → `button_wireless_2` (`_TZ3000_dzwgk7e2`+TS0042)
5. **Refaire les Flows** : *Bouton appuyé* → lumières (pas Virtual onoff).

Publish: Bastien Test **v1.0.44 #50** confirmé Athom. Master Universal Tip suit Auto-Publish P2668+.
