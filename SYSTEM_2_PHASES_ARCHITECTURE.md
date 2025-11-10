# 🏗️ SYSTÈME 2-PHASES - ARCHITECTURE COMPLÈTE

## 📋 OVERVIEW

Système intelligent en 2 phases pour drivers Zigbee:

**PHASE 1 - STATIQUE (Base)**:
- Détection automatique type d'énergie (AC/DC/Battery)
- Activation capabilities de base (statiques)
- Support Zigbee natif ET custom (Tuya, Xiaomi, etc.)
- Fonctionnement garanti même si Phase 2 échoue

**PHASE 2 - DYNAMIQUE (Intelligent)**:
- Après initialization complète
- Scan clusters disponibles
- Détection capabilities manquantes  
- Activation dynamique des features découvertes
- Enrichissement progressif

---

## 🎯 PHASE 1: MODE STATIQUE (BASE)

### Objectifs:
✅ Device fonctionnel dès le pairing
✅ Capabilities déclarées dans driver.compose.json actives
✅ Détection power source fiable
✅ Pas de crash si erreur

### Implémentation dans BaseHybridDevice.js:

```javascript
async onNodeInit({ zclNode }) {
  try {
    this.log('[INIT] 🚀 Starting Phase 1: STATIC initialization...');
    
    // 1. POWER DETECTION (CRITICAL)
    await this.detectPowerSource();
    // Result: this.powerType = 'AC' | 'DC' | 'BATTERY'
    
    // 2. CONFIGURE STATIC CAPABILITIES
    await this.configureStaticCapabilities();
    // Activate capabilities from driver.compose.json
    
    // 3. SETUP ZIGBEE NATIVE CLUSTERS
    await this.setupNativeClusters();
    // Temperature, Humidity, Battery, OnOff, etc.
    
    // 4. SETUP CUSTOM PROTOCOLS
    await this.setupCustomProtocols();
    // Tuya DP, Xiaomi custom, etc.
    
    // 5. MARK DEVICE AS AVAILABLE
    await this.setAvailable();
    this.log('[OK] ✅ Phase 1 complete - Device operational!');
    
    // 6. START PHASE 2 IN BACKGROUND
    this.schedulePhase2();
    
  } catch (err) {
    this.error('[PHASE1] ❌ Critical error:', err);
    // Device reste disponible avec capabilities de base
    await this.setAvailable();
  }
}
```

### 1.1 Power Detection (ROBUSTE):

```javascript
async detectPowerSource() {
  try {
    this.log('[POWER] 🔋 Detecting power source...');
    
    // Method 1: Read powerSource attribute
    try {
      const endpoint = this.zclNode.endpoints[1];
      const powerCluster = endpoint?.clusters?.powerConfiguration;
      
      if (powerCluster) {
        const { powerSource } = await powerCluster.readAttributes(['powerSource'])
          .timeout(5000);
        
        if (powerSource === 'battery' || powerSource === 3) {
          this.powerType = 'BATTERY';
          this.log('[POWER] ✅ Detected: BATTERY (from attribute)');
          return;
        }
        
        if (powerSource === 'mains' || powerSource === 1) {
          this.powerType = 'AC';
          this.log('[POWER] ✅ Detected: AC MAINS (from attribute)');
          return;
        }
      }
    } catch (readErr) {
      // Continue to next method
    }
    
    // Method 2: Check capabilities
    if (this.hasCapability('measure_battery')) {
      this.powerType = 'BATTERY';
      this.log('[POWER] ✅ Detected: BATTERY (from capability)');
      return;
    }
    
    // Method 3: Check driver settings
    const settings = this.getSettings();
    if (settings.power_source && settings.power_source !== 'auto') {
      this.powerType = settings.power_source.toUpperCase();
      this.log(`[POWER] ✅ Detected: ${this.powerType} (from settings)`);
      return;
    }
    
    // Default: Assume AC
    this.powerType = 'AC';
    this.log('[POWER] ⚠️  Defaulting to: AC (no detection method worked)');
    
  } catch (err) {
    this.error('[POWER] ❌ Detection failed:', err);
    this.powerType = 'AC'; // Safe default
  }
}
```

### 1.2 Static Capabilities:

