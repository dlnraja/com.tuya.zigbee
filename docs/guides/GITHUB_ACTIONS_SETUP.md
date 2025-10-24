# 🚀 GitHub Actions Setup - Official Homey Actions

**Date:** 2025-10-11 14:39  
**Status:** ✅ **READY TO CONFIGURE**  
**Actions:** Official Athom Marketplace

---

## ✅ What's Configured

### Active Workflows

1. **homey-app-cicd.yml** ⭐ MAIN WORKFLOW
   - **Validates** app automatically on push
   - **Publishes** on manual dispatch
   - Uses official Athom actions

2. **homey-validate.yml**
   - Multi-level validation on PRs
   - Runs automatically on pull requests

---

## 🎯 Quick Setup (2 Steps)

### Step 1: Get Homey Personal Access Token

```
1. Go to: https://tools.developer.homey.app/me
2. Scroll to "Personal Access Tokens"
3. Click "Create new token"
4. Give it a name: "GitHub Actions"
5. Copy the token (shown once!)
```

### Step 2: Add Token to GitHub

```
1. Go to: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions
2. Click "New repository secret"
3. Name: HOMEY_PAT
4. Value: <paste token from Step 1>
5. Click "Add secret"
```

**That's it!** GitHub Actions is now fully configured.

---

## 🎮 How to Use

### Automatic Validation

**Triggers automatically:**
- Every push to `master` (except `.md` files)
- Every pull request

**What it does:**
- ✅ Validates app at publish level
- ✅ Shows results in Actions tab

**No action required from you!**

---

### Manual Publication

**When to use:**
- Ready to publish new version
- Bug fixes completed
- New devices added

**Steps:**

1. **Go to GitHub Actions:**
   ```
   https://github.com/dlnraja/com.tuya.zigbee/actions
   ```

2. **Select workflow:**
   - Click "Homey App CI/CD"

3. **Run workflow:**
   - Click "Run workflow"
   - Choose:
     - **Branch:** master
     - **Version type:** patch/minor/major
     - **Changelog:** (optional, auto-generated if empty)
   - Click "Run workflow"

4. **Monitor:**
   - Watch progress in Actions tab
   - Wait for green checkmark

5. **On Homey Dashboard:**
   ```
   https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
   ```
   - New build appears as "Draft"
   - Click "Promote to Test"
   - Or submit for certification

---

## 📊 Workflow Details

### homey-app-cicd.yml

**Job 1: Validate**
- **Triggers:** Push to master
- **Action:** `athombv/github-action-homey-app-validate@master`
- **Level:** publish
- **Duration:** ~1-2 minutes

**Job 2: Publish**
- **Triggers:** Manual dispatch only
- **Actions:**
  1. `athombv/github-action-homey-app-version@master`
     - Updates version in app.json
     - Updates .homeychangelog.json
  2. Git commit and push
  3. `athombv/github-action-homey-app-publish@master`
     - Publishes to Homey App Store
- **Duration:** ~3-5 minutes

---

## 🔍 Version Types

| Type | When to Use | Example |
|------|-------------|---------|
| **patch** | Bug fixes, minor updates | 2.1.51 → 2.1.52 |
| **minor** | New features, devices | 2.1.51 → 2.2.0 |
| **major** | Breaking changes | 2.1.51 → 3.0.0 |

**Recommendation:** Use `patch` for most updates.

---

## 📝 Changelog

### Auto-Generated

If you leave changelog empty, it generates based on commit message:

| Commit starts with | Generated changelog |
|-------------------|---------------------|
| `feat:` or `feature:` | "New features and device support added" |
| `fix:` or `bug:` | "Bug fixes and stability improvements" |
| `device`, `manufacturer`, `driver` | "Enhanced device compatibility" |
| Other | "Performance and stability improvements" |

### Custom Changelog

Enter your own message in the workflow dispatch input.

**Tip:** Keep it under 400 characters (Homey limit).

---

## ✅ Verification

### Check Workflow Runs

```
https://github.com/dlnraja/com.tuya.zigbee/actions
```

**Look for:**
- ✅ Green checkmark = Success
- ❌ Red X = Failed (check logs)
- 🟡 Yellow circle = Running

### Check Homey Dashboard

```
https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
```

**After successful publish:**
- New build appears
- Status shows "Draft"
- Ready to promote

---

