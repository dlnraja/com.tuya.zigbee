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
| D3 | 9 "duplicate ids" = copies in `driver.compose.json` `flow` shadowed by the flow file (air_purifier_curtain, curtain_motor_tilt, sensor_gas_presence) | Pending: keep the shipped card; only drop the shadowed copy when it is a strict subset (nothing lost) | Never rename/lose a user-facing id | master |
| D4 | 17 undeclared `get*Card('id')` refs (generic triggers in lib helpers) | Pending: keep guarded (try/catch), no new app-level duplicates of driver cards | Declaring 17 generic app cards would create ambiguous twins of driver cards and grow app.json | master |
