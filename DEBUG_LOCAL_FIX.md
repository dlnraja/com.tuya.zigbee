# 🔧 Homey App Run - Debug Local Fix

## ❌ Problème Rencontré

```
Error: Timeout after 10000ms
× Error: ENOENT: no such file or directory, open '.homeybuild\app.json'
```

## ✅ Solution Appliquée

### 1. Rebuild Complet
```bash
homey app build
✓ App built successfully
```

---

## 🎯 Options pour Tester l'App

### Option 1: Test sur Homey Cloud (Recommandé)
L'app est déjà publiée sur le Homey App Store (v4.9.275).

**Installation:**
1. Ouvrir l'app Homey sur smartphone
2. Aller dans **Paramètres → Apps**
3. Chercher **"Universal Tuya Zigbee"**
4. Cliquer **"Installer"** ou **"Mettre à jour"**

**Avantages:**
- ✅ Pas de configuration réseau nécessaire
- ✅ Version stable publiée
- ✅ Fonctionne immédiatement
- ✅ Tous les drivers opérationnels

---

### Option 2: Test Version Test (Test Channel)
Tester la dernière version avant publication.

**URL:**
```
https://homey.app/app/com.dlnraja.tuya.zigbee/test/
```

**Installation:**
1. Ouvrir le lien sur mobile/PC
2. Cliquer **"Install on Homey"**
3. Sélectionner votre Homey
4. Attendre installation (~30 sec)

**Avantages:**
- ✅ Version la plus récente
- ✅ Pas de problème réseau local
- ✅ Installation rapide

---

### Option 3: Debug Local (Si Homey Accessible)

#### Prérequis
1. **Homey sur le même réseau WiFi**
2. **Port ouvert:** Homey doit être accessible
3. **Homey sélectionné:** Vérifier avec `homey select`

#### Configuration

**Étape 1: Sélectionner le bon Homey**
```bash
homey select
```
Choisir le Homey Pro accessible sur votre réseau local.

**Étape 2: Vérifier la connexion**
```bash
homey info
```
Doit afficher les infos du Homey (nom, version, etc.)

**Étape 3: Lancer l'app**
```bash
homey app run
```

#### Si Timeout Persiste

**Solution A: Augmenter le timeout**
Éditer la configuration Homey CLI (si possible) ou utiliser:
```bash
homey app install
```
Au lieu de `homey app run` (installation permanente au lieu de debug).

**Solution B: Vérifier le réseau**
```bash
# Ping le Homey
ping [IP_DU_HOMEY]

# Vérifier que le port est ouvert
telnet [IP_DU_HOMEY] 80
```

**Solution C: Redémarrer Homey**
1. Débrancher Homey
2. Attendre 10 secondes
3. Rebrancher
4. Attendre démarrage complet (LED verte)
5. Réessayer `homey app run`

---

### Option 4: Installation Manuelle (Archive)

#### Créer l'archive
```bash
homey app build
```

#### Installer manuellement
1. Aller sur https://my.homey.app
2. Sélectionner votre Homey
3. **Apps → Install App** (coin supérieur droit)
4. Glisser-déposer le fichier `.tar.gz` de `.homeybuild/`

---

## 🔍 Diagnostic Détaillé

### Erreur 1: Timeout Remote Debug Session

**Cause:**
- Homey non accessible sur réseau local
- Firewall bloque la connexion
- Homey en veille/hors ligne
- Réseau WiFi différent

**Solutions:**
1. Vérifier que Homey et PC sont sur même WiFi
2. Désactiver temporairement firewall/antivirus
3. Redémarrer Homey
4. Utiliser câble Ethernet pour Homey (si Pro)

### Erreur 2: ENOENT .homeybuild/app.json

**Cause:**
- Cache `.homeybuild` supprimé ou incomplet
- Build échoué silencieusement

**Solutions:**
1. ✅ **DÉJÀ FAIT:** `homey app build` réussi
2. Vérifier que `.homeybuild/app.json` existe maintenant:
   ```bash
   dir .homeybuild\app.json
   ```

