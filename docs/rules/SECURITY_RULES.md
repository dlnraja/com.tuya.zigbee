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
- **`node .github/scripts/privacy-redactor.js <files...>`** — sanitize and block Gmail/Homey diagnostic outputs before commit or artifact upload

## 📬 Gmail / Diagnostic Dump Privacy Rules

Gmail and Homey diagnostic workflows are allowed to keep technical evidence only:

1. Preserve Tuya/Homey debug facts: manufacturer names (`_TZE...`), product IDs (`TS0601`), DP numbers, clusters, capabilities, app versions and sanitized error classes.
2. Redact or hash all personal/sensitive facts: email addresses, account names, usernames, phone numbers, IP/MAC addresses, local paths, IMAP UIDs, report owner IDs, tokens, passwords, API keys and raw JSON secrets.
3. Never log the Gmail account identity. Use a stable alias from `privacy-redactor.js`.
4. Never mark Gmail messages as read from automation unless a workflow is explicitly designed for mailbox operations. Diagnostic fetchers must use `markSeen: false`.
5. Run `node .github/scripts/privacy-redactor.js` before every `git add`, `git commit`, `git push`, issue creation or artifact upload that includes `.github/state/` or `diagnostics/` data.
6. Use `GITHUB_TOKEN` by default in workflows. Use `GH_PAT` only where cross-repository permissions are required and documented.
7. Raw exports must remain local and ignored by git: `.github/state/gmail-raw/`, `gmail-dumps/`, `diagnostics/raw/` and `*.raw.json`.

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
.github/state/gmail-raw/
.github/state/*raw*.json
.github/state/*gmail-dump*.json
.github/state/*diagnostics-raw*.json
diagnostics/raw/
diagnostics/**/*.raw.json
gmail-dumps/
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
