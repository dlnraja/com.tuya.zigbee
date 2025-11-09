# 🚀 Automated Publishing via GitHub Actions

## 📋 **OVERVIEW**

This repository is configured to **automatically publish** the Homey app to the App Store via GitHub Actions.

**Workflow file:** `.github/workflows/publish.yml`

---

## 🔑 **SETUP REQUIRED**

### **1. Get Homey API Token**

You need a Homey API token to authenticate the CLI during the publish workflow.

#### **Option A: Via Homey CLI (Recommended)**

```bash
# Install Homey CLI
npm install -g homey

# Login to your Homey account
homey login

# Get your token
homey token
```

Copy the token that is displayed.

#### **Option B: Via Athom Account**

1. Go to https://my.homey.app/
2. Login with your Athom account
3. Go to Settings → API Tokens
4. Create a new token with "App Publishing" permissions

---

### **2. Add Token to GitHub Secrets**

1. Go to your repository: https://github.com/dlnraja/com.tuya.zigbee
2. Click **Settings** (top right)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**
5. Add the secret:
   - **Name:** `HOMEY_API_TOKEN`
   - **Value:** (paste your token here)
6. Click **Add secret**

---

## 🚀 **HOW TO PUBLISH**

You have **3 ways** to trigger a publish:

### **Method 1: Automatic on Tag Push** ⭐ RECOMMENDED

```bash
# 1. Update version in app.json
# app.json: "version": "4.9.327"

# 2. Commit changes
git add app.json CHANGELOG.md
git commit -m "chore: bump version to v4.9.327"

# 3. Create and push tag
git tag v4.9.327
git push origin master
git push origin v4.9.327
```

✅ **The workflow will automatically:**
- Validate the app
- Run tests
- Publish to Homey App Store
- Create a GitHub Release

---

### **Method 2: Manual Trigger**

1. Go to https://github.com/dlnraja/com.tuya.zigbee/actions
2. Click on **"Publish to Homey App Store"** workflow
3. Click **"Run workflow"** (right side)
4. Enter the version (e.g., `4.9.327`)
5. Click **"Run workflow"** button

---

### **Method 3: Local Publish** (fallback)

```bash
# If GitHub Actions fails, you can still publish locally
npm install -g homey
homey login
homey app validate --level publish
homey app publish
```

---

## 📋 **PUBLISH CHECKLIST**

Before publishing, make sure:

- [ ] ✅ Version bumped in `app.json`
- [ ] ✅ CHANGELOG.md updated
- [ ] ✅ All tests passing (`npm test`)
- [ ] ✅ App validated (`npm run validate:publish`)
- [ ] ✅ No lint errors (`npm run lint`)
- [ ] ✅ Git committed and pushed
- [ ] ✅ Tag created (for automatic publish)

---

## 🔄 **WORKFLOW PROCESS**

When you push a tag (e.g., `v4.9.327`), the workflow will:

### **Step 1: Validate** (~3 min)
```yaml
✓ Checkout code
✓ Install dependencies
✓ Run tests (mocha)
✓ Validate for publish (homey app validate --level publish)
```

### **Step 2: Publish** (~5 min)
```yaml
✓ Checkout code
✓ Install dependencies
✓ Install Homey CLI
✓ Authenticate with Homey
✓ Validate app structure
✓ Build app
✓ Publish to Homey App Store
✓ Create GitHub Release
```

### **Step 3: Notify**
```yaml
✓ Success notification (if published)
✓ Failure notification (if failed)
```

**Total time:** ~8-10 minutes

---

## 📊 **EXPECTED OUTPUT**

### **On Success ✅**

```
✅ Publish to Homey App Store
  ✓ validate / Validate App
    ✓ Run tests
    ✓ Validate for publish
  ✓ publish / Publish to Homey
    ✓ Authenticate with Homey
    ✓ Validate app structure
    ✓ Build app
    ✓ Publish to Homey App Store
    ✓ Create GitHub Release
  ✓ notify / Notify
    ✓ Success notification

✅ App published successfully!
✅ Version: v4.9.327
✅ Check: https://apps.homey.app/app/com.dlnraja.tuya.zigbee
✅ GitHub Release created: https://github.com/dlnraja/com.tuya.zigbee/releases/tag/v4.9.327
```

