# 🚨 DIAGNOSTIC URGENT - 7 DEVICES NON FONCTIONNELS

## 📋 RÉSUMÉ PROBLÈME

### Statut Actuel:
- ✅ **7 devices pairés**
- ✅ **Plus de "Zigbee inconnue"** (drivers OK)
- ❌ **Aucune data ne remonte**
- ❌ **Aucune commande ne fonctionne**
- ⏰ **Depuis 2 jours**

### Devices Affectés:

#### 1. USB Device (2-port)
**Problème**: Affiche **1 seul bouton** au lieu de 2
**Driver**: Probablement `usb_outlet_2port`
**Attendu**: 2 boutons pour contrôler 2 ports USB
**Actuel**: 1 seul bouton visible

#### 2. Switches avec CR2032 (batterie)
**Problème**: Aucune action possible
**Types**: 3 gang + 1 gang
**Étrange**: Switches alimentés par batterie CR2032?
**Normal**: Switches = AC powered, sensors = battery

---

## 🔍 CAUSES POSSIBLES

### Cause 1: MAUVAIS DRIVER ASSIGNÉ
**USB 1 bouton au lieu de 2**:
- Device pairé avec driver `usb_outlet_1gang` (1 port)
- Au lieu de `usb_outlet_2port` (2 ports)
- → Manufacturer ID matché le mauvais driver!

**Solution**: Re-pair avec bon driver

### Cause 2: SWITCHES NE SONT PAS DES SWITCHES
**"Switches CR2032"** = IMPOSSIBLE en théorie
- Switches muraux = AC powered
- CR2032 = Batteries pour sensors

**HYPOTHÈSE**: Ce sont des **WIRELESS BUTTONS**, pas des switches!
- `button_wireless_*` ou `switch_wireless_*`
- Alimentés par batterie
- Envoient commandes mais ne contrôlent rien directement

### Cause 3: NETWORK ZIGBEE CASSÉ
**Aucune data ne remonte depuis 2 jours**:
- Coordinateur Zigbee défaillant?
- Réseau saturé?
- Interférences?

---

## 🎯 ACTIONS IMMÉDIATES

### ACTION 1: VOIR TES SCREENSHOTS

**Copie manuellement les images**:

1. Extrais `D:\Download\Photos-1-001.zip`
2. Copie TOUTES les images dans:
   ```
   c:\Users\HP\Desktop\homey app\tuya_repair\user_screenshots\
   ```
3. Dis-moi quand c'est fait

**OU décris chaque image**:
- Nom du driver en haut
- Ce que tu vois (boutons, capabilities, erreurs)
- Screenshot de quoi? (Device settings? Zigbee info?)

### ACTION 2: VÉRIFIER DEVICES

Pour CHAQUE device, note:

#### Device 1: USB 2-port
- Driver actuel: ?
- Manufacturer ID: ?
- Model ID: ?
- Combien de boutons visibles: 1 ou 2?

#### Device 2-7: Switches/Buttons CR2032
- Type exact: Switch ou Button?
- Driver actuel: ?
- Gangs: 1, 2, ou 3?
- Manufacturer ID: ?

### ACTION 3: TEST RÉSEAU ZIGBEE

**Dans Homey app**:
1. Settings → Zigbee
2. Screenshot de la page
3. Note:
   - Nombre total devices
   - Signal strength
   - Erreurs visibles?

---

## 💡 HYPOTHÈSES À VÉRIFIER

### Hypothèse 1: Devices mal assignés lors pairing

**Scénario**:
- USB 2-port → Pairé comme 1-port
- Wireless buttons → Pairés comme switches
- → Manufacturer IDs matchent plusieurs drivers
- → App choisit le mauvais

**Test**: Quel est le manufacturer ID exact de chaque device?

### Hypothèse 2: App v4.9.64 a cassé quelque chose

**Scénario**:
- Update vers v4.9.64 il y a 2 jours
- Devices fonctionnaient avant
- Maintenant tous cassés

**Test**: 
- Quand as-tu fait la dernière update app?
- Devices fonctionnaient avant update?

### Hypothèse 3: Homey RC v12.9.0-rc.5 corrompt data

**Scénario**:
- RC instable
- Corrupt device storage
- Plus de communication Zigbee

**Test**: Downgrade vers v12.8.0?

---

## 📸 CE DONT J'AI BESOIN MAINTENANT

### URGENT:

1. **Les images du ZIP**
   - Copie dans `user_screenshots/`
   - OU décris chacune en détail

2. **Info précise sur chaque device**:

```
DEVICE 1 - USB
- Driver visible dans Homey: ?
- Manufacturer ID: ?
- Model ID: ?
- Capabilities visibles: ?

DEVICE 2 - Switch/Button CR2032 (3 gang)
- Driver visible: ?
- Manufacturer ID: ?
- Type réel: Switch mural ou Wireless button?

DEVICE 3 - Switch/Button CR2032 (1 gang)
- Driver visible: ?
- Manufacturer ID: ?
- Type réel: ?

...etc pour les 7 devices
```

3. **Timeline exact**:
   - Quand dernière update Homey?
   - Quand dernière update app?
   - Devices fonctionnaient quand pour la dernière fois?
   - Qu'est-ce qui a changé il y a 2 jours?

---

## 🔧 SOLUTIONS POTENTIELLES

### Solution 1: RE-PAIR avec bon driver

**Si manufacturer IDs matchent plusieurs drivers**:
1. Note manufacturer ID exact
2. Supprime device
3. Je modifie app pour forcer bon driver
4. Re-pair device

### Solution 2: Fix capabilities USB 2-port

**Si driver correct mais 1 bouton**:
1. Je vérifie code `usb_outlet_2port`
2. Fix capability `onoff.usb2` manquante
3. Publie nouvelle version
4. Tu updates app

### Solution 3: Wireless Buttons vs Switches

**Si devices sont wireless buttons**:
1. Change vers driver `button_wireless_*`
2. Ou `switch_wireless_*`
3. Capabilities correctes

---

## ⏰ PROCHAINE ÉTAPE

**FAIS ÇA MAINTENANT**:

1. ✅ Extrais le ZIP
2. ✅ Copie images dans `user_screenshots/`
3. ✅ Liste les 7 devices avec leurs infos
4. ✅ Réponds aux questions ci-dessus

**Je vais**:
1. Analyser les screenshots
2. Identifier les manufacturer IDs
3. Corriger les drivers
4. Publier fix immédiat
5. Te guider pour re-pair

---

**C'EST URGENT - ON VA RÉSOUDRE ÇA ENSEMBLE! 🚀**
