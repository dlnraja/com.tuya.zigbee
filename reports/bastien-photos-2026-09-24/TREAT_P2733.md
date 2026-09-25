# Bastien Instagram + diags — P2733 (2026-09-25)

Silent treat. No forum POST.

## Couples (locked)
| Couple | Driver | Symptoms (IG + Zigbee tools) |
|--------|--------|------------------------------|
| `_TZ3000_axpdxqgu`+`TS0041` | `button_wireless_1` | white / Moïse — mostly OK, wants snappier; slowed when blacks fire |
| `_TZ3000_dzwgk7e2`+`TS0042` | `button_wireless_2` | black 2-btn — slow; ~7s dead; crashes; slows TS0041 |
| `_TZ3000_vsxvaj9i`+`TS0043` | `button_wireless_3` | black 3-btn — slow; battery 0–84%; crashes |

## Root cause (mesh dump + code)
Wake `onEndDeviceAnnounce` **awaited** multi-EP `cluster.bind()` + battery endpoint scan on every press announce → TX err 40–59%, ~2h last-seen, Homey Flow queue lag (~7s).

## Fix P2733 (BOTH + Bastien tip **1.0.101**)
1. Snappy/skipBatt remotes: wake **listen-only** (magic FF + 0xFD re-arm; no mass bind)
2. BaseUnifiedDevice: skip `_scanAllEndpointsForBattery` + skip 0x8004 wake write
3. Press path: never schedule `_readBatteryWhileAwake` on snappy 1-btn
4. UBE TSN 400ms (was 5000)

## User
1. Update **Zigbee Bastien** → **≥1.0.101**
2. Restart app once
3. Press each remote (wake) → Flow → lights — should feel immediate; no app crash on rapid black presses
4. New diag UUID only if still ~7s dead / TX err stuck high
