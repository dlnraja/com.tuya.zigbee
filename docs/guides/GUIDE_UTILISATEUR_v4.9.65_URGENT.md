# 🚀 GUIDE URGENT - v4.9.65 FIX USB + DIAGNOSTIC

## ✅ CE QUI A ÉTÉ RÉPARÉ

### BUG CRITIQUE USB OUTLET TROUVÉ ET FIXÉ!

**Problème**: Tous les drivers USB avaient `measure_battery` + CR2032
- USB 1-gang, 2-port, 3-gang
- Devices pensaient être sur batterie alors qu'ils sont AC powered!
- → Device affichait 1 bouton au lieu de 2
- → Aucune data ne remontait
- → Ne répondait pas aux commandes

**Solution**: v4.9.65 supprime `measure_battery` de TOUS les USB drivers
- USB outlets sont maintenant correctement AC powered
- Plus de confusion batterie/AC

---

## 🎯 ACTIONS IMMÉDIATES - DANS L'ORDRE!

### ÉTAPE 1: PARTAGE TES SCREENSHOTS (URGENT!)

J'ai besoin de voir tes captures d'écran pour t'aider!

**Méthode A - Copie dans le projet**:
```
1. Va dans: D:\Download\
2. Fais clic droit sur Photos-1-001.zip
3. "Extraire tout..." 
4. Copie TOUTES les images extraites dans:
   c:\Users\HP\Desktop\homey app\tuya_repair\user_screenshots\
5. Dis-moi "C'est fait!"
```

**Méthode B - Décris-les moi**:
Pour chaque image:
- Nom du driver (en haut de l'image)
- Ce que tu vois (boutons, erreurs, capabilities)
- Quel device c'est (USB? Switch? Button?)

---

### ÉTAPE 2: UPDATE VERS v4.9.65 (DISPONIBLE MAINTENANT!)

**Dans Homey app**:
```
1. Settings → Apps
2. Trouve "Universal Tuya Zigbee"
3. Si update disponible → UPDATE
4. Attends fin installation
5. Continue à ÉTAPE 3
```

---

### ÉTAPE 3: FIX TON USB DEVICE (2-PORT)

**Après update v4.9.65**:

#### A. Supprime le device actuel
```
1. Homey app → Devices
2. Trouve ton USB 2-port
3. Settings (⚙️) → Advanced → Remove device
4. Confirme suppression
```

#### B. Re-pair le device
```
1. Homey app → Devices → + Add Device
2. Cherche "USB Outlet"
3. Choisis "USB Outlet - 2 Ports"
4. Suis instructions pairing
5. IMPORTANT: Tiens bouton 5 secondes jusqu'à LED clignote
```

#### C. Vérifie après pairing
```
✓ Tu dois voir 2 boutons maintenant:
  - USB Port 1
  - USB Port 2
✓ Essaye allumer/éteindre chaque port
✓ Devices doivent répondre!
```

---

### ÉTAPE 4: TES "SWITCHES CR2032"

Tu as dit avoir des **"switches CR2032 3 gang + 1 gang"**.

**QUESTION IMPORTANTE**: Ce sont des:

#### Option A: SWITCHES MURAUX (fixés au mur)?
- Câblés dans l'électricité
- Contrôlent lumières/prises directement
- **→ NE PEUVENT PAS avoir de batteries!**
- **→ Mauvais driver assigné!**

#### Option B: WIRELESS BUTTONS (batteries)?
- Petits devices portables
- Envoient commandes par Zigbee
- Alimentés par CR2032
- **→ Ce sont des BUTTONS, pas des SWITCHES!**

**ACTION**: Regarde tes screenshots et dis-moi:
```
Device Switch/Button #1:
- Driver actuel: ?
- C'est fixé au mur (switch) ou portable (button)?
- Manufacturer ID: ?
- Combien de gangs: 1 ou 3?

Device Switch/Button #2:
- Driver actuel: ?
- C'est fixé au mur (switch) ou portable (button)?
- Manufacturer ID: ?
- Combien de gangs: 1 ou 3?
```

---

## 🔍 INFO DONT J'AI BESOIN (PAR DEVICE)

### Pour CHAQUE device qui ne fonctionne pas:

```
DEVICE #1:
- Type: USB? Switch? Button? Sensor?
- Driver actuel (dans Homey): ?
- Manufacturer ID: Settings → Zigbee info
- Model ID: Settings → Zigbee info
- Fixé au mur ou portable?
- Alimenté comment: Secteur? Batterie? USB?

DEVICE #2:
(même info)

...etc pour les 7 devices
```

---

## 🚨 PROBLÈME DEPUIS 2 JOURS - TIMELINE

**Aide-moi à comprendre**:

### Questions:
1. **Il y a 2 jours, qu'est-ce qui a changé?**
   - Update Homey?
   - Update app Tuya?
   - Ajout nouveau device?
   - Autre?

2. **Avant le problème**:
   - Tous les devices fonctionnaient?
   - Lesquels fonctionnaient, lesquels non?

3. **Version Homey**:
   - Tu es sur v12.9.0-rc.5 (Release Candidate)
   - Depuis quand?
   - Prêt à downgrade vers v12.8.0 (stable)?

---

## ✅ CHECKLIST COMPLÈTE

### Maintenant:
- [ ] Extrait ZIP et copié images dans `user_screenshots/`
- [ ] Update vers v4.9.65
- [ ] Supprimé + re-pairé USB device
- [ ] Vérifié: USB montre bien 2 boutons maintenant?
- [ ] Testé: USB répond aux commandes?

### Info à me donner:
- [ ] Screenshots copiés OU descriptions détaillées
- [ ] Liste complète 7 devices (type, driver, IDs)
- [ ] Timeline: qu'est-ce qui a changé il y a 2 jours?
- [ ] Switches CR2032: muraux ou portables?

---

## 💡 POURQUOI v4.9.65 VA AIDER

### Fix USB:
- ✅ Plus de confusion batterie/AC
- ✅ Devices USB correctement configurés
- ✅ Capabilities correctes (onoff + onoff.usb2/usb3)
- ✅ Devraient répondre après re-pair

### Prochains fix (besoin tes screenshots):
- Identifier manufacturer IDs manquants
- Corriger switches/buttons mal assignés
- Ajouter tes devices si IDs manquants

---

## 📞 PROCHAINE ÉTAPE

**FAIS ÉTAPES 1-4 CI-DESSUS**, puis dis-moi:

1. ✅ "Update fait, USB re-pairé, ça marche!" 
   → Ou "USB toujours pas de 2 boutons"

2. 📸 "Images copiées dans user_screenshots/"
   → Ou décris-moi chaque screenshot

3. 📋 Liste complète des 7 devices avec leurs infos

4. 🕐 Timeline du problème

**ON VA RÉSOUDRE CHAQUE DEVICE UN PAR UN! 💪**
