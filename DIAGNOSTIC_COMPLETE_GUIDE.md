# 🔍 GUIDE DIAGNOSTIC COMPLET - v4.9.148

## 📋 PROCÉDURE POUR OBTENIR LOGS COMPLETS

### Étape 1: Attendre v4.9.148 (5 minutes)
GitHub Actions publie actuellement la version corrigée.

### Étape 2: Installer v4.9.148
1. Ouvre Homey Developer Dashboard
2. Install from GitHub
3. Sélectionne version **v4.9.148**
4. Attends la fin de l'installation

### Étape 3: Redémarrer TOUS les devices
Pour chaque device:
1. Clique sur le device
2. Settings → Advanced → Re-initialize
3. OU: Retire et remet les piles

### Étape 4: Attendre 2 minutes
Laisse les devices s'initialiser complètement.

### Étape 5: Envoyer diagnostic COMPLET
1. Ouvre chaque device
2. Settings → Advanced → Send diagnostic report
3. Message: "Test complet v4.9.148"
4. Envoie le rapport

---

## 🎯 DEVICES À TESTER

### 1. Button 4-Gang (TS0044) - _TZ3000_bgtzm4ny
**Logs attendus**:
```
[BATTERY] ✅ Initial battery: 100 %
[OK] ✅ Background initialization complete!
Final power type: BATTERY
Battery type: CR2032
```

### 2. Button SOS (TS0215A) - _TZ3000_0dumfk2z  
**Logs attendus**:
```
[IAS] 🚨 Setting up IAS Zone...
[IAS] ✅ Zone Enroll Response sent
[BATTERY] ✅ Initial battery: XX %
Final power type: BATTERY
Battery type: CR2032
```

### 3. Climate Monitor (TS0601) - _TZE284_vvmbj46n
**Logs attendus**:
```
[TEMP] ✅ Initial temperature: XX °C
[HUMID] ✅ Initial humidity: XX %
[BATTERY] ✅ Initial battery: XX %
```

### 4. Button 3-Gang (TS0043) - _TZ3000_bczr4e10
**Logs attendus**:
```
[BATTERY] ✅ Initial battery: XX %
Final power type: BATTERY
```

### 5. Presence Radar (TS0601) - _TZE200_rhgsbacq
**Logs attendus**:
```
[BATTERY] ✅ Initial battery: XX %
[TUYA] DP reports configured
```

### 6. Soil Tester (TS0601) - _TZE284_oitavov2
**Logs attendus**:
```
[TEMP] ✅ Initial temperature: XX °C
[HUMID] ✅ Initial humidity: XX %
[BATTERY] ✅ Initial battery: XX %
```

### 7. Switch 2-Gang (TS0002) - _TZ3000_h1ipgkwn
**Logs attendus**:
```
[OK] Gang 1 set to: true/false
[OK] Gang 2 set to: true/false
[RECV] Gang X cluster update
```

---

## ✅ CE QUI DOIT ÊTRE VISIBLE

### Dans Homey App (après v4.9.148):

**Devices avec Batterie**:
- ✅ Icône batterie en haut à droite
- ✅ Pourcentage visible (ex: 95%)
- ✅ Mise à jour régulière

**Climate Monitor**:
- ✅ Temperature: XX.X°C
- ✅ Humidity: XX%
- ✅ Battery: XX%
- ✅ Toutes les valeurs rafraîchies

**Buttons**:
- ✅ Battery visible
- ✅ Presses détectées
- ✅ Flows fonctionnels

**Switches**:
- ✅ Contrôle ON/OFF
- ✅ 2 boutons visibles
- ✅ PAS d'icône batterie (AC powered)

---

## 🚨 SI PROBLÈME PERSISTE

### Symptômes possibles:

**1. Pas de batterie affichée**
→ Vérifier logs: `[BATTERY]` doit apparaître
→ Si absent: Device n'a pas powerConfiguration cluster
→ Solution: Vérifier endpoints dans driver.compose.json

**2. Pas de temp/humid affichée**
→ Vérifier logs: `[TEMP]` et `[HUMID]` doivent apparaître  
→ Si absent: Device n'a pas les clusters 1026/1029
→ Solution: Vérifier endpoints ou Tuya DP fallback

**3. Buttons ne détectent pas presses**
→ Vérifier logs: `[SETUP] Listening to onOff/scenes`
→ Si absent: Listeners pas configurés
→ Solution: Vérifier ButtonDevice.js

**4. IAS Zone pas enrollé (SOS button)**
→ Vérifier logs: `[IAS] Zone Enroll Response sent`
→ Si absent: IAS Zone setup a échoué
→ Solution: Vérifier setupIasZone() dans device.js

---

## 📊 COMPARAISON VERSIONS

### v4.9.146 (Actuelle - STABLE)
- ✅ Batteries fonctionnent
- ✅ Buttons fonctionnent
- ✅ Switches fonctionnent
- ⚠️ Climate sensors: code commenté (pas de valeurs)

### v4.9.147 (CASSÉE - NE PAS INSTALLER)
- ❌ Drivers sans déclaration de classe
- ❌ "No class found" erreur
- ❌ Rien ne fonctionne

### v4.9.148 (PROCHAINE - CORRIGÉE)
- ✅ Drivers restaurés
- ✅ Batteries fonctionnent
- ✅ Climate sensors: À tester
- ✅ Tout doit fonctionner

---

## 🎯 CONCLUSION

**TA SITUATION ACTUELLE** (v4.9.146):
- Button 4-gang: ✅ **100% batterie affichée**
- Switch 2-gang: ✅ **Fonctionne**
- Climate monitor: ❓ **Pas de logs dans diagnostic**
- SOS button: ❓ **Pas de logs dans diagnostic**

**ACTION**: 
1. ⏳ Attendre v4.9.148 (5 min)
2. 📥 Installer v4.9.148
3. 🔄 Redémarrer devices
4. 📊 Envoyer diagnostic COMPLET avec TOUS les devices
5. 📧 M'envoyer les logs complets

**IMPORTANT**: Le diagnostic que tu as envoyé ne montre que 2 devices. Je dois voir TOUS les devices pour diagnostiquer correctement!
