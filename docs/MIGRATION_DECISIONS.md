# 🎯 DÉCISIONS DE MIGRATION - DRIVERS HYBRIDES & INTERNES

**Date**: 23 Octobre 2025  
**Status**: ✅ **DÉCISIONS PRISES**

---

## 📋 DÉCISIONS POUR 14 DRIVERS SPÉCIAUX

### 1. SWITCHES HYBRIDES → MERGER

**Décision**: ✅ **MERGER avec drivers standards**

| Driver Hybride | Merger Avec | Raison |
|---------------|-------------|---------|
| `avatto_smart_switch_2gang_hybrid` | `switch_wall_2gang` | Détection intelligente |
| `avatto_smart_switch_4gang_hybrid` | `switch_wall_4gang` | Détection intelligente |
| `avatto_switch_2gang_hybrid` | `switch_wall_2gang` | Même fonction |
| `zemismart_smart_switch_1gang_hybrid` | `switch_wall_1gang` | Consolidation |
| `zemismart_smart_switch_3gang_hybrid` | `switch_wall_3gang` | Consolidation |

**Action**: 
- ✅ Copier manufacturer IDs vers driver standard
- ✅ Ajouter logique hybrid si nécessaire
- ✅ Supprimer driver hybride après merge

---

### 2. SWITCHES INTERNES → MERGER

**Décision**: ✅ **MERGER avec drivers standards**

| Driver Interne | Merger Avec | Raison |
|----------------|-------------|---------|
| `zemismart_smart_switch_1gang_internal` | `switch_wall_1gang` | Logique interne = variante |

**Action**:
- ✅ Copier manufacturer IDs
- ✅ Préserver logique spéciale si présente

---

### 3. THERMOSTATS → CRÉER NOUVEAUX DRIVERS

**Décision**: ✅ **CRÉER drivers thermostat unifiés**

| Driver Ancien | Nouveau Driver | Raison |
|--------------|----------------|---------|
| `avatto_thermostat_hybrid` | `thermostat_smart` | Nouveau driver unifié |
| `avatto_thermostat_smart_internal` | `thermostat_smart` | Merger dans unifié |
| `zemismart_temperature_controller_hybrid` | `thermostat_temperature_control` | Fonction spécifique |

**Action**:
- ✅ Créer `thermostat_smart` avec détection intelligente
- ✅ Créer `thermostat_temperature_control` pour contrôle temp
- ✅ Merger tous les manufacturer IDs

---

### 4. MONITORS INTERNES → MERGER

**Décision**: ✅ **MERGER avec drivers standards**

| Driver Interne | Merger Avec | Raison |
|----------------|-------------|---------|
| `zemismart_air_quality_monitor_pro_internal` | `air_quality_monitor` | Pro = version avancée |

**Action**:
- ✅ Copier manufacturer IDs vers `air_quality_monitor`
- ✅ Ajouter capabilities "pro" si nécessaires

---

### 5. CURTAINS INTERNES → MERGER

**Décision**: ✅ **MERGER avec drivers standards**

| Driver Interne | Merger Avec | Raison |
|----------------|-------------|---------|
| `zemismart_curtain_motor_internal` | `curtain_motor` | Internal = variante config |

**Action**:
- ✅ Copier manufacturer IDs
- ✅ Préserver settings spéciaux

---

### 6. DOORBELL BUTTON → CRÉER NOUVEAU

**Décision**: ✅ **CRÉER nouveau driver**

| Driver Interne | Nouveau Driver | Raison |
|----------------|----------------|---------|
| `zemismart_doorbell_button_internal` | `doorbell_button` | Fonction distincte |

**Action**:
- ✅ Créer `doorbell_button` (différent de `doorbell`)
- ✅ Copier logique et IDs

---

### 7. USB OBSOLÈTES → SUPPRIMER & MIGRER

**Décision**: ✅ **SUPPRIMER et migrer IDs**

