# Rule: alternative control paths are always offered, never a substitute (P3380-P3383)

Source: forum 21313 #296 (Tuya Cloud app, Peter_Kawa), #300/#302, #291/#292. User page: `docs/ALTERNATIVE_CONTROL_PATHS.md`.
Machine-readable: `config/alt-control-paths.json`; triage helper: `scripts/lib/alt-control-paths.js`.

1. For any unsupported device, missing DP or "not exposed" report, triage and reply candidates propose the paths
   (exact card/setting ids from `config/alt-control-paths.json`) **while** the native fix for the exact mfr+pid couple
   is investigated. The native fix stays mandatory; never close an item because a workaround exists.
2. Escape-hatch cards (`alt_*`) are additive: no device filter, inputs validated (DP 1-255, typed values, hex <= 64 B,
   ZCL ids bounded), rate-limited (5 sends / 2 s / device, scenes 20 / h), never log keys or payload secrets.
3. User DP maps only add standard capabilities, never remove one, never touch published flow or driver ids.
4. Cloud scenes are opt-in (`alt_tuya_scenes_enabled` false by default), use the user's own Tuya IoT project, never a
   dependency, never a paid plan. Local control first.
5. Dimmer scales are resolved deterministically (setting > echo > spec > observed max > default); no AI guessing.
6. Socket metering fallback only on class `socket`, only for unmapped DP 18/19/20 with plausible ranges.
