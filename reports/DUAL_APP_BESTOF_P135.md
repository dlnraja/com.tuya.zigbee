# DUAL-APP BEST-OF P135

## Apps
| App checkout | Branch | Version |
|---|---|---|
| `homey/master` | `master` (Test) | 9.0.504 → next |
| `homey/stable` | `stable-v5` (Live) | 5.12.68 |

## Best-of transfers (reliability only)
### master → stable
- `climate_sensor_zt08` thin driver (#513 pairing)
- Strip `hodyryli` from bloated `climate_sensor`
- TS004F remotes → `button_wireless_4` (not `switch_1gang`)
- `iadro9bf` → `presence_sensor_radar`
- Anti-bot gate updated from obsolete P93 → P129/P133

### stable → master
- Already had DeviceIOFacade / humidity / gates; P52 sync kept LowLevelBridge FPs flowing
- No feature managers backported the other way

## Diags run (master)
- voice / athom / flow-dups / unbound / anti-bot / bare / double-division / gmail-crash → OK
- Homey device diag: skipped (no HOMEY_PAT locally)
- Athom build diag: build #2807 UNKNOWN (timeout; no error pattern)
- Dashboards: hub 6/6 + master-dashboard Health **93/100** (431 drivers)

## Publish
- master 9.0.504 Auto-Publish: **success**
- stable 5.12.68: push + publish next