---

## 🎯 Recommandation

### Pour Tests Rapides
👉 **Option 2: Test Channel**
- Plus rapide
- Pas de problème réseau
- Version déjà validée

### Pour Développement Actif
👉 **Option 3: Debug Local**
- Mais résoudre le timeout d'abord
- Vérifier connectivité Homey

### Pour Production
👉 **Option 1: App Store**
- v4.9.275 déjà publiée
- Installation automatique

---

## 📋 Checklist Debug Local

### Avant de lancer `homey app run`

- [ ] Build réussi (`homey app build`)
- [ ] `.homeybuild/app.json` existe
- [ ] Homey sélectionné (`homey select`)
- [ ] Homey accessible (`homey info`)
- [ ] Même réseau WiFi (PC + Homey)
- [ ] Firewall désactivé (temporairement)
- [ ] Homey allumé et opérationnel (LED verte)

### Commandes de Vérification

```bash
# 1. Build
homey app build

# 2. Sélectionner Homey
homey select

# 3. Vérifier connexion
homey info

# 4. Lister Homeys disponibles
homey list

# 5. Vérifier version CLI
homey --version

# 6. Lancer debug
homey app run
```

---

## 🔧 Script de Diagnostic Automatique

Créez `DEBUG_CHECK.bat`:

```batch
@echo off
echo ===================================================================
echo    HOMEY DEBUG - Diagnostic Automatique
echo ===================================================================
echo.

echo [1/6] Verifying build...
homey app build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo [OK] Build successful
echo.

echo [2/6] Checking .homeybuild...
if exist .homeybuild\app.json (
    echo [OK] .homeybuild\app.json exists
) else (
    echo [ERROR] .homeybuild\app.json missing
    pause
    exit /b 1
)
echo.

echo [3/6] Listing available Homeys...
homey list
echo.

echo [4/6] Checking selected Homey...
homey info
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Cannot connect to Homey
    echo Please check:
    echo   - Same WiFi network
    echo   - Homey is powered on
    echo   - Firewall allows connection
    pause
)
echo.

echo [5/6] Validating app...
homey app validate
echo.

echo [6/6] Ready to run!
echo.
echo Choose an option:
echo   1. Run debug mode (homey app run)
echo   2. Install app (homey app install)
echo   3. Exit
echo.
set /p choice="Enter choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Starting debug mode...
    homey app run
) else if "%choice%"=="2" (
    echo.
    echo Installing app...
    homey app install
) else (
    echo.
    echo Exiting...
)

pause
```

---

## 🌐 Alternative: Test en Ligne

Si debug local impossible, utilisez:

### URL Test Version
```
https://homey.app/app/com.dlnraja.tuya.zigbee/test/
```

### URL App Store
```
https://homey.app/app/com.dlnraja.tuya.zigbee
```

### Homey Dashboard
```
https://tools.developer.homey.app/apps/app/com.dlnraja.tuya.zigbee
```

---

## 📊 Status Actuel

| Élément | Status |
|---------|--------|
| **Build** | ✅ Réussi |
| **Validation** | ✅ Passed (debug level) |
| **Publication** | ✅ v4.9.275 live |
| **Test Channel** | ✅ Disponible |
| **Debug Local** | ⚠️ Timeout (à résoudre) |

---

## 💡 Conseil

Pour éviter les problèmes de timeout:

1. **Utilisez le Test Channel** pour tester rapidement
2. **Résolvez le réseau** pour debug local futur
3. **Vérifiez Homey** est bien accessible

Le debug local n'est pas obligatoire pour tester l'app !

---

## 🎯 Action Recommandée

```bash
# Option la plus simple
1. Aller sur: https://homey.app/app/com.dlnraja.tuya.zigbee/test/
2. Cliquer "Install on Homey"
3. Tester immédiatement

# OU si debug local nécessaire:
1. Vérifier: homey info
2. Si timeout: Redémarrer Homey
3. Réessayer: homey app run
```

---

*Dernière mise à jour: 2025-11-04 18:30*
