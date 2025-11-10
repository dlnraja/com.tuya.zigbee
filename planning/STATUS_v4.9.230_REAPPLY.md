# STATUS - v4.9.230 À RÉAPPLIQUER

## SITUATION

GitHub Actions a auto-increment à v4.9.222
Mes changements v4.9.230 perdus dans reset --hard
Besoin de réappliquer les fixes:

1. ✅ Time sync correction (TuyaEF00Manager.js)
2. ✅ Data reporting (BaseHybridDevice.js registerCapability calls)
3. ❌ À FAIRE: Système automatique flow cards

## FIXES À RÉAPPLIQUER

### 1. TuyaEF00Manager.js ligne 113-132
```javascript
// Send via dataRequest (correct SDK3 method)
try {
  await tuyaCluster.dataRequest({
    dp: dp,
    datatype: datatype,
    data: payload
  });
  this.device.log('[TUYA] ✅ Time sync sent via dataRequest');
  return true;
} catch (err1) {
  // Fallback: try sendFrame with correct syntax
  try {
    await endpoint.sendFrame(0xEF00, frame, 0x00);
    this.device.log('[TUYA] ✅ Time sync sent via sendFrame');
    return true;
  } catch (err2) {
    this.device.log(`[TUYA] ❌ Time sync failed both methods:`, err1.message, err2.message);
    return false;
  }
}
```

### 2. BaseHybridDevice.js ligne 315 (après temperature read)
```javascript
// CRITICAL FIX: Register capability listener for future updates!
this.log('[TEMP] 🔔 Registering temperature listener...');
await this.registerTemperatureCapability();
```

### 3. BaseHybridDevice.js ligne 334 (après humidity read)
```javascript
// CRITICAL FIX: Register capability listener for future updates!
this.log('[HUMID] 🔔 Registering humidity listener...');
await this.registerHumidityCapability();
```

## PROCHAINES ÉTAPES

1. Réappliquer ces 3 fixes
2. Version: v4.9.230
3. Commit + push
4. Créer système automatique flow cards
5. Tester avec utilisateur

## USER REQUEST

"Corriger TOUS flow cards partout et ajouter moyens d'en créer de façon automatique en fonction des capabilities"
