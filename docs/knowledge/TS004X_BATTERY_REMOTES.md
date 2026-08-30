# Battery multi-button remotes — TS0041 / TS0042 / TS0043 / TS0044 / TS004F

> P2249 + **P2253** (hybrid RX/TX wrappers, scene mode, blue LED, 5.x regression path).
> Sacred couple = **manufacturerName + productId** only. Never invent a pid.

## What these devices are

| Pid | Buttons | Role | Homey drivers |
|-----|---------|------|----------------|
| **TS0041** | 1 | Battery scene remote | `button_wireless_1`, `button_wireless_4_ts0041` |
| **TS0042** | 2 | Battery scene remote | `button_wireless_2` |
| **TS0043** | 3 | Battery scene remote (Zemismart ZM-ZS-3, Moes, Lonsonho, LoraTap) | **`button_wireless_3`** |
| **TS0044** | 4 | Battery scene remote / scene switch (Moes ZT-SY, Lonsonho, Nedis) | **`scene_switch_4`** / `button_wireless_4` |
| **TS004F** | 4 / knob | Scene **or** dimmer (**0x8004** only here) | `button_wireless_4`, `smart_knob*` |

They are **end devices** (not routers). Presses arrive as **manufacturer OnOff cmd 0xFD** per endpoint (Z2M `tuya_on_off_action`), not as Homey native toggles.

## Protocol mix (P2253) — support ALL layers

Homey native Zigbee does **not** cover every path. Runtime keeps **parallel** wrappers:

| Layer | Path | Role |
|-------|------|------|
| Native ZCL | genOnOff / scenes / levelControl cmds | Some firmwares / TS004F command mode |
| Tuya Zigbee mfr | genOnOff **0xFD** BoundCluster + raw catcher | Dominant press path (TS0041–44) |
| E000 | cluster 0xE000 BoundCluster | Alternate button encoding |
| EF00 | 0xEF00 **RX listen only** | Hybrid DP remotes; **never force EF00 TX** on pure ZCL |
| Magic | genBasic **0xFFDE=0x13** | First-press-after-sleep fix |
| Scene attr | genOnOff **0x8004** | **TS004F only** — TS0041–44 reject → kills presses |

`IntelligentProtocolDetect` → HYBRID listen + cascade; `HomeyCompensationLayer` queues magic for TS0041–44 **without** `ts004f_scene_mode`.

## Scene mode vs dimmer

| Pid | Software 0x8004? | Homey `button_mode` |
|-----|------------------|---------------------|
| TS0041–44 | **No** (`writeSceneAttr: false`) | Default **scene** (UI hint only) |
| TS004F | Yes (0=dimmer, 1=scene) | Auto / scene / dimmer writes attr |

Hardware scene/dimmer toggle on some TS004F: hold buttons 2+4 ~6s (Z2M).

## Blue LED (if present)

