# P2331 — Button ↔ Flow deep pass (2026-08-31)

Silent forum. BOTH.

## Beyond P2330
| Gap | Fix |
|-----|-----|
| `button_wireless_*` on/off mapped to `*_button_pressed` | mixin: on/off → physical switch cards |
| fingerbot hashed `physi_*` / `power_*` | unhash to full compose IDs |
| fingerbot/contact/air_purifier invent `_triggerIds` | align to compose |
| UnifiedSwitchBase `_gangN_turned_` invent | declared-only / CoreCapability |
| `wall_switch_4_gang` missing `physical_gangN` | add 8 triggers |
| `button_wireless_4` release invent | per-button `*_button_N_release` |

## Sacred remotes (unchanged P2328)
zgyzgdua/wkai→scene_switch_4 · kfu→button_wireless_4 · 0xFD RX intact
