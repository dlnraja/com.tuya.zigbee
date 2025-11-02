# 🧪 TEST LOCAL IMMÉDIAT

## Problème Actuel

❌ **Aucune data dans l'app**:
- Batterie: vide
- Capteurs: vide  
- USB 2-gang: 1 seul bouton au lieu de 2

## Cause

Le **DynamicCapabilityManager** n'est pas encore actif sur ton Homey car:
1. Code poussé sur GitHub ✅
2. GitHub Actions compile ⏳ (en cours)
3. App Store propage ⏳ (30-60 min)
4. Homey reçoit mise à jour ❌ (pas encore)

---

## ✅ SOLUTION IMMÉDIATE - Test Local

### 1. Lancer l'app en mode debug LOCAL

```powershell
# Dans le terminal
cd "c:\Users\HP\Desktop\homey app\tuya_repair"

# Lancer l'app directement sur ton Homey (bypass App Store)
homey app run --debug
```

**Ce que ça fait**:
- Installe la version LOCALE (avec DynamicCapabilityManager) directement sur ton Homey
- Bypass l'App Store complètement
- Active immédiatement tous les nouveaux changements
- Affiche tous les logs en temps réel

### 2. Observer les logs

Tu devrais voir dans le terminal:

```
✅ [DYNAMIC] 🔍 Starting dynamic capability discovery...
✅ [DYNAMIC] 📍 Inspecting endpoint 1...
✅ [DYNAMIC]   - Cluster 6 (onOff) → onoff
✅ [DYNAMIC] 📍 Inspecting endpoint 2...
✅ [DYNAMIC]   - Cluster 6 (onOff) → onoff.2
✅ [DYNAMIC] ✅ Added capability: onoff (EP1)
✅ [DYNAMIC] ✅ Added capability: onoff.2 (EP2)
✅ [DYNAMIC] ✅ Discovery complete - 2 capabilities created
```

### 3. Vérifier dans l'app Homey

Ouvre l'app Homey sur ton téléphone:
1. Va sur le device USB 2-gang
2. Tu devrais maintenant voir **2 boutons**:
   - Power (endpoint 1)
   - Power 2 (endpoint 2)

---

## 🔍 Si ça ne fonctionne toujours pas

### Vérifier que le device est bien reconnu

Dans les logs `homey app run`, cherche:

```
[DYNAMIC] 📍 Inspecting endpoint X...
```

Si tu ne vois PAS ces lignes:
- Le DynamicCapabilityManager n'est pas appelé
- Problème d'intégration dans BaseHybridDevice

### Forcer la réinitialisation du device

1. Dans Homey app:
   - Paramètres device → "Repair device"
   - OU supprimer et ré-appairer le device

2. Le device va passer par `onNodeInit()` à nouveau
3. DynamicCapabilityManager va s'exécuter
4. Capabilities créées automatiquement

---

## 📊 Vérifier l'état actuel des capabilities

```powershell
# Lancer le diagnostic
node scripts/DIAGNOSTIC_CURRENT_STATE.js
```

Ça va afficher:
- Version app installée
- Capabilities par device
- Valeurs actuelles
- Endpoints détectés

---

## ⚠️ IMPORTANT

**Le DynamicCapabilityManager ne s'exécute QUE**:
1. Au premier appairage du device
2. Quand tu fais "Repair device"
3. Quand tu relances l'app avec `homey app run`

**Si le device est déjà appairé AVANT la mise à jour**:
- Les anciennes capabilities restent
- Les nouvelles capabilities ne sont PAS créées automatiquement
- Il faut **forcer une réinitialisation**

---

## 🚀 PROCÉDURE COMPLÈTE

### Étape 1: Lancer en local
```powershell
homey app run --debug
```

### Étape 2: Observer les logs
Attendre de voir:
```
✅ [DYNAMIC] Discovery complete
```

### Étape 3: Forcer réinit du USB 2-gang
- Homey app → USB 2-gang
- Paramètres → "Repair device"
- Suivre les instructions

### Étape 4: Vérifier
- Ouvrir le device dans Homey app
- Tu devrais voir 2 boutons maintenant

---

## 📝 Si tu vois des erreurs

Copie-colle les logs ici et je corrigerai immédiatement.

**Erreurs possibles**:
- `Cannot add capability X` → Capability déjà existe, normal
- `cluster.bind is not a function` → Normal, géré par defensive check
- `No endpoints found` → Problème de device, vérifier Zigbee connection

---

## 🎯 Résultat Attendu

**USB 2-Gang Switch**:
```
┌─────────────────────────────┐
│ USB 2-Gang Switch           │
├─────────────────────────────┤
│ 🔘 Power         [ ON  ]    │  ← Nouveau!
│ 🔘 Power 2       [ OFF ]    │  ← Nouveau!
└─────────────────────────────┘
```

**Capteurs**:
```
┌─────────────────────────────┐
│ Temperature Sensor          │
├─────────────────────────────┤
│ 🌡️ Temperature   22.5°C     │  ← Valeur réelle
│ 💧 Humidity      65%        │  ← Valeur réelle
│ 🔋 Battery       95%        │  ← Valeur réelle
└─────────────────────────────┘
```
