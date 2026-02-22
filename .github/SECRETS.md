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
| GH_PAT | Cross-repo access (forks, triage) |
| TRIAGE_PAT | Issue triage operations |
| GITHUB_TOKEN | Auto-provided by GitHub Actions |

Used by: tuya-automation-hub.yml, sunday-master.yml, nightly-auto-process.yml, upstream-auto-triage.yml

## Gmail OAuth Setup

1. [Google Cloud Console](https://console.cloud.google.com/) → Create project
2. Enable **Gmail API** (APIs & Services > Library)
3. Create OAuth client ID (Desktop app type)
4. Note `client_id` and `client_secret`
5. Add scope `gmail.readonly` + your email as test user
6. Get refresh token locally (one-time):
   - Use Google OAuth Playground or `googleapis` npm
   - Authorize with `gmail.readonly` scope
   - Copy the refresh token
7. Add to GitHub Secrets: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`

## Priority Setup Order
1. HOMEY_PAT - required for publishing
2. GOOGLE_API_KEY - used by most AI workflows + Gmail analysis
3. HOMEY_EMAIL + HOMEY_PASSWORD - forum posting
4. GH_PAT - cross-repo scanning
5. GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN - diagnostics pipeline
6. Remaining AI keys (any one is enough for fallback)
