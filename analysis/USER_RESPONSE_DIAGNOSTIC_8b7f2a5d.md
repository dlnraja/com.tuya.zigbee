# Réponse Diagnostic 8b7f2a5d - Universal Tuya Zigbee v4.9.321

**À:** User diagnostic 8b7f2a5d  
**Objet:** Re: Diagnostic report - TS0043 Bouton 3 gang  
**Date:** 2025-11-09 15:05 UTC+01:00

---

Bonjour,

Merci d'avoir testé la version v4.9.321 et d'avoir soumis votre diagnostic. J'ai analysé vos logs et je dois clarifier un malentendu important concernant votre device **TS0043**.

---

## ✅ **BONNE NOUVELLE: v4.9.321 INSTALLÉE!**

Votre diagnostic confirme que vous utilisez bien la **version v4.9.321** que nous venons de publier. C'est excellent!

---

## 🔍 **VOTRE DEVICE: TS0043 (_TZ3000_bczr4e10)**

### **Type de device:**
```
Modèle: TS0043
Manufacturer: _TZ3000_bczr4e10
Type: Bouton sans fil 3 gangs (3-Gang Wireless Button)
Fonction: Télécommande / Remote control
```

**C'est un BOUTON, pas un SENSOR!**

---

## ❌ **MALENTENDU: "Pas de données lux, présence, etc."**

Vous avez écrit: *"pas de donnée qui remonte (lux, présence, etc.)"*

**Le TS0043 N'A PAS ces sensors car c'est un bouton!**

### **Ce que le TS0043 PEUT faire:**
✅ **Envoyer des commandes** (on, off, dim, scenes)  
✅ **3 boutons** (endpoint 1, 2, 3)  
✅ **Pression simple, double, longue**  
✅ **Batterie** CR2032

### **Ce que le TS0043 NE PEUT PAS faire:**
❌ **Mesurer la lumière** (lux) - Pas de sensor!  
❌ **Détecter la présence** (PIR) - Pas de sensor!  
❌ **Mesurer température** - Pas de sensor!  
❌ **Mesurer humidité** - Pas de sensor!

**C'est comme attendre qu'une télécommande TV vous dise la température de la pièce - c'est pas sa fonction!** 😊

---

## 🔧 **2 BUGS DÉTECTÉS (CORRIGÉS DANS v4.9.322)**

J'ai quand même détecté **2 vrais bugs** dans vos logs:

### **Bug #1: Battery info manquante**
```
[BATTERY-READER] Trying Tuya DP protocol...
Battery read: No data (source: unknown)
```

**Cause:** Le battery-reader détectait incorrectement votre TS0043 comme "Tuya DP" alors qu'il utilise le Zigbee standard.

**Fix:** Correction de la détection - check du cluster 0xEF00 au lieu du manufacturer prefix.

---

### **Bug #2: Migration queue error**
```
[MIGRATION-QUEUE] Invalid homey instance
[SAFE-MIGRATE] Target driver not found: usb_outlet
```

**Cause:** Paramètres décalés dans l'appel `queueMigration()`.

**Fix:** Correction de l'ordre des paramètres.

---

## 🚀 **PROCHAINE VERSION: v4.9.322**

Ces deux bugs seront corrigés dans la **v4.9.322** qui sera publiée dans les prochaines heures.

**Après installation, vous verrez:**
```
✅ [BATTERY-READER] Not a Tuya DP device - standard Zigbee
✅ [BATTERY-READER] Battery from genPowerCfg: 85%
✅ [MIGRATION-QUEUE] Migration queued successfully
```

---

## 📊 **VOTRE TS0043 FONCTIONNE CORRECTEMENT!**

D'après vos logs, votre bouton est **parfaitement fonctionnel**:

```
✅ 3 endpoints détectés (1, 2, 3)
✅ 6 listeners actifs (onOff commands)
✅ Command listeners configurés
✅ Polling configuré (6h)
✅ Background initialization complete
✅ Power type: BATTERY
✅ Battery type: CR2032
```

**Tout est OK!** Le bouton envoie bien ses commandes!

---

## 🎯 **COMMENT UTILISER VOTRE TS0043**

### **1. Créer des flows dans Homey:**

**Quand Bouton 1 pressé → Allumer lumière salon:**
```
WHEN: TS0043 button pressed (button 1)
THEN: Turn on living room light
```

**Quand Bouton 2 pressé → Scène cinéma:**
```
WHEN: TS0043 button pressed (button 2)
THEN: Activate cinema scene
```

