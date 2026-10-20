# Daily resume 2026-10-20 — workstream B (device research and fixes)

Branch: `master` (`com.dlnraja.tuya.zigbee`, 9.0.x). Change number: **P2910**. All text below is our own wording;
upstream items are cited by number, link and author only.

## 1. `_TZ3000_rco1yzb1` / TS004F — single click, click window, triple click

Upstream: [JohanBendz/com.tuya.zigbee#423](https://github.com/JohanBendz/com.tuya.zigbee/issues/423) (reporters
RogerGorissen, Tanjis, fransjvos; maintainer Johan Bendz, Batch 89b) and the merged enhancement
[#424](https://github.com/JohanBendz/com.tuya.zigbee/issues/424) (RogerGorissen). Device identity: Lidl/Silvercrest
one-button remote HG08164 in Zigbee2MQTT `lidl.ts` (actions on/off/step/single/double), single endpoint in the
interview posted on #423.

What we already had (driver `button_wireless_4`):
- P2790 quirk `rco1yzb1_single_click_missing` (`lib/data/firmware-quirks.json`): On and Off both mean one press.
- P2798 optional setting `click_window_ms` (0 = off) with `lib/utils/ClickAggregator.js`.

What was wrong: both were wired on `cluster.on('commandOn'|'commandOff')`. zigbee-clusters only emits `attr.*`
events on a cluster, and remote→Homey On/Off frames go to the bound cluster or to the raw L1 path
(`PhysicalButtonMixin.onZigBeeMessage`, every On/Off/Toggle = single). So the window never ran in practice, and a
real double click on this firmware produced two singles.

Fix (P2910, additive):
- `lib/utils/ClickWindowAuto.js`: decides per device and per button. Explicit `click_window_ms` > 0 always wins.
  With the setting at 0 the window turns on **only** when (a) the exact couple carries the `onoff_commands_single`
  quirk, (b) a Flow uses a double or triple card for that device and that button
  (`FlowCardTriggerDevice.getArgumentValues(device)`, cached 60 s, reset on the card `update` event), and (c) the
  remote has not sent native press frames (0xFD scene mode or E000), because then the firmware counts clicks itself.
  Otherwise single presses stay immediate.
- `drivers/button_wireless_4/device.js`: `onZigBeeMessage` override counts On/Off/Toggle presses (350 ms per-command
  duplicate filter, same as the parent path) only while a window is in effect, then emits single / double / triple
  once; everything else goes to the parent path unchanged. Timers and Flow hooks are released in `onUninit` and
  `onDeleted`. The older cluster-event listeners stay as a complementary layer.
- Default auto window 600 ms (clamped 150–2000 ms); users can still set their own value for slow clickers.
- Test: `test/critical/p2910-click-window-auto.test.js`.

User action: none (no re-pair). Single click works as before; double/triple become available automatically once a
Flow uses them. Remaining: physical confirmation on the exact hardware (same open acceptance as upstream #423 A/B).
Note: Z2M describes this couple as a one-button remote while it lives on the 4-button driver; not moved today
(paired devices work through endpoint 1), kept as a lead.

## 2. Johan closed items (last ~60 days) and Batch comments

The scanner `scripts/scanners/johan-canonical-index.js` already parses closed and duplicate items and the
"Batch NN" consolidation comments (cursor 2026-10-19 09:17 UTC; 457 items closed since 2026-08-20, 363 with
identities). Cross-check against all driver fingerprints left 5 exact couples with no home driver; 4 were placed:

| Couple | Driver | Source (one reliable source each, W4) | Upstream |
|---|---|---|---|
| `_TZ3000_ee8nrt2l` / TS0044 | `button_wireless_4` | Z2M `tuya.ts` TS0044 white-label LoraTap SS6400ZB (4-button) | #1159 (canonical #941) |
| `_TZ3000_5ftkaulg` / TS0011 | `switch_1gang` | ZHA quirks issue zigpy/zha-device-handlers#2090 signature; homed-service-zigbee#146 | #1178 |
| `_TYZB01_0aps0h1r` / TS0212 | `co_sensor` | Homey interview on #977 (Alecto SMARTCOA10, IAS zone type CO) | #977 / #513 |
| `_TYZB01_o7m83470` / TS0212 | `co_sensor` | SmartThings Edge driver by Mariano_Colmenarejo (Nedis CO sensor) | #977 / #513 |

`co_sensor` gains productId TS0212 and clusters 1/1280 on EP1; its IAS path already maps alarm 1 to `alarm_co`
(`DRIVER_TYPE_ZCL_MAPPINGS.co_sensor`). The makers above were also listed on unrelated drivers whose productIds
never matched the real device (button_wireless_2, smoke_sensor2, climate_sensor); those entries were moved to
`lib/data/dual-couple-legacy.json` so no new dual couple appears (native-matrix gate). Paired devices are not touched.

Still a lead: `_TZ3000_amal63is` / TS0002 (#128 Batch 105) — no external source found.

## 3. Sweep checkpoint chunk (30 oldest needs-info, upstream issues 2020–2024)

`data/leads/sweep-checkpoint.json`: this chunk resolved 30 needs-info items (435 → 405 at start of day). The automatic history-sweep run of 2026-10-20 (`fcc664d8cc`) added new items meanwhile, so the file now holds **476** needs-info (506 before this chunk). Result: 1 fixed, 7 already fixed (with SHA), 22 no
action (no identity, platform or other-app problems). Details are in the checkpoint `lastChunk` and the ledger.

Fixed from #127 (jellelambers, martijnpieters; "all sockets switch together"): Lidl HG06338 3-socket strip, Z2M
`lidl.ts`. `_TZ3000_vmpbygs5` sat on `button_wireless_2`, `_TZ3000_oznonj5q` on `switch_1gang`, `_TZ3000_wzauvbcs` on
both `button_wireless_2` and `socket_power_strip`. All three now pair only on `socket_power_strip` (EP1–3 each bound
to OnOff). Users with such a strip paired on the old drivers must **re-pair** it to get three separate sockets.

Already fixed (evidence): `_TZ3000_w0qqde0g`/TS011F (#133, b9a5f7aa9d), `_TZ3000_iedbgyxt`/TS0001 valve (#349,
1bd93aa131), IH-K009 TS0201 family (#237), `_TZ3000_amdymr7l`/TS011F BW-SHP13 (#221, 1bd93aa131),
`_TZ3000_gvn91tmx`/TS011F read from the screenshot on #338 (1bd93aa131), ZG-204ZL (#347, 7b64ef71f1).

## Gates

Node 22: `npm test` (only pre-existing failure: p2383 setup-node@v5 check on `fleet-intelligent-enrich.yml`, also red
on the base commit), `homey app validate --level publish` OK, rules gates OK, couple-pin gate OK, dual-couple legacy
check OK. Floor in `p2636` lowered 380 → 375 for the documented moves (unique makers 95, unchanged guard).
