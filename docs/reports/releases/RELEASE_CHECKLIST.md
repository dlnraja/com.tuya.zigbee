# ✅ Release Checklist - Universal Tuya Zigbee

**Pre-submission quality gate for Homey App Store**

---

## 🎯 Release Candidate Requirements

Before submitting to Homey App Store or creating a release tag, verify ALL items below:

---

## 1. 🖼️ Assets & Visuals

### App Icons
- [ ] `assets/images/small.png` (250x175px) exists and displays correctly
- [ ] `assets/images/large.png` (500x350px) exists and displays correctly  
- [ ] `assets/images/xlarge.png` (1000x700px) exists and displays correctly
- [ ] `assets/icon.svg` exists (preview icon)
- [ ] No "black square" icons (test in Homey app preview)
- [ ] Icons have proper background (not transparent mask)
- [ ] All PNG files < 500KB each

### Driver Icons
- [ ] Sample 10 random drivers → Check icons display correctly
- [ ] No missing `assets/images/[driver]` folders
- [ ] Driver icons consistent style/theme

**Test Command**:
```bash
# Check all assets exist
find assets/images -name "*.png" -o -name "*.svg" | wc -l
# Should be > 200 files (app icons + driver icons)
```

---

## 2. ✅ Homey Validation

### Validate Command
- [ ] Run: `npx homey app validate --level publish`
- [ ] **0 errors** (warnings tolerated if justified)
- [ ] Log artifacts uploaded to GitHub Actions
- [ ] Public link to latest validation log available

### app.json Coherence
- [ ] `app.json` version matches `package.json` version
- [ ] `app.json` SDK version = 3
- [ ] `app.json` compatibility >= 12.2.0
- [ ] Description (EN) updated with latest stats
- [ ] Description (FR) updated with latest stats
- [ ] Category appropriate ("appliances")
- [ ] Brand color defined

**Test Commands**:
```bash
npx homey app validate --level publish
node -p "require('./app.json').version === require('./package.json').version"
```

---

## 3. 📊 Device Matrix

### Matrix Generation
- [ ] Run: `node scripts/build-device-matrix.js`
- [ ] `matrix/devices.json` generated (no errors)
- [ ] `matrix/devices.csv` generated
- [ ] `matrix/DEVICE_MATRIX.md` updated with count
- [ ] Device count in README matches matrix count

### Matrix Quality
- [ ] No duplicate device IDs across drivers
- [ ] All drivers have at least 1 manufacturer ID
- [ ] Driver names user-friendly (no codes/abbreviations)
- [ ] Capabilities list accurate for each driver

**Test Command**:
```bash
node scripts/build-device-matrix.js
MATRIX_COUNT=$(node -p "require('./matrix/devices.json').length")
echo "Matrix has $MATRIX_COUNT devices"
```

**Expected**: Count > 180 devices

---

## 4. 📚 Documentation

### Core Docs
- [ ] `README.md` updated with latest version
- [ ] `README.md` has "Install CLI" section at top
- [ ] `README.md` states "App Store: pending review" (if not live)
- [ ] `README.md` includes "Transparency (CI)" section
- [ ] `README.md` has 2 CI badges (Build + Matrix) linking to GitHub Actions
- [ ] `ZIGBEE_COOKBOOK.md` exists and is complete
- [ ] `LOGGING_GUIDE.md` exists (for developers)
- [ ] `CHANGELOG.md` updated with release notes

### GitHub Links
- [ ] README links to: Matrix, Cookbook, Device Request, Forum
- [ ] All 4 links tested and working
- [ ] CI artifacts downloadable (test latest workflow run)

### Homey Store Description
- [ ] `.homeychangelog.json` has entry for this version
- [ ] Changelog entry (EN) complete and accurate
- [ ] Changelog entry (FR) complete and accurate
- [ ] Changelog highlights key fixes/features
- [ ] No emoji overload (max 5 emoji total)

---

## 5. 🐛 Known Issues

### Critical Issues (Must Fix)
- [ ] No "device paired but completely broken" issues open
- [ ] No data corruption bugs (battery 200%, temp 255°C)
- [ ] No safety-critical bugs (smoke/gas alarms, water leak)
- [ ] No blocking pairing issues for major device types

### Documented Issues
- [ ] Known limitations documented in CHANGELOG ("Known Issues" section)
- [ ] Workarounds provided for medium-priority bugs
- [ ] Beta features clearly marked as "experimental"

**Check**:
```bash
# Review open critical issues on GitHub
# Check forum for recent "not working" reports
```

---

## 6. 🧪 Testing

### Manual Testing (Sample Drivers)
- [ ] **Motion sensor** - Pairing works, triggers alarm
- [ ] **Temperature sensor** - Reports temp/humidity correctly
- [ ] **Smart plug** - On/off + power monitoring works
- [ ] **Light bulb** - Dim + color (if applicable) works
- [ ] **Thermostat** - Mode changes work, temp setpoint applies
- [ ] **Curtain/blind** - Open/close/position works

