# P2668 — Bastien couple research (internet × live mesh) + complementary patches

## Blocking user action (updated)

1. Homey → Apps → **Zigbee Bastien** → **Update ≥ 1.0.44** (was 1.0.37; tip now includes P2662–P2668)
2. Restart app
3. **Repair** each HOBEIAN light (8×)
4. Delete **5 Homey Virtual** tiles → re-pair **only** under Zigbee Bastien
5. Remove **2 Unknown Nodes** → re-pair as button_1 / button_2
6. Rebuild Flows: **Button pressed → lights** (not Virtual onoff)

## Couple matrix (Z2M / forums × our drivers)

| mfr | pid | Live role | Z2M exposes | Our driver | Gap closed |
|-----|-----|-----------|-------------|------------|------------|
| HOBEIAN | ZG-301Z | 8× lights | switch, countdown, power_on, switch_type (**no metering**) | switch_1gang | P2662–P2668: fill pid, calm mesh, setClass light, setEnergy approx, learnmode |
| NodOn | SIN-4-FP-21 | radiators | official NodOn | EXTERNAL | keep |
| _TZ3000_vsxvaj9i | TS0043 | Virtual 3-btn | battery + 1_/2_/3_ actions | button_wireless_3 | learnmode anti-Virtual |
| _TZ3000_ltt60asa | TS0004 | Virtual 4-gang | 4× switch, POB, backlight (+energy on some FW) | switch_4gang | +mmkbptmx sibling; P2668 setClass light |
| _TZ3000_fllyghyj | SNZB-02 | Virtual TH | temp/humidity/battery | climate_sensor | P2666 lock |
| eWeLink | CK-TLSR…(7014) | Virtual TH | temp/humidity/battery | climate_sensor | P2622/P2666 |
| _TZ3000_axpdxqgu | TS0041 | Unknown Node | battery + single/double/hold | button_wireless_1 | P2630/P2667 IEEE map |
| _TZ3000_dzwgk7e2 | TS0042 | Unknown Node | battery + 1_/2_ actions | button_wireless_2 | P2636/P2667 |
| _TZE284_vvmbj46n | TS0601 | LCD TH (SSOT) | LCD TH+clock | lcdtemphumidsensor | P2668 learnmode |

## HOBEIAN when broken vs works
- **Broken ≤1.0.34**: blank pid, electrical flood ~5k TX, class socket Energy
- **Works ≥1.0.40**: heal + MeshFloodCalm
- **≥1.0.42**: setClass(light)
- **≥1.0.44**: setEnergy approximation + Bastien learnmode (Z2M: no metering)

## Sources
- https://www.zigbee2mqtt.io/devices/ZG-301Z.html
- https://www.zigbee2mqtt.io/devices/TS0043.html / TS0042 / TS0041 / TS0004
- Z2M #28038 axpdxqgu · ZHA #1982 ltt60asa EP isolation
