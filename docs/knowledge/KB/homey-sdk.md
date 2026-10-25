# Homey SDK rules & pitfalls (our words)
- Driver match is on exact zigbee.manufacturerName + productId arrays in driver.compose.json; endpoints/clusters must match the interview. Source: [Homey Apps SDK](https://apps.developer.homey.app/wireless/zigbee).
- Flow card ids must exist in app.json or triggers throw (invalid_flow_card_id).
- Large app.json slows/destroys Athom processing; keep drivers lean.
- Settings changes arrive via onSettings; never block it on a sleepy device.
- Use BoundCluster for incoming commands; register listeners once (memory leaks otherwise).

Related notes:
- [P2929 — Bastien app: crashes and failing Flow cards/buttons (21/10/2026, Paris)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/BASTIEN_CRASH_BUTTONS_P2929_2026-10-21.md)
- [Button event router (P2926) — 2026-10-21](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/BUTTON_EVENT_ROUTER_P2926.md)
- [Forum Homey — fils clés (10/10/2026)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/FORUM_THREADS_DIGEST.md)
- [Diagnostics et crashs Homey reçus par Gmail (01/08 → 10/10/2026)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/GMAIL_DIAGNOSTICS_2026-08-10.md)
- [Homey firmware & Zigbee stack: research notes (2026-10-10)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/HOMEY_FIRMWARE.md)
- [Homey news 2025-2026: what it means for this app (queue #101-#106)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/HOMEY_NEWS_2026_AUDIT.md)
- [Homey SDK, CLI and developer news — October 2026 (our summary)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/HOMEY_SDK_NEWS_2026-10.md)
- [Homey versions strictly incremental — all apps (rule from dlnraja, 2026-10-10)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/HOMEY_VERSION_FLOOR.md)
- [Battery multi-button remotes — TS0041 / TS0042 / TS0043 / TS0044 / TS004F](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/TS004X_BATTERY_REMOTES.md)
- [Z2M generic device options → ideas for Homey (ideas only, nothing implemented)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/Z2M_GENERIC_CONCEPTS.md)
