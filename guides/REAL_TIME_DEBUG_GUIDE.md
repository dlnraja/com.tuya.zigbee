# 🔍 DEBUG EN TEMPS RÉEL - Guide Complet

## Option 1: Homey App Run (Mode Debug Local) ⭐ RECOMMANDÉ

### Prérequis
```bash
# Vérifier connexion Homey
homey select
homey info
```

### Lancer en Mode Debug
```bash
# Dans le dossier de l'app
cd "c:\Users\HP\Desktop\homey app\tuya_repair"

# Lancer l'app en debug
homey app run
```

**Ce que ça fait:**
- ✅ Lance l'app sur votre Homey
- ✅ Affiche TOUS les logs en temps réel
- ✅ Recharge automatiquement à chaque modification
- ✅ Vous voyez exactement ce qui se passe

**Logs en temps réel:**
```
[log] Device initialized
[err] Error in capability
[info] Battery value: 85%
[debug] Zigbee cluster data: {...}
```

---

## Option 2: SSH Direct sur Homey (Vous devez le faire)

### Activation SSH sur Homey
1. Aller sur: https://my.homey.app
2. Sélectionner votre Homey
3. Settings → System → Enable SSH

### Connexion SSH
```bash
# Depuis votre PC
ssh root@<IP_HOMEY>

# Exemple
ssh root@192.168.1.100
```

### Commandes Utiles sur Homey

#### Voir les logs de l'app en temps réel
```bash
# Logs de toutes les apps
homey app log

# Logs de votre app spécifiquement
homey app log com.dlnraja.tuya.zigbee

# Suivre les logs en continu
tail -f /var/log/homey.log
```

#### Vérifier l'app
```bash
# Status de l'app
homey app list

# Redémarrer l'app
homey app restart com.dlnraja.tuya.zigbee

# Voir les erreurs
journalctl -u homey -f
```

#### Diagnostics Zigbee
```bash
# Voir tous les devices Zigbee
homey zigbee list

# Info sur un device spécifique
homey zigbee info <IEEE_ADDRESS>

# Clusters d'un device
homey zigbee clusters <IEEE_ADDRESS>
```

---

## Option 3: Homey Developer Tools 🌐

### URL
https://tools.developer.homey.app/

### Fonctionnalités
1. **Real-time Logs**
   - Voir logs de l'app en direct
   - Filtrer par niveau (log, error, warning)
   - Rechercher dans les logs

2. **App Management**
   - Voir status de l'app
   - Redémarrer l'app
   - Voir build history

3. **Device Inspection**
   - Voir tous les devices de votre app
   - Inspecter capabilities
   - Voir settings

---

## Option 4: Homey App Install + Logs

### Installation Rapide
```bash
# Build + Install
homey app build
homey app install

# Voir les logs immédiatement
homey app log com.dlnraja.tuya.zigbee
```

**Workflow Itératif:**
```bash
# 1. Modifier le code
# 2. Rebuild + install
homey app build && homey app install

# 3. Voir logs
homey app log com.dlnraja.tuya.zigbee

# 4. Répéter jusqu'à correction
```

---

## 🎯 Workflow Recommandé pour Debugging

### Étape 1: Préparer l'Environnement
```bash
# Terminal 1: App Run (si Homey accessible)
homey app run

# Terminal 2: Prêt pour modifications
# Votre éditeur de code ouvert
```

### Étape 2: Reproduire le Problème
1. Effectuer l'action qui cause le problème
2. Observer les logs en temps réel
3. Identifier l'erreur exacte

### Étape 3: Fixer
1. Modifier le code
2. L'app se recharge automatiquement (si `homey app run`)
3. Tester immédiatement
4. Répéter si nécessaire

### Étape 4: Valider
```bash
# Une fois fixé
homey app validate --level publish

# Publier
git add -A
git commit -m "fix: description du fix"
git push
```

---

## 🔧 Scripts de Debug Automatiques

### LIVE_DEBUG.bat
```batch
@echo off
echo Starting Live Debug Session...
echo.

echo [1/3] Building app...
call homey app build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo [2/3] Installing on Homey...
call homey app install
if %ERRORLEVEL% NEQ 0 (
    echo Install failed!
    pause
    exit /b 1
)

echo [3/3] Watching logs...
echo Press Ctrl+C to stop
echo.
call homey app log com.dlnraja.tuya.zigbee
```

### QUICK_TEST.bat
```batch
@echo off
echo Quick Test Cycle
echo.

:loop
echo.
echo [BUILD + INSTALL]
call homey app build >nul 2>&1 && call homey app install >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo ✓ Updated on Homey
    echo.
    echo [LOGS - Press Ctrl+C when done, then 'y' to loop again]
    call homey app log com.dlnraja.tuya.zigbee
    
    choice /C YN /M "Test again?"
    if %ERRORLEVEL% EQU 1 goto loop
) else (
    echo ✗ Build or install failed
    pause
)
```

---

## 📊 Informations Utiles pour le Debug

### Votre Configuration
```
App ID: com.dlnraja.tuya.zigbee
Version actuelle: v4.9.277
Homey Version: v12.9.0-rc.10
Homey Model: Homey Pro (Early 2023)
```

