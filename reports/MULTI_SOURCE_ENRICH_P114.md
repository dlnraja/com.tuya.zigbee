# P114 — Multi-source enrich + DeviceIO RX/TX

Date: 2026-08-11 · Version: 9.0.474

## Goal

Recover new devices / FPs from all local source state (forum, Gmail, Blakadder,
sacred lots, infer-enrich), reinforce high-confidence couples, harden RX/TX on
`DeviceIOFacade`, and automate the closed loop in CI.

## Source coverage (orchestrator snapshot)

| Source | Status |
|--------|--------|
| Gmail unique FPs | 612 / 612 present in drivers |
| Forum silent digest | 24 actionable, 3 ambiguous new FPs (manual review only) |
| Sacred lot2 / lot3 | Applied (rehome/reinforce); mostly already present |
| Blakadder new | 0 pending candidates |
| Infer-enrich | 2 applied historically; 500 needs-review (not blind-applied) |

## Fingerprint reinforces (this pass)

- `curtain_motor`: `_TZE284_xtrnjaoz`, `_TZE200/204_fzo2pocs`, `_TZE200/284_xu4a5rhj` (+ case variants)
- `gas_sensor`: `_TZE200_chbyv06x`
- `wall_dimmer_tuya`: `_TZE284_bxoo2swd`
- `presence_sensor_radar`, `wall_thermostat`, `ceiling_fan`: sibling reinforces from KNOWN_ROUTES

Ambiguous forum Johan truncations remain **skipped** (not auto-applied).

## DeviceIO RX/TX

- `sendDP`: cluster `setData` / `writeData` / `datapoint` / `dataRequest` before raw frame
- `requestDP`: `MCUVersionHelper` nudge + retry before passive listen
- `readZcl`: `FallbackChains.readSensorWithFallbacks` (named → raw → optional DP)

## Automation

- New: `tools/ci/multi-source-enrich-orchestrator.js`
- Wired into `auto-enrich-closed-loop.js` phase `3a-multi-source-enrich`
- Wired into `.github/workflows/auto-enrich-closed-loop.yml` (apply when not dry-run)
- npm: `enrich:multi-source` / `enrich:multi-source:apply`

## Policy

- `FORUM_AUTO_POST=0`, `REPLY_TOPICS=140352` only
- No mass dump into `generic_tuya`
- Known routes + sacred lots only under `--apply`
