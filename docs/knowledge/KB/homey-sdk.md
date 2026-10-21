# Homey SDK rules & pitfalls (our words)
- Driver match is on exact zigbee.manufacturerName + productId arrays in driver.compose.json; endpoints/clusters must match the interview. Source: [Homey Apps SDK](https://apps.developer.homey.app/wireless/zigbee).
- Flow card ids must exist in app.json or triggers throw (invalid_flow_card_id).
- Large app.json slows/destroys Athom processing; keep drivers lean.
- Settings changes arrive via onSettings; never block it on a sleepy device.
- Use BoundCluster for incoming commands; register listeners once (memory leaks otherwise).

Related notes:
- [Athom / Homey publish limits — what we know (2026-10-10, Paris)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/ATHOM_LIMITS.md)
- [Button event router (P2926) — 2026-10-21](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/BUTTON_EVENT_ROUTER_P2926.md)
- [Disabled workflows (P2916, 20/10/2026)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/DISABLED_WORKFLOWS_P2916.md)
- [Homey forum — Apps category + zigbee tag digest (2026-10)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/FORUM_APPS_CATEGORY_DIGEST_2026-10.md)
- [Forum Homey — fils clés (10/10/2026)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/FORUM_THREADS_DIGEST.md)
- [Diagnostics et crashs Homey reçus par Gmail (01/08 → 10/10/2026)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/GMAIL_DIAGNOSTICS_2026-08-10.md)
- [Homey firmware & Zigbee stack: research notes (2026-10-10)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/HOMEY_FIRMWARE.md)
- [Homey news 2025-2026: what it means for this app (queue #101-#106)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/HOMEY_NEWS_2026_AUDIT.md)
- [Homey SDK, CLI and developer news — October 2026 (our summary)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/HOMEY_SDK_NEWS_2026-10.md)
- [Homey versions strictly incremental — all apps (rule from dlnraja, 2026-10-10)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/HOMEY_VERSION_FLOOR.md)
- [P2933 / P2934 — Homey diag reports via Gmail + Aqara DJT11LM (2026-10-21)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/P2933_P2934_GMAIL_DIAG_AND_DJT11LM_2026-10-21.md)
- [Battery multi-button remotes — TS0041 / TS0042 / TS0043 / TS0044 / TS004F](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/TS004X_BATTERY_REMOTES.md)
- [Homey forum 154077 — "[APP][Pro] Tuya Local" (read 2026-10-11)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/TUYA_LOCAL_THREAD_154077.md)
- [Z2M generic device options → ideas for Homey (ideas only, nothing implemented)](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/knowledge/Z2M_GENERIC_CONCEPTS.md)
