# Battery multi-button remotes — TS0041 / TS0042 / TS0043 / TS0044 / TS004F

> P2249 investigation (Peter smartbutton + Zemismart/Moes wall remotes).
> Sacred couple = **manufacturerName + productId** only. Never invent a pid.

## What these devices are

| Pid | Buttons | Role | Homey drivers |
|-----|---------|------|----------------|
| **TS0041** | 1 | Battery scene remote | `button_wireless_1`, `button_wireless_4_ts0041` |
| **TS0042** | 2 | Battery scene remote | `button_wireless_2` |
| **TS0043** | 3 | Battery scene remote (Zemismart ZM-ZS-3, Moes, Lonsonho, LoraTap) | **`button_wireless_3`** |
| **TS0044** | 4 | Battery scene remote (Moes ZT-SY, Lonsonho, Nedis) | **`scene_switch_4`** / `button_wireless_4` |
| **TS004F** | 4 / knob | Scene **or** dimmer (0x8004) | `button_wireless_4`, `smart_knob*` |

They are **end devices** (not routers). Presses arrive as **manufacturer OnOff cmd 0xFD** per endpoint (Z2M `tuya_on_off_action`), not as Homey native toggles.

## Locked couples (do not invent)

| Couple | Driver | Source |
|--------|--------|--------|
| `_TZ3000_a7ouggvs` + **TS0043** | `button_wireless_3` | DEVICE_TRUTH zemismart-ts0043 |
| `_TZ3400_key8kk7r` + **TS0043** | `button_wireless_3` | Blakadder ZM-ZS-3 |
| `_TZ3000_bczr4e10` + **TS0043** | `button_wireless_3` | INT-170 |
| `_TZ3000_zgyzgdua` + **TS0044** | `scene_switch_4` | meter91 / INT-015 Moes |
| `_TZ3000_wkai4ga5` + **TS0044** | `scene_switch_4` | Z2M Moes white-label |
| `_TZ3000_xffhmvhv` + **TS004F** | `button_wireless_4` | Nobø — **no** 0x8004 |

## Recurring failure modes (community + our diags)

1. **Wrong driver** — TS0043/44 stolen by `button_wireless_2` / wall_switch / switch_1gang (fixed P2249: strip pids).
2. **0x8004 scene write** on TS0041–44 — attr 32772 unsupported → physical press dies (DeviceOperatingMode + wake skip).
3. **First press ignored after sleep** — missing Tuya genBasic **0xFFDE=0x13** setup (HA thread + Z2M configureMagicPacket) → P2249 magic write.
4. **Missing 0xFD BoundCluster** — Homey SDK drops mfr cmds; PhysicalButtonMixin OnOffBoundCluster + raw catcher.
5. **Peter couples ABSENT** — next diag must show `[BUTTON-WAKE] mfr=… pid=…` (FleetIdentityLog).

## Runtime path (Homey)

```
wake/announce → TuyaMagicPacket (read 0xFFFE + write 0xFFDE=0x13)
             → bind genOnOff EP1..N
             → OnOffBoundCluster handleFrame 0xFD → pressType
             → FlowCardHeuristics declared-only trigger
```

## User action

Update Test build → **remove + re-pair** remotes that still show as 1-gang/2-gang wall switch.
Hold bottom-left (TS0044) or left button ~10s for pairing (Z2M notes). Fresh CR2032 required.

## Do not

- Invent manufacturerName/productId from retail SKU alone.
- Glue Peter SOS/contact mfrs onto TS004x.
- Force EF00 TX on these ZCL remotes.
