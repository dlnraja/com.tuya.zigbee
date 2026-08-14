# MULTI_SOURCE_SWEEP P132

Sequential follow-up after P131 (no multitask).

## Shipped
- fingerprint_lock: LockControlMixin + lock()/unlock() flow TX
- FlowGangControl: resolve onoff.N vs onoff.gangN
- ActuatorFlowHelper exported from lib/flow
- generate-flow-handlers: cover/lock/gang/alarm heuristics
- wall_thermostat: target_temperature UI 5-35 / 0.5
- scene/button/knob drivers: Homey class button (was sensor)
- climate_sensor_dimmer + dimmer_air_purifier: UnifiedLightBase (was log-only DP dump)
- hybrid_heater_thermostat: DeviceIOFacade/sendTuyaCommand TX (sendTuyaDataPoint was dead)

## Version
9.0.500