### Automated Tests
- [ ] `npm test` passes (if tests exist)
- [ ] ESLint shows < 50 warnings
- [ ] No syntax errors in any driver

**Test Command**:
```bash
npx eslint . --max-warnings 50
```

---

## 7. 🔗 CI/CD Pipeline

### GitHub Actions
- [ ] Workflow `build.yml` runs on every push
- [ ] Workflow succeeds (green checkmark)
- [ ] Artifacts uploaded successfully
- [ ] Artifacts retention = 30-90 days
- [ ] Badge in README links to latest workflow run

### Transparency
- [ ] Public can download validation logs (no auth required)
- [ ] Public can download device matrix JSON/CSV
- [ ] GitHub Actions tab visible (repo not private)

**Verify**:
```
Go to: https://github.com/dlnraja/com.tuya.zigbee/actions
Check: Latest run has artifacts
Download: build-artifacts.zip
Verify: Contains devices.json + validation logs
```

---

## 8. 🌍 Community

### Forum Presence
- [ ] Forum thread pinned (or first post updated)
- [ ] First post contains 4 key links (README, Cookbook, Matrix, Device Request)
- [ ] Recent questions answered (< 7 days old)
- [ ] Device requests acknowledged (< 48h old)

### GitHub
- [ ] Device Request template functional
- [ ] Bug Report template functional (if exists)
- [ ] Recent issues triaged (< 7 days old)
- [ ] PRs reviewed (< 14 days old)

### Tone
- [ ] No "competitor bashing" in README/forum
- [ ] Neutral "Local vs Cloud" comparison (if present)
- [ ] Professional, helpful responses to users

---

## 9. 📦 Version & Git

### Version Bump
- [ ] `package.json` version incremented (semver)
- [ ] `app.json` version matches package.json
- [ ] `.homeychangelog.json` has new version entry
- [ ] Git tag created: `git tag v3.0.XX`
- [ ] Tag pushed: `git push origin v3.0.XX`

### Git Hygiene
- [ ] All changes committed
- [ ] Working tree clean (`git status`)
- [ ] Pushed to `master` branch
- [ ] No merge conflicts
- [ ] No large files (>100MB) in history

**Commands**:
```bash
git status  # Should show "nothing to commit, working tree clean"
git log -1  # Verify commit message describes release
git tag v3.0.50
git push origin master --tags
```

---

## 10. 🚀 Deployment

### Homey CLI
- [ ] Installed: `npm install -g homey`
- [ ] Logged in: `homey login`
- [ ] Validated: `homey app validate --level publish`
- [ ] Build test: `homey app build` (no errors)

### App Store Submission (Manual)
- [ ] Run: `homey app publish` (if ready)
- [ ] Submission email received from Athom
- [ ] Review link checked (if provided)
- [ ] Response time: typically 1-7 days

**OR**

### GitHub Release (if not submitting yet)
- [ ] Create GitHub Release with tag
- [ ] Release notes = CHANGELOG excerpt
- [ ] Attach `com.dlnraja.tuya.zigbee.tar.gz` (build output)
- [ ] Mark as "Pre-release" if beta

---

## ✅ Sign-Off

**Release Manager**: _________________  
**Date**: _________________  
**Version**: v3.0.___  

**Pre-Flight Check**:
- [ ] All 10 sections above completed
- [ ] No critical blockers remain
- [ ] Community notified (forum post)
- [ ] CI/CD green (all checks pass)

**Status**:
- [ ] ✅ **READY FOR APP STORE**
- [ ] ⚠️ **BETA RELEASE** (GitHub only)
- [ ] ❌ **NOT READY** (blockers remain)

---

## 📝 Post-Release

### After App Store Approval
- [ ] Update README: Remove "pending review", add Store link
- [ ] Forum announcement: "v3.0.XX now live in App Store!"
- [ ] Monitor for 48h: Check for critical bugs
- [ ] Respond to reviews: Thank users, address concerns

### After GitHub Release
- [ ] Forum announcement: "v3.0.XX beta available"
- [ ] Installation instructions: `homey app install` from repo
- [ ] Request testing feedback from community

---

## 🔗 Quick Commands Reference

```bash
# Full pre-release validation
npx homey app validate --level publish
node scripts/build-device-matrix.js
npx eslint . --max-warnings 50
npm test

# Version & publish
npm version patch  # or minor/major
git add -A
git commit -m "chore: release v3.0.XX"
git tag v3.0.XX
git push origin master --tags
homey app publish

# Check CI
# Visit: https://github.com/dlnraja/com.tuya.zigbee/actions
# Download latest artifacts
# Verify: devices.json present + validation log clean
```

---

**This checklist ensures quality, transparency, and professionalism before every release.** ✅

**Last Updated**: v3.0.50 - October 2025
