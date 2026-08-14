# Weekly Sovereign Autopilot (P136)

Dual-layer design so **Cursor quota stays thin** and **GitHub Actions** does the heavy feed.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions — Sundays 06:00 UTC (free minutes)          │
│  weekly-sovereign-loop.yml                                  │
│  • Dispatch: mega-crawl, gmail, forum-poll, triage,         │
│    publish-diagnose, safe-sync-stable, self-improve         │
│  • Local gates (anti-bot, bare, double-division, voice)     │
│  • Homey Test URL probe                                     │
│  • Recent CI / open issues snapshot                         │
│  → reports/WEEKLY_SOVEREIGN_LOOP.md                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Cursor Automation — Sundays ~10:00 UTC (1× / week)         │
│  Thin brain: read report → ≤3 reliability commits or 1 PR   │
│  NO mega crawls, NO forum auto-post, NO stable features     │
└─────────────────────────────────────────────────────────────┘
```

## Dual-app rules (unchanged)

| Branch | Role |
|--------|------|
| `master` | Test / preview / features |
| `stable-v5` | Live reliability only — crash/data backports after soak |

## Quota caps

- Cursor: **1 run / week**, bounded prompt, prefer dispatch GHA over re-scraping
- GitHub: existing secrets only (`GITHUB_TOKEN` / `GH_PAT`); no new paid APIs
- Forum: silent enrich forever; never paste unchecked AI

## Files

- `tools/ci/weekly-sovereign-loop.js`
- `.github/workflows/weekly-sovereign-loop.yml`
- Report: `reports/WEEKLY_SOVEREIGN_LOOP.md` (written by the weekly job)

## Homey Test URL

`https://homey.app/a/com.dlnraja.tuya.zigbee/test/`
