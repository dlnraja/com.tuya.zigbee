# 💬 Réponse Forum - Peter van Werkhoven - Device Icons Issue

**Pour:** @Peter_van_Werkhoven  
**Post:** #281  
**Sujet:** Device icons showing black squares  
**Date:** 12 Octobre 2025

---

## Message Forum (EN)

Hi Peter,

Good catch on the icon issue! This is a known problem related to how Homey caches app images.

### 🔍 The Issue

The black squares appear because:
1. **Homey's image cache** is showing old/corrupted icons
2. The app has new unique icons for each driver (v2.11.4+)
3. Homey hasn't refreshed the cache yet

### ✅ Solution (Easy!)

**Method 1: Force Homey Refresh (Recommended)**
1. Go to Homey Settings → Apps
2. Find "Universal Tuya Zigbee" app
3. Click the ⚙️ (settings) icon
4. Scroll down and click "Reload App"
5. Wait 10-20 seconds
6. Check your dashboard - icons should be fixed!

**Method 2: Clear Homey Cache (If Method 1 doesn't work)**
1. Open Homey Developer Tools (https://developer.homey.app)
2. Go to your Homey
3. Click "Tools" → "Clear cache"
4. Restart Homey
5. Icons will reload fresh

**Method 3: Re-pair Devices (Last resort)**
- After updating to v2.15.1, re-pairing the devices will definitely load the correct icons
- This also fixes your battery/sensor data issues at the same time!

### 🎨 What the New Icons Look Like

Each driver now has **unique, professional Material Design icons**:
- Temperature sensors: Blue with thermometer icon
- Motion sensors: Red with eye/radar icon
- Plugs: Turquoise with plug sockets (like the image you saw!)
- Switches: Green with toggle icon
- And 163 other unique designs!

### 📋 My Recommendation

Since you're going to update to v2.15.1 anyway (for the battery/sensor fixes), I'd suggest:
1. Wait for v2.15.1 (24-48h)
2. Update the app
3. Remove both devices (SOS + Multisensor)
4. Restart Homey (clears cache)
5. Re-add devices

This will fix **all three issues at once**:
- ✅ Correct battery readings
- ✅ Sensor data reception
- ✅ Proper device icons

### 🙏 Thanks for the Feedback!

These "minority" issues are super important - they help me improve the app for everyone. I appreciate your detailed testing and patience!

Best regards,  
Dylan

---

## Message Forum (FR - Backup)

Bonjour Peter,

Bon œil pour le problème d'icônes! C'est un problème connu lié au cache d'images de Homey.

### 🔍 Le Problème

Les carrés noirs apparaissent car:
1. Le cache d'images de Homey montre des icônes anciennes/corrompues
2. L'app a de nouvelles icônes uniques pour chaque driver (v2.11.4+)
3. Homey n'a pas encore rafraîchi le cache

### ✅ Solution (Facile!)

**Méthode 1: Forcer Rafraîchissement Homey**
1. Aller dans Paramètres Homey → Apps
2. Trouver "Universal Tuya Zigbee"
3. Cliquer sur ⚙️ (paramètres)
4. Descendre et cliquer "Reload App"
5. Attendre 10-20 secondes
6. Vérifier dashboard - icônes devraient être corrigées!

**Méthode 2: Nettoyer Cache**
1. Ouvrir Homey Developer Tools
2. Aller sur votre Homey
3. "Tools" → "Clear cache"
4. Redémarrer Homey

**Méthode 3: Re-pairer Devices**
- Après update v2.15.1, re-pairer les devices chargera les bonnes icônes
- Cela fixe aussi les problèmes battery/sensor en même temps!

### 📋 Ma Recommandation

Comme vous allez mettre à jour vers v2.15.1 de toute façon:
1. Attendre v2.15.1 (24-48h)
2. Mettre à jour l'app
3. Retirer les 2 devices
4. Redémarrer Homey (nettoie cache)
5. Re-ajouter devices

Cela fixera **les 3 problèmes d'un coup**:
- ✅ Lectures battery correctes
- ✅ Réception données sensors
- ✅ Icônes devices correctes

Merci pour vos retours détaillés! 🙏

Cordialement,  
Dylan

---

**Préparé par:** Dylan  
**Date:** 12 Octobre 2025 13:55
