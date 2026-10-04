# Skill routing

Read this first: pick the skill for the task, then follow it.
(Pattern inspired by zhaoxuya520/reverse-skill's routing file; see CREDITS.)

| Task | Read |
|------|------|
| New device / fingerprint (mfr + pid couple) | `docs/knowledge/DEVICE_TRUTH.md`, `docs/knowledge/PECULIARITIES.md`, then `skills/TUYA_ARCHITECT_SOP.md` |
| Tuya DP mapping, EF00 frames, unknown DP | `skills/TUYA_DP_MASTER.md`, `lib/tuya/TuyaDpValue.js` (signed), `lib/tuya/TuyaUnsignedValue.js` (counters/distances) |
| Driver code, capabilities, flow cards, timers | `skills/HOMEY_SDK3_EXPERT.md`, `AGENTS.md` (common bug patterns) |
| Syncing data from Z2M / ZHA / other sources | `skills/SYNC_PROTOCOL.md`, `data/sources/registry.json` |
| Covers (curtains, shutters, blinds) | `lib/devices/UnifiedCoverBase.js`, `lib/covers/` (flow actions, paced queue, position+tilt, Identify), `docs/knowledge/FIELD_NOTES_2026-10_X_SCAN.md` (TaHoma notes) |
| Dead flow cards (never fired / no listener) | `tools/flow/build-dead-flow-autowire.js` (title → capability map), `lib/flow/DeadFlowAutoWire.js`, `config/flow/dead-flow-autowire.json` |
| Energy / metering values | `docs/knowledge/FIELD_NOTES_2026-10_X_SCAN.md` (signed vs unsigned, declared type can lie) |
| Stable backport | `docs/rules/DUAL_APP_VISION.md` (reliability fixes only) |

Rules that always apply: never invent a manufacturerName or productId; every behaviour fix gets a `test/critical/pNNNN-*.test.js`.