## 🐛 Troubleshooting

### Error: "HOMEY_PAT not found"

**Solution:**
- Verify secret is named exactly `HOMEY_PAT` (case-sensitive)
- Check: https://github.com/dlnraja/com.tuya.zigbee/settings/secrets/actions

### Error: "Validation failed"

**Solution:**
```bash
# Run locally first
npx homey app validate --level publish

# Fix reported errors
# Then try workflow again
```

### Error: "Authentication failed"

**Solution:**
- Token may be expired
- Generate new token at https://tools.developer.homey.app/me
- Update GitHub secret

### Workflow doesn't trigger

**Solution:**
- Check you're on `master` branch
- Verify paths-ignore doesn't match your changes
- Try manual dispatch instead

---

## 📚 Official Documentation

### Athom Actions

1. **Validate:**
   - https://github.com/marketplace/actions/homey-app-validate
   - Repository: https://github.com/athombv/github-action-homey-app-validate

2. **Update Version:**
   - https://github.com/marketplace/actions/homey-app-update-version
   - Repository: https://github.com/athombv/github-action-homey-app-version

3. **Publish:**
   - https://github.com/marketplace/actions/homey-app-publish
   - Repository: https://github.com/athombv/github-action-homey-app-publish

### Homey Developer

- **Main Docs:** https://apps.developer.homey.app/the-basics/app/publishing
- **Tools:** https://tools.developer.homey.app
- **Dashboard:** https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee

---

## 🎯 Complete Publication Flow

```
┌─────────────────────────────────────┐
│ 1. Push code changes                │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 2. Auto Validation (GitHub Actions) │
│    ✅ Validates at publish level    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 3. Manual Dispatch (when ready)     │
│    • Choose version type            │
│    • Optional changelog             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 4. GitHub Actions Runs              │
│    ✅ Updates version               │
│    ✅ Commits to git                │
│    ✅ Publishes to Homey            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 5. Homey Dashboard                  │
│    • New build created (Draft)      │
│    • Ready to promote               │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 6. Promote to Test (Manual)         │
│    • Test URL active                │
│    • Community testing              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ 7. Submit for Certification (Opt.)  │
│    • Athom review (1-3 days)        │
│    • Promote to Live                │
└─────────────────────────────────────┘
```

---

## 🎓 Best Practices

### Before Publishing

1. ✅ Test locally: `npx homey app install`
2. ✅ Validate: `npx homey app validate --level publish`
3. ✅ Update CHANGELOG.md
4. ✅ Commit all changes
5. ✅ Push to master (triggers validation)

### During Publishing

1. ✅ Wait for validation to pass
2. ✅ Use manual dispatch
3. ✅ Choose appropriate version type
4. ✅ Provide meaningful changelog
5. ✅ Monitor Actions tab

### After Publishing

1. ✅ Check Homey Dashboard
2. ✅ Promote to Test
3. ✅ Test with Test URL
4. ✅ Collect feedback
5. ✅ Submit for certification (if desired)

---

## 📞 Support

### Documentation

- **This Guide:** GITHUB_ACTIONS_SETUP.md
- **Workflows Guide:** [.github/workflows/OFFICIAL_WORKFLOWS_GUIDE.md](.github/workflows/OFFICIAL_WORKFLOWS_GUIDE.md)
- **Quick Start:** [QUICK_START_PUBLICATION.md](QUICK_START_PUBLICATION.md)
- **Full Guide:** [PUBLICATION_GUIDE_OFFICIELLE.md](PUBLICATION_GUIDE_OFFICIELLE.md)

### Community

- **Forum:** https://community.homey.app/t/140352/
- **GitHub Issues:** https://github.com/dlnraja/com.tuya.zigbee/issues

---

## ✅ Ready to Publish!

**Your setup is complete. Next steps:**

1. ⏳ **Configure HOMEY_PAT** (Step 1 & 2 above) - **DO THIS NOW**
2. ⏳ **Test workflow** with manual dispatch
3. ⏳ **Promote to Test** on Homey Dashboard
4. ⏳ **Community testing** via test URL
5. ⏳ **Submit for certification** (optional)

---

**Status:** ✅ **CONFIGURED & READY**  
**Created:** 2025-10-11 14:39  
**Next:** Configure HOMEY_PAT secret

---

**Made with ❤️ using Official Athom GitHub Actions**
