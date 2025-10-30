# 🚨 BUGS CRITIQUES IDENTIFIÉS - LOGS DIAGNOSTIC

## 1. ❌ `withTimeout is not defined` (ZigbeeTimeout.js:34)
```javascript
// LIGNE 34 - ERROR
static withTimeoutAndDefault(promise, defaultValue, ms = 5000, operation = 'Operation') {
  return Promise.resolve(withTimeout(promise, ms, operation)).catch(() => defaultValue);
  //                      ^^^^^^^^^^^ MANQUE this.
}
```

## 2. ❌ `this.detectAvailableMethods is not a function` (TuyaEF00Manager.js:51)
```javascript
// LIGNE 51 - APPEL À MÉTHODE INEXISTANTE
async initialize(zclNode) {
  // ...
  this.detectAvailableMethods(); // ❌ CETTE MÉTHODE N'EXISTE PAS!
}
```

## 3. ❌ `this.tuyaEF00Manager.on is not a function` (climate_sensor_soil/device.js:103)
```javascript
// LIGNE 103+ - TuyaEF00Manager N'EST PAS UN EVENTEMITTER
this.tuyaEF00Manager.on('dp-1', (value) => { // ❌ .on() N'EXISTE PAS
  // ...
});
```

## 4. ❌ `Cannot read properties of undefined (reading 'resolve')`
Multiples endroits - Mauvaise utilisation de Promise.resolve()

## 5. ❌ Pas de données battery/sensor qui remontent
Les listeners ne fonctionnent pas car TuyaEF00Manager ne peut pas émettre d'events

## 6. ❌ Switch 2-gang toujours cassé
À investiguer séparément
