# Cap / Flow / DP / Cluster / RX-TX enrich — 2026-09-15 (P2518)

## Dual-app
**BOTH** — flow cards, DP RX maps, power_scale, EF00 valve clusters (reliability).

## Fleet results
| Area | Result |
|------|--------|
| Flow compose | **431/431** drivers · **5851** cards |
| Flow L99 | **0** fails (dups, integrity, coherence, harvest) |
| DP knowledge | **197/197** registry couples covered |
| Clusters | 35 compose / 44 lexicon · **0** missing |
| P2449 declared wire | PASS |
| Layer / L14 / ProtocolRxTx | PASS |
| Valve EF00 | `water_valve_smart` + `valve_dual_irrigation` → `[0,4,5,61184]` (no OnOff 6) |
| power_scale | **+59** metering drivers |
| wifi_ir titleFormatted | stripped (P2515/P2518) |

## RX fix (root cause)
`energy_meter_3phase` inherited plug `DP1→onoff`. Z2M ATMS100133Z / `a14rjslz`+`TS0601` uses **DP1=energy**. Now:
- DP1/24 → `meter_power`
- DP23 → `meter_power.exported`
- DP29 → `measure_power` (+ mirror `phase_total`)
- phase scalars 103–114 → V/A/phase power
- `mainsPowered` + strip phantom battery reporting

## Soft remaining
DP audit still lists Z2M soft gaps (presence radar extras, packed DP6 phase buffers). Not inventing capabilities without Homey UI targets.

## Gates
`npm run check:p2518` · `check:p244x` · `check:p2500` · `check:p2517`

## No forum POST
