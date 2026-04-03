# SDK v3 HOOKS - Diagramme Exact

## LIFECYCLE HOOKS (ordre d'exécution)

```
PAIRING TIME
├── onPairListDevices()     → Liste devices disponibles
├── onPair()                → Session de pairing active
└── [Device selected]       → Création instance

DEVICE INIT
├── constructor()           → NE PAS utiliser pour logique
├── onInit()               → Init générale (non-Zigbee)
└── onNodeInit({zclNode})  → ⭐ POINT D'ENTRÉE PRINCIPAL

POST-INIT (dans onNodeInit)
├── registerCapability()    → Lier cap → cluster ZCL
├── zclNode.endpoints[x].clusters.xxx.on() → Listeners
└── setTimeout/setInterval → Enrichissement différé
```

## HOOKS À UTILISER

### onNodeInit (CRITIQUE)
```javascript
async onNodeInit({ zclNode }) {
  // 1. Stocker référence
  this.zclNode = zclNode;
  
  // 2. Détection clusters (PAS blocking)
  await this._detectCapabilities(zclNode);
  
  // 3. Listeners ZCL/DP
  await this._setupListeners(zclNode);
  
  // 4. Time Sync DIFFÉRÉ
  this.homey.setTimeout(() => this._doTimeSync(), 5000);
  
  // 5. Enrichissement DIFFÉRÉ
  this.homey.setTimeout(() => this._enrichDevice(), 10000);
}
```

### registerCapability (SDK3)
```javascript
// Pattern correct - lie capability au cluster ZCL
this.registerCapability('onoff', CLUSTER.ON_OFF);
this.registerCapability('dim', CLUSTER.LEVEL_CONTROL);
this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT);
```

## ANTI-PATTERNS (INTERDITS)

```javascript
// ❌ JAMAIS dans onNodeInit
throw new Error('Missing cluster');
if (!cluster) return this.setUnavailable();

// ❌ JAMAIS au pairing
if (!this.hasCapability('required_cap')) reject();

// ✅ TOUJOURS
try { await action(); } catch(e) { this.log('warn', e); }
```

## TIME SYNC PATTERN
```javascript
async _doTimeSync() {
  const ep = this.zclNode?.endpoints?.[1];
  if (ep?.clusters?.time) {
    const t = Math.floor(Date.now()/1000) - 946684800;
    await ep.clusters.time.writeAttributes({time: t});
  }
}
```
