# SESSION HANDOFF — 2026-08-20 (P2203 IAS already-enrolled bind)

> Shared App ID `com.dlnraja.tuya.zigbee`. Forum silent (T157628). Dual-track: master=preview, stable=reliability-only. Never Publish Stable→Test while 9.0 soaks.

| Track | Tip (repo) | Homey Test |
|-------|------------|------------|
| master | **9.0.613 → next publish (P2203)** | Auto-Publish on push; do not overwrite with 5.12 |
| stable-v5 | **5.12.87** | soak; do **not** Promote Stable→Test |

## Forum fine analysis (silent, 2026-08-20)

| Post | Who | Finding | Action |
|------|-----|---------|--------|
| #2184 | Peter | SOS OK on 9.0.596 after re-pair; water+smartbutton still dead; diag `1cf775a2` | P2184+**P2203** |
| #2183 | Peter | Heap / Flows dead; SOS/button/water/contact | Heap defer P2184; IAS bind P2203 |
| #2186/#2188 | Gabriel | `_TZ3000_lwthnp7j` 4-gang ZCL touch BR | Already `wall_switch_4gang_1way`+TS0004 — no invent |
| Scanner “new FPs” | — | `_TZE200_ABC123`, Johan cartesian mfr dumps, `V5498KDM` | **Refuse** — no Z2M couple |

### WHY P2203 (doubt → fix)

| Q | Answer |
|---|--------|
| **Pourquoi** | After app update Homey restarts; sleepy IAS already `enrolled` → early return set listener but **never bind** → 0 `iasZone` msgs (Peter water) |
| **Comment** | `IASZoneManager._ensureIasBound`: cluster.bind + endpoint.bind fallback; call on enrolled path AND after enroll |
| **Pour qui** | Water / contact / SOS IAS users (BOTH tracks) |
| **Quand** | `enrollIASZone` at init + every wake `onEndDeviceAnnounce` |
| **Contre quoi** | Listener-only without bind; EF00 mirror on IAS-only (`useTuyaMirror` off) |

Also: `IASAlarmFallback` skips Tuya mirror when `_iasOnlyProfile`; uses `safeSetCapabilityValue`.

## Prior locks (still sacred)

| Couple | Driver |
|--------|--------|
| `_TZ3000_k4ej3ww2`+TS0207 | `water_leak_sensor` IAS |
| `_TZ3000_mrpevh8p`+TS0041 | `button_wireless_1` |
| `_TZE200/204_pay2byax`+TS0601 | `contact_sensor_zigbee` |
| `_TZ3000_lwthnp7j`+TS0004 | `wall_switch_4gang_1way` |
| `_TZE284_m1cvyneb`+TS0601 | `wall_dimmer_tuya` |

## User guidance (silent — do not forum-post)

After Homey Test shows the P2203 build: **remove + re-pair** water + smartbutton if still silent (bind needs a radio window).

## Do not

- Forum/PM replies · invent productIds · Publish Stable→Test · trust forum-scanner ABC123/cartesian dumps
