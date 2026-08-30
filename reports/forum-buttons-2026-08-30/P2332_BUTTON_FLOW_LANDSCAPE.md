# P2332 — Button / scene / wireless FLOW CARD landscape leftovers

**Classify:** BOTH (reliability — flow cards fire, sacred couples, no invent)

## Internet / Z2M cross-ref

| Source | Finding | Action |
|--------|---------|--------|
| Z2M TS004x | Presses = Tuya mfr OnOff **0xFD** (`tuya_on_off_action`), not native toggles | Keep BoundCluster + wrapHandleFrame (P2328) |
| Z2M / community | First press after sleep needs genBasic **0xFFDE=0x13** | Already in `TuyaMagicPacket` + ButtonDevice wake |
| Z2M #12768 Nobø SWS-IZ `_TZ3000_xffhmvhv`+TS004F | Firmware rejects **0x8004** | Profile `skip8004` + misattribution + MVM resolve |
| Homey FLOW-GUARD | Undeclared `getDeviceTriggerCard` → silent miss / invent spam | Declared-only via `_tryCard` / `_safeTriggerFlow` |

## Fixes

1. **ButtonDevice._triggerHoldRelease** — `_tryCard` candidates only (no raw Homey getters).
2. **VirtualButtonMixin** — `virtual_button_pressed` via `_safeTriggerFlow` (P2332).
3. **scene_switch_4** E000 fallback — `triggerButtonPress` / `_tryCard` (prior turn).
4. **TuyaSpecificClusterDevice._triggerPhysicalFlow** — stopped permanently shadowing PhysicalButtonMixin; legacy bool DP path uses `_safeTriggerFlow` + gang cards; (gang, press) forwards to mixin.
5. **wall_switch_4_gang** — call `initPhysicalButtonDetection` (compose cards were dead RX).
6. **wall_switch_4_gang_tuya** — `_gangNumber`, per-gang `physical_gangN_*` compose, DP → `(gang, on\|off)`.
7. **xffhmvhv** — misattribution registry + MVM `resolveDriverType` → `button_wireless_4`.

## User note (silent)

Wrong driver after pair still needs **update Test + remove/re-pair**. Flows on remotes use `*_button_*` cards, not wall `physical_gang*`.

## Tests

`test/critical/p2332-button-flow-landscape.test.js`
