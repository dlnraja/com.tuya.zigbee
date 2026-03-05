# GitHub Secrets Reference

> **⚠️ SECURITY**: Athom OAuth creds (`598d85a3...`) + login screenshots exist in git history.
> Rotate the Athom OAuth credentials, then run: `bfg --replace-text passwords.txt && git reflog expire --expire=now --all && git gc --prune=now --aggressive && git push --force`

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
| GMAIL_CLIENT_ID | Gmail OAuth | Read diagnostic emails (expires 7d in Testing mode) |
| GMAIL_CLIENT_SECRET | Gmail OAuth | Read diagnostic emails (expires 7d in Testing mode) |
| GMAIL_REFRESH_TOKEN | Gmail OAuth | Auto-renewed daily by keepalive (but expires 7d in Testing) |
| GMAIL_EMAIL | Gmail IMAP | Gmail address for IMAP fallback (permanent, never expires) |
| GMAIL_APP_PASSWORD | Gmail IMAP | App Password for IMAP fallback (permanent, never expires) |
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
| gmail-diagnostics.yml | GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_EMAIL, GMAIL_APP_PASSWORD, HOMEY_EMAIL, GOOGLE_API_KEY, GH_PAT |
| gmail-token-keepalive.yml | GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_APP_PASSWORD, GH_PAT |
| monthly-comprehensive-sync.yml | GOOGLE_API_KEY, OPENAI_API_KEY, HOMEY_PAT, HOMEY_PAT_API, GH_PAT |
| weekly-fingerprint-sync.yml | GITHUB_TOKEN |
| daily-everything.yml | GH_PAT, GOOGLE_API_KEY, HOMEY_PAT, HOMEY_EMAIL, HOMEY_PASSWORD, DISCOURSE_API_KEY, GMAIL_*, GMAIL_APP_PASSWORD |
| github-auto-manage.yml | GH_PAT, GOOGLE_API_KEY, HOMEY_PAT |
| validate.yml | GITHUB_TOKEN |
| code-quality.yml | GITHUB_TOKEN |
| dependabot-auto-merge.yml | GH_PAT, GITHUB_TOKEN |
| monthly-enrichment.yml | HOMEY_PAT_API |

## Gmail OAuth Setup (Complete Guide)

### Step 1: Google Cloud Console
1. https://console.cloud.google.com/ > Create project "Tuya Diagnostics"
2. APIs & Services > Library > Enable **Gmail API**

### Step 2: OAuth Consent Screen
1. APIs & Services > OAuth consent screen > **External**
2. App name: `Tuya Diagnostics`, add your email
3. Scopes: `gmail.readonly`, `userinfo.email`
4. Test users: add your Gmail
5. **PUBLISH APP** (Testing→Production) to avoid 7-day token expiry

### Step 3: Create OAuth Client
1. Credentials > Create > OAuth 2.0 Client ID > **Web application**
2. Redirect URI: `https://developers.google.com/oauthplayground`
3. Copy **Client ID** + **Client Secret**

### Step 4: OAuth Playground (get refresh token)
1. Go to https://developers.google.com/oauthplayground
2. Click gear ⚙️ top-right:
   - ✅ **Use your own OAuth credentials** → paste Client ID + Secret
   - ✅ **Auto-refresh the token before it expires**
3. Left panel: Gmail API v1 > select `gmail.readonly`
4. **Authorize APIs** → sign in → allow
5. **Exchange authorization code for tokens**
6. Copy the **Refresh Token**

### Step 5: GitHub Secrets
Add to repo Settings > Secrets > Actions:
- `GMAIL_CLIENT_ID` = Client ID from Step 3
- `GMAIL_CLIENT_SECRET` = Client Secret from Step 3
- `GMAIL_REFRESH_TOKEN` = Refresh Token from Step 4

### Auto-Rotation (Testing Mode — 7-day cycle)
- Keepalive runs **4×/day** (05h, 11h, 17h, 23h UTC)
- Tracks token age via `tokenSetDate` in health JSON
- **Day 5**: Warning alert + GitHub issue
- **Day 6**: Urgent alert + GitHub issue
- **Day 7+**: `invalid_grant` → issue with rotation steps
- Auto-rotates if Google returns new token (needs `GH_PAT`)

### Quick Rotation
1. https://developers.google.com/oauthplayground
2. Gear ⚙️ > Use own credentials > paste ID+Secret
3. ✅ Auto-refresh > Gmail API v1 > gmail.readonly
4. Authorize > Exchange > copy Refresh Token
5. `gh secret set GMAIL_REFRESH_TOKEN` (paste token)

### Troubleshooting
- **400/invalid_grant**: Token expired. Do Quick Rotation above, OR set up IMAP fallback (permanent).
- **Testing mode**: 7-day expiry. Alerts fire at day 5+6.
- **Production mode**: Token permanent (if app published).

## Gmail IMAP Fallback (Permanent — No Expiry)

OAuth tokens expire every 7 days in Testing mode. IMAP with App Password **never expires**.

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
- `fetch-gmail-diagnostics.js` tries OAuth first (fast, full search)
- If OAuth fails (`invalid_grant`), automatically falls back to IMAP
- IMAP reads emails via `imap.gmail.com:993` with App Password
- Same pipeline: sanitize → parse → cross-ref → AI analyze → issues
- **No keepalive needed** — App Password is permanent

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
