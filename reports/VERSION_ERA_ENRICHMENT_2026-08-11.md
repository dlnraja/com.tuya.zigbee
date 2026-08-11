# Version-era enrichment audit — 2026-08-11 (P103)

Cross-study of project history (branches/tags/changelogs/commits/docs) + external
protocol patterns. Applied silently into runtime (no external attribution in
user-facing changelogs).

## Sources studied

| Source | Finding |
|--------|---------|
| Forum era table (AGENTS / regression gate) | Good: 5.7.15/16, 5.8.25/40, 5.11.25/146, 7.4.9, 9.0.258+. Crashy: 5.11.152/138/166, 7.4.1/6 |
| Commit chain P92.59→P102 | Magic packet, IAS re-enroll, battery non-linear, flow guards, DeviceIOFacade |
| `docs/EXTERNAL_APPS_ANALYSIS.md` | Poll when configureReporting ignored; magic 0xFFFE; never mass-copy drivers |
| Z2M/ZHA public patterns | `configureMagicPacket` = Basic read incl. 0xFFFE; sendFrame when schema rejects attr |
| Local caches `scripts/data/z2m-*.json` + `data/protocol_quirk_table.json` | Per-mfr init sequences already inventoried |
| Branches `stable-v5` / `master` / `feature/wifi-local-first` | Reliability-only on stable; features stay master |
| Topic 146735 silent scan | Dimmer couples already on `dimmer_2_gang_tuya`; local-first WiFi notes already wired |
| Infer-enrich incomplete corpora | 2 HIGH sacred couples applied (TS0203 contact) |

## Applied this pass

1. **TuyaMagicPacket** — `sendFrame` / `writeRaw` fallback when `readAttributes` rejects `0xFFFE`; optional `force` for interview-miss recovery (still store-flagged after success).
2. **HomeyCompensationLayer.applyQuirkGuidedInit** — drives `protocol_quirk_table.json` sequences (magic → query_all → IAS → time/MCU → energy divisors) by mfr/pid.
3. **DeviceIOFacade.runInterviewCompensation** — calls quirk-guided init before legacy magic/EF00/IAS path.
4. **Infer-enrich HIGH** — `_TZE200/_TZE204_2imwyigp` + `TS0203` → `contact_sensor`.
5. **Lot3 / T146735** — already present (no further FP churn).

## Explicitly NOT applied

- Mass dump into `generic_tuya`
- Master-only feature managers onto stable (availability/circadian/cascade…)
- Auto-map unknown clusters → capabilities
- Re-adding `[[device]]` in Flow titleFormatted

## Success checks

- `npm run io:smoke`
- `npm run check:bare-zigbee`
- `node tools/ci/gmail-crash-pattern-gate.js` → `verdict: ok`
- `node tools/ci/anti-bot-regression-gate.js`
