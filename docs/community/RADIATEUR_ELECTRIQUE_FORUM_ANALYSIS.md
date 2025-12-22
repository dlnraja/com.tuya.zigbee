# 🏠 ANALYSE FORUM : Pilotage Radiateur Électrique

## 📋 SOURCE FORUM
**URL:** https://community.homey.app/t/pilotage-radiateur-electrique-choix-module/21648/35
**Date d'analyse:** 22 Dec 2025
**Utilisateur:** dlnraja

## 🎯 PROBLÉMATIQUE IDENTIFIÉE

### **Problème Principal**
Les utilisateurs veulent piloter leurs **radiateurs électriques** avec des modules Zigbee mais rencontrent plusieurs problèmes :

1. **Logique inversée** : L'état ON/OFF du module est inversé par rapport au radiateur
   - Module indique "allumé" (jaune) → Radiateur réellement éteint
   - Module indique "éteint" → Radiateur réellement allumé

2. **Mesure énergétique incorrecte** :
   - Radiateur éteint → Indique 2000W de consommation
   - Radiateur allumé → Indique 0W de consommation

3. **Manque d'options de configuration** pour adapter le comportement du module

### **Solution Technique Proposée**
**Hardware :**
- **Module Aqara Relay Double** (Zigbee)
- **Diode 1N4007** pour chaque fil pilote
- Câblage fil-pilote spécifique pour radiateurs électriques

**Software :**
- Interface permettant de sélectionner le **type d'appareil connecté**
- Option **"Radiateur"** qui inverse automatiquement la logique de fonctionnement
- Configuration dans les paramètres du module

## 📊 DEVICES CONCERNÉS

### **Modules Zigbee Compatibles**
- **Aqara Relay Two-way Control Module** (LLKZMK11LM)
- **Fibaro modules** (équivalents)
- **Autres relais Zigbee Tuya** avec capacité double relais

### **Manufacturer IDs Pertinents**
```javascript
// Aqara relais (généralement _TZ3000_ ou équivalent)
"_TZ3000_*", "_TZE200_*", "_TZ3210_*"
```

## 🔧 IMPLÉMENTATION REQUISE

### **1. Interface Changement Type Device**
```
┌─────────────────────────────────┐
│     Type d'appareil connecté    │
├─────────────────────────────────┤
│ ○ Éclairage (normal)           │
│ ● Radiateur (logique inversée)  │
│ ○ Ventilation                   │
│ ○ Autre                         │
└─────────────────────────────────┘
```

### **2. Paramètres Driver Nécessaires**
- `device_type` : String - Type d'appareil ("light", "radiator", "fan", "other")
- `invert_logic` : Boolean - Inverser la logique ON/OFF
- `energy_monitoring` : Boolean - Désactiver mesure énergie pour radiateurs

### **3. Logique Métier**
```javascript
// Exemple logique inversée pour radiateurs
if (device_type === 'radiator') {
    const actualState = !moduleState; // Inversion
    this.setCapabilityValue('onoff', actualState);
}
```

## 🎨 UX/UI AMÉLIORATIONS

### **Écran Configuration Device**
1. **Sélection type appareil** lors du pairing initial
2. **Modification ultérieure** via paramètres device
3. **Icônes visuelles** différentes selon le type
4. **Avertissements** sur les limitations (mesure énergie)

### **Icônes Suggérées**
- 💡 Éclairage (par défaut)
- 🔥 Radiateur/Chauffage
- 🌀 Ventilation
- ⚙️ Autre/Générique

## 📱 FONCTIONNALITÉS SPÉCIFIQUES RADIATEUR

### **Modes Fil-Pilote Français**
- **Confort** : Température normale
- **Éco** : Température réduite (-3°C ou -4°C)
- **Hors-gel** : Température minimale (~7°C)
- **Arrêt** : Radiateur complètement éteint

### **Commandes Possibles**
```javascript
// Implémentation fil-pilote avec double relais
const filPiloteModes = {
    'comfort': { relay1: false, relay2: false },    // Pas de signal
    'eco': { relay1: true, relay2: false },         // Signal négatif
    'frost': { relay1: false, relay2: true },       // Signal positif
    'off': { relay1: true, relay2: true }           // Double signal
};
```

## 🔍 DRIVERS À MODIFIER/CRÉER

### **Drivers Existants à Améliorer**
1. `switch_1gang` - Ajouter support changement type
2. `switch_2gang` - Support radiateur double zone
3. `relay_switch` - Configuration type appareil

### **Nouveau Driver Spécialisé**
`radiator_controller` - Driver spécifique pour:
- Logique fil-pilote française
- Modes température (confort/éco/hors-gel/off)
- Interface radiateur dédiée
- Support diode 1N4007

## ⚡ WORKFLOW IMPLÉMENTATION

### **Phase 1 : Analyse Technique**
- [x] Analyse forum détaillée
- [ ] Identification drivers concernés
- [ ] Étude compatibility manufacturer IDs

### **Phase 2 : Développement Core**
- [ ] Interface changement type device
- [ ] Logique inversion ON/OFF
- [ ] Paramètres configuration étendus

### **Phase 3 : Driver Radiateur**
- [ ] Création driver radiator_controller
- [ ] Support modes fil-pilote français
- [ ] Interface utilisateur spécialisée

### **Phase 4 : Tests & Validation**
- [ ] Tests logique inversée
- [ ] Validation modes fil-pilote
- [ ] Tests utilisateur final

## 🎯 IMPACT UTILISATEURS

### **Problèmes Résolus**
✅ Logique ON/OFF correcte pour radiateurs
✅ Interface intuitive changement type
✅ Support spécialisé fil-pilote français
✅ Configuration flexible selon usage

### **Bénéfices**
- **Simplicité d'usage** : Plus besoin device virtuel inverse
- **Flexibilité** : Un driver pour plusieurs types d'appareils
- **Spécialisation** : Support natif radiateurs électriques français
- **Communauté** : Réponse directe aux demandes forum

## 📚 RÉFÉRENCES TECHNIQUES

### **Documentation Fil-Pilote**
- Norme française chauffage électrique
- Protocoles 6 ordres fil-pilote
- Câblage diode 1N4007

### **Hardware Recommandé**
- **Module :** Aqara LLKZMK11LM (€15-20)
- **Diode :** 1N4007 (€0.20-0.30 pièce)
- **Compatibilité :** Tous radiateurs fil-pilote français

---

**STATUS:** 🔄 En cours d'implémentation
**PRIORITÉ:** 🔴 Haute - Demande communauté active
**COMPLEXITÉ:** 🟡 Moyenne - Nécessite interface + logique métier
