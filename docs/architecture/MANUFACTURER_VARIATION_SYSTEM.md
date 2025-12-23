# Système de Gestion Dynamique des Variations ManufacturerNames

## Problème Résolu

**CRITIQUE**: Les drivers Tuya utilisaient une configuration **statique unique** alors que les manufacturerNames ont des **clusters ZCL, DPs Tuya, et endpoints légèrement différents**.

### Exemples de Variations

#### Curtain Motor Driver
- **`_TZE200_icka1clh`** (MOES): Pure Tuya DP - cluster 61184 uniquement
- **`_TZ3000_vd43bbfq`**: Mixed ZCL + Tuya DP - clusters 0,1,6,8,258,61184
- **`_TZ3210_ol1uhvza`**: Enhanced ZCL - clusters 0,1,6,8,258,768

#### Button Wireless Driver
- **`_TZ3000_arfwfgoa`**: Standard ZCL - clusters 0,1,3,6,1280
- **`_TZ3400_key8kk7r`**: Scene controller - clusters 0,1,3,6,5,61184
- **Multi-button**: Endpoints 2-8 selon productId (TS0042/43/44)

## Architecture Solution

### 1. ManufacturerVariationManager

**Localisation**: `lib/ManufacturerVariationManager.js`

**Responsabilités**:
- Détection automatique du protocole par manufacturerName
- Configuration dynamique des clusters, endpoints, bindings
- Mapping spécialisé des DPs selon le type d'appareil
- Gestion des cas spéciaux (MOES, Benexmart, etc.)

### 2. Configurations Dynamiques

#### Protocol Types
- **`tuya_dp`**: Pure Tuya (cluster 61184 seulement)
- **`zcl`**: ZCL standard (clusters 6, 8, 258, etc.)
- **`mixed`**: Hybride (ZCL + Tuya simultané)

#### Endpoint Mapping
```javascript
endpoints: {
  1: { clusters: [0, 1, 6, 61184], bindings: [1, 6] },
  2: { clusters: [0, 3], bindings: [1] } // Multi-button
}
```

#### DP Mappings Contextuels
```javascript
dpMappings: {
  1: { capability: 'windowcoverings_state', transform: (v) => ... },
  101: { capability: null, internal: 'opening_mode' } // MOES specific
}
```

### 3. Intégration Base Classes

Toutes les base classes intègrent le système:

- **`ButtonDevice`**: Configuration multi-endpoint et scene controllers
- **`HybridCoverBase`**: Variations MOES roller blind (DP 101)
- **`HybridSwitchBase`**: Multi-gang et mixed protocols
- **`HybridSensorBase`**: Sensor types et sleepy device handling
- **`HybridPlugBase`**: Energy monitoring variations
- **`HybridLightBase`**: RGB vs White light protocols

### 4. Flow d'Application

```javascript
async _applyManufacturerConfig() {
  const manufacturerName = this.getData()?.manufacturerName || 'unknown';
  const productId = this.getData()?.productId || 'unknown';

  // Get dynamic configuration
  const config = ManufacturerVariationManager.getManufacturerConfig(
    manufacturerName, productId, driverType
  );

  // Apply to device
  ManufacturerVariationManager.applyManufacturerConfig(this, config);
}
```

## Avantages

### ✅ Résolution Problèmes Actuels
- **MOES Curtain Motor**: Fix "could not get device by id" + valeurs 33%/77%
- **TS0041 Recognition**: Différenciation automatique switch vs button
- **Multi-button Support**: Endpoints dynamiques selon productId

### 🚀 Amélioration Performance
- **Protocol Optimization**: Utilise le protocol optimal par manufacturerName
- **Reduced Conflicts**: Évite les conflits ZCL/Tuya inappropriés
- **Better Battery Life**: Protocol adapté pour sleepy devices

### 🎯 Extensibilité
- **Easy Addition**: Nouveau manufacturerName = simple pattern matching
- **Modular**: Configurations séparées par type d'appareil
- **Future-Proof**: Support anticipé des nouveaux protocoles

## Patterns de ManufacturerNames

### _TZE200_ Series - Pure Tuya DP
- Utilise cluster 61184 (0xEF00) exclusivement
- Pas de bindings ZCL
- DP mappings complets requis

### _TZ3000_ Series - Mixed Protocol
- ZCL standard + Tuya DP fallback
- Bindings appropriés par cluster type
- Performance optimale

### _TZ3210_ Series - Enhanced ZCL
- ZCL avancé avec cluster 768 (Color Control)
- Capabilities étendues (tilt, color, etc.)
- Minimal Tuya DP usage

### _TZ3400_ Series - Scene Controllers
- Cluster 5 (Scenes) requis
- Multi-endpoint pour boutons multiples
- Event-based communication

## Configuration Examples

### MOES Roller Blind
```javascript
// _TZE200_icka1clh
{
  protocol: 'tuya_dp',
  endpoints: { 1: { clusters: [61184], bindings: [] } },
  dpMappings: {
    1: { capability: 'windowcoverings_state' },
    101: { capability: null, internal: 'opening_mode' } // Tilt mode
  },
  specialHandling: 'moes_roller_blind'
}
```

### Standard Button
```javascript
// _TZ3000_arfwfgoa
{
  protocol: 'zcl',
  endpoints: {
    1: { clusters: [0, 1, 3, 6, 1280], bindings: [1, 6, 1280] }
  },
  zclClusters: [6, 1280],
  capabilities: ['measure_battery']
}
```

### Multi-Gang Switch
```javascript
// _TZE200_9mahtqtg (3-gang)
{
  protocol: 'tuya_dp',
  endpoints: { 1: { clusters: [61184], bindings: [] } },
  dpMappings: {
    1: { capability: 'onoff' },
    2: { capability: 'onoff.gang2' },
    3: { capability: 'onoff.gang3' }
  },
  capabilities: ['onoff', 'onoff.gang2', 'onoff.gang3']
}
```

## Testing & Validation

### Unit Tests
- Configuration generation par manufacturerName
- Protocol detection accuracy
- DP mapping validation

### Integration Tests
- Real device pairing avec configuration dynamique
- Protocol switching validation
- Performance impact measurement

### Regression Tests
- Existing devices continuent de fonctionner
- Backward compatibility maintained
- No breaking changes

## Maintenance

### Adding New ManufacturerNames
1. Identifier le pattern (_TZE200_, _TZ3000_, etc.)
2. Analyser interview data pour clusters/DPs
3. Ajouter configuration dans ManufacturerVariationManager
4. Tester avec appareil réel

### Debugging Issues
- Logs détaillés de configuration appliquée
- Protocol detection tracing
- Cluster/DP mapping validation

Cette architecture résout définitivement le problème des variations manufacturerNames tout en gardant une extensibilité maximale.
