# 🔍 DIAGNOSTIC COMPLET - Tous les Devices

**Date**: 26 October 2025 @ 15:33 UTC+1  
**Version App**: v4.9.53  
**Utilisateur**: Dylan (le développeur lui-même teste!)

---

## 🚨 PROBLÈMES IDENTIFIÉS

### 1. BATTERIE = NULL sur TOUS les Devices
```
✗ Switch 2gang: measure_battery = null
✗ SOS Emergency Button: measure_battery = null
✗ Soil Tester: measure_battery = null
✗ Presence Sensor Radar: measure_battery = null
✗ 3-button controller: measure_battery = null
✗ 4-button controller: measure_battery = null
✗ Climate Monitor: measure_battery = null
```

**TOUS** battery-powered = `null` (pas de données!)

### 2. USB 2-Port Manque 1 Port
- USB 2-port ne montre qu'**1 port** au lieu de **2 ports**
- (Device non visible dans cette liste mais mentionné par user)

---

## 🔎 CAUSE ROOT

### Ces Devices Sont Paired sur ANCIENNE VERSION!

Tous ces devices ont été paired **AVANT v4.9.53**:
- v4.9.50, v4.9.51, ou v4.9.52
- Avec le code commenté (`// this.registerCapability`)
- Configuration incomplète enregistrée dans Homey

**Résultat**:
- ❌ Batterie non configurée → `null`
- ❌ USB 2ème port non configuré → invisible
- ❌ Capabilities commentées = non enregistrées

---

## ✅ SOLUTION: RE-PAIRING OBLIGATOIRE

### Pourquoi Re-Pairing?

v4.9.53 a fixé le code, MAIS:
- Les devices existants gardent leur **vieille configuration**
- `registerCapability` ne s'exécute que lors du **premier pairing**
- Homey mémorise la configuration initiale
- **Il faut re-pair pour appliquer la nouvelle config!**

### C'est Comme:

```javascript
// AVANT v4.9.53 (au moment du pairing):
// this.registerCapability('measure_battery', 1, {...}); // ❌ COMMENTÉ = PAS EXÉCUTÉ

// APRÈS v4.9.53 (mais device déjà paired):
this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {...}); 
// ✅ MAINTENANT ACTIF... mais device déjà configuré avec ancien setup!
```

**La solution**: Supprimer et re-pair = nouvelle configuration appliquée!

---

## 📋 PROCÉDURE DE RE-PAIRING

### Pour CHAQUE Device:

#### 1️⃣ SUPPRIMER de Homey
```
Settings → Devices → [Device Name] → Supprimer
```

#### 2️⃣ FACTORY RESET du Device Physique

**Batteries** (buttons, sensors):
- Retirer batterie 10 secondes
- Remettre batterie
- Maintenir bouton 5-10 secondes
- LED clignote rapidement = reset OK

**USB/Plugs/Switches** (alimentés):
- Débrancher appareil
- Maintenir bouton appuyé
- Rebrancher en gardant bouton appuyé
- Maintenir 5-10 secondes
- LED clignote = reset OK

**Switches muraux**:
- Couper l'alimentation
- Maintenir bouton appuyé
- Réactiver alimentation
- Maintenir 5-10 secondes
- LED clignote = reset OK

#### 3️⃣ RE-PAIR dans Homey

```
Homey App → Devices → Add Device → Universal Tuya Zigbee
→ Sélectionner le BON driver (Switch 2gang, USB 2-port, etc.)
→ Suivre instructions pairing
→ Attendre confirmation
```

#### 4️⃣ VÉRIFIER les Logs

**Logs attendus pour v4.9.53**:
```
🔌 Configuring Port 1 (endpoint 1)...
  - Capability onoff exists
  - Registering with CLUSTER.ON_OFF on endpoint 1
[OK] ✅ Port 1 configured successfully

🔌 Configuring Port 2 (endpoint 2)...
  - Capability onoff.usb2 exists
  - Registering with CLUSTER.ON_OFF on endpoint 2
[OK] ✅ Port 2 configured successfully

⚡ Setting up battery monitoring...
  - Registering measure_battery with CLUSTER.POWER_CONFIGURATION
[OK] ✅ Battery monitoring configured
```

Si ces logs n'apparaissent PAS:
- Device pas correctement factory reset
- OU mauvais driver sélectionné
- OU problème à investiguer

---

