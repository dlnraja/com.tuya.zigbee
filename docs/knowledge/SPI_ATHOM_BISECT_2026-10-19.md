# led_controller_spi_tuya — Athom AggregateError bisect (19/10/2026)

Why: Athom processing fails with AggregateError every time this driver is in the master payload
(#3630 v9.0.1549, #3632 v9.0.1551, #3633 v9.0.1552, #3634 v9.0.1553), while #3631 v9.0.1550 without it
reached Test. The same driver ships fine in the Bastien app. The user approved (19/10 23:12 Paris) an
exception to additive-only for this never-published driver: one removal per one-shot, stop at the first Test.

Static findings before the bisect:
- Images 75x75 / 500x500 like led_controller_rgb; icon identical to Bastien; learnmode/metadata patterns common.
- Couple duplicates also exist on Bastien (switch_1gang), which publishes -> not the cause by themselves.
- Size is not the cause: valve_controller_5zone (+31 flow cards) reached Test first try (#3635 v9.0.1554).

| Step | Change | One-shot run | Build | Result |
|---|---|---|---|---|
| 1 | drop never-fired trigger led_controller_spi_tuya_brightness_changed (flow compose = Bastien empty form) | 39326655463 (+ retries 39328676023, 39331643608) | #3637 v9.0.1556, #3638 v9.0.1557, #3639 v9.0.1558 | AggregateError x3 -> not the cause |
| 2 | + drop light_temperature, light_mode from the manifest (= Bastien caps onoff/dim/light_hue/light_saturation; device code keeps CT support via DP4 when the capability exists) | 39334371872 (+ retries 39335672791, 39338314235) | #3640 v9.0.1559, #3641 v9.0.1560, #3642 v9.0.1561 | AggregateError x3 -> not the cause |
| 3 | + keep only the 4 base mfr ids (_TZE204_8fffc3kb, _TZE284_gt5al3bl + lowercase). Removed: 6 upper-case variants (matching is case-insensitive) and _TZE28C1000000_gt5al3bl (4 case forms), which stays on led_controller_rgb | 39340778213 (+ retries 39343027778, 39345805168) | #3643 v9.0.1562, #3644 v9.0.1563, #3645 v9.0.1564 | AggregateError x3 -> not the cause |

## Conclusion (20/10/2026, Paris)

Conclusive: 9/9 builds with the driver failed (AggregateError) across all three removals, while builds without it
reach Test. The cause is not in this driver's own files (manifest, flow cards, capabilities, manufacturer ids);
it is how Athom processes a new driver id in the master app, which this repo cannot see. No more SPI builds are dispatched.

Resolution (user decision 20/10 02:00): the devices keep working through the fold in place since 10/10
(c5def1c840): `led_controller_rgb`, already in Test, lists all 12 manufacturer spellings, and `onMapDeviceClass`
(lower-case match) gives them `lib/devices/LedControllerSpiTuyaDevice.js`, the DP1/2/3/4/61 single-frame class.
Colour temperature and light mode are in the rgb manifest and only register on the device when the capability
exists; other RGB devices keep their default class (test/spi-fold-routing.test.js). The separate
`drivers/led_controller_spi_tuya` was removed from master and taken out of `config/publish-hold-drivers.json`
(`_folded`). It never shipped, so no paired device depends on it. The extra "SPI minus another recent driver"
build was skipped: Athom would only report the same opaque AggregateError, and the devices already pair on the
published host. Credit: DP layout from zigbee-herdsman-converters gledopto.ts GL-SPI-206P (Koen Kanters and contributors).

Outcome: master #3646 v9.0.1565 and #3647 v9.0.1566 reached Test after the removal (fold 896ea9f61f). CSV error kind fixed by P2901 (dc3ab1df91): #3645 recorded `AggregateError`.
