# Regression lessons gate (2026-08-11)

Static MUST-KEEP CI gate derived from version eras + crash lessons.

## Eras (forum T140352 / AGENTS.md)

| Class | Versions |
|-------|----------|
| Crashy | 5.11.152, 5.11.138, 5.11.166, 7.4.1, 7.4.6, 9.0.218 |
| Good | 5.7.15/16, 5.8.25/40, 5.11.25/146, 7.4.9, 9.0.258+ |

## Lessons → rules

| Lesson | Rule id | Enforcement |
|--------|---------|-------------|
| P19 setTimeout/_destroyed | `p19-safe-timers` | fatal presence |
| P19 registerRunListenerasync | `p19-registerRunListenerasync` | fatal anti-pattern |
| P51 dual-track | `p51-track-hint` / `--expect-id` | warn / optional fatal |
| P94 bot FP revert | `p94-anti-bot-gate` | fatal presence |
| P100 getDeviceActionCard / read-only error | `p100-flow-guard`, `p100-readonly-error-assign` | fatal |
| P101 getDeviceById | `p101-getdevicebyid` | fatal presence |
| Flow `[[device]]` / linear battery | flow + phoenix rules | fatal |

## Run

```bash
npm run check:regression-lessons
npm run check:reliability
```

Wired (blocking) into auto-fix/publish/unified-ci/publish-stable; soft companion on gmail/diag workflows after email gates.

Does **not** modify `lib/tuya/TuyaZigbeeDevice.js`.