## 🎯 RÉSULTAT ATTENDU APRÈS RE-PAIRING

### USB 2-Port:
```
✅ Port 1 (onoff): Visible et fonctionnel
✅ Port 2 (onoff.usb2): Visible et fonctionnel
✅ 2 boutons dans Homey app
```

### Battery Devices:
```
✅ measure_battery: Valeur 0-100% (pas null!)
✅ Notifications batterie faible activées
✅ Mise à jour auto toutes les 24h
```

### Switch 2-Gang:
```
✅ Switch 1 (onoff): Visible et fonctionnel
✅ Switch 2 (onoff.switch_2): Visible et fonctionnel
✅ 2 boutons indépendants
```

---

## 📊 DEVICES À RE-PAIR

### Priorité 1 (Multi-Gang/Port):
1. **USB 2-Port** (manque 1 port) - **URGENT**
2. **Switch 2-Gang** (possiblement 1 seul switch visible)

### Priorité 2 (Battery Null):
3. SOS Emergency Button
4. Soil Tester Temp Humid
5. Presence Sensor Radar
6. 3-Button Controller
7. 4-Button Controller
8. Climate Monitor

**Total**: 8 devices à re-pair

---

## ⏱️ ESTIMATION TEMPS

- **Par device**: 2-3 minutes
- **8 devices**: ~20-25 minutes total
- **Inclut**: Remove + Reset + Pair + Test

---

## 📝 ORDRE RECOMMANDÉ

### Commencer par les Plus Simples:

1. **USB 2-Port** (test du fix multi-port)
2. **Switch 2-Gang** (test du fix multi-gang)
3. **Climate Monitor** (battery simple)
4. **3-Button Controller** (battery + buttons)
5. **4-Button Controller** (battery + buttons)
6. **SOS Emergency Button** (battery + alarm)
7. **Presence Sensor Radar** (battery + sensors)
8. **Soil Tester** (battery + multi-sensors)

**Raison**: Commencer simple pour confirmer que le re-pairing marche, puis faire les plus complexes.

---

## 🔬 APRÈS RE-PAIRING: NOUVEAU DIAGNOSTIC

### Envoyer Nouveau Diagnostic Qui Inclut:

1. **Logs de pairing** d'au moins 1 device
2. **Valeurs batterie** (doivent être 0-100%, pas null)
3. **Confirmation multi-port/gang** (tous les boutons visibles)

### Dans les Logs, Chercher:

```
✅ registerCapability appelé pour CHAQUE capability
✅ CLUSTER objects utilisés (pas numeric IDs)
✅ Logs verbeux de configuration
✅ [OK] ✅ messages de succès
```

---

## ❓ SI PROBLÈME PERSISTE APRÈS RE-PAIRING

### Si measure_battery = null APRÈS re-pairing:

1. **Vérifier logs** pour:
   ```
   ⚡ Setting up battery monitoring...
   ```
   
2. **Si log absent**: Driver pas configuré batterie
3. **Si log présent mais battery null**: Bug cluster communication
4. **Envoyer diagnostic** avec logs de pairing

### Si USB/Switch manque encore des ports:

1. **Vérifier logs** pour:
   ```
   🔌 Configuring Port 2...
   ```
   
2. **Compter les "Configuring"**: Doit être = nombre de ports
3. **Si manquant**: Driver incomplètement fixé
4. **Envoyer diagnostic** immédiatement

---

## 🎯 CONCLUSION

**Problème**: Devices paired avec ancien code commenté  
**Solution**: RE-PAIRING avec v4.9.53  
**Temps**: ~25 minutes pour 8 devices  
**Résultat Attendu**: Batterie visible + Tous les ports/switches visibles  

**C'est normal que ça nécessite re-pairing!**  
C'est la seule façon d'appliquer la nouvelle configuration.

---

## 📧 QUESTION POUR L'UTILISATEUR

Comme c'est toi (Dylan) qui teste:

**Peux-tu confirmer**:
1. As-tu déjà essayé de re-pair au moins 1 device avec v4.9.53?
2. Si oui, est-ce que tu as vu les nouveaux logs verbeux?
3. Si oui, est-ce que battery/ports sont apparus après re-pairing?

Si tu n'as PAS encore re-paired, **c'est normal** que tout soit null et que des ports manquent!

Re-pair 1-2 devices pour tester, et envoie nouveau diagnostic avec les logs de pairing 👍
