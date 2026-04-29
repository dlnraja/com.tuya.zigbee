#  TUYA DP MASTER SKILL

> Intelligent DP mapping and protocol detection.

##  DP Detection Logic

### 1. The 56-Year Sleepy Bug
Tuya devices reporting `0x000000000000` as time must be ignored to prevent 1970/2026 epoch collisions.

### 2. Standard DP Mappings
- `DP 1`: Standard Switch
- `DP 4`: Presence/Motion
- `DP 18/19/20`: Energy (W/mA/kWh)
- `DP 38`: External Temperature Probe

### 3. Smart-Adapt Logic
If an unknown DP is received:
1. Log to `UnknownDeviceHandler`.
2. check `universal_atlas.json` for community mappings.
3. If no match, register as `tuya_dp_received` generic flow card.

##  Optimization
- Use `LogBuffer` for high-frequency DP change monitoring.
- Batch updates for energy meters to save Homey CPU cycles.
