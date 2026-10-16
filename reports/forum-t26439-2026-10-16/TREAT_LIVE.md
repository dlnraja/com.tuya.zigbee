# T26439 Johan thread inspire — around #5520 (silent)

SHADOW only — no forum POST. Tip target **9.0.1476** (P2827).

Source: [T26439 #5520](https://community.homey.app/t/app-pro-tuya-zigbee-app/26439/5520) + posts #5515–#5535 + Johan GH #1108/#986/#1456.

## Harvest → enrich

| Post | Signal | Our action |
|------|--------|------------|
| #5520 FrankP | TS0042 2-gang wall remote works (Johan 0.3.0) | Harden `wall_remote_2_gang` clusters (1+6+57344); lock `tzvbimpq`+TS0042 → `button_wireless_2` |
| #5516/#5519 Axel | `_TZE284_nqqylykc`+TS0601 dimmer | Already `wall_dimmer_tuya` + brightness 0–1000; registry P2827 |
| #5524–#5526 Peter | LCD battery + clock images | Covered by LCD forceTimeUpdates / battery path (9ern5sfh family) |
| #5528–#5531 Maarten | 2-gang curtain gang2 regression | Existing `curtain_module_2_gang` subdevices — soak tip |
| #5532 Mates | `_TZ3000_qja6nq5z`+TS004F knob | Already `smart_knob_rotary` P2448 |
| #5534 Dragan | `_TZE200_crq3r3la` CK-BL702-MWS-01(7016) | Already `presence_sensor_radar` + settings; registry P2827 |
| #5535 Kizabgd | `_TZE284_9em5sfh` LCD | **OCR typo** of `9ern5sfh` — do **not** invent; keep lcd exclusive |

## Images / links

- Peter screenshots (LCD battery `?` → fixed after Johan tip) — inspire battery UI soak, no invent couple
- Johan #1108 Avatto dimmer interview `_TZE204_nqqylykc`+TS0601
- AliExpress / smarterhomeshop links in GH bodies — credit ideas only, no copy

## User action (no reply)

Update Universal Tuya Test ≥**9.0.1476**. TS0042 remotes: prefer **Wireless Button 2** / wall remote; re-pair after tip. Radar: pair `presence_sensor_radar` for settings (not Homey generic).
