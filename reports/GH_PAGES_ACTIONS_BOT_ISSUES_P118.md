# P118 — GH Pages / Actions / README / bot issues

Date: 2026-08-11 · Version: 9.0.479

## GitHub triage

| Item | Action |
|------|--------|
| Open PRs | 0 |
| Open issues | was 1 bot `#439` `[Auto] New Tuya devices…` |
| `#439` | **Closed** (bot auto-scan; already processed P114–P117) |

## GH Pages

- Status: `built`, HTTPS enforced
- URLs HTTP 200: `/`, `/dashboards.html`, `/wifi.html`
- Deploy workflow expanded path triggers (compose, app.json, generate-*-page.js, README, changelog)
- Last deploy: success on P117 push

## GitHub Actions harden

- Added top-level `permissions:` to `continuous-flow.yml`, `e2e-dashboard-test.yml`, `delete-johan-comments.yml`
- Repaired mangled `continuous-flow` workflow_dispatch YAML
- Workflow audit: **0** remaining missing defaults/timeout/permissions

## Docs

- `README.md` regenerated via `generate-readme.js` → **v9.0.478**, 430 drivers, 4,363 unique FPs
- `AGENTS.md` version stamp refreshed
