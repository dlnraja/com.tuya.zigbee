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

### Every job running scripts MUST have:
```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: '22'
- run: npm ci --prefer-offline --no-audit || npm install
```
**TRAP**: Job without checkout will silently fail on `node` scripts!

### Always include:
```yaml
permissions:
  contents: write
concurrency:
  group: workflow-name
  cancel-in-progress: true
```

### Always set timeout:
```yaml
timeout-minutes: 30
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
Stagger by 30+ min: daily-everything 02:00, nightly 03:30, hub 06:00, sunday 07:00.

### 3. `needs:` + failed jobs
Jobs with `needs:` skip if parent failed. **Fix**: add `if: always()`.

### 4. Step ID references
Use `id: my_step` (snake_case). Reference: `steps.my_step.outcome`.

### 5. Shell = bash on Ubuntu
No PowerShell syntax. Use `${VAR}` not `$env:VAR`.

### 6. DISCOURSE_API_KEY lint warnings
False positive — secret exists but linter doesn't know. Safe to ignore.

---

## D. Draft → Test Promotion

Standard 3-tier pattern (ALL workflows must use):
1. **Node script**: `node .github/scripts/auto-publish-draft.js`
2. **Curl fallback**: delegation token + REST API call
3. **Verify retry**: sleep 20s then re-run Node script

**TRAP**: Promote step MUST be in job with checkout + node + npm. A bare summary job will silently fail!

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

## F. Workflow Inventory

| Workflow | Schedule | Key Secrets |
|----------|----------|-------------|
| daily-everything | 4x/day (2,8,14,20 UTC) | ALL |
| sunday-master | Sun 07:00 | ALL |
| nightly-auto-process | 03:30 daily | HOMEY_PAT, GH_PAT, GOOGLE |
| publish | manual | HOMEY_PAT |
| auto-publish-on-push | on push master | HOMEY_PAT |
| daily-promote-to-test | daily | HOMEY_PAT |

See `.github/SECRETS.md` for full secret reference.