**Not** a Homey-controllable backlight / DP. Observed behaviour (Z2M #8072 class + forum):

- Short flash on **pairing / wake**
- Blink = **left network** / rejoin needed — not a setting

Do not invent a LED capability or write backlight DPs on these remotes.

## Locked couples (do not invent)

| Couple | Driver | Source |
|--------|--------|--------|
| `_TZ3000_a7ouggvs` + **TS0043** | `button_wireless_3` | DEVICE_TRUTH zemismart-ts0043 |
| `_TZ3400_key8kk7r` + **TS0043** | `button_wireless_3` | Blakadder ZM-ZS-3 |
| `_TZ3000_bczr4e10` + **TS0043** | `button_wireless_3` | INT-170 |
| `_TZ3000_zgyzgdua` + **TS0044** | `scene_switch_4` | meter91 / INT-015 Moes |
| `_TZ3000_wkai4ga5` + **TS0044** | `scene_switch_4` | Z2M Moes white-label |
| `_TZ3000_xffhmvhv` + **TS004F** | `button_wireless_4` | Nobø — **no** 0x8004 |
| `_TZ3000_mrpevh8p` + **TS0041** | `button_wireless_1` | Z2M SH-SC07 / Johan #1120 / Peter #2202 — **P2285** |
| `_TZ3000_5bpeda8u` / `_TZ3000_b4awzgct` + **TS0041** | `button_wireless_1` | Z2M SH-SC07 siblings (not 4_ts0041) |

## Architecture deep-dive — `_TZ3000_mrpevh8p`+`TS0041` (P2285)

| Layer | Reality (cross-ref) |
|-------|---------------------|
| Identity | Sacred couple only. Retail: SH-SC07 / RSH-SC021. Z2M whitelabel PR #6225. |
| Interview | EP1: clusters **0,1,6,E000**; out 25,10. EP2–4: phantom OnOff/power (battery 253 junk). |
| RX press | Dominant: genOnOff **mfr cmd 0xFD** data[0]=0 single / 1 double / 2 hold (Z2M `tuya.fz.on_off_action`). |
| Bound | `OnOffBoundCluster.handleFrame` + raw `wrapHandleFrame('physical-onoff-fd')` |
| E000 | Present on EP1 — cascade Bound when profile.usesE000 |
| EF00 | **Absent** — never force EF00 TX; IO passive wrap must not orphan 0xFD |
| TX wake | `configureMagicPacket` / `sendTuyaMagicPacket` (0xFFDE=0x13) on init + announce |
| Forbidden TX | **0x8004** scene attr — kills presses on TS0041–44 |
| Battery | EP1 only; ZCL 0–200; **never** configure battery reporting (Z2M #8072 mesh death) |
| Flows | `button_wireless_1_button_1gang_button_{pressed\|double_press\|long_press}` |

Known external bugs: Z2M interview fail (force re-pair); HA ZHA double-event “stuck” toggle; Domoticz momentary on→off race; fingerprints case `MRPEVH8P`→`switch_1gang` (fixed P2285).

## Why some users said 5.x “worked better”

Cross-ref (diags meter91 `55e3e591`, Nobø `9cbf9eb6`, forum #2189, git P2235/P2249):

1. Older 5.x paths were **less aggressive** on wake: fewer triple-writes of **0x8004** onto sleepy remotes that never implemented it.
2. Master briefly over-applied TS004F scene recovery to TS0044 → physical press died → fixed by family classification + wake skip.
3. Hybrid wrappers (0xFD BoundCluster + raw + magic) restore parity **and** keep multi-press scene behaviour without the bad TX.

## Recurring failure modes

1. **Wrong driver** — TS0043/44 stolen by `button_wireless_2` / wall_switch (P2249 strip pids).
2. **0x8004 scene write** on TS0041–44 — attr 32772 unsupported → press dies.
3. **First press ignored after sleep / pair** — missing **0xFFDE=0x13** (Z2M configure + HA “first action ignored”).
4. **Missing 0xFD BoundCluster** — SDK drops mfr cmds.
5. **Button order reversed** — use setting `reverse_button_order` (`scene_switch_4` / `button_wireless_3`).
6. **Peter couples ABSENT** — do not invent; wait for `[BUTTON-WAKE] mfr=… pid=…`.
7. **Late identity (P2298/P2316)** — `zb_manufacturer_name` lands minutes after init → re-arm 0xFD + magic.

## Runtime path (Homey)

```
wake/announce → TuyaMagicPacket (0xFFDE=0x13)
             → bind genOnOff EP1..N (+ scenes / E000 when present)
             → OnOffBoundCluster 0xFD + raw catcher + optional E000/EF00 RX
             → ButtonDevice.triggerButtonPress (+ reverse_button_order)
             → FlowCardHeuristics declared-only trigger
             → NEVER write 0x8004 unless family=ts004f
```

## User action

Update Test → **remove + re-pair** remotes still shown as 1/2-gang wall switch.
Pairing: hold bottom-left (TS0044) or left button ~10s. Fresh CR2032.

## Do not

- Invent manufacturerName/productId from retail SKU alone.
- Glue Peter SOS/contact mfrs onto TS004x.
- Force EF00 TX on pure ZCL remotes.
- Teach 0x8004 for TS0044 in docs (TS004F only).
