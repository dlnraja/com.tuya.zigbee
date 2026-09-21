# Bastien warnings — intelligent treat (screenshot Paramètres Avancés)

## What looks like a “warning” on the photo

| UI | Value | Verdict |
|----|-------|---------|
| Toujours en marche | Non | **False alarm** — Homey Virtual treats TS0043 as *socket* |
| Courant arrêt/marche | `-` | **False alarm** — no electrical metering on a scene remote |
| Recevoir lorsque inactif | × | **Normal** — sleepy enddevice |
| Firmware | `-` | Soft — Virtual never interviewed OTA |
| Fabricant / Produit | `_TZ3000_vsxvaj9i` / `TS0043` | **Real identity** → must be Bastien `button_wireless_3` |

## Real problems (live API)

1. **Tip-lag** — box still **1.0.34** while tip ≥1.0.36/37
2. **5× Homey Virtual** devices that must be Bastien (TS0043, TS0004, SNZB-02×2, eWeLink climate)
3. **HOBEIAN ZG-301Z** on Bastien `switch_1gang` but **zb_model_id blank** → P2632 heal skipped → phantom `measure_power` / Energy-ish noise

## Code treat (1.0.37 / P2662)

- `isHobeianZg301z`: HOBEIAN + `switch_1gang` + empty pid → assume ZG-301Z (Bastien fleet)
- Soft-fill `zb_model_id=ZG-301Z` + strip phantom power caps
- TS0043 learnmode EN/FR: never Homey Virtual; explain Energy dashes

## User actions

1. Update Zigbee Bastien ≥ **1.0.37**
2. Repair / restart HOBEIAN lights (heal fills model + strips phantoms)
3. Delete Virtual tiles → re-pair under Bastien only
