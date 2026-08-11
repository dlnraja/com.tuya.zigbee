# P119 — Automate bot issue treat + close

Date: 2026-08-11

## Why

Bot `[Auto]` / `auto-scan` issues (e.g. #439) stayed open because shadow policy blocked all issue closes, including on `dlnraja`.

## What

| Piece | Role |
|-------|------|
| `tools/ci/auto-bot-issue-triage.js` | Extract mfrs → `bot-auto-scan-candidates.json` → comment → **close bot only** |
| `.github/workflows/auto-bot-issue-triage.yml` | Cron `45 4 * * *` + on `[Auto]`/`auto-scan` issue events |
| `monthly-scan.yml` | Persist candidates, upsert one tracking issue, triage+close same run |
| `auto-close-supported.yml` | Daily `45 5 * * *`; bot triage step first |
| `auto-enrich-closed-loop.yml` | Also runs bot triage each loop |
| `github-shadow-policy.js` | `ALLOW_BOT_ISSUE_CLOSE=true` allows own-repo close only |

## Safety

- Human bug reports: **never** auto-closed by this path
- Upstream Johan: still read-only
- `stale.yml` still `days-before-close: -1`

## Local

```bash
npm run triage:bot-issues:dry
npm run triage:bot-issues
```
