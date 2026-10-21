# P2951 — zcl_cluster_layer compose/$extends + `_TZ3000_dfgbtub0`|TS0042

## zcl_cluster_layer
The per-device kill switch for the ZCL cluster layer lived in `.homeycompose/drivers/settings/zclClusterLayer.json` with setting id `zcl_cluster_layer`. Drivers pulled it with `"$extends": ["zclClusterLayer"]`. After `homey app build`, committed `app.json` carried the expanded id `zcl_cluster_layer`, so `test/critical/compose-app-couple-divergence.test.js` reported 382 orphan settings (compose advertised the extends *name*, not the setting id).

Fix: rename the template to `zcl_cluster_layer.json` and every `$extends` to `["zcl_cluster_layer"]`. Runtime `getSetting('zcl_cluster_layer')` is unchanged.

## `_TZ3000_dfgbtub0` / TS0042
This maker ships two remotes. The 4-button TS0044 couple is sacred on `button_wireless_4` (forum 156967#12, P2293) and is unchanged. The 2-button TS0042 is confirmed by three independent sources: Z2M `tuya.ts` (TS0042 whitelabel Marmitek Push_LO), Blakadder (Eardatek ESW-0ZAC-EU, zigbeemodel TS0042 + this maker) and Johan's `wall_remote_2_gang` (TS0042 only). No driver matched `_TZ3000_dfgbtub0|TS0042` before.

Placed: both case forms on `button_wireless_2` (already lists TS0042, not TS0044). A couple is mfr+pid, so neither exact couple is shared. The 34 productIds both drivers list produce theoretical pairs; 33 were already frozen in `data/native-matrix-baseline.json` (the maker was on both drivers until d09e9531cf), the 34th (TS0215A) is a documented reviewed exception in `data/native-matrix-reviewed-duals.json`. The P2554 test now asserts this rule instead of "bw2 must not co-own the maker".