### **On Failure ❌**

The workflow will stop at the first error and provide detailed logs.

**Common errors:**

1. **Authentication failed:**
   - Check `HOMEY_API_TOKEN` secret is set correctly
   - Token may have expired, regenerate it

2. **Validation failed:**
   - Run `npm run validate:publish` locally
   - Fix validation errors
   - Re-commit and re-tag

3. **Tests failed:**
   - Run `npm test` locally
   - Fix failing tests
   - Re-commit and re-tag

4. **Build failed:**
   - Check app.json is valid
   - Check all required files exist
   - Run `homey app build` locally

---

## 🔧 **TROUBLESHOOTING**

### **"Authentication failed"**

```bash
# Regenerate token
homey logout
homey login
homey token

# Update GitHub secret with new token
# Settings → Secrets → HOMEY_API_TOKEN → Update
```

### **"Validation failed"**

```bash
# Test locally
npm run validate:publish

# See detailed errors
homey app validate --level publish

# Fix errors and retry
```

### **"Version already exists"**

```bash
# You're trying to publish the same version twice
# Bump version in app.json
# Create new tag and push
```

### **"Tag already exists"**

```bash
# Delete local tag
git tag -d v4.9.327

# Delete remote tag
git push origin :refs/tags/v4.9.327

# Create new tag with updated version
git tag v4.9.328
git push origin v4.9.328
```

---

## 📝 **VERSION NAMING**

Follow semantic versioning:

```
MAJOR.MINOR.PATCH

4.9.327
│ │  │
│ │  └── Patch: Bug fixes, small changes
│ └────── Minor: New features, backwards compatible
└──────── Major: Breaking changes
```

**Examples:**
- `v4.9.327` - Patch: Added TS0002 driver
- `v4.10.0` - Minor: New pairing system
- `v5.0.0` - Major: Complete rewrite

---

## 🎯 **BEST PRACTICES**

### **Before Publishing:**

1. **Test thoroughly:**
   ```bash
   npm test
   npm run lint
   npm run validate:publish
   ```

2. **Update CHANGELOG.md:**
   - Add all changes for this version
   - Follow existing format
   - Be descriptive

3. **Commit all changes:**
   ```bash
   git add -A
   git commit -m "chore: prepare v4.9.327 release"
   git push origin master
   ```

4. **Create and push tag:**
   ```bash
   git tag v4.9.327
   git push origin v4.9.327
   ```

5. **Monitor workflow:**
   - https://github.com/dlnraja/com.tuya.zigbee/actions
   - Wait for ✅ success
   - Check Homey App Store

### **After Publishing:**

1. **Verify on App Store:**
   - https://apps.homey.app/app/com.dlnraja.tuya.zigbee
   - Check version is updated
   - Test installation on a device

2. **Check GitHub Release:**
   - https://github.com/dlnraja/com.tuya.zigbee/releases
   - Verify release notes
   - Update if needed

3. **Announce:**
   - Community forum post
   - Discord announcement
   - Social media (optional)

---

## 🔐 **SECURITY**

### **Never commit:**
- ❌ `HOMEY_API_TOKEN` in code
- ❌ Personal tokens in files
- ❌ Credentials in workflow files

### **Always use:**
- ✅ GitHub Secrets for tokens
- ✅ Environment variables
- ✅ `secrets.HOMEY_API_TOKEN` in workflows

---

## 📚 **RESOURCES**

- **Homey CLI Docs:** https://apps-sdk-v3.developer.homey.app/guide/
- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Homey App Store:** https://apps.homey.app/
- **Repository Actions:** https://github.com/dlnraja/com.tuya.zigbee/actions

---

## ✅ **QUICK START**

```bash
# 1. Get token
homey token

# 2. Add to GitHub Secrets
# Settings → Secrets → New secret
# Name: HOMEY_API_TOKEN
# Value: (your token)

# 3. Publish
git tag v4.9.327
git push origin v4.9.327

# 4. Monitor
# https://github.com/dlnraja/com.tuya.zigbee/actions

# 5. Done! 🎉
```

---

**Created:** 2025-11-09  
**Workflow:** `.github/workflows/publish.yml`  
**Status:** ✅ Ready to use (after token setup)
