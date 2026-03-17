# OAuth/API Key Migration Summary (v5.11.125+)

## ✅ Completed Changes

### 1. forum-auth.js - Priority Auth System
- **Priority 1**: `DISCOURSE_API_KEY` + `DISCOURSE_USERNAME` (admin API key, no CSRF/session)
- **Priority 2**: `HOMEY_EMAIL` + `HOMEY_PASSWORD` (SSO OAuth flow, fallback)
- **New export**: `authHeaders(auth, json)` - centralized header builder

### 2. Updated Scripts (8 files)
All forum scripts now use centralized `authHeaders` from forum-auth.js:
- `forum-auth.js` (core)
- `forum-cleanup.js`
- `forum-cleanup-edit.js`
- `forum-cleanup-now.js`
- `forum-responder.js`
- `forum-scan-spam.js`
- `forum-updater.js`
- `post-forum-update.js`

### 3. Documentation
- `SECRETS.md`: Added DISCOURSE_API_KEY and DISCOURSE_USERNAME entries
- `WORKFLOW_GUIDELINES.md`: (no pattern found to update)

## 🔄 Backward Compatible

**IMPORTANT**: Existing workflows continue to work WITHOUT changes.
- YML workflows using `HOMEY_EMAIL` + `HOMEY_PASSWORD` will use SSO fallback
- No breaking changes - all scripts validate successfully

## 🎯 Optional: YML Workflow Enhancement

To use admin API key (more reliable, no rate limits), add to workflow env:
```yaml
env:
  DISCOURSE_API_KEY: ${{ secrets.DISCOURSE_API_KEY }}
  DISCOURSE_USERNAME: ${{ secrets.DISCOURSE_USERNAME }}
  # Fallback (can keep or remove):
  HOMEY_EMAIL: ${{ secrets.HOMEY_EMAIL }}
  HOMEY_PASSWORD: ${{ secrets.HOMEY_PASSWORD }}
```

**Workflows that call forum scripts** (found 12+):
- daily-everything.yml
- forum-auto-responder.yml
- forum-cleanup-flagged.yml
- forum-merge-posts.yml
- auto-publish-on-push.yml
- github-auto-manage.yml
- auto-close-supported.yml
- cleanup-wrong-threads.yml
- And others...

## 🔐 Next Steps (Optional)

1. Generate DISCOURSE_API_KEY in Discourse admin panel
2. Add as GitHub secret: `DISCOURSE_API_KEY`
3. Add GitHub secret: `DISCOURSE_USERNAME` = "dlnraja"
4. Optionally update YML workflows to pass these secrets (not required)

## 📊 Validation Status
- ✅ All 8 scripts: Syntax validated
- ✅ Commit: 4c4efea276
- ✅ Pushed to origin/master
- ✅ No breaking changes
