# eWeLink + `CK-TLSR8656-SS5-01(7014)` (P2631)

Bastien mesh ieee `a4:c1:38:09:4f:ff:ff:ff` — showed as **Appareil Zigbee**.

## Identity
- manufacturerName: `eWeLink`
- productId: `CK-TLSR8656-SS5-01(7014)`
- driver: `climate_sensor` only
- NOT the wireless button `CK-TLSR8656-SS5-01(7000)`

## Z2M / alts
- Z2M page: temperature + humidity + battery + voltage (ZCL)
- herdsman PR #8855: eWeLink family — **7014=TH**, **7000=button**, 7002=motion, 7003=contact, 7019=leak
- Hubitat: CK-TLSR8656 TH driver · clusters `[0,1,3,4,32,1026,1029,FC11]`

## Clusters (Hubitat / P2622)
`[0, 1, 3, 4, 32, 1026, 1029, FC11/64529]` — no EF00 TX.

## Bastien mesh 2026-09-23
Node 4 `salon/cuisine` — OK on `climate_sensor` (sleepy, multi-hop via HOBEIAN).

## Action
Update Bastien tip → never pair as button 7000 · Contre quoi `check:p2695`.
