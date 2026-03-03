# Workflow Guidelines & Rules

> Prevent common traps, conflicts, and errors in GitHub Actions YML files.

---

## A. Secret Dependencies

| Secret | Required For | Get From |
|--------|-------------|----------|
| `HOMEY_PAT` | Publish, draft→test | https://tools.developer.homey.app/me |
| `GH_PAT` | Cross-repo (forks, triage) | GitHub Settings → Tokens (scopes: repo, read:org) |
| `GOOGLE_API_KEY` | AI analysis (Gemini) | https://aistudio.google.com/apikey |
| `DISCOURSE_API_KEY` | Forum posting | `node .github/scripts/generate-discourse-key.js` |

### Rules
1. **NEVER hardcode tokens** in YML or JS
2. **Guard missing secrets**: `if [ -z "$SECRET" ]; then exit 0; fi`
3. **Use `continue-on-error: true`** for optional-secret steps
4. **`GITHUB_TOKEN`** is auto-provided, never add manually
5. **Fallback**: `${{ secrets.GH_PAT || secrets.GITHUB_TOKEN }}`

---

## B. YML Structure Rules

### Every workflow MUST have `defaults: run: shell: bash`:
```yaml
defaults:
  run:
    shell: bash
```
**WHY**: Prevents PowerShell from blocking on `>>` and `<<` operators. All 32 workflows have this.

### Every job running scripts MUST have:
```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: '22'
- run: npm ci --prefer-offline --no-audit || npm install
```
**TRAP**: Job without `npm ci` will crash on `require('./retry-helper')` imports!

### Always include:
```yaml
permissions:
  contents: write
  issues: write
  pull-requests: write
concurrency:
  group: workflow-name
  cancel-in-progress: true
```

### Always set timeout:
```yaml
timeout-minutes: 30  # Increase for multi-step jobs (60 for nightly, 90 for daily)
```

---

## C. Common Traps

### 1. Git Push Rejected
Multiple workflows push concurrently. **Fix**: always rebase first:
```bash
git pull --rebase origin master || true
git push || true
```

### 2. Cron Conflicts
Stagger by 30+ min. Verified no conflicts exist.
Key schedule: daily-everything 02/08/14/20, nightly 03:30, auto-close 04:15, hub 01/07/13/19, sunday 07:00.

### 3. `needs:` + failed jobs
Jobs with `needs:` skip if parent failed. **Fix**: add `if: always()`.

### 4. Step ID references
Use `id: my_step` (snake_case). Reference: `steps.my_step.outcome`.

### 5. Shell = bash on Ubuntu
No PowerShell syntax. Use `${VAR}` not `$env:VAR`.
All workflows have `defaults: run: shell: bash` to enforce this.

### 6. DISCOURSE_API_KEY lint warnings
False positive — secret exists but linter doesn't know. Safe to ignore.

### 7. Discourse CSRF
After `getForumAuth()`, ALWAYS call `refreshCsrf()` or all POST/PUT/DELETE get 403 BAD CSRF.

### 8. Discourse DELETE rate limit
~2/min. Use EDIT to replace spam content instead (no rate limit on edits).

### 9. Large state files
`comprehensive-scan.json` (~22MB) is in `.gitignore`. Always `git reset HEAD` if staged.

### 10. REPLY_TOPICS — CRITICAL (updated v5.12.14)
**Bot must ONLY post on T140352** (our own thread). NEVER post on other people's threads.
```yaml
env:
  REPLY_TOPICS: "140352"
```
**ALL scripts that post to forum — verified T140352 only:**
| Script | Guard |
|--------|-------|
| `forum-responder.js` | `REPLY_TOPICS` env (default='140352') |
| `forum-respond-requests.js` | `REPLY_TOPIC` env + skip guard |
| `post-forum-update.js` | `.filter(t=>t===140352)` hardcode |
| `post-lasse-reply.js` | `topic_id:140352` hardcode |
| `update-forum-first-post.js` | `TOPIC=140352` hardcode |
| `forum-updater.js` | `TOPIC=140352` hardcode |
| `monthly-comprehensive.js` | `postToForum(140352,...)` |
| `github-issue-manager.js` | `topic_id:140352` hardcode |

**BUG FIXED v5.12.14:** `post-forum-update.js` had default `FORUM_TOPICS='140352,26439,146735'`
which caused bot to post release updates on OTHER people's threads (T26439, T146735).
Fix: hardcoded `.filter(t=>t===140352)` safety net — even if env overridden, only T140352 is used.

### 11. Auto-reopen chain
When user comments on closed issue/PR → `auto-reopen-on-comment.yml` reopens it →
`auto-respond.yml` triggers on `reopened` event → daily/nightly re-process in next cycle.

---

## D. Draft → Test Promotion

