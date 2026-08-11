# P113 — Publish / diag monitor / backlog finish + repush

## Version
9.0.472

## Verified
- GitHub Pages dashboards: https://dlnraja.github.io/com.tuya.zigbee/dashboards.html (HTTP 200)
- Site root: https://dlnraja.github.io/com.tuya.zigbee/ (HTTP 200)
- wifi.html: HTTP 200
- Fetch Homey Diagnostics / Gmail / Forum / Enrich relaunched

## Finished this pass
1. `smoke_sensor` + `smoke_sensor3` migrated bare ZigBeeDevice → TuyaZigbeeDevice (DeviceIO + IAS enroll + L14)
2. Removed both from `bare-zigbee-allowlist.json`
3. `ensureTuyaCluster` now prefers `ensureTuyaClusterCompensated`
4. Interview IAS also triggers for `alarm_gas` / `alarm_fire`

## Publish
Auto-Publish on Push + Auto-Fix+Publish pipeline triggered on push; Homey Test channel via Athom bot after gates.
