# Dual-app + L99 enrich automation (2026-08-23)

## Tracks (never blur)

| | master | stable-v5 |
|--|--------|-----------|
| App ID | `com.dlnraja.tuya.zigbee` | `com.dlnraja.tuya.zigbee.stable` |
| Version | 9.0.x | 5.12.x |
| Goal | Features + soak | Reliability only |

SSOT: `config/architecture/dual-app-tracks.json`

## Classification of recent work

| Item | Tag |
|------|-----|
| EnergyJumpGuard ↔ SmartDivisor, energy gates | BOTH |
| BootBudget / IntelligentLazyLoad | BOTH |
| Flow brand-scrub (titles) | BOTH |
| Daylight Atmosphere / Solar Sync / Path Light | MASTER_ONLY |
| CI intel caches / forum SHADOW respond | MASTER_ONLY |

## Regular automation

| Workflow | Cron | Mode |
|----------|------|------|
| auto-enrich-closed-loop | `0 */4 * * *` | soft `l99-dual-app-enrich-gates` |
| project-resilience | `20 5 * * *` | soft + commit reports |
| recurrent-orchestrator | `30 3 * * *` | soft |
| forum-poll | every 4h :15 | soft |
| unified-ci | on push/PR | **hard** `--hard` |

```bash
npm run check:l99-dual
npm run check:l99-dual:hard
```

## Docs / rules aligned

- `docs/rules/DUAL_APP_VISION.md` — L99 table
- `docs/rules/DEVELOPMENT_RULES.md` — independent App IDs (fixed stale shared-id text)
- `docs/rules/CROSS_APP_PROMPT_RULES.md`
- `.github/WORKFLOW_GUIDELINES.md` §M + dual classification
- `AGENTS.md` Stable vs Master table
