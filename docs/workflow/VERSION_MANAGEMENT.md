# 🔢 Intelligent Version Management

## 📋 Overview

The workflow has been optimized for **MANUAL VERSION CONTROL** with intelligent automation.

## 🎯 Philosophy

**YOU control versions, GitHub Actions publishes them.**

- ✅ Manual version increments for meaningful releases
- ✅ Descriptive changelogs for each version
- ✅ Automatic publication without auto-increment
- ✅ No version conflicts or race conditions

## 🔄 Workflow Pipeline

### Current Setup (Optimized)

```yaml
1. update-docs → Auto-update links, paths, README
2. validate → Validate app at publish level
3. version → READ current version from app.json
4. publish → Publish THAT version to Homey App Store
```

**Key Change:** Step 3 no longer AUTO-INCREMENTS!

## 📝 How to Release a New Version

### Step 1: Update Version Manually

Edit `app.json`:
```json
{
  "version": "3.1.10"  // Increment manually
}
```

### Step 2: Update Changelog

Edit `.homeychangelog.json`:
```json
{
  "3.1.10": {
    "en": "🔧 YOUR MEANINGFUL CHANGELOG HERE\n✅ Feature 1\n✅ Feature 2\n✅ Bug fix"
  }
}
```

### Step 3: Commit & Push

```bash
git add app.json .homeychangelog.json
git commit -m "chore: Bump version to 3.1.10"
git push origin master
```

### Step 4: Watch GitHub Actions

The workflow will:
1. ✅ Validate the app
2. ✅ Read version 3.1.10 from app.json
3. ✅ Create GitHub Release v3.1.10
4. ✅ Publish v3.1.10 to Homey App Store

## 🎨 Version Numbering Strategy

### Semantic Versioning: MAJOR.MINOR.PATCH

**MAJOR** (3.x.x):
- Breaking changes
- Major SDK upgrades
- Complete rewrites

**MINOR** (x.1.x):
- New features
- New drivers (bulk)
- Significant improvements

**PATCH** (x.x.9):
- Bug fixes
- Small improvements
- Individual driver additions
- Cluster fixes

### Examples from This Session

- `3.1.9` → Critical fixes + 126 cluster conversions (PATCH)
- `3.2.0` → Would be: +50 new drivers (MINOR)
- `4.0.0` → Would be: SDK4 migration (MAJOR)

## 🚫 What NOT to Do

❌ **Don't auto-increment in workflow**
```yaml
# BAD - causes conflicts
uses: athombv/github-action-homey-app-version@master
with:
  version: patch  # NO!
```

❌ **Don't use generic changelogs**
```json
{
  "3.1.9": {
    "en": "Automated release"  // NO! Be specific!
  }
}
```

❌ **Don't skip version updates**
```bash
# BAD - publishes same version twice
git commit -m "fix: Some bug"
git push  # Will fail if version unchanged
```

## ✅ Best Practices

### 1. Meaningful Changelogs

**Good:**
```json
{
  "3.1.9": {
    "en": "🔧 CRITICAL FIXES\n✅ Fixed diagnostic ef9db7d4\n✅ ALL cluster IDs numeric (126 fixes)\n✅ Custom clusters support"
  }
}
```

**Bad:**
```json
{
  "3.1.9": {
    "en": "Bug fixes"  // Too vague!
  }
}
```

### 2. Logical Grouping

Combine related changes in one version:
```
3.1.9:
- Fix diagnostic ef9db7d4
- Convert ALL clusters to numeric
- Add README.txt
- Fix GitHub Actions
```

### 3. Version Branches (Optional)

For major changes:
```bash
git checkout -b feature/sdk4-migration
# Make changes
# When ready:
# Update version to 4.0.0
git checkout master
git merge feature/sdk4-migration
git push
```

## 🔍 Checking Current Version

### Via Git
```bash
git show HEAD:app.json | grep version
```

### Via Node.js
```bash
node -p "require('./app.json').version"
```

### Via GitHub
Check latest tag: https://github.com/dlnraja/com.tuya.zigbee/tags

## 📊 Version History

### Our Session (Oct 19-20, 2025)

| Version | Commits | Description |
|---------|---------|-------------|
| 3.1.7 | 1-20 | Massive expansion (190 drivers, 12,563+ IDs) |
| 3.1.8 | - | (Already published externally) |
| 3.1.9 | 21-28 | Critical fixes (clusters, diagnostic, workflows) |

## 🎯 Future Versions (Planned)

- **3.1.10+**: Bug fixes, individual driver additions
- **3.2.0**: Next major feature set (TBD)
- **4.0.0**: SDK4 migration (when Homey releases it)

## 🚀 Quick Reference

### To Release New Version:

1. **Edit** `app.json` → Increment version
2. **Edit** `.homeychangelog.json` → Add meaningful changelog
3. **Commit** → `git commit -m "chore: Bump version to X.Y.Z"`
4. **Push** → `git push origin master`
5. **Watch** → GitHub Actions will auto-publish

### Version Already Published?

**Error:** `✖ version X.Y.Z has already been published`

**Solution:** Increment to next version (X.Y.Z+1)

## 📚 References

- [Semantic Versioning](https://semver.org/)
- [Homey App Store Guidelines](https://apps.developer.homey.app/app-store/guidelines)
- [GitHub Actions Workflow](/.github/workflows/homey-official-publish.yml)

## 🏆 Why This Approach?

**Before (Auto-increment):**
- ❌ Version conflicts
- ❌ Generic "Automated release" changelogs
- ❌ No control over version numbers
- ❌ Race conditions between workflows

**Now (Manual control):**
- ✅ Full version control
- ✅ Meaningful changelogs
- ✅ Predictable releases
- ✅ Professional versioning
- ✅ No conflicts

---

**Last Updated:** October 20, 2025  
**Current Version:** 3.1.9  
**Status:** ✅ Production Ready
