# P2702 — Bastien diag 1f4dcf2e (2026-09-23 soir)

**Diag:** `1f4dcf2e-4288-4181-b597-ffbc19a6720b` @ Bastien **v1.0.76**  
**User:** TS0041 + TS0043 toujours inconnue; TS0042 latence énorme bouton → relais.

## Couples (locked)

| Couple | Driver | Status in diag |
|--------|--------|----------------|
| `_TZ3000_dzwgk7e2`+`TS0042` | `button_wireless_2` | Paired OK — latency complaint |
| `_TZ3000_axpdxqgu`+`TS0041` | `button_wireless_1` | Absent from app log → Unknown Node |
| `_TZ3000_vsxvaj9i`+`TS0043` | `button_wireless_3` | Absent / off-mesh → Unknown |

## Root causes

1. **Unknown TS0041:** `button_wireless_2` still listed `productId: TS0041` → pairing bleed / Homey Zigbee Unknown.
2. **Unknown TS0043:** not on Bastien driver (IEEE off-mesh / Virtual); sacred-keep was missing → compact risk.
3. **TS0042 slow:** debounce 200 + await `safeSetCapabilityValue` pulse **before** Flow cards delayed relay Flows.

## Fix (tip **1.0.78** / BOTH master **9.0.1208** / stable **5.12.321**)

- Remove `TS0041` from `button_wireless_2` productId (all 3 apps)
- Sacred-keep pin `axpdxqgu`+TS0041 + `vsxvaj9i`+TS0043
- Snappy profiles: debounce **80** / crossPath **120** / `snappyRelayFlow`
- `ButtonDevice`: fire Flow **before** UI pulse; minInterval 50 on snappy

## User actions (no forum post)

1. Update **Zigbee Bastien** Test → **≥1.0.78**
2. Delete **Unknown** nodes for 1-btn + 3-btn
3. Re-pair via **Zigbee Bastien** → Bouton sans fil **1** / **3** (PAS Homey Zigbee)
4. TS0042: Flow « Bouton appuyé » → relais should feel much faster

Gate: `npm run check:p2702`
