# 🚀 NODE.JS 22 UPGRADE GUIDE - HOMEY APPS SDK

**Date**: 30 Oct 2025  
**Current Version**: Node.js 18  
**Target Version**: Node.js 22  
**Homey Version Required**: ≥12.9.0  
**Source**: https://apps.developer.homey.app/upgrade-guides/node-22

---

## 📊 CURRENT STATUS

### Package.json:
```json
"engines": {
  "node": ">=18.0.0"
}
```

### App.json:
```json
"compatibility": ">=12.2.0",
"sdk": 3
```

---

## 🎯 WHAT'S CHANGING

### Official Statement:
> "Homey Apps now run in a Node.js v22 environment (Homey v12.9.0+), upgraded from Node.js v16 and v18. While Node.js updates are generally backwards compatible, some issues may arise."

### Homey v12.9.0+:
- ✅ All Homey platforms now run on **Node.js 22**
- ✅ Required for new app submissions
- ✅ Existing apps need migration

### Platform Support:
- **Homey Pro (2016–2019)**: v22 (≥12.9.0)
- **Homey Pro (Early 2023)**: v22 (≥12.9.0)
- **Homey Pro (mini)**: v22 (≥12.9.0)
- **Homey Cloud**: v22 (soon)

---

## 🔍 RESEARCH - OFFICIAL DOCUMENTATION

### From Homey Apps SDK:
> "As of Homey v12.9.0, all Homey platforms run apps on Node.js v22"

### Key URLs:
- Main docs: https://apps.developer.homey.app/
- App structure: https://apps.developer.homey.app/the-basics/app
- Breaking changes: https://apps.developer.homey.app/guides/how-to-breaking-changes

---

## ⚠️ POTENTIAL BREAKING CHANGES

### Node.js 22 Changes (from Node.js 18/20):

#### 1. **V8 Engine Updates**
- New JavaScript features
- Performance improvements
- Possible syntax changes

#### 2. **Module System**
- ESM improvements
- CommonJS interop changes
- Import/require behavior

#### 3. **Crypto Updates**
- OpenSSL 3.0+ changes
- Deprecated algorithms removed
- New crypto methods

#### 4. **Dependencies**
- Native modules may need recompilation
- npm package compatibility
- Breaking changes in popular packages

#### 5. **Performance**
- Memory management changes
- Garbage collection improvements
- Event loop optimizations

---

## 📋 MIGRATION CHECKLIST

### 1. Update package.json
```json
{
  "engines": {
    "node": ">=22.0.0"
  }
}
```

### 2. Test Dependencies
```bash
npm audit
npm outdated
npm update
```

### 3. Check Native Modules
- `canvas`
- `sharp`
- `puppeteer`
- `node-gyp` based packages

### 4. Test All Features
- Driver initialization
- Zigbee communication
- Flow cards
- Settings pages
- API endpoints

### 5. Validate
```bash
homey app validate --level publish
homey app build
homey app run
```

---

## 🔧 CURRENT DEPENDENCIES CHECK

### Our Dependencies:
```json
"dependencies": {
  "homey-zigbeedriver": "^2.2.2"  // ✅ Check Node 22 compat
},
"devDependencies": {
  "axios": "^1.12.2",              // ✅ Should be OK
  "canvas": "^3.2.0",              // ⚠️ Native module
  "cheerio": "^1.1.2",             // ✅ Should be OK
  "fast-glob": "^3.3.3",           // ✅ Should be OK
  "fs-extra": "^11.3.2",           // ✅ Should be OK
  "js-yaml": "^4.1.0",             // ✅ Should be OK
  "pngjs": "^7.0.0",               // ✅ Should be OK
  "puppeteer": "^24.24.0",         // ⚠️ Check compatibility
  "sharp": "^0.34.4"               // ⚠️ Native module
}
```

### Action Items:
- ⚠️ **canvas**: Native module - may need update
- ⚠️ **sharp**: Native module - may need update  
- ⚠️ **puppeteer**: Check Node 22 compatibility
- ⚠️ **axios**: Verify no node-fetch dependency issues
- ✅ **homey-zigbeedriver**: Verify latest version

### HTTP/Fetch Related:
- 🔍 **Audit HTTP calls**: Check if using node-fetch
- ✅ **Use built-in fetch**: Prefer global fetch() in Node 18+
- ⚠️ **Add HTTP agents**: If still using node-fetch
- ✅ **Host header**: Ensure all HTTP servers handle missing Host header

---

## 🧪 TESTING STRATEGY

### Phase 1: Code Audit
```bash
# Search for node-fetch usage
grep -r "node-fetch" .

# Search for HTTP server creation
grep -r "createServer" .

# Check for fetch calls
grep -r "\.fetch(" .
```

### Phase 2: Local Testing
```bash
# Install Node 22
nvm install 22
nvm use 22

# Install dependencies
npm clean-install

# Run tests
npm test
npm run validate
```

### Phase 3: Homey Testing
```bash
# Test on dev Homey
homey app run

# Check logs
homey app log

# Test all drivers
# Test all flow cards
# Test pairing
```

### Phase 4: Production
```bash
# Final validation
homey app validate --level publish

# Build
homey app build

# Publish test version
homey app publish --changelog "Node.js 22 migration"
```

---

## 🐛 KNOWN ISSUES & SOLUTIONS (OFFICIAL)

### ⚠️ Issue 1: HTTP(S) Calls Failing with "socket hang up"/"ECONNRESET"

**Problem**: When using `node-fetch`, you may encounter ECONNRESET errors due to Node.js 19+ changes in keep-alive socket management:

```javascript
FetchError: request to <url> failed, reason: socket hang up
{ type: 'system', errno: 'ECONNRESET', code: 'ECONNRESET' }
```