Standard 3-tier Puppeteer pattern (ALL workflows must use):
1. **Tier 1**: `npm install puppeteer --no-save` + `node .github/scripts/auto-promote-puppeteer.js`
2. **Tier 2**: `node .github/scripts/auto-publish-draft.js` (API fallback)
3. **Tier 3**: sleep 30s then re-run Puppeteer script

**TRAP**: Promote step MUST be in job with checkout + node + npm. A bare summary job will silently fail!
**TRAP**: Puppeteer needs `npm install puppeteer --no-save` before running.

---

## E. Commit Pattern

```yaml
- run: |
    git config user.name "github-actions[bot]"
    git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
    git add -A
    git diff --cached --quiet || git commit -m "auto: description [skip ci]"
    git pull --rebase origin master || true
    git push || true
```

Key: `[skip ci]` prevents infinite workflow loops.

---

## F. Rate-Limit Protection

All scripts using `gh` CLI or `fetch()` MUST have throttling:

### For `forum-auth.js` (SSO login):
All 7 fetch calls use `fetchTO()` with 15s timeout to prevent hangs during OAuth redirects.

### For `gh` CLI scripts (execSync):
```javascript
const { sleep } = require('./retry-helper');
await sleep(400); // 0.4s between API calls
```
Scripts with throttling: `triage-run.js`, `triage-upstream-enhanced.js`, `scan-forks.js`, `scan-johan-full.js`

### For fetch-based scripts:
```javascript
const { fetchWithRetry } = require('./retry-helper');
// Auto-handles: 429 backoff, GitHub X-RateLimit headers, Discourse spacing, CSRF refresh
```

### GitHub Issue Manager:
Always set `MAX_ITEMS` env to prevent unbounded API calls:
```yaml
env:
  MAX_ITEMS: "100"       # daily
  INCLUDE_CLOSED: "true" # for deep scans (sunday/monthly)
```

---

## G. Workflow Inventory (32 workflows)

| Workflow | Schedule | Steps | Key Secrets |
|----------|----------|-------|-------------|
| daily-everything | 4x/day (2,8,14,20 UTC) | 33 | ALL |
| sunday-master | Sun 07:00 | 20 jobs | ALL |
| nightly-auto-process | 03:30 daily | 15+ | ALL |
| auto-close-supported | 04:15 daily + Sun 15:00 | batch close | GH_PAT |
| upstream-auto-triage | Mon 05:00 | triage both repos | GH_PAT |
| weekly-fingerprint-sync | Mon 06:00 | Z2M/ZHA sync | GH_PAT |
| monthly-comprehensive-sync | 1st 01:00 | deep scan | ALL |
| auto-respond | on issue/PR open | FP check | GITHUB_TOKEN |
| auto-reopen-on-comment | on comment | reopen closed | GITHUB_TOKEN |
| stale | daily | mark+close inactive | GITHUB_TOKEN |
| publish | manual | Homey publish | HOMEY_PAT |
| auto-publish-on-push | on workflow complete | publish+promote | HOMEY_PAT |
| gmail-token-keepalive | 4x/day (5,11,17,23 UTC) | token refresh | GMAIL_* |
| deploy-pages | on push + daily | Device Finder | GITHUB_TOKEN |
| tuya-automation-hub | 4x/day (1,7,13,19) + Mon/Thu | forum+github | ALL |
| forum-auto-responder | 4x/day (5,11,17,23) | forum respond | DISCOURSE_API_KEY |
| cleanup-wrong-threads | manual | cleanup bot posts | DISCOURSE_API_KEY |
| code-quality | Wed 03:00 + on push | quality checks | — |
| dependabot-auto-merge | on PR | auto-merge deps | GH_PAT |

See `.github/SECRETS.md` for full secret reference.

---

## H. Sensor DP Discovery

New sensor variants (soil+fertilizer, air+VOC) may have unknown DPs.
1. Check fingerprint in `driver.compose.json`
2. Standard DPs work (soil: DP3/5/14/15)
3. Unknown DPs logged by `_handleDP()` — ask user for logs
4. Create capability in `.homeycompose/capabilities/`
5. Add DP mapping in `device.js`

### Known Pending: `_TZE284_hdml1aav` fertilizer/EC DP (unknown)

---

## I. Auto-Reopen Guard (v5.12.x)

`auto-reopen-on-comment.yml` skips reopening when:
- Commenter is `dlnraja`, `github-actions[bot]`, or `dependabot[bot]`
- Comment < 5 chars, issue closed < 2min ago, or "thank you" patterns

**BUG FIXED:** dlnraja commenting on closed issues (to confirm resolution)
triggered the auto-reopen bot → infinite close/reopen loop.
Fix: added `dlnraja` to both the `if:` condition AND the `SKIP_USERS` array.
