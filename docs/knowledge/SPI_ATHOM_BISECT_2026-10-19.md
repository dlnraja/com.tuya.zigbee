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
| 1 | drop never-fired trigger led_controller_spi_tuya_brightness_changed (flow compose = Bastien empty form) | pending | | |