### Devices Problématiques Identifiés
```
1. Switch 1gang (a4:c1:38:51:fc:d7:b6:ea)
   - Manufacturer: _TZ3000_h1ipgkwn
   - Product: TS0002
   - Issue: Avait "dim" + "battery" → CORRIGÉ v4.9.277

2. 4-Boutons Controller (a4:c1:38:41:9a:f1:e0:50)
   - Manufacturer: _TZ3000_bgtzm4ny
   - Product: TS0044
   - Capabilities: null → À investiguer

3. SOS Button (a4:c1:38:85:a8:b5:4c:d1)
   - Manufacturer: _TZ3000_0dumfk2z
   - Product: TS0215A
   - Capabilities: null → À investiguer

4. Climate Monitor (a4:c1:38:ac:ed:30:d7:a5)
   - Manufacturer: _TZE284_vvmbj46n
   - Product: TS0601
   - Capabilities: null → À investiguer
```

---

## 🎯 Actions Immédiates

### Si Homey Accessible Localement
```bash
# Option A: Mode Debug (le meilleur)
homey app run

# Option B: Install + Logs
homey app install
homey app log com.dlnraja.tuya.zigbee
```

### Si Homey Non Accessible
```bash
# Utiliser la version test
# URL: https://homey.app/app/com.dlnraja.tuya.zigbee/test/

# Demander à l'utilisateur de:
# 1. Installer la version test
# 2. Envoyer diagnostic report
# 3. Vous obtiendrez logs complets par email
```

---

## 📧 Alternative: Diagnostic Reports

### Demander un Diagnostic Report
1. App Homey sur smartphone
2. Settings → Apps → Universal Tuya Zigbee
3. ⋮ (menu) → Send diagnostic report
4. Ajouter message descriptif du problème

**Vous recevrez:**
- Logs complets (stdout + stderr)
- Stack traces
- Configuration devices
- État de l'app

**Avantage:**
- Pas besoin d'accès SSH
- Logs complets automatiques
- Directement par email

---

## 🔍 Que Chercher dans les Logs

### Erreurs Communes
```javascript
// Module non trouvé
Cannot find module './path/to/module'
→ Vérifier imports et structure

// Capability invalide
Invalid capability: measure_something
→ Capability non définie dans driver

// Zigbee error
Zigbee command failed
→ Device ne répond pas ou commande incorrecte

// Flow card error
Invalid Flow Card ID
→ Flow card non définie dans app.json
```

### Patterns à Identifier
```javascript
// Device initialization
[log] [Device:abc123] onNodeInit

// Capability update
[log] [Device:abc123] Capability 'onoff' changed to true

// Cluster data
[log] [Device:abc123] Received cluster data: {...}

// Error pattern
[err] [Device:abc123] Error in onNodeInit: ...
```

---

## 💡 Conseils de Debug

### 1. Ajouter des Logs
```javascript
// Dans votre device.js
async onNodeInit() {
  this.log('=== DEVICE INIT START ===');
  this.log('Device Name:', this.getName());
  this.log('IEEE Address:', this.getData().ieee);
  this.log('Manufacturer:', this.getSettings().zb_manufacturer_name);
  
  try {
    // Votre code
    this.log('✓ Init successful');
  } catch (err) {
    this.error('✗ Init failed:', err);
  }
  
  this.log('=== DEVICE INIT END ===');
}
```

### 2. Logs de Capabilities
```javascript
// Log quand capability change
this.registerCapabilityListener('onoff', async (value) => {
  this.log('ONOFF changed to:', value);
  // Votre code
});
```

### 3. Logs Zigbee
```javascript
// Log données cluster
this.zclNode.endpoints[1].clusters.onOff.on('attr.onOff', (value) => {
  this.log('Zigbee onOff attribute:', value);
});
```

---

## 🚀 Prochaines Étapes

### Immédiat
1. **Essayer `homey app run`**
   - Voir si timeout est résolu
   - Observer logs en temps réel

2. **Si timeout persiste:**
   - Utiliser `homey app install` + `homey app log`
   - Ou demander diagnostic reports

3. **Identifier problèmes null capabilities:**
   - Regarder logs initialization
   - Vérifier cluster registration
   - Tester lecture attributs

### Debug Capabilities Null
```javascript
// Ajouter dans onNodeInit
async onNodeInit() {
  this.log('=== TESTING CAPABILITIES ===');
  
  // Test lecture batterie
  try {
    const battery = await this.zclNode.endpoints[1]
      .clusters.powerConfiguration
      .readAttributes(['batteryPercentageRemaining']);
    this.log('Battery read:', battery);
  } catch (err) {
    this.error('Battery read failed:', err);
  }
  
  // Test lecture température
  try {
    const temp = await this.zclNode.endpoints[1]
      .clusters.temperatureMeasurement
      .readAttributes(['measuredValue']);
    this.log('Temperature read:', temp);
  } catch (err) {
    this.error('Temperature read failed:', err);
  }
}
```

---

## 📝 Résumé

**JE NE PEUX PAS:**
- Me connecter en SSH sur votre Homey
- Accéder à votre réseau local
- Voir les logs directement

**VOUS POUVEZ:**
1. Lancer `homey app run` (debug local)
2. Me SSH sur Homey et partager logs
3. Envoyer diagnostic reports
4. Utiliser scripts debug automatiques

**NOUS POUVONS ENSEMBLE:**
1. Vous lancez debug
2. Vous partagez logs/erreurs
3. Je fournis les corrections
4. Vous testez immédiatement
5. Itération rapide jusqu'à fix

---

**Quelle méthode préférez-vous pour debugger en temps réel?**

1. `homey app run` (si réseau local OK)
2. SSH + partage logs
3. Diagnostic reports par email
4. `homey app install` + `homey app log`