```javascript
async configureStaticCapabilities() {
  try {
    this.log('[STATIC] ⚙️  Configuring static capabilities...');
    
    const capabilities = this.getCapabilities();
    
    for (const capability of capabilities) {
      try {
        await this.setupStaticCapability(capability);
      } catch (capErr) {
        this.log(`[STATIC] ⚠️  ${capability} setup failed:`, capErr.message);
        // Continue with other capabilities
      }
    }
    
    this.log('[STATIC] ✅ Static capabilities configured');
  } catch (err) {
    this.error('[STATIC] ❌ Configuration failed:', err);
  }
}

async setupStaticCapability(capability) {
  const endpoint = this.zclNode.endpoints[1];
  
  switch (capability) {
    case 'measure_temperature':
      const tempCluster = endpoint?.clusters?.msTemperatureMeasurement;
      if (tempCluster) {
        const { measuredValue } = await tempCluster.readAttributes(['measuredValue']);
        await this.setCapabilityValue('measure_temperature', measuredValue / 100);
        this.log('[STATIC] ✅ Temperature:', measuredValue / 100, '°C');
      }
      break;
      
    case 'measure_humidity':
      const humidCluster = endpoint?.clusters?.msRelativeHumidity;
      if (humidCluster) {
        const { measuredValue } = await humidCluster.readAttributes(['measuredValue']);
        await this.setCapabilityValue('measure_humidity', measuredValue / 100);
        this.log('[STATIC] ✅ Humidity:', measuredValue / 100, '%');
      }
      break;
      
    case 'measure_battery':
      if (this.powerType === 'BATTERY') {
        const powerCluster = endpoint?.clusters?.powerConfiguration;
        if (powerCluster) {
          const { batteryPercentageRemaining } = await powerCluster.readAttributes(['batteryPercentageRemaining']);
          await this.setCapabilityValue('measure_battery', Math.round(batteryPercentageRemaining / 2));
          this.log('[STATIC] ✅ Battery:', Math.round(batteryPercentageRemaining / 2), '%');
        }
      }
      break;
      
    // Add more capabilities...
  }
}
```

### 1.3 Native Clusters Setup:

```javascript
async setupNativeClusters() {
  try {
    this.log('[NATIVE] 📡 Setting up Zigbee native clusters...');
    
    const endpoint = this.zclNode.endpoints[1];
    
    // Temperature cluster (1026)
    if (endpoint?.clusters?.msTemperatureMeasurement) {
      await this.setupTemperatureCluster(endpoint);
    }
    
    // Humidity cluster (1029)
    if (endpoint?.clusters?.msRelativeHumidity) {
      await this.setupHumidityCluster(endpoint);
    }
    
    // Power cluster (1)
    if (endpoint?.clusters?.powerConfiguration) {
      await this.setupPowerCluster(endpoint);
    }
    
    // IAS Zone cluster (1280)
    if (endpoint?.clusters?.iasZone) {
      await this.setupIASZoneCluster(endpoint);
    }
    
    // OnOff cluster (6)
    if (endpoint?.clusters?.onOff) {
      await this.setupOnOffCluster(endpoint);
    }
    
    this.log('[NATIVE] ✅ Native clusters configured');
  } catch (err) {
    this.error('[NATIVE] ❌ Setup failed:', err);
  }
}
```

### 1.4 Custom Protocols:

```javascript
async setupCustomProtocols() {
  try {
    this.log('[CUSTOM] 🔧 Setting up custom protocols...');
    
    const endpoint = this.zclNode.endpoints[1];
    
    // Tuya EF00 (61184)
    if (endpoint?.clusters?.manuSpecificTuya || endpoint?.clusters?.['0xEF00']) {
      await this.setupTuyaProtocol(endpoint);
    }
    
    // Xiaomi custom
    if (this.getData().manufacturerName?.startsWith('lumi.')) {
      await this.setupXiaomiProtocol(endpoint);
    }
    
    // Aqara custom
    if (this.getData().manufacturerName?.startsWith('aqara.')) {
      await this.setupAqaraProtocol(endpoint);
    }
    
    this.log('[CUSTOM] ✅ Custom protocols configured');
  } catch (err) {
    this.error('[CUSTOM] ❌ Setup failed:', err);
  }
}
```

---

## 🧠 PHASE 2: MODE DYNAMIQUE (INTELLIGENT)

### Objectifs:
✅ Découvrir capabilities non-déclarées
✅ Activer features manquantes
✅ Enrichissement progressif
✅ Pas de crash si découverte échoue

### Déclenchement:
- 30 secondes après Phase 1
- Ou: Sur demande utilisateur (bouton dans settings)
- Ou: Périodiquement (1x/jour)

### Implémentation:

```javascript
schedulePhase2() {
  // Start Phase 2 after 30 seconds
  setTimeout(() => {
    this.runPhase2().catch(err => {
      this.error('[PHASE2] ❌ Failed:', err);
      // Device continue avec Phase 1 seulement
    });
  }, 30000);
}

async runPhase2() {
  try {
    this.log('[INIT] 🧠 Starting Phase 2: DYNAMIC discovery...');
    
    // 1. SCAN AVAILABLE CLUSTERS
    const discovered = await this.scanAvailableClusters();
    
    // 2. DETECT MISSING CAPABILITIES
    const missing = await this.detectMissingCapabilities(discovered);
    
    // 3. ADD DYNAMIC CAPABILITIES
    if (missing.length > 0) {
      await this.addDynamicCapabilities(missing);
    }
    
    // 4. SETUP ADVANCED FEATURES
    await this.setupAdvancedFeatures(discovered);
    
    this.log('[OK] ✅ Phase 2 complete - Enhanced features active!');
    
  } catch (err) {
    this.error('[PHASE2] ❌ Error:', err);
    // Device reste fonctionnel avec Phase 1
  }
}
```

### 2.1 Cluster Scanning:

