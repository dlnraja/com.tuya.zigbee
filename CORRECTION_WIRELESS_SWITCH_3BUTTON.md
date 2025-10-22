# 🔧 CORRECTION - wireless_switch_3button_cr2032

**Diagnostic**: e10dadd9-7cf9-4cd3-9e8b-3b929aeccd29  
**Erreur**: SyntaxError: Unexpected identifier at line 448  
**Driver**: zemismart_wireless_switch_3button_cr2032

---

## ❌ PROBLÈME IDENTIFIÉ

Le fichier `device.js` a une structure incorrecte:
- `onNodeInit()` se ferme trop tôt à la ligne 387
- Les méthodes `triggerCapabilityFlow()` et `pollAttributes()` sont déclarées **APRÈS** la fermeture de `onNodeInit()`
- Mais `pollAttributes()` est appelée **DANS** `onNodeInit()` à la ligne 486
- Résultat: JavaScript ne trouve pas la méthode

---

## ✅ SOLUTION

### Structure CORRECTE attendue:
```javascript
class WirelessSwitch3gangCr2032Device extends ZigBeeDevice {
  
  async onNodeInit() {
    // Initialize device
    // Register capabilities
    // Setup listeners
    // Call this.registerFlowCards()
  }
  
  // Méthodes helper HORS de onNodeInit
  async triggerCapabilityFlow(capabilityId, value) {
    // ...
  }
  
  async pollAttributes() {
    // ...
  }
  
  async registerFlowCards() {
    // Flow cards registration
  }
}
```

### Problème ACTUEL:
```javascript
class WirelessSwitch3gangCr2032Device extends ZigBeeDevice {
  
  async onNodeInit() {
    // Initialize device
    
    // TOUT LE CODE DES FLOW CARDS EST ICI (lignes 170-387)
    // ...
    
  } // <- Fermeture ligne 387
  
  // CES MÉTHODES SONT EN DEHORS DE LA CLASSE!
  async triggerCapabilityFlow() { }  // ligne 390
  async pollAttributes() { }          // ligne 443
  
  // Autres méthodes...
}
```

---

## 🔨 FIX REQUIS

**Option 1**: Déplacer flow cards dans méthode séparée
**Option 2**: Restructurer complètement le fichier

**Recommandation**: Option 2 (refactoring complet pour clarté)

---

## 📋 ACTIONS

1. ✅ Extraire tout le code flow cards (170-387) → nouvelle méthode `registerFlowCards()`
2. ✅ Appeler `this.registerFlowCards()` depuis `onNodeInit()`
3. ✅ Garder `triggerCapabilityFlow()` et `pollAttributes()` comme méthodes de classe
4. ✅ Tester compilation
5. ✅ Déployer v4.1.7

---

**Status**: ⏳ FIX EN COURS
