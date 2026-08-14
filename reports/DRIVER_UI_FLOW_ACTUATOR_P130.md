# DRIVER_UI_FLOW_ACTUATOR_P130 — 2026-08-14

Continues after P128/P129 (TS004F). Mid-pass overlap: **P131** (v9.0.499 flow listeners) and **P132** (v9.0.500 lock TX / UI class / heater DP). This ship completes remaining sensor condition stubs + hybrid heater flow listeners as **v9.0.501**.

## Scope honesty

Cannot redesign UI for all 430 drivers in one pass. Maximized:

| Axis | Result |
|------|--------|
| A Actuator control + flow cards | Shared `ActuatorFlowHelper` + `LockControlMixin`; dead TX paths fixed |
| B Missing assets/caps | Fleet has icon/small/large (0 missing); fixed wrong Homey `class` on remotes; thermostat `capabilitiesOptions` |
| C Multi-protocol fallbacks | Locks + hybrid heater: `io.sendDP` → `sendTuyaCommand` → ZCL |
| D CI / generators | `generate-flow-handlers.js` no longer emits silent `TODO` stubs for covers/gangs/alarms/locks |
| E Sources | Cross-ref used existing audit tools; forum stayed silent |

## Coverage stats

| Metric | Value |
|--------|------:|
| Drivers total | 430 |
| Actuator-class drivers (approx) | ~296–337 |
| `return true // TODO` action/condition stubs | **0** (was 40+) |
| Wrong Homey class remotes fixed | 11 (`sensor`→`button`/`socket`) |
| Dead `xlarge.png` refs (fleet) | 242 — **deferred** (regenerate via `generate-driver-images.js` later) |
| Gates | anti-bot PASS · adaptive-double-division hard PASS · unbound-catch 0 · fp-collision 0 · bare-zigbee 0 violations · gmail-crash ok |

## What was fixed (this pass + retained from P131/P132 overlap)

### Shared infrastructure
- `lib/flow/ActuatorFlowHelper.js` — `triggerCapabilityListener` + sync + gang/cover helpers
- `lib/mixins/LockControlMixin.js` — writable `locked` with EF00/ZCL fallbacks
- `lib/drivers/FlowGangControl.js` — resolve `onoff.N` **and** `onoff.gangN`
- `tools/ci/generate-flow-handlers.js` — infer cover/gang/child_lock/lock/alarm/feed; no TODO stubs

### High-impact device TX
- `climate_sensor_dimmer`, `dimmer_air_purifier` — rebase onto `UnifiedLightBase` (were log-only)
- `hybrid_heater_thermostat` — replace non-existent `sendTuyaDataPoint` with `_sendHeaterDp` (IO façade) + flow listeners
- `lock_smart`, `fingerprint_lock` — LockControlMixin + flow uses `lock()`/`unlock()`; condition reads `locked` not `onoff`

### Flow cards (P131 + P130)
Curtains, siren, Sonoff multi-gang WiFi, wall thermostat child-lock, pet feeder feed, dimmer 0-10V / 4ch, outdoor 2-socket, bulb_white ID prefix, device_plug_smart (was `const card = null`), radiator_controller turn_on/off/temp, hybrid heater onoff/mode/temp, sensor alarm conditions (smoke/water/motion/door), thermostat mode_is.

### UI / compose
- Scene switches / SOS / knobs → `class: button`
- Wireless valves → `class: socket`
- `wall_thermostat` `capabilitiesOptions.target_temperature` min/max/step
- `boiler_switch_energy` — remove `_hybrid_*_needs_device_assignment` placeholders

## Top gaps remaining

1. **IR blaster** — code DB / learn flow still incomplete vs Z2M
2. **242× dead `images.xlarge`** — strip or regenerate fleet-wide
3. **door_controller / garage** — `locked` vs plug-base mismatch (next pass)
4. **Franken hybrids** (`device_air_purifier_water` phantom onoff/dim) — prune caps
5. **#513** `_TZE284_hodyri` — leave open pending user confirm
6. **WiFi local-first** actuators — Sonoff paths improved; full local bridge coverage still uneven
7. **auto-fix-all** can regenerate stub drivers — prefer generator inference (hardened here)

## Verify & ship

- Version: **9.0.501**
- Commit: `d2af07d22`
- Branch: `master` only (no stable-v5 push)
- Forum: silent enrich only
- Related: P131 flow listeners · P132 lock/gang/heater TX · this P130 sensor conditions + hybrid flow hardening
