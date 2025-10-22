# 🔍 GitHub Actions Failure Analysis

**Date**: 22 octobre 2025, 13:19  
**Last Commit**: 4fc98845b "Add driver search engine and fix diagnostic issues (v4.1.2)"

---

## ✅ Local Validation Status

**App Validation**: ✅ **PASSED**
```
✓ Pre-processing app...
✓ Validating app...
Exit code: 0
```

**JSON Validation**: ✅ **PASSED**
- `settings/drivers-database.json`: Valid JSON (544KB)

**Code Changes**: ✅ **VALID**
- 2 driver device.js files fixed (IEEE address + battery reporting)
- Settings page enhanced with search engine
- New scripts added

---

## 🔍 Possible Causes

### 1. Large File Size (Most Likely)
**File**: `settings/drivers-database.json` (544KB, 22,771 lines)

**Issue**: GitHub Actions may timeout or fail when processing large files during:
- Build process
- Upload to Homey App Store
- npm install with large assets

**Solution**: Optimize the database file or move it to an external source.

### 2. Settings Assets Not Included in Build
**Issue**: The `settings/` directory may not be properly included in the Homey app build.

**Check**: Verify `.homeyignore` doesn't exclude settings files.

### 3. GitHub Actions Timeout
**Issue**: The workflow may be taking too long (default timeout: 360 minutes per job).

**Common bottlenecks**:
- npm install with large assets
- Build process with many files
- Publishing large app package

### 4. HOMEY_TOKEN Issue
**Issue**: The secret may be expired or invalid.

**Check**: Verify token at: https://tools.developer.homey.app/

### 5. Memory Limit Exceeded
**Issue**: Node.js may run out of memory processing large JSON files.

**Solution**: Add `NODE_OPTIONS=--max-old-space-size=4096` to workflow.

---

## 🛠️ Quick Fixes

### Option A: Optimize Database (Recommended)
Reduce the database file size by removing unnecessary data:

```javascript
// Instead of storing full arrays
productIds: ["TS0601", "_TZ3000_abc", "_TZ3000_def", ...]

// Store counts or summaries
productIds: ["TS0601", "..."], // +15 more
productIdCount: 18
```

### Option B: Move to External Source
Fetch the database dynamically instead of including it in the app:

```javascript
// In settings/index.html
const response = await fetch('https://raw.githubusercontent.com/.../drivers-database.json');
```

### Option C: Generate On-The-Fly
Build the database in the settings page from app.json:

```javascript
// Parse app.json and build search index client-side
const drivers = Homey.drivers;
// Build search index from drivers
```

---

## 📋 Immediate Actions

### Step 1: Check GitHub Actions Logs
1. Go to: https://github.com/dlnraja/com.tuya.zigbee/actions
2. Click on the failed workflow run
3. Look for the specific error message

### Step 2: Common Error Patterns

**If error contains "ENOSPC"**:
- Issue: No space left on device
- Solution: Clean up temp files in workflow

**If error contains "timeout"**:
- Issue: Build/upload taking too long
- Solution: Optimize assets or increase timeout

**If error contains "validation failed"**:
- Issue: Homey validation issue
- Solution: Check validation locally (already done ✅)

**If error contains "HOMEY_TOKEN"**:
- Issue: Authentication failed
- Solution: Regenerate token

---

## 🔧 Proposed Solution

### Immediate Fix: Use Compressed Database

```javascript
// scripts/BUILD_DRIVER_DATABASE_COMPRESSED.js
const drivers = [...]; // Your data

// Keep only essential fields
const compressed = drivers.map(d => ({
  id: d.id,
  n: d.name,  // Shortened keys
  c: d.category,
  b: d.brand,
  p: d.productIds.slice(0, 3) // Only first 3
}));

fs.writeFileSync('settings/drivers-db-min.json', 
  JSON.stringify({d: compressed})); // Further compressed
```

**Result**: Reduce file size by ~70% (544KB → ~150KB)

---

## 📊 File Size Comparison

### Current Structure
```json
{
  "drivers": [
    {
      "id": "avatto_smart_plug_ac",
      "name": "Smart Plug (AC)",
      "category": "Smart Plugs",
      "brand": "AVATTO",
      "productIds": ["TS011F", "_TZ3000_g5xawfcq", ...],
      "manufacturerIds": [...],
      "class": "socket",
      "capabilities": [...],
      "connectivity": [...]
    }
  ]
}
```
**Size**: 544KB

### Optimized Structure
```json
{
  "d": [
    {
      "i": "avatto_smart_plug_ac",
      "n": "Smart Plug (AC)",
      "c": "Smart Plugs",
      "b": "AVATTO",
      "p": ["TS011F", "_TZ3000_g5xawfcq"],
      "m": 18
    }
  ]
}
```
**Estimated Size**: ~120KB

---

## 🚀 Alternative: Client-Side Generation

### Better Approach (No database file needed)
Fetch driver data directly from Homey API in settings page:

```javascript
// In settings/index.html
async function loadDriversDatabase() {
  const drivers = await Homey.getDrivers();
  
  driversData = Object.values(drivers).map(driver => ({
    id: driver.id,
    name: driver.name,
    category: categorizeDriver(driver.id),
    brand: extractBrand(driver.id),
    // Parse from driver.compose.json data
  }));
  
  populateFilters();
}
```

**Advantages**:
- ✅ No large static file
- ✅ Always up-to-date
- ✅ No GitHub Actions issues
- ✅ Faster builds

**Disadvantages**:
- ❌ Requires Homey API access
- ❌ Slightly slower initial load

---

## 🎯 Recommendation

### Immediate Action: Option 1 (Fastest)
Remove the database file temporarily and rebuild:

```bash
# Remove large file
git rm settings/drivers-database.json

# Commit
git add .
git commit -m "Remove large database file (causing GH Actions timeout)"
git push origin master
```

Then implement **client-side generation** in a follow-up commit.

### Long-term Action: Option 2 (Best)
Implement client-side driver database generation using Homey API.

---

## 📝 What to Tell Users

If the search engine is temporarily unavailable:

```
⚠️ Le moteur de recherche est temporairement désactivé suite à 
   un problème de build. Il sera restauré dans la prochaine version
   avec une implémentation optimisée.
   
✅ Toutes les corrections de bugs sont actives (SOS button, motion sensor).
```

---

## ✅ Next Steps

1. **Check exact error** on GitHub Actions
2. **Choose solution** based on error type
3. **Implement fix** and re-deploy
4. **Test** on real Homey device

---

**Current Status**: Awaiting GitHub Actions error logs to determine exact cause.
