# Homey tokens and secrets upkeep

Workflow: `.github/workflows/homey-secrets-health.yml` (weekly Monday 04:41 UTC + manual). It runs no AI, prints no values, and opens no issue: an invalid token fails the run and is recorded in the `homey-secrets-health` artifact (`data/status/homey-secrets-health.json`).

| Secret | Kind | Used by | Renewal |
|---|---|---|---|
| `HOMEY_PAT` | **Apps PAT** (`pat-apps-…`), tools.developer.homey.app | app upload/publish (`homey-app-publish`, publish*.yml) | **By hand** – no refresh API |
| `HOMEY_PAT_API` | **User/dashboard PAT** (my.homey.app) | diagnostics, device/dashboard calls | **By hand** |
| `HOMEY_TOKEN` | legacy | old scripts | By hand (or retire) |
| `HOMEY_REFRESH_TOKEN` | OAuth refresh token (`npx homey login`) | account API via `scripts/ci/homey-token-refresh.js` | **Automatic**: each run exchanges and writes the rotated token back, needs `GH_PAT` with secrets:write. If the chain breaks: `npx homey login` again. |
| `GH_PAT` | GitHub fine-grained PAT | secret write-back | By hand at its expiry date |

Do not mix the apps PAT and the user dashboard PAT: they are accepted by different APIs.
