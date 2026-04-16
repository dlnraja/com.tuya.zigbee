# 📦 Homey App Publishing Guide

## 🎯 Publication Process

### Automatic Build (via GitHub Actions)

1. **Version bump** in `app.json`
2. **Commit & push** to `master`
3. **Auto-tag** creates tag (e.g., `v4.9.315`)
4. **GitHub Action** builds and publishes to Homey App Store
5. **Build appears** in Test/Draft channel

### Manual Promotion to Live

**⚠️ IMPORTANT:** Builds are published to **Test** channel by default. You must manually promote them to **Live**.

---

## 🚀 How to Promote Builds to Live

### Step 1: Access Homey Developer Dashboard

https://developer.homey.app/apps/com.dlnraja.tuya.zigbee

### Step 2: Find Your Build

In the **Builds** section, you'll see:
```
Build #603 - v4.9.311 - Test ⚠️
Build #602 - v4.9.313 - Draft ⚠️
Build #601 - v4.9.312 - Draft ⚠️
```

### Step 3: Promote to Live

For each build you want to publish:

1. **Click on the build number** (e.g., #603)
2. **Click "Promote to Live"** button
3. **Confirm** the promotion
4. Build status changes: `Test` → `Live` ✅

### Step 4: Verify

After promotion:
- Status shows **Live** ✅
- Build is available to all users
- Automatic updates roll out within 15-30 minutes

---

## 📊 Build Status Explained

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| **Draft** | Build created but not published | Promote to Test or Live |
| **Test** | Available to test users only | Promote to Live for all users |
| **Live** | Available to all users ✅ | None - published! |
| **Deprecated** | Old version, superseded | None |
| **Failed** | Build error | Check logs, fix, rebuild |

---

## 🔄 Current Versions to Promote

Based on latest builds, promote these to Live:

```bash
# Priority order:
1. v4.9.315 (Safe Migration System) - HIGHEST PRIORITY
2. v4.9.314 (Critical Bugfixes)
3. v4.9.313 (Data Collection & KPI)
4. v4.9.312 (Safe Driver Management)
5. v4.9.311 (Auto-Migration)
```

**Recommendation:** Promote **v4.9.315** directly to Live (skip intermediate versions for users).

---

## 🛠️ Troubleshooting

### Build Not Appearing?

**Wait time:** Builds can take 5-10 minutes to appear after tag push.

**Check GitHub Actions:**
https://github.com/dlnraja/com.tuya.zigbee/actions

Look for:
- ✅ "Homey App Store Publisher" (success)
- ❌ Failed? Check error logs

### Build Failed?

Common issues:

1. **Invalid app.json**
   - Check JSON syntax
   - Validate with: `homey app validate --level publish`

2. **Missing dependencies**
   - Ensure all npm packages in `package.json`
   - Run: `npm install` locally

3. **HOMEY_PAT expired**
   - Generate new token at https://developer.homey.app/tokens
   - Update GitHub secret: Settings → Secrets → HOMEY_PAT

### Can't Promote to Live?

**Possible reasons:**

1. **Validation errors** - Fix issues shown in build log
2. **Previous version still Live** - Deprecate old version first
3. **Permissions** - Ensure you're app owner/maintainer

---

## 📝 Quick Promotion Steps

### Via Dashboard (Recommended)

```
1. Go to: https://developer.homey.app/apps/com.dlnraja.tuya.zigbee
2. Click on build number (e.g., #603)
3. Click "Promote to Live"
4. Confirm
5. ✅ Done!
```

### Batch Promotion Strategy

If you have multiple versions:

**Option A: Promote Latest Only**
- Promote v4.9.315 to Live
- Users will update directly to latest
- Faster for users

**Option B: Promote All in Order**
- Promote 311 → 312 → 313 → 314 → 315
- Sequential changelog visible
- More thorough

**Recommendation:** Use **Option A** (promote 4.9.315 only).

---

## 🎯 After Promotion

### Verify Live Status

1. Check build status shows **Live** ✅
2. Version appears in Homey App Store
3. Users receive update notification

### Monitor Installs

Dashboard shows:
- **Local Installs:** Homey Pro devices
- **Cloud Installs:** Homey Cloud devices
- **Crashes:** Monitor for issues

### Rollback if Needed

If issues after promotion:

1. **Promote previous stable version** (e.g., v4.9.308)
2. **Deprecate problematic version**
3. **Fix issues and re-release**

---

## 📧 Notification Settings

To receive notifications when:
- Builds complete
- Users report issues
- Crashes detected

Go to: https://developer.homey.app/settings/notifications

Enable:
- ✅ Build completion
- ✅ Crash reports
- ✅ User feedback

---

## 🚀 Best Practices

### Before Promoting to Live

1. **Test the build** yourself
   - Install from Test channel on your Homey
   - Verify critical functionality
   - Check for crashes

2. **Review changelog**
   - Ensure all changes documented
   - Clear migration instructions if needed

3. **Check crash reports**
   - Monitor Test channel crashes
   - Fix critical issues before Live promotion

### Version Strategy

- **Major fixes:** Promote immediately to Live
- **Minor updates:** Test for 24-48 hours first
- **Experimental features:** Keep in Test longer

### Communication

- **Announce on forum** when promoting major versions
- **Update GitHub Release notes** with key changes
- **Respond to user feedback** quickly

---

## 📊 Current Status (Nov 8, 2025)

```
Published Builds:
├─ #603: v4.9.311 - Test (12 installs)
├─ #602: v4.9.313 - Draft
├─ #601: v4.9.312 - Draft
├─ #600: v4.9.308 - Test (10 installs)
└─ #599: v4.9.307 - Test (1 install)

Pending:
├─ v4.9.314 (build may still be processing)
└─ v4.9.315 (build may still be processing)

Action Required:
1. Wait for builds #604 (v4.9.314) and #605 (v4.9.315) to complete
2. Promote v4.9.315 to Live
3. Optionally deprecate older Test versions
```

---

## 🔗 Useful Links

- **Developer Dashboard:** https://developer.homey.app/apps/com.dlnraja.tuya.zigbee
- **GitHub Actions:** https://github.com/dlnraja/com.tuya.zigbee/actions
- **Token Management:** https://developer.homey.app/tokens
- **Documentation:** https://apps-sdk-v3.developer.homey.app/

---

## 💡 Pro Tips

1. **Test channel is your friend** - Always test before promoting
2. **Keep one Live version** - Avoid multiple Live versions
3. **Monitor crash rates** - Act quickly if crashes spike
4. **Document breaking changes** - Users need clear migration guides
5. **Respond to feedback** - User suggestions tab is gold

---

**Last Updated:** Nov 8, 2025  
**Current Live Version:** 4.9.308  
**Target Live Version:** 4.9.315 (Safe Migration System)
