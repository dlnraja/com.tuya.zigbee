# GitHub Secrets Reference

> ** SECURITY**: Athom OAuth creds purged from git history (Mar 2026, git-filter-repo).
> Login screenshots also purged. Credentials must be rotated in Athom Developer Portal.

## Configured Secrets

| Secret | Provider | Capabilities |
|--------|----------|-------------|
| HOMEY_PAT | Athom App Store | Publish app, get versions, auto-publish draft to test |
| HOMEY_PAT_API | Homey Cloud API | List devices, get Zigbee mesh, device diagnostics, interviews, flows, insights, crash logs |
| DISCOURSE_API_KEY | Discourse | **PRIORITY** Forum auth (admin API key, no CSRF/session) |
| DISCOURSE_USERNAME | Discourse | Username for API key (default: dlnraja) |
| HOMEY_EMAIL | Homey Account | Forum SSO login fallback + OAuth promote |
| HOMEY_PASSWORD | Homey Account | Forum SSO login fallback + OAuth promote |
| GH_PAT | GitHub | Cross-repo: forks, triage JohanBendz, issue comments. Scopes: repo, read:org |
| GITHUB_TOKEN | GitHub (auto) | Current repo only. Cannot access other repos (#46566) |
| GOOGLE_API_KEY | Google Gemini | AI analysis, vision (images), code gen, translation, long context |
| OPENAI_API_KEY | OpenAI | GPT-4o fallback, embeddings, PR review |
| GMAIL_CLIENT_ID | Gmail OAuth | **LEGACY**  removed v5.12.6, use IMAP instead |
| GMAIL_CLIENT_SECRET | Gmail OAuth | **LEGACY**  removed v5.12.6, use IMAP instead |
| GMAIL_REFRESH_TOKEN | Gmail OAuth | **LEGACY**  removed v5.12.6, use IMAP instead |
| GMAIL_EMAIL | Gmail IMAP | **REQUIRED**  Gmail address for IMAP (permanent, never expires) |
| GMAIL_APP_PASSWORD | Gmail IMAP | **REQUIRED**  App Password for IMAP (permanent, never expires) |
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
| publish.yml | HOMEY_PAT, GOOGLE_API_KEY, GH_PAT, HOMEY_EMAIL, HOMEY_PASSWORD |
| auto-publish-on-push.yml | HOMEY_PAT, GOOGLE_API_KEY, GH_PAT, HOMEY_EMAIL, HOMEY_PASSWORD |
| nightly-auto-process.yml | GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_PAT, HOMEY_PAT_API, HOMEY_EMAIL, HOMEY_PASSWORD, GH_PAT, GMAIL_*, GMAIL_APP_PASSWORD |
| sunday-master.yml | GH_PAT, GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_PAT, HOMEY_PAT_API, HOMEY_EMAIL, HOMEY_PASSWORD, GMAIL_*, GMAIL_APP_PASSWORD |
| tuya-automation-hub.yml | GH_PAT, GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_EMAIL, HOMEY_PASSWORD |
| upstream-auto-triage.yml | GH_PAT, GOOGLE_API_KEY |
| forum-auto-responder.yml | GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_EMAIL, HOMEY_PASSWORD |
| gmail-diagnostics.yml | GMAIL_EMAIL, GMAIL_APP_PASSWORD, HOMEY_EMAIL, GOOGLE_API_KEY, GH_PAT |
| gmail-token-keepalive.yml | GMAIL_EMAIL, GMAIL_APP_PASSWORD, HOMEY_EMAIL, GH_PAT |
| monthly-comprehensive-sync.yml | GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_PAT, HOMEY_PAT_API, GH_PAT |
| weekly-fingerprint-sync.yml | GITHUB_TOKEN |
| daily-everything.yml | GH_PAT, GOOGLE_API_KEY, HOMEY_PAT, HOMEY_EMAIL, HOMEY_PASSWORD, GMAIL_*, GMAIL_APP_PASSWORD |
| github-auto-manage.yml | GH_PAT, GOOGLE_API_KEY, HOMEY_PAT |
| validate.yml | GITHUB_TOKEN |
| code-quality.yml | GITHUB_TOKEN |
| dependabot-auto-merge.yml | GH_PAT, GITHUB_TOKEN |
| monthly-enrichment.yml | HOMEY_PAT_API |

## Gmail OAuth (DEPRECATED v5.12.6)

> **OAuth has been fully removed.** All email access now uses IMAP with App Password.
> The secrets GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN can be deleted from GitHub.
> The keepalive workflow now runs weekly IMAP health checks instead of OAuth token refresh.

## Gmail IMAP (v5.12.6  sole method)

IMAP with App Password is the **only** email method. OAuth has been completely removed.

### Setup (30 seconds, one-time)
1. Go to https://myaccount.google.com/apppasswords
2. Select app: **Mail**, device: **Other**  name it `Tuya Diagnostics`
3. Click **Generate**  copy the 16-character password
4. Add GitHub secrets:
   ```
   gh secret set GMAIL_EMAIL        # your Gmail address
   gh secret set GMAIL_APP_PASSWORD  # the 16-char app password
   ```

### How it works
- `fetch-gmail-diagnostics.js` uses IMAP first (permanent, no expiry)
- No OAuth dependency  permanent, no token expiry
- IMAP reads emails via `imap.gmail.com:993` with App Password
- Same pipeline: sanitize  parse  cross-ref  AI analyze  issues
- **No keepalive needed**  App Password is permanent
- IMAP health check runs weekly (Monday 08:00 UTC)

### Prerequisites
- 2-Factor Authentication must be enabled on the Google account
- If you don't see App Passwords: enable 2FA first at https://myaccount.google.com/signinoptions/two-step-verification

## Forum Auth (Session SSO)

Forum uses HOMEY_EMAIL + HOMEY_PASSWORD for Athom SSO login (no API key needed).
All forum scripts authenticate via `forum-auth.js`  `getForumAuth()`  session cookies + CSRF.


## Priority Setup Order

1. **NVIDIA_API_KEY** (NEW) - FREE TIER: 800 calls/day! Add immediately for free AI
2. HOMEY_PAT  publishing
3. HOMEY_PAT_API  real device diagnostics
4. GOOGLE_API_KEY  AI analysis (most workflows)
5. HOMEY_EMAIL + HOMEY_PASSWORD  forum
6. GH_PAT  cross-repo (scopes: repo, read:org)
7. Gmail secrets  diagnostic pipeline
8. OPENAI_API_KEY  GPT fallback
9. HF_TOKEN, GROQ_API_KEY - Free tier AI redundancy
10. Remaining AI keys (optional, any one adds redundancy)

## AI Provider Tiers (Updated v7.4.15)

**TIER 1 - FREE (Use First):**
| Provider | Secret | Daily Cap |
|----------|--------|-----------|
| NVIDIA NIM | NVIDIA_API_KEY | 800 |
| HuggingFace | HF_TOKEN | 500 |
| Groq | GROQ_API_KEY | 500 |
| OpenRouter | OPENROUTER_API_KEY | Varies |

**TIER 2 - PAID (Budget Strict):**
| Provider | Secret | Daily Cap | Max Monthly |
|----------|--------|-----------|-------------|
| Cerebras | CEREBRAS_API_KEY | 100 | $5 |
| Together.ai | TOGETHER_API_KEY | 200 | $10 |
| DeepSeek | DEEPSEEK_API_KEY | 50 | $3 |

**TIER 3 - PREMIUM (Very Strict):**
| Provider | Secret | Daily Cap | Max Monthly |
|----------|--------|-----------|-------------|
| OpenAI | OPENAI_API_KEY | 50 | $10 |
| Mistral | MISTRAL_API_KEY | 30 | $5 |
