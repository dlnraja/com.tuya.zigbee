# GitHub Secrets Reference

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
| GMAIL_CLIENT_ID | Gmail OAuth | Read diagnostic emails |
| GMAIL_CLIENT_SECRET | Gmail OAuth | Read diagnostic emails |
| GMAIL_REFRESH_TOKEN | Gmail OAuth | Auto-renewed daily by keepalive workflow |
| DISCOURSE_API_KEY | Homey Forum | Discourse User API key for forum posting (preferred over session login) |

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
| nightly-auto-process.yml | GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_PAT, HOMEY_PAT_API, HOMEY_EMAIL, HOMEY_PASSWORD, GH_PAT, DISCOURSE_API_KEY, GMAIL_* |
| sunday-master.yml | GH_PAT, GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_PAT, HOMEY_PAT_API, HOMEY_EMAIL, HOMEY_PASSWORD, DISCOURSE_API_KEY, GMAIL_* |
| tuya-automation-hub.yml | GH_PAT, GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_EMAIL, HOMEY_PASSWORD, DISCOURSE_API_KEY |
| upstream-auto-triage.yml | GH_PAT, GOOGLE_API_KEY |
| forum-auto-responder.yml | GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_EMAIL, HOMEY_PASSWORD, DISCOURSE_API_KEY |
| gmail-diagnostics.yml | GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GOOGLE_API_KEY, GH_PAT |
| gmail-token-keepalive.yml | GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GH_PAT |
| monthly-comprehensive-sync.yml | GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_PAT, HOMEY_PAT_API, GH_PAT |
| weekly-fingerprint-sync.yml | GITHUB_TOKEN |
| daily-everything.yml | GH_PAT, GOOGLE_API_KEY, HOMEY_PAT, HOMEY_EMAIL, HOMEY_PASSWORD, DISCOURSE_API_KEY, GMAIL_* |
| github-auto-manage.yml | GH_PAT, GOOGLE_API_KEY, HOMEY_PAT |
| validate.yml | GITHUB_TOKEN |
| code-quality.yml | GITHUB_TOKEN |
| dependabot-auto-merge.yml | GH_PAT, GITHUB_TOKEN |
| monthly-enrichment.yml | HOMEY_PAT_API |

## Gmail OAuth Setup

1. Google Cloud Console > Create project
2. Enable Gmail API
3. Create OAuth client ID (Web app, redirect: https://developers.google.com/oauthplayground)
4. Get refresh token via OAuth Playground
5. Add secrets: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
6. CRITICAL: Publish OAuth consent screen (Testing mode = 7-day token expiry)

Auto-renewal: gmail-token-keepalive.yml runs 3x/day (6h, 14h, 22h UTC).
Testing mode: token expires every 7 days. Keepalive creates GitHub issue alert when expired.

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