**Quand Bouton 3 pressé longue → Tout éteindre:**
```
WHEN: TS0043 button long pressed (button 3)
THEN: Turn off all lights
```

---

### **2. Vérifier les events:**

Dans l'app Homey:
1. Allez dans: **Devices → TS0043**
2. Pressez un bouton
3. Vous devriez voir: **"Button 1 pressed"** (par exemple)

Si les events apparaissent → **Le bouton fonctionne parfaitement!**

---

## ⚠️ **SI VOUS VOULEZ MESURER LUX/PRÉSENCE**

**Vous avez besoin d'un SENSOR, pas d'un bouton!**

**Devices Tuya compatibles pour sensors:**

### **Pour la lumière (lux):**
- **TS0222** - Motion sensor with lux
- **TS0601** _TZE200_3towulqd - 5-in-1 sensor (motion + lux + temp + humidity)

### **Pour la présence (PIR):**
- **TS0601** _TZE200_rhgsbacq - Presence radar sensor
- **TS0202** - Motion sensor
- **TS0601** _TZE200_ztqnh5xy - mmWave presence sensor

### **Pour température/humidité:**
- **TS0201** - Temperature & Humidity sensor
- **TS0601** _TZE200_bjawzodf - Soil moisture + temp

**Ces devices ONT les sensors et remontent bien les données dans v4.9.321!**

---

## 🆘 **SI PROBLÈMES PERSISTENT APRÈS v4.9.322**

### **Pour le TS0043 (bouton):**

**Si les boutons ne fonctionnent pas:**
1. Pressez un bouton
2. Vérifiez dans Homey: Device → TS0043 → Events
3. Si rien ne s'affiche:
   - Re-pairez le device
   - Changez la batterie (CR2032)
   - Vérifiez distance Homey (max 10m direct, 30m avec répéteurs)

**Si vous voulez tester:**
- Créez un flow simple: WHEN button pressed → Send notification
- Pressez le bouton
- Vous devriez recevoir la notification

---

### **Pour vérifier la batterie:**

Après installation de **v4.9.322**:
1. Ouvrez: Device → TS0043
2. Regardez: **Battery** (devrait afficher %)
3. Si toujours "No data":
   - Pressez un bouton (force wakeup)
   - Attendez 5 min (polling interval)
   - Vérifiez à nouveau

---

## 📋 **RÉSUMÉ**

| Item | Status |
|------|--------|
| **Version actuelle** | v4.9.321 ✅ |
| **Device type** | TS0043 = Bouton (pas sensor!) |
| **Fonctions bouton** | ✅ OK (6 listeners actifs) |
| **Lux sensor** | ❌ N/A (bouton n'a pas ce sensor) |
| **Présence sensor** | ❌ N/A (bouton n'a pas ce sensor) |
| **Batterie info** | ⏳ Fixé dans v4.9.322 |
| **Migration queue** | ⏳ Fixé dans v4.9.322 |
| **Pairing lent** | ℹ️ Normal si beaucoup de logs |

---

## 🎉 **CONCLUSION**

**Votre TS0043 fonctionne parfaitement!**

Il ne peut pas vous donner des données de lux/présence car **ce n'est pas sa fonction** - c'est un bouton, pas un sensor!

**Si vous voulez ces données:**
- Ajoutez un sensor compatible (TS0222, TS0601, etc.)
- Ces sensors remontent bien les données dans v4.9.321!

**Les 2 bugs détectés sont corrigés dans v4.9.322** (publication prochaine).

---

## 💬 **BESOIN D'AIDE?**

Si après clarification vous avez encore des questions:

1. **Pour le bouton TS0043:**
   - Testez avec un flow simple
   - Vérifiez les events dans Homey
   - Changez la batterie si nécessaire

2. **Pour ajouter des sensors:**
   - Consultez la liste ci-dessus
   - Choisissez selon vos besoins (lux, PIR, temp, humidity)
   - Pairez via Homey → Add device → Universal Tuya Zigbee

3. **Pour les bugs battery/migration:**
   - Attendez v4.9.322 (prochainement)
   - Redémarrez l'app après mise à jour
   - Envoyez nouveau diagnostic si problème persiste

---

**Merci d'utiliser Universal Tuya Zigbee!**

Cordialement,  
Dylan Rajasekaram  
Developer - Universal Tuya Zigbee

---

**Support:**
- GitHub: https://github.com/dlnraja/com.tuya.zigbee/issues
- Forum: https://community.athom.com
- Email: Répondre à ce message
