# User profile — Joep_Vullings

Forum topic: **T140352** · Posts: 1842, 2024, 2082, 2102, 2105, **2218**

## Couple
`_TZE284_fhvpaltk` + `TS0601` → **`valve_dual_irrigation`** (Insoma / SGW08 two-way)
Sibling: `_TZE284_eaet5qt5`+`TS0601`

## Interview (forum #2082 / #2024)
EP1 `inputClusters`: **`[0, 4, 5, 61184, 0, 60672]`** — **no OnOff (6)**

## Thread
| Post | Symptom | Fix |
|------|---------|-----|
| #1842/#2082 | Paired as dimmer / wrong caps | Dedicated dual valve driver |
| #2102/#2105 | Caps OK, buttons/flows weak | Flow wire + DP TX |
| **#2218** | Repair → **Unknown Zigbee** | **P2468**: compose required cluster **6**; device has none → Homey refuse match. Clusters now `[0,4,5,61184]`. Remove Unknown + re-pair under **Smart 2-Way Irrigation Valve** (Repair alone does not rematch). |

## User action (silent)
Update Test tip ≥ P2468 → remove Unknown → Add → Smart 2-Way Irrigation Valve.
