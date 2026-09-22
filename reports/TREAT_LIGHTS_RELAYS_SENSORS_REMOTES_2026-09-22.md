# TREAT — lights / relays / sensors / remotes (diags 2026-09-22)

Silent only. No forum POST (T157628). Dual-app **BOTH**.

## New diag map (Gmail thread)

| Log / signal | App @ mail | Driver seen | Verdict |
|--------------|------------|-------------|---------|
| **cb3c0c87** « Rien ne fonctionne » | Bastien **1.0.51** | (boot crash) | MODULE_NOT_FOUND zigbeedriver → tip **≥1.0.58** P2676 |
| **149bc1a5** SIGABRT / OOM | Universal **9.0.1165** | all devices dead | tip **≥9.0.1182** P2678 |
| **e8d98608** / **4d4e1684** boutons | Bastien ≤1.0.34 | `remote_button_wireless_wall` / wrong tile | **P2680** strip IAS/EF00 clusters; re-pair `button_wireless_1` / `_3` |
| **af98752d** | Stable tip-lag | presence | tip **≥5.12.300** radar soft-require |
| GH **#551** famkxci2+TS0043 | ≤9.0.1086 | Generic Zigbee | compose OK + **P2680** hybrid profile (was zcl_only) |
| GH **#550** gkfbdvyx | ≤9.0.1059 | presence lux-only | P2600 already tip — update + repair |
| GH **#553** OOM | 9.0.1165 | — | tip ≥9.0.1182 |

## Couples locked (no invent)

| Couple | Driver | Contre quoi |
|--------|--------|-------------|
| `_TZ3000_axpdxqgu`+TS0041 | `button_wireless_1` | forbid remote_button_wireless_wall |
| `_TZ3000_vsxvaj9i`+TS0043 | `button_wireless_3` | forbid wall remote / 1gang |
| `_TZ3000_famkxci2`+TS0043 | `button_wireless_3` | hybrid 0xFD, skip 0x8004 |
| `_TZE204_gkfbdvyx`+TS0601 | `presence_sensor_radar` | no compose onoff |
| `_TZ3000_FDXIHPP7`+… | `wall_switch_1gang_1way` | Athom case forms |

## Code ship (P2680)

1. `remote_button_wireless_wall` EP1 → `[0,1,6]` + bind `6` (removed IAS 1280/1281, EF00 61184, groups)
2. `PhysicalButtonMixin` `famkxci2`: `zcl_only` → **hybrid** + `skip8004`
3. Contre quoi: `npm run check:p2680`
4. Surgical sync → stable + bastien mixin/compose

## Soft class gaps (empty_mfr stubs)

Placeholder drivers (`relay_board_1_channel`, `pirsensor`, `dimmer_dual_channel`…) stay empty — **never invent mfr**. Real coverage is on `switch_*` / `button_wireless_*` / `presence_sensor_radar` / bulb drivers.

## User actions

1. **Bastien** → update **≥1.0.58**, reboot app (fixes « rien ne fonctionne »)
2. **Universal** → **≥9.0.1182** (OOM)
3. **Stable** → **≥5.12.300**
4. Remotes / 3ch stuck on Generic or wall remote → **remove + re-pair** under Wireless Button 1/3 (not Homey Zigbee)
5. Lights / relays unresponsive only while app crashed → tip update restores them (no re-pair if driver was correct)

## Tips at treat time

- Universal Auto-Publish after P2679 → watch **#3332+**
- Bastien **1.0.58** #68 testing
- Stable **5.12.300** #215 testing
