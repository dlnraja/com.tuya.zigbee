# Dynamic adaptation — nothing is mandatory (P3207)

Origin: GH#598 (oletorv, `_TZE284_9ern5sfh` / TS0601 "Unable to connect"), user rule t778u/t780u.
Applies to every driver, on every branch that carries the modules.

## SDK facts (audit)

- Homey turns every manifest `zigbee.endpoints.<ep>.bindings` entry into a bind request **during
  pairing** (apps.developer.homey.app/wireless/zigbee). A bind for a cluster the node does not have
  is answered with an error; GH#598 shows that this can end pairing with "Unable to connect".
- `zigbee.endpoints.<ep>.clusters` only declares what the app may talk to; it sends nothing at pairing.
- `ZCLNode` endpoints are built from the node's real `endpointDescriptors` (zigbee-clusters
  `Node.js`/`Endpoint.js`), so `endpoint._descriptor.inputClusters/outputClusters` tell what the node serves.
- Bindings made at pairing persist in the device. Removing a cluster from manifest `bindings` does not
  touch any already paired device; it only changes new pairings, where runtime binding takes over.

## Rules

1. Manifest `bindings`: only clusters that EVERY couple of the driver has. Never 0xEF00 at pairing
   (Tuya EF00 reports reach Homey without a bind). The 33 drivers that still bind 61184 are listed by the
   audit and left unchanged until a couple shows the problem (no blind mass change).
2. Runtime binding — `lib/zigbee/DynamicBindingAdapter.js`, data `lib/zigbee/data/runtime-bindings.json`:
   5–8 s after init, each listed cluster is bound **only if the node's descriptor lists it** (input or
   output), each bind and reporting configuration in its own try/catch with a timeout. Reporting is set up
   only for read-only measurement clusters (battery, lux, temperature, humidity), never onOff/level.
   Done pairs persist in store `p3207_dynBind`; ≤16 pairs, ≤3 attempts each.
3. Sleepy nodes: a failed step is retried on the next frame the node sends (one-shot hook on
   `zclNode.handleFrame`, restored before anything else runs).
4. Lazy capabilities: a capability is added when a real report arrives, never removed.
5. Raw level — `lib/zigbee/RawAdaptiveObserver.js`, fed by `UnknownDPLogger`:
   unknown EF00 DPs (id, type, min/max, count) and unknown ZCL attribute reports go to a per-device LRU
   (24 keys). A capability is added only at high confidence:
   - exact catalogue row for this couple (KB), value decodes, ≥2 reports, catalogue does not veto; or
   - family inference (`InferredDpLayer`) confirmed by 3 valid reports on this device, zero invalid;
   - ZCL: known measurement cluster/attribute, ≥2 numeric reports.
   Only read-only capabilities (`measure_*`, `meter_*`, `alarm_battery`). Never when the driver owns it.
   Learned mapping persisted in store `dyn_learned` (≤16). Zero TX.
6. Kill switch: device setting or store `dyn_adapt_off = true`, or env `HOMEY_DYN_ADAPT=0` (raw layer).
   Delete the driver row in `runtime-bindings.json` to stop runtime binds for one driver.

## Audit

`node scripts/audit/binding-presence-audit.js [--json]` compares manifest bindings with the sourced
interviews in `docs/data/interviews/` (empty interviews are ignored as no evidence) and lists the
61184 bindings. P3207 moved to runtime: lcdtemphumidsensor 1/1026/1029, dimmer_1_gang_tuya 6/8,
slim_motion_sensor 1, rain_sensor 1024, wall_curtain_switch 6.

Left as is (reported, evidence too weak or driver too shared): switch_2gang ep2 (`_TZ3210_nuenzetq`
interview shows one endpoint), contact_sensor 1/1280 (`_TZ3000_6zvw8ham` interview looks like a plug),
button_wireless_2 6 (`_TZ3000_fsiepnrh`), lcdtemphumidluxsensor 57346 (`_TYZB01_ftdkanlj`).