```javascript
async scanAvailableClusters() {
  try {
    this.log('[SCAN] 🔍 Scanning available clusters...');
    
    const discovered = {
      endpoints: {},
      capabilities: []
    };
    
    for (const [epId, endpoint] of Object.entries(this.zclNode.endpoints)) {
      discovered.endpoints[epId] = {
        clusters: [],
        bindings: []
      };
      
      // Scan clusters
      for (const [clusterName, cluster] of Object.entries(endpoint.clusters || {})) {
        discovered.endpoints[epId].clusters.push({
          name: clusterName,
          id: cluster.id,
          attributes: await this.scanClusterAttributes(cluster)
        });
      }
    }
    
    this.log('[SCAN] ✅ Discovery complete:', discovered);
    return discovered;
    
  } catch (err) {
    this.error('[SCAN] ❌ Failed:', err);
    return { endpoints: {}, capabilities: [] };
  }
}
```

### 2.2 Missing Capabilities Detection:

```javascript
async detectMissingCapabilities(discovered) {
  try {
    this.log('[DETECT] 🔎 Detecting missing capabilities...');
    
    const missing = [];
    const current = this.getCapabilities();
    
    // Check for temperature
    if (!current.includes('measure_temperature')) {
      const hasTemp = discovered.endpoints['1']?.clusters
        .some(c => c.name === 'msTemperatureMeasurement');
      if (hasTemp) {
        missing.push('measure_temperature');
      }
    }
    
    // Check for humidity
    if (!current.includes('measure_humidity')) {
      const hasHumid = discovered.endpoints['1']?.clusters
        .some(c => c.name === 'msRelativeHumidity');
      if (hasHumid) {
        missing.push('measure_humidity');
      }
    }
    
    // Check for lux
    if (!current.includes('measure_luminance')) {
      const hasLux = discovered.endpoints['1']?.clusters
        .some(c => c.name === 'msIlluminanceMeasurement');
      if (hasLux) {
        missing.push('measure_luminance');
      }
    }
    
    this.log('[DETECT] ✅ Missing capabilities:', missing);
    return missing;
    
  } catch (err) {
    this.error('[DETECT] ❌ Failed:', err);
    return [];
  }
}
```

### 2.3 Dynamic Capability Addition:

```javascript
async addDynamicCapabilities(missing) {
  try {
    this.log('[DYNAMIC] ➕ Adding dynamic capabilities...');
    
    for (const capability of missing) {
      try {
        // Add capability
        await this.addCapability(capability);
        
        // Setup capability
        await this.setupStaticCapability(capability);
        
        this.log(`[DYNAMIC] ✅ Added: ${capability}`);
      } catch (addErr) {
        this.log(`[DYNAMIC] ⚠️  Failed to add ${capability}:`, addErr.message);
      }
    }
    
    this.log('[DYNAMIC] ✅ Dynamic capabilities added');
    
  } catch (err) {
    this.error('[DYNAMIC] ❌ Failed:', err);
  }
}
```

---

## 🛡️ ERROR HANDLING - TRY-CATCH PARTOUT

### Pattern Standard:

```javascript
async anyMethod() {
  try {
    this.log('[METHOD] Starting...');
    
    // Step 1
    try {
      const result = await this.step1();
      this.log('[METHOD] ✅ Step 1 complete');
    } catch (step1Err) {
      this.log('[METHOD] ⚠️  Step 1 failed:', step1Err.message);
      // Continue to step 2
    }
    
    // Step 2
    try {
      const result = await this.step2();
      this.log('[METHOD] ✅ Step 2 complete');
    } catch (step2Err) {
      this.log('[METHOD] ⚠️  Step 2 failed:', step2Err.message);
      // Continue to step 3
    }
    
    this.log('[METHOD] ✅ Complete');
    
  } catch (err) {
    this.error('[METHOD] ❌ Critical error:', err);
    // Method failed but device continues
  }
}
```

---

## 📊 RÉSUMÉ COMPLET

### PHASE 1 (STATIQUE):
✅ Power detection robuste (3 méthodes)
✅ Capabilities statiques actives
✅ Zigbee natif supporté
✅ Custom protocols supportés (Tuya, Xiaomi, Aqara)
✅ Device fonctionnel dès pairing
✅ Try-catch sur chaque opération
✅ Logs détaillés partout

### PHASE 2 (DYNAMIQUE):
✅ Scan clusters disponibles
✅ Détection capabilities manquantes
✅ Ajout dynamique capabilities
✅ Enrichissement features
✅ Pas de crash si échoue
✅ Device reste fonctionnel avec Phase 1

### ROBUSTESSE:
✅ Try-catch imbriqués partout
✅ Vérifications défensives (?.clusters?.)
✅ Fallback sur chaque opération
✅ Logs à chaque étape
✅ Device toujours disponible
✅ Pas de crash possible

---

## 🎯 PROCHAINES ÉTAPES

1. ✅ Valider syntaxe TOUS les drivers
2. ✅ Implémenter système 2-phases dans BaseHybridDevice.js
3. ✅ Tester sur devices réels
4. ✅ Déployer v4.9.149

**STATUS**: Architecture définie - Ready for implementation! 🚀