| Driver Obsolète | Action | Raison |
|----------------|--------|---------|
| `avatto_usb_outlet` | SUPPRIMER | Remplacé par usb_outlet_1gang, 2port, 3gang |
| `avatto_usb_outlet_advanced` | SUPPRIMER | IDs déjà distribués |

**Action**:
- ✅ Manufacturer IDs déjà distribués dans nouveaux USB drivers
- ✅ Supprimer anciens drivers
- ✅ Documenter migration pour utilisateurs

---

## 🎯 RÉSUMÉ DES ACTIONS

| Action | Nombre | Drivers |
|--------|--------|---------|
| **Merger** | 8 | Switches hybrides + internes |
| **Créer Nouveau** | 3 | Thermostats + doorbell button |
| **Supprimer** | 2 | USB obsolètes |
| **IDs à Distribuer** | 1 | USB IDs |

---

## 🔧 LOGIQUE INTELLIGENT HYBRIDE

### Qu'est-ce qu'un "Hybrid"?

**Avant**: Drivers séparés avec suffixe "_hybrid"  
**Après**: UN driver avec **détection intelligente**

### Exemple: Switch Hybrid

```javascript
// AVANT: 2 drivers séparés
avatto_switch_2gang         // AC powered
avatto_switch_2gang_hybrid  // AC + Battery detection

// APRÈS: 1 driver intelligent
switch_wall_2gang {
  async detectAndConfigurePowerSource(zclNode) {
    // Auto-detect AC, DC, ou Battery
    // Configure appropriately
    // User can override in settings
  }
}
```

**Avantages**:
- ✅ Un seul driver par fonction
- ✅ Détection automatique
- ✅ Override manuel possible
- ✅ Moins de confusion utilisateur

---

## 📊 IMPACT SUR L'APP

### Avant Migration
- 189 drivers
- Noms avec marques
- Drivers hybrides séparés
- USB dispersé

### Après Migration
- ~180 drivers (consolidation)
- Noms unbranded
- Détection intelligente intégrée
- USB organisé

---

## ✅ VALIDATION

### Checklist Merger Drivers
- [x] Identifier tous les drivers hybrides/internes
- [x] Décider action pour chacun
- [x] Créer logique de merge dans script
- [x] Planifier distribution manufacturer IDs
- [x] Documenter pour utilisateurs

### Checklist Nouveaux Drivers
- [x] `thermostat_smart` - À créer
- [x] `thermostat_temperature_control` - À créer
- [x] `doorbell_button` - À créer
- [x] Drivers USB - ✅ Déjà créés

---

## 🚀 ORDRE D'EXÉCUTION

### Phase 1: Merger Hybrides/Internes
1. Copier manufacturer IDs vers drivers standards
2. Ajouter logique intelligente si nécessaire
3. Valider merge

### Phase 2: Créer Nouveaux Drivers
1. `thermostat_smart`
2. `thermostat_temperature_control`
3. `doorbell_button`

### Phase 3: Supprimer Obsolètes
1. Vérifier IDs USB distribués
2. Supprimer `avatto_usb_outlet`
3. Supprimer `avatto_usb_outlet_advanced`

### Phase 4: Migration Standard
1. Renommer 165 drivers restants
2. Corriger bugs
3. Valider SDK3

---

## 📝 NOTES IMPORTANTES

### Préservation Données
- ✅ **TOUS les manufacturer IDs** préservés
- ✅ **TOUS les product IDs** préservés
- ✅ **Logique spéciale** des drivers internes préservée
- ✅ **Settings utilisateur** compatibles

### Communication Utilisateurs
- ⚠️ Drivers hybrides supprimés (fonctionnalité mergée)
- ⚠️ USB drivers obsolètes (migrer vers nouveaux)
- ✅ Nouveaux drivers thermostats disponibles
- ✅ Organisation plus claire

---

**Décisions Prises**: 23 Octobre 2025  
**Status**: ✅ **PRÊT POUR EXÉCUTION**  
**Script**: `scripts/execute_migration.js`
