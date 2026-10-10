# Lost couples restore — 2026-10-11

Method: every manufacturerName string ever added/removed in `drivers/*/driver.compose.json` (git log -p) vs the current tip, case-insensitive, per branch.
Limit: the local clone is shallow (master/stable/bastien history only partially available; unshallow was interrupted). A full-history pass is still pending.

| Branch | Ever | Current | Lost (raw) |
|---|---|---|---|
| master | 4255 | 4228 | 27 |
| stable-v5 | 4227 | 4227 | 0 |
| bastien-home | 4186 | 4181 | 5 |

## Excluded (master, 27)
- 21 placeholders/synthetic (`_TZ3000_ph_*`, `_TZ3000_dummy*`, `_TZ3000_xxxxxxxx`, `_TZE20x_xxxxxxxx`): invented, never restore.
- `_TZE284_nkjintbl`, `_TZE200_j1xl73iw`, `_TZE284_lsanae15`: deliberate moves (bleed prune / energy_meter_din lock); still present in their verified driver.

## Bastien (5)
- `_TZ3000_nuenzetq`, `_TZE200/_TZE204_rxqls8v0`: moved, still present (switch_2gang / motion_sensor). Excluded.
- **Restored** to `button_wireless_1` (TS0041 present), removed without documented reason in 82a1a581b8 (P2750), still in button_wireless_1 on master and stable:
  - `_TZ3000_qgwcxxws` + TS0041 — Z2M `tuya.ts` whitelabel Tuya MINI-ZSB (Koenkk/zigbee-herdsman-converters); Johan app `smart_button_switch` TS0041 (JohanBendz/com.tuya.zigbee).
  - `_TZ3000_8rppvwda` + TS0041 — Johan app `wall_remote_1_gang` TS0041; long-term on master/stable. Not in Z2M tuya.ts (single external source + our long-term presence).

Gates: couple-pin OK; fingerprint integrity has 4 pre-existing errors (identical before/after this change).
