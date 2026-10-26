# P3065 — Flow uplift: decisions table

Scope: driver flow cards (`drivers/*/driver.flow.compose.json`, which is what `homey app build`
ships; a `flow` block in `driver.compose.json` is ignored when the flow file exists).
Rules: additive, user-facing card ids never renamed, nothing mandatory at pairing, combo budget untouched.
Gate: `test/critical/p3065-flow-card-consistency.test.js` (ratchet, lists may only shrink) +
`test/critical/p3065-flow-i18n-ratchet.test.js`.

Sources: Homey Apps SDK v3 docs, "Flow" guide (titleFormatted is for `[[arg]]` placeholders; tokens are
shown as droptokens, not in the title) — https://apps.developer.homey.app/the-basics/flow and
https://apps.developer.homey.app/the-basics/flow/arguments ; card layout ideas credited to Johan Bendz's
original com.tuya.zigbee app (https://github.com/JohanBendz/com.tuya.zigbee).

| # | Finding | Decision | Why | Branches |
|---|---------|----------|-----|----------|
| D1 | 15 arg-less triggers (button scene recall, wall remote press/multi/scene, smart knob) had a `titleFormatted` with `[[token]]` / `({token})` that are tokens, not args → the card showed raw `[[scene_id]]` | Remove `titleFormatted` on those arg-less triggers only; `title` + tokens unchanged; ids unchanged | SDK: titleFormatted placeholders must be args; without args `title` is the right field. Lossless for flows (tokens still offered) | master (UI), port after soak |
| D2 | `button_wireless_smart` titles contained U+FFFD (`sc�ne`) and de/nl "recall" | Restore `scène`; de "Taste N: Szene abgerufen", nl "Knop N: scène opgeroepen" | Data corruption fix + own-words labels; test forbids U+FFFD in flow files | master; data fix eligible for stable/bastien if the file matches |
| D3 | 9 duplicate flow ids: `air_purifier_curtain`, `curtain_motor_tilt` (calibrate/reset_position/hold/open_partial) and `sensor_gas_presence` (run_self_test) had a second copy in `driver.compose.json` `flow`, shadowed by `driver.flow.compose.json` (never shipped). | Shipped cards win (they already carry fr/de/nl, valid args, and the dropdown ids `all/gas/co` that `driver.js` handles). The only extra the shadow copies held was a `hint` on calibrate/reset/hold: merged into the shipped cards (en/fr/nl kept, de written). Shadow blocks then removed. Not adopted: shadow `range` arg for open_partial (would change the arg widget of existing flows) and shadow `smoke/co/all` dropdown (`smoke` is not a gas-sensor test). Ids unchanged, so existing flows keep working. | Ratchet duplicateIds 9→0 + hint/no-shadow test |
| D4 | 17 undeclared `get*Card('id')` refs (generic triggers called from lib helpers: FlowTriggerHelpers, battery engines, DeviceHealth, GreenPowerManager, BaseTuyaDPDevice, unused SmartButtonRouter) | Keep them guarded, do not declare. Audit: every call site is inside try/catch or uses `?.`/`safeFlowCard`/`_safeGetCard`, so a missing card is a no-op, never a crash. Declaring 17 generic cards would create twins of the per-driver cards (e.g. `<driver>_battery_low`) and grow app.json; users already get the driver-scoped cards. | Ratchet now freezes the id SET (no new undeclared id, even if the count stays 17) and fails on any unguarded literal call to one of them (probe-tested) | master |
