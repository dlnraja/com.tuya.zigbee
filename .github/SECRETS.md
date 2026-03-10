# GitHub Secrets Reference

> **✅ SECURITY**: Athom OAuth creds purged from git history (Mar 2026, git-filter-repo).
> Login screenshots also purged. Credentials must be rotated in Athom Developer Portal.

## Configured Secrets

| Secret | Provider | Capabilities |
|--------|----------|-------------|
| HOMEY_PAT | Athom App Store | Publish app, get versions, auto-publish draft to test |
| HOMEY_PAT_API | Homey Cloud API | List devices, get Zigbee mesh, device diagnostics, interviews, flows, insights, crash logs |
| HOMEY_EMAIL | Homey Forum | Forum login for Discourse API |
| HOMEY_PASSWORD | Homey Forum | Forum login for Discourse API |
| GH_PAT | GitHub | Cross-repo: forks, triage JohanBendz, issue comments. Scopes: repo, read:org |
| GITHUB_TOKEN | GitHub (auto) | Current repo only. Cannot access other repos (#46566) |
| GOOGLE_API_KEY | Google Gemini | AI analysis, vision (images), code gen, translation, long context |
| OPENAI_API_KEY | OpenAI | GPT-4o fallback, embeddings, PR review |
| GMAIL_CLIENT_ID | Gmail OAuth | **LEGACY** — removed v5.12.6, use IMAP instead |
| GMAIL_CLIENT_SECRET | Gmail OAuth | **LEGACY** — removed v5.12.6, use IMAP instead |
| GMAIL_REFRESH_TOKEN | Gmail OAuth | **LEGACY** — removed v5.12.6, use IMAP instead |
| GMAIL_EMAIL | Gmail IMAP | **REQUIRED** — Gmail address for IMAP (permanent, never expires) |
| GMAIL_APP_PASSWORD | Gmail IMAP | **REQUIRED** — App Password for IMAP (permanent, never expires) |
| DISCOURSE_API_KEY | Homey Forum | Discourse User API key for forum posting (preferred over session login) |
| ATHOM_CLIENT_ID | Athom OAuth | OAuth client ID for headless promotion (from Athom Developer Tools SPA) |
| ATHOM_CLIENT_SECRET | Athom OAuth | OAuth client secret for headless promotion (from Athom Developer Tools SPA) |

## Not Yet Configured (optional)

| Secret | Provider | Free tier |
|--------|----------|-----------|
| GROQ_API_KEY | Groq | Yes - fast Llama/Mixtral inference |
| HF_TOKEN | HuggingFace | Yes - models, datasets, inference |
| MISTRAL_API_KEY | Mistral | Yes - Mistral Large/Small |
| OPENROUTER_API_KEY | OpenRouter | Pay-per-use multi-model |
| APIFREELLM_KEY | Free LLM | Free fallback |

## Legacy (can be removed)

| Secret | Notes |
|--------|-------|
| HOMEY_TOKEN | Old token, replaced by HOMEY_PAT |
| FULLTOKEN | Old token, unused |

## HOMEY_PAT_API Capabilities (NEW)

Personal Access Token from my.homey.app with ALL scopes checked.
Base URL: https://api.athom.com

| Endpoint | What it does |
|----------|-------------|
| GET /homey | Get Homey info (version, model, IP) |
| GET /manager/devices/device | List all paired devices |
| GET /manager/zigbee | Zigbee mesh info, routes, neighbors |
| GET /manager/devices/device/{id} | Device details + capabilities |
| GET /manager/devices/device/{id}/report | Device diagnostic report |
| GET /manager/insights | Energy/power usage logs |
| GET /manager/flow | List all flows |
| GET /manager/apps | Installed apps + versions |
| POST /manager/devices/device/{id}/capability/{cap} | Set device capability |

Used by: homey-device-diagnostics.js (NEW)

## Workflow Usage Matrix

| Workflow | Secrets Used |
|----------|-------------|
| publish.yml | HOMEY_PAT, GOOGLE_API_KEY, GH_PAT, DISCOURSE_API_KEY, HOMEY_EMAIL, HOMEY_PASSWORD |
| auto-publish-on-push.yml | HOMEY_PAT, GOOGLE_API_KEY, GH_PAT, DISCOURSE_API_KEY, HOMEY_EMAIL, HOMEY_PASSWORD |
| nightly-auto-process.yml | GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_PAT, HOMEY_PAT_API, HOMEY_EMAIL, HOMEY_PASSWORD, GH_PAT, DISCOURSE_API_KEY, GMAIL_*, GMAIL_APP_PASSWORD |
| sunday-master.yml | GH_PAT, GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_PAT, HOMEY_PAT_API, HOMEY_EMAIL, HOMEY_PASSWORD, DISCOURSE_API_KEY, GMAIL_*, GMAIL_APP_PASSWORD |
| tuya-automation-hub.yml | GH_PAT, GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_EMAIL, HOMEY_PASSWORD, DISCOURSE_API_KEY |
| upstream-auto-triage.yml | GH_PAT, GOOGLE_API_KEY |
| forum-auto-responder.yml | GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_EMAIL, HOMEY_PASSWORD, DISCOURSE_API_KEY |
| gmail-diagnostics.yml | GMAIL_EMAIL, GMAIL_APP_PASSWORD, HOMEY_EMAIL, GOOGLE_API_KEY, GH_PAT |
| gmail-token-keepalive.yml | GMAIL_EMAIL, GMAIL_APP_PASSWORD, HOMEY_EMAIL, GH_PAT |
| monthly-comprehensive-sync.yml | GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_PAT, HOMEY_PAT_API, GH_PAT |
| weekly-fingerprint-sync.yml | GITHUB_TOKEN |
| daily-everything.yml | GH_PAT, GOOGLE_API_KEY, HOMEY_PAT, HOMEY_EMAIL, HOMEY_PASSWORD, DISCOURSE_API_KEY, GMAIL_*, GMAIL_APP_PASSWORD |
| github-auto-manage.yml | GH_PAT, GOOGLE_API_KEY, HOMEY_PAT |
| validate.yml | GITHUB_TOKEN |
| code-quality.yml | GITHUB_TOKEN |
| dependabot-auto-merge.yml | GH_PAT, GITHUB_TOKEN |
| monthly-enrichment.yml | HOMEY_PAT_API |

## Gmail OAuth (DEPRECATED v5.12.6)

> **OAuth has been fully removed.** All email access now uses IMAP with App Password.
> The secrets GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN can be deleted from GitHub.
> The keepalive workflow now runs weekly IMAP health checks instead of OAuth token refresh.

## Gmail IMAP (v5.12.6 — sole method)

IMAP with App Password is the **only** email method. OAuth has been completely removed.

### Setup (30 seconds, one-time)
1. Go to https://myaccount.google.com/apppasswords
2. Select app: **Mail**, device: **Other** → name it `Tuya Diagnostics`
3. Click **Generate** → copy the 16-character password
4. Add GitHub secrets:
   ```
   gh secret set GMAIL_EMAIL        # your Gmail address
   gh secret set GMAIL_APP_PASSWORD  # the 16-char app password
   ```

### How it works
- `fetch-gmail-diagnostics.js` uses IMAP first (permanent, no expiry)
- No OAuth dependency — permanent, no token expiry
- IMAP reads emails via `imap.gmail.com:993` with App Password
- Same pipeline: sanitize → parse → cross-ref → AI analyze → issues
- **No keepalive needed** — App Password is permanent
- IMAP health check runs weekly (Monday 08:00 UTC)

### Prerequisites
- 2-Factor Authentication must be enabled on the Google account
- If you don't see App Passwords: enable 2FA first at https://myaccount.google.com/signinoptions/two-step-verification

## Discourse API Key Setup

1. Run: `node .github/scripts/generate-discourse-key.js`
2. This opens a browser to `community.homey.app` to authorize a User API Key
3. After authorizing, the script captures the key and prints it
4. Add it as GitHub secret: `DISCOURSE_API_KEY`
5. This key is preferred over session login (HOMEY_EMAIL/PASSWORD) — no 403 errors
6. All forum scripts gracefully fall back: API key → session login → scan-only mode

## Priority Setup Order

1. HOMEY_PAT — publishing
2. HOMEY_PAT_API — real device diagnostics
3. GOOGLE_API_KEY — AI analysis (most workflows)
4. HOMEY_EMAIL + HOMEY_PASSWORD — forum
5. GH_PAT — cross-repo (scopes: repo, read:org)
6. Gmail secrets — diagnostic pipeline
7. OPENAI_API_KEY — GPT fallback
8. Remaining AI keys (optional, any one adds redundancy)
