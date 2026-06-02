# 🔐 Security Rules v8.5.0
# ==========================
# Universal Tuya Zigbee — Anti-Leak & Credential Safety Protocol

## 🚨 GOLDEN RULE: NEVER COMMIT CREDENTIALS

1. **No .env files** — ever, in any branch, for any reason
2. **No hardcoded tokens** — `ghp_*`, `gho_*`, `homey_pat_*`, `AIza*`, `AKIA*`
3. **No passwords** in source code or documentation examples
4. **No GitHub tokens in remote URLs** — use SSH or `GITHUB_TOKEN` secret

## ✅ DO THIS INSTEAD

| Scenario | Correct Approach |
|----------|-----------------|
| Local API key | Create `.env` file (listed in `.gitignore`) |
| GitHub Auth | Use `GITHUB_TOKEN` (auto-provided) or `GH_PAT` (repository secret) |
| Homey Auth | Use `HOMEY_PAT` (repository secret) |
| Example values | Use `<placeholder>` or `your-actual-value-here` |

## 🔧 Automated Checks

The project includes `scripts/ci/security-scanner.js` that runs:
- **`npm run security-scan`** — scan tracked files for secrets
- **`npx security-scan`** — alias via package.json

## 📋 Pre-Commit Checklist

Before any commit:
1. Run `npm run security-scan`
2. Verify no `.env` files in `git status`
3. Verify no tokens in `git remote -v`
4. Run `git diff --cached | grep -i 'gh[pousrx]_[A-Za-z0-9_]\{36,\}'` — should return nothing

## 🔄 CI Integration

The `unified-ci.yml` workflow runs the security scanner as a required job:
- Fails if any secret patterns detected in tracked files
- Fails if `.env` or `credentials.json` committed
- Warns if remote URL contains embedded token

## 🚑 Incident Response

If a secret is committed:
1. **IMMEDIATELY** revoke the leaked credential
2. Force-push to remove from git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch <file>" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Notify repository owner
4. Rotate all affected credentials

## 📁 Files Protected by .gitignore

```
.env*
*.key
*.pem
*.token
credentials.json
secrets.json
homey-auth.*
oauth2.keys.json
client_secret*.json
.netrc
*.p12
*.pfx
*.keystore
.github/state/_new_refresh_token*
.github/state/_token_*
.github/state/*secret*
.github/state/*credential*
screenshots/
screenshots-debug/
promote-screenshots/
push-promote-screenshots/
page-dump.html
```

## ⚙️ GitHub Secrets Reference

| Secret Name | Purpose | Required For |
|-------------|---------|--------------|
| `HOMEY_PAT` | Homey publishing | `publish.yml`, `publish-stable.yml` |
| `GH_PAT` | Cross-repo access | `smart-pr-merge.yml` |
| `GOOGLE_API_KEY` | AI analysis | `unified-ci.yml` |
| `DISCOURSE_API_KEY` | Forum posting | `notifications.yml` |
| `HOMEY_EMAIL` | Forum login fallback | `notifications.yml` |
| `HOMEY_PASSWORD` | Forum login fallback | `notifications.yml` |

## 🧪 Security Scanner Output

When run successfully, the scanner:
1. Checks for forbidden files (`.env`, `credentials.json`, etc.) inside the repo
2. Checks git config for embedded tokens in remote URLs
3. Scans tracked files for secret patterns (API keys, passwords, tokens)

Exit codes:
- `0` — Clean, no issues
- `1` — Issues found (requires action)
- `2` — Scanner crashed (report bug)