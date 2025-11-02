# ⚠️ URGENT: v4.9.50 BREAKING DEVICES

**Date**: October 26, 2025 @ 13:27 UTC+1  
**Severity**: 🔴 CRITICAL  
**Status**: ROLLBACK REQUIRED

---

## 🚨 User Report

**From**: Same user (French)  
**Translation**: "It's getting worse and worse - the app no longer recognizes devices after pairing and they are recognized as unknown zigbee which is obviously not good in v50"

**Critical Detail**: Even **FRESH PAIRING** in v4.9.50 results in "Zigbee Inconnu"

This means:
- ❌ NOT a migration issue from v4.9.49
- ❌ NOT old metadata problem
- ❌ v4.9.50 fundamentally broke device identification
- ❌ Affects ALL new pairings

---

## 🔍 Impact Analysis

### What's Broken
- All devices paired on v4.9.50 show as "Unknown Zigbee"
- Device type matching completely broken
- No capabilities available
- App completely unusable for new devices

### What Works
- ❓ Unknown - need more diagnostics
- Old devices from v4.9.48 or earlier may still work
- App loads without crash

---

## 🐛 Likely Root Cause

### Hypothesis 1: Import Breaking Module Loading
```javascript
// Added in v4.9.50:
const { CLUSTER } = require('zigbee-clusters');
```

If this import fails or causes circular dependencies:
- BaseHybridDevice class fails to load
- All drivers extending it fail
- Homey can't match devices to drivers
- Result: "Unknown Zigbee"

### Hypothesis 2: Runtime Error in onNodeInit
If the CLUSTER fixes cause a runtime error during device initialization:
- Device pairs but onNodeInit() crashes
- Driver identification fails
- Device defaults to "Unknown"

### Hypothesis 3: Driver Exports Broken
If BaseHybridDevice export is broken:
- `module.exports` issue
- All child drivers fail to load
- No drivers available for matching

---

## 🔧 Immediate Actions Required

### 1. Request Full Diagnostic Log

Need user to send diagnostic with:
- Full stdout/stderr
- Device pairing attempt logs
- Driver loading errors

**Current diagnostic (4092b48f)**: stdout/stderr both "n/a" - not helpful!

### 2. Test Locally

```bash
# Check if drivers load
homey app run

# Check for errors in lib/BaseHybridDevice.js
node -c lib/BaseHybridDevice.js

# Check for module loading issues
npm test  # if tests exist
```

### 3. Consider Rollback

If issue confirmed critical:
- Revert commit e644c1f96
- Push v4.9.51 with revert
- Return to v4.9.49 state
- Re-think CLUSTER fix approach

---

## 📊 Decision Tree

### If Diagnostics Show:
**Module loading error** → Revert CLUSTER import, find alternative  
**Runtime error in onNodeInit** → Wrap CLUSTER usage in try/catch  
**Export issue** → Check module.exports in BaseHybridDevice  
**Unknown cause** → Full rollback to v4.9.49

---

## 🎯 Next Steps

1. **URGENT**: Reply to user requesting full diagnostic
2. **Test locally**: Try pairing a device on v4.9.50
3. **Check errors**: Look for driver loading failures
4. **Prepare rollback**: Have v4.9.51 revert ready
5. **Alternative fix**: Find way to fix CLUSTER issue without breaking everything

---

## 📧 Response Template

```
Bonjour,

C'est très important - j'ai besoin d'un diagnostic COMPLET avec les erreurs.

Le diagnostic actuel (4092b48f) montre "n/a" pour stdout et stderr.

SVP:
1. Ouvrir Homey app
2. Settings → Apps → Universal Tuya Zigbee
3. Envoyer diagnostic PENDANT ou JUSTE APRÈS le pairing d'un device
4. Ne pas attendre - envoyer immédiatement

J'ai besoin de voir les erreurs exactes pour comprendre pourquoi v4.9.50 casse tout.

Désolé pour les problèmes - je vais corriger ça en urgence.

Dylan
```

---

**Status**: 🔴 CRITICAL - Awaiting full diagnostics before rollback decision
