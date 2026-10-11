# New drivers — 2026-10-11

Two lost-couple leads had no existing driver that fits, so each got its own driver on its own prep
branch. That way the master worker can publish them one at a time, and if Athom rejects one, the other
is not affected. The text below is our own write-up. Device facts come from the community sources
credited for each driver.

## valve_controller_5zone — AutomatOn AUT000069

- **Couple (exact only):** `_TZ3000_j0ktmul1` + `TS011F`. It was previously on `usb_dongle_triple` by
  mistake; it now has a curated removal from there.
- **Device:** a mains-powered controller for 5 underfloor-heating or irrigation valve zones. Each zone
  is a plain ZCL on/off endpoint (EP1–EP5). After the Tuya "magic packet" on configure, on/off
  reporting is bound per endpoint. No Tuya data points are needed.
- **Implementation:** the device class extends `UnifiedSwitchBase` with `gangCount = 5`. Capabilities
  are `onoff`, `onoff.gang2`…`onoff.gang5`, titled "Zone N".
- **Flow cards (en/fr/nl/de):** per zone, triggers `…_gangN_turned_on/off` (the naming the runtime
  trigger heuristics already fire), a condition "zone N is on", and actions on/off/toggle. There is
  also an "all zones off" action. Actions go through `triggerCapabilityListener`, so the command really
  reaches the device.
- **Branch:** `prep/new-driver-valve-controller-5zone`. Test:
  `test/critical/newdrv-valve-controller-5zone.test.js`.
- **Credit:** Zigbee2MQTT / zigbee-herdsman-converters `automaton.ts` (Koen Kanters and contributors,
  PR #5579, zigbee2mqtt #16992); lsroka76/Z2S_Library device database; wonjj6768 SmartThings edge
  drivers (`valves.lua`).

## remote_rgbcct_8zone — MiBoxer FUT089Z

- **Couple (exact only):** `_TZ3000_xwh1e22x` + `TS1002`. As you decided, the legacy `bulb_rgbw` entry
  stays until this driver is published and soaked; after that, a W4 move puts the couple on the remote
  only. Until then the dual claim is recorded as a reviewed exception in
  `data/native-matrix-reviewed-duals.json` and in the collision baseline. The pin and registry entry
  are deliberately postponed to the W4 move, because they would make automation strip the `bulb_rgbw`
  entry.
- **Device:** a battery RGB+CCT remote with 8 zones. It does not report state; it sends standard ZCL
  commands to Zigbee group base+N for zone N (factory base 100, so groups 101–108):
  onOff on/off, levelControl moveToLevel(WithOnOff), colorControl moveToColorTemperature and
  moveToHueAndSaturation, plus the Tuya scene command 0xFD on genOnOff.
- **Implementation:** native only. Battery comes from powerConfiguration. Bound onOff, levelControl and
  colorControl clusters live in `zone-commands.js`. The zone comes from the group id the frame was
  sent to (`meta.groupId`); a frame not sent to a group gives zone 0. A setting `zone_group_base`
  (default 100) covers remotes whose zones were re-mapped to other groups.
- **Flow triggers (en/fr/nl/de):** on, off, brightness (%), colour temperature (mired + warmth %),
  colour (hue °, saturation %), scene. Each trigger carries a `zone` token and a zone dropdown
  ("any" or 1–8) that the driver filters on.
- **Open point:** we have not yet confirmed that a real Homey receives this remote's group traffic.
  The library hands the group id to the handlers, but test it on real hardware during the soak, before
  the W4 move.
- **Branch:** `prep/new-driver-remote-rgbcct-8zone`. Test:
  `test/critical/newdrv-remote-rgbcct-8zone.test.js`.
- **Credit:** Zigbee2MQTT `miboxer.ts` (FUT089Z zone and group converters; Koen Kanters and
  contributors); u236/homed-service-zigbee; JohanBendz/com.tuya.zigbee#1361; zigpy/zha-device-handlers#1829.
  Ledron YK-16 (`_TZ3000_zwszqdpy`) is the same remote, but it is not added; that needs its own
  verification.

## Johan-only couples — verdicts (2026-10-11)

44 of the 52 Johan-only couples were still unplaced; the other 8 had been placed in the previous round.
Rule: we place a couple only when an independent source confirms the **same mfr + pid** and the same
device type. If the second source names a different pid, the Johan couple is not confirmed and nothing
is invented.

| Couple | Verdict | Source(s) | Action |
|---|---|---|---|
| `_TYZB02_key8kk7r` TS0043 | 3-button remote | ZHA ts0043 TuyaSmartRemote0043NO; deCONZ Tuya3gangMap | button_wireless_2 → button_wireless_3 |
| `_TZ3000_rrjr1q0u` TS0043 | 3-button remote | deCONZ Tuya3gangMap + wireless switch list | button_wireless_2 → button_wireless_3 |
| `_TZ3000_mugyhz0q` TS0207 | Tuya 899WZ leak sensor | Z2M TS0207_water_leak_detector | water_leak_sensor_tuya → water_leak_sensor |
| `_TZ3000_0s9gukzt` TS0207 | Nous E4 leak sensor | Z2M TS0207_water_leak_detector | water_leak_sensor_tuya → water_leak_sensor |
| `_TZ3000_zl1kmjqx` TS0201 | Temp/humidity sensor | Z2M IH-K009 / RSH-HS06_1; ZHA ty0201 | button_wireless_2 → climate_sensor |
| `_TZ3000_qeuvnohg` TS0121 | not confirmed | Z2M says **TS011F** DIN relay | none (pid differs) |
| `_TYZB01_iuepbmpv` TS0201 | contradicted | Z2M says **TS0121** MS-104Z switch module | none |
| `_TYZB01_ncutbjdi` TS0001/000F/0011 | not confirmed | Z2M says **TS0003** 1-gang module | none; follow-up: it sits on switch_2_gang |
| `_TYZB01_aneiicmq` TS0001/000F/0011 | not confirmed | Z2M says **TS0003** BW-SS7 1-gang | none; same follow-up |
| `_TZ3210_iystcadi` TS0505A | not confirmed | Z2M says **TS0505B** Lidl light bar | none |
| `_TZ3210_zxbtub8r` TS110F/TS0052 | not confirmed | Z2M says **TS110E** 1-ch dimmer | none; follow-up: this mfr is on presence_sensor_radar |
| `_TZ3000_saiqcn0y`, `_TZ3000_xr3htd96` TS0601 | not confirmed | Z2M/deCONZ say **TS0201** | none |
| `_TZ3000_18ejxno0` TS0042 | not confirmed | Z2M/deCONZ say TS0012 wall switch | none |
| `_TZ3000_qewo8dlz` TS0043 | not confirmed | deCONZ says **TS0013** wired 3-gang | none |
| 25 others (TS0042/43/44 buttons, e98krvvk, bagt1e4o, 6oabgtzv, s8r1qoyq, cehuw1lw, dku2cfsc, fjt5218m, 6g8b7at8, vzrytttn) | no second source | — | left as leads |

None of these needed a new driver: every confirmed couple fits an existing one.
