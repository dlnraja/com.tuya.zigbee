# GitHub Secrets

> Settings > Secrets and variables > Actions > New repository secret

## 1. CRITICAL - Publishing
| Secret | Source |
|--------|--------|
| HOMEY_PAT | https://tools.developer.homey.app/me |

Used by: publish.yml, auto-publish-on-push.yml, nightly-auto-process.yml, monthly-comprehensive-sync.yml (auto-publish-draft.js)

## 2. Homey Forum
| Secret | Purpose |
|--------|---------|
| HOMEY_EMAIL | Forum login email |
| HOMEY_PASSWORD | Forum login password |

Used by: publish.yml, tuya-automation-hub.yml, sunday-master.yml, nightly-auto-process.yml, forum-auto-responder.yml

## 3. Gmail Diagnostics
| Secret | Purpose |
|--------|---------|
| GMAIL_CLIENT_ID | Google OAuth Client ID |
| GMAIL_CLIENT_SECRET | Google OAuth Secret |
| GMAIL_REFRESH_TOKEN | Gmail refresh token |

Used by: gmail-diagnostics.yml

## 4. AI/LLM Keys
| Secret | Provider |
|--------|----------|
| GOOGLE_API_KEY | Gemini |
| OPENAI_API_KEY | OpenAI |
| GROQ_API_KEY | Groq |
| MISTRAL_API_KEY | Mistral |
| OPENROUTER_API_KEY | OpenRouter |
| HF_TOKEN | HuggingFace |
| APIFREELLM_KEY | Free LLM fallback |

Used by: tuya-automation-hub.yml, sunday-master.yml, nightly-auto-process.yml, monthly-comprehensive-sync.yml, forum-auto-responder.yml, gmail-diagnostics.yml

## 5. GitHub Access
| Secret | Purpose |
|--------|---------|
| GH_PAT | Cross-repo access (forks, triage). Scopes: `repo`, `read:org` |
| GITHUB_TOKEN | Auto-provided — **current repo only** ([#46566](https://github.com/orgs/community/discussions/46566)) |

> **Warning:** `GITHUB_TOKEN` cannot access other repos. `GH_PAT` is required for JohanBendz triage, fork scanning, and cross-repo issue comments.

Used by: tuya-automation-hub.yml, sunday-master.yml, nightly-auto-process.yml, upstream-auto-triage.yml

## Gmail OAuth Setup

1. [Google Cloud Console](https://console.cloud.google.com/) → Create project
2. Enable **Gmail API** (APIs & Services > Library)
3. Create OAuth client ID (Web application type, redirect URI: `https://developers.google.com/oauthplayground`)
4. Note `client_id` and `client_secret`
5. Add scope `gmail.readonly` + your email as test user
6. Get refresh token via [OAuth Playground](https://developers.google.com/oauthplayground/):
   - ⚙️ Settings → Check **Use your own OAuth credentials** → Paste Client ID + Secret
   - Left panel → **Gmail API v1** → Select `gmail.readonly`
   - Click **Authorize APIs** → Sign in → Allow
   - Click **Exchange authorization code for tokens** → Copy **Refresh token**
7. Add to GitHub Secrets: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
8. **CRITICAL**: Publish OAuth consent screen (not Testing) → refresh tokens expire after 7 days in Testing mode!

### Auto-Renewal (built-in)
- **gmail-token-keepalive.yml** runs daily at 6AM UTC — refreshes token to prevent expiry
- **gmail-diagnostics.yml** runs 3x/day — also refreshes token + auto-rotates if Google issues a new one
- If Google returns a new refresh_token, it's automatically saved to `GMAIL_REFRESH_TOKEN` secret via `gh secret set`
- Even in Testing mode (7-day expiry), daily keepalive prevents expiration

## Priority Setup Order
1. HOMEY_PAT - required for publishing
2. GOOGLE_API_KEY - used by most AI workflows + Gmail analysis
3. HOMEY_EMAIL + HOMEY_PASSWORD - forum posting
4. GH_PAT - cross-repo scanning
5. GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN - diagnostics pipeline
6. Remaining AI keys (any one is enough for fallback)