**Root Cause**: Services that aggressively close idle connections + new socket management in Node.js 19+

**Solution 1: Use Custom HTTP Agent (Recommended for node-fetch)**

```javascript
const fetch = require("node-fetch");
const http = require("http");
const https = require("https");

// Create agents with keep-alive enabled
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

// Use appropriate agent for your request
fetch("https://example.com/api", {
  agent: (_parsedURL) => 
    _parsedURL.protocol === "http:" ? httpAgent : httpsAgent,
});
```

**Solution 2: Switch to Built-in fetch() (Recommended for new code)**

```javascript
// No imports needed, fetch is globally available in Node 18+
const response = await fetch("https://example.com/api");
const data = await response.json();
```

✅ **Preferred**: Built-in fetch is maintained as part of Node.js and requires no external dependencies.

**GitHub Issue**: https://github.com/node-fetch/node-fetch/issues/1735

---

### ⚠️ Issue 2: Missing Host Header Causing 400 Bad Request

**Problem**: Node.js 20+ requires a `Host` header on incoming requests. Without it, the server responds with `400 Bad Request`.

**Solution**: Add Host header to requests OR disable requirement server-side:

```javascript
http.createServer({ requireHostHeader: false });
```

**GitHub PR**: https://github.com/athombv/com.athom.homeyduino/pull/60

---

### Issue 3: Native Module Compilation
**Problem**: Canvas/Sharp fail to compile

**Solution**:
```bash
npm rebuild
# or
npm install --force
```

### Issue 4: ESM/CommonJS Conflicts
**Problem**: Import errors

**Solution**:
- Keep using CommonJS (`require`)
- SDK3 uses CommonJS
- Don't mix ESM/CommonJS

### Issue 5: Crypto Deprecations
**Problem**: Crypto warnings

**Solution**:
- Update to modern crypto APIs
- Check OpenSSL 3.0 compatibility

---

## 📦 RECOMMENDED UPDATES

### Core Updates:
```json
{
  "engines": {
    "node": ">=22.0.0"
  },
  "dependencies": {
    "homey-zigbeedriver": "^2.2.2"  // Check for updates
  },
  "devDependencies": {
    "axios": "^1.7.0",
    "canvas": "^3.2.0",      // Latest with Node 22 support
    "sharp": "^0.34.0",      // Latest with Node 22 support
    "puppeteer": "^24.0.0"   // Verify Node 22 compat
  }
}
```

---

## ⚡ PERFORMANCE EXPECTATIONS

### Node 22 Improvements:
- ✅ **15-20% faster** V8 engine
- ✅ **Better memory** management
- ✅ **Improved** async/await performance
- ✅ **Faster** module loading

### For Our App:
- ⚡ Faster driver initialization
- ⚡ Better Zigbee message handling
- ⚡ Improved flow card execution
- ⚡ Reduced memory footprint

---

## 🎯 MIGRATION PLAN

### Timeline:
```
Week 1: Research & Planning ✅ (This document)
Week 2: Dependency updates & local testing
Week 3: Homey testing
Week 4: Production migration
```

### Steps:
1. ✅ **Research** Node 22 changes
2. ⏳ **Update** package.json
3. ⏳ **Test** dependencies locally
4. ⏳ **Fix** any breaking changes
5. ⏳ **Test** on Homey dev
6. ⏳ **Validate** all features
7. ⏳ **Publish** test version
8. ⏳ **Monitor** for issues
9. ⏳ **Rollout** to production

---

## 📚 RESOURCES

### Official Documentation:
- Homey Apps SDK: https://apps.developer.homey.app/
- Node.js 22 Release Notes: https://nodejs.org/en/blog/release/v22.0.0
- Node.js API Changes: https://nodejs.org/docs/latest-v22.x/api/

### Community:
- Homey Community Forum: https://community.homey.app/
- Stack Overflow: https://stackoverflow.com/questions/tagged/homey
- GitHub Issues: https://github.com/athombv/homey-apps-sdk-issues

---

## ✅ IMMEDIATE ACTIONS

### Before Migration:
- ✅ Create this guide
- ⏳ Backup current working version
- ⏳ Create git branch `node22-migration`
- ⏳ Update dependencies
- ⏳ Run comprehensive tests

### During Migration:
- ⏳ Update package.json engines
- ⏳ Test all native modules
- ⏳ Validate with Homey CLI
- ⏳ Test on Homey device

### After Migration:
- ⏳ Monitor error logs
- ⏳ Check performance metrics
- ⏳ Update documentation
- ⏳ Notify users of update

---

## 🔄 ROLLBACK PLAN

### If Issues Arise:
```bash
# Revert package.json
git checkout main -- package.json

# Reinstall Node 18
nvm use 18
npm clean-install

# Republish previous version
homey app publish --force
```

---

## 📊 SUCCESS CRITERIA

### Migration Success = ALL of:
- ✅ homey app validate passes
- ✅ homey app build succeeds
- ✅ All 172 drivers load correctly
- ✅ All flow cards work
- ✅ Custom pairing functions
- ✅ IntelligentDataManager works
- ✅ RawDataParser works
- ✅ No performance regression
- ✅ No new errors in logs

---

## 🎉 BENEFITS

### Why Migrate:
- ✅ **Required** for new Homey versions (≥12.9.0)
- ✅ **Better performance** (15-20% faster)
- ✅ **Latest features** from Node.js
- ✅ **Security updates**
- ✅ **Long-term support**
- ✅ **Future-proof** the app

---

**Status**: 📋 Planning Phase  
**Next Step**: Update package.json and test dependencies  
**Risk Level**: ⚠️ Medium (native modules)  
**Estimated Time**: 2-3 weeks

**Note**: This is a MANDATORY migration for Homey v12.9.0+
