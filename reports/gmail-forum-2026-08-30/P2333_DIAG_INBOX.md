# P2333 — Homey diagnostic inbox (Aug 26–30)

Silent only. Source: Gmail Homey Diagnostics Reports (MCP).

## Diags ingested

| Log ID | User / topic | Couple / driver | Finding |
|--------|--------------|-----------------|---------|
| `60959c24` | PresentSky dimmer | `_TZE284_m1cvyneb` → `wall_dimmer_tuya` | DP2 brightness routed as **humidity**; DynCap added `measure_humidity`; IEEE/404 TX on sibling tile |
| `a095345e` | #532 Only ON Mode | `wall_thermostat` FCU | DynCap mapped **DP36 valve → target_temperature=5** (tip was 9.0.699; race before dpMappings) |
| `c40705a1` | MOES 4-way | `_TZ3000_zgyzgdua` | Locked `scene_switch_4` (P2328) — needs **update Test + re-pair** |
| `7a6f2ca1` / `c137a5d7` / `e5d19878` | #533 curtain | Moes cover | Pairing clusters (P2329) — update + re-pair as Cover Controller |
| `4217d5e3` | presence 24G | `_TZE204_clrdrnya` | Already on `presence_sensor_radar` — update + re-pair |
| `4b1a0dc9` / `95a7c6e5` | Peter Smartbutton | `mrpevh8p`+TS0041 | No 0xFD in window; battery strip noise — P2285+ stack; water 3315-S false MISATTR already fixed P2282 |

## Code fixes (BOTH)

1. **TuyaEF00Manager** — dimmer drivers: never map DP2→humidity; honor `internal`/`skip` dpMappings; context `dim` for DP2.
2. **wall_dimmer_tuya** — explicit `dpMappings` + strip phantom climate caps + `_dynCapBlockDps`.
3. **DynamicCapabilityManager** — hard-reserve thermo DP36 + dimmer DP1/2; `purgeDriverOwnedDiscoveries()`; persist cleaned store.
4. **wall_thermostat** — reserve DP36 **before** FCU arm; purge dyn-cap after map install.

## User action (silent)

Update Homey Test tip (≥9.0.727), remove/re-pair affected tiles when still wrong driver.
