# 📋 INSTRUCTIONS RE-PAIRING - v4.9.53

**IMPORTANT**: Tous les devices paired AVANT v4.9.53 doivent être re-paired pour bénéficier des fixes!

---

## 🎯 POURQUOI RE-PAIRING?

v4.9.53 a dé-commenté et enrichi le code de 88+ drivers.

**MAIS**: Les devices déjà paired gardent leur ancienne configuration.

**SOLUTION**: Re-pair = nouvelle configuration appliquée!

---

## 📱 DEVICES CONCERNÉS

### Multi-Gang/Port (PRIORITÉ 1):
- ✅ USB outlets (2-port, 3-port)
- ✅ Wall switches (2, 3, 4, 6 gang)
- ✅ Touch switches (1-8 gang)
- ✅ Wireless switches (multi-button)

### Battery-Powered (PRIORITÉ 2):
- ✅ Motion sensors
- ✅ Door/window sensors
- ✅ Temperature/humidity sensors
- ✅ Buttons/controllers
- ✅ Smoke detectors
- ✅ Water leak sensors

**Si `measure_battery = null` OU ports/gangs manquants → RE-PAIR!**

---

## 🔄 PROCÉDURE STEP-BY-STEP

### ÉTAPE 1: Préparer l'App Homey

1. Ouvrir app Homey sur téléphone
2. Aller dans **Devices**
3. Localiser le device à re-pair
4. Noter ses paramètres (nom, zone, flows)

### ÉTAPE 2: Supprimer de Homey

1. Cliquer sur le device
2. **Settings** (engrenage en haut)
3. Descendre tout en bas
4. **Remove device**
5. Confirmer suppression

### ÉTAPE 3: Factory Reset Device

#### Pour BATTERIES (Sensors, Buttons):

**Méthode 1** (Preferred):
```
1. Retirer batterie complètement
2. Attendre 10 secondes
3. Remettre batterie
4. Maintenir bouton 5-10 secondes
5. LED clignote rapidement = OK
```

**Méthode 2** (Si pas de LED):
```
1. Retirer batterie
2. Attendre 30 secondes
3. Remettre batterie
4. Bouton reset 3x rapidement
```

#### Pour USB/PLUGS (Alimentés):

```
1. Débrancher de la prise
2. Maintenir bouton appuyé
3. Rebrancher EN MAINTENANT le bouton
4. Continuer 5-10 secondes
5. LED clignote = OK
```

#### Pour SWITCHES MURAUX:

```
1. Couper alimentation (disjoncteur)
2. Attendre 10 secondes
3. Maintenir bouton appuyé
4. Réactiver alimentation EN MAINTENANT
5. Continuer 5-10 secondes
6. LED clignote = OK
```

### ÉTAPE 4: Re-Pairing dans Homey

1. App Homey → **Devices** → **+** (Add Device)
2. Chercher **"Universal Tuya Zigbee"**
3. **Sélectionner le BON DRIVER**:
   - USB 2-port → `usb_outlet_2port`
   - Switch 3-gang → `switch_wall_3gang`
   - Climate sensor → `climate_monitor_temp_humidity`
   - Etc.

4. **Suivre instructions à l'écran**:
   - Approcher device de Homey (<2m)
   - Appuyer bouton pairing si demandé
   - Attendre détection (peut prendre 30s-2min)

5. **Confirmation**:
   - Device apparaît dans liste
   - Tous les boutons/ports visibles
   - Battery % visible (pas null)

### ÉTAPE 5: Vérification

#### Dans Homey App:
```
✅ Device apparaît
✅ Tous les boutons/ports visibles
✅ Battery % affiché (pas null)
✅ Device répond aux commandes
```

#### Dans Homey Developer Tools:
```
Settings → Developer Tools → Devices → [Device]
✅ Capabilities: measure_battery a une valeur
✅ Capabilities: tous les onoff.* présents
```

#### Dans les Logs:
```
✅ Logs verbeux de configuration:
   🔌 Configuring Port 1 (endpoint 1)...
   🔌 Configuring Port 2 (endpoint 2)...
   ⚡ Setting up battery monitoring...
   [OK] ✅ ... configured successfully
```

---

## 🚨 TROUBLESHOOTING

### Device Ne Pair Pas:

**Symptôme**: Homey ne trouve pas le device

**Solutions**:
1. ✅ Factory reset PAS complet → Refaire reset
2. ✅ Trop loin de Homey → Rapprocher (<1m)
3. ✅ Device déjà paired ailleurs → Reset plus long (20s)
4. ✅ Interférences → Désactiver WiFi temporairement
5. ✅ Batterie faible → Remplacer batterie

### Device Pair Mais Incomplete:

**Symptôme**: Device pair mais ports/battery manquants

**Solutions**:
1. ✅ Mauvais driver sélectionné → Supprimer et re-pair avec bon driver
2. ✅ Pairing interrompu → Supprimer et recommencer
3. ✅ Trop rapide → Attendre 2-3 min après détection

### Battery Toujours Null:

**Symptôme**: `measure_battery = null` après re-pairing

**Solutions**:
1. ✅ Vérifier logs pour "battery monitoring"
2. ✅ Si log absent → Driver pas configuré battery
3. ✅ Si log présent → Attendre 5-10 min (premier report)
4. ✅ Forcer update: Retirer/remettre batterie

### Ports/Switches Manquants:

**Symptôme**: USB 2-port ne montre que 1 port

**Solutions**:
1. ✅ Vérifier logs: "Configuring Port 2" doit être présent
2. ✅ Si absent → Driver pas complètement fixé
3. ✅ Envoyer diagnostic pour investigation
4. ✅ Essayer driver alternatif si disponible

---

## ⏱️ TEMPS ESTIMÉ

| Device Type | Reset | Pairing | Test | Total |
|-------------|-------|---------|------|-------|
| Battery sensor | 30s | 1-2 min | 30s | 3 min |
| USB outlet | 20s | 1-2 min | 1 min | 3-4 min |
| Wall switch | 1 min | 1-2 min | 1 min | 3-4 min |

**8 devices** = ~25-30 minutes total

---

## 📊 ORDRE RECOMMANDÉ

### Batch 1 - Test Fixes (2 devices, 6 min):
1. **USB 2-port** (test multi-port fix)
2. **Switch 3-gang** (test multi-gang fix)

→ **Vérifier que fix marche avant de continuer!**

### Batch 2 - Battery Simple (3 devices, 9 min):
3. **Climate Monitor** 
4. **SOS Button**
5. **3-Button Controller**

### Batch 3 - Battery Complex (3 devices, 10 min):
6. **4-Button Controller**
7. **Presence Sensor Radar**
8. **Soil Tester**

**Total**: 8 devices en 25 minutes

---

## ✅ CHECKLIST PAR DEVICE

```
□ Device supprimé de Homey
□ Factory reset effectué (LED clignote)
□ Re-paired dans Homey avec BON driver
□ Tous les boutons/ports visibles
□ Battery % affiché (pas null)
□ Device répond aux commandes ON/OFF
□ Logs verbeux présents
□ Device ajouté aux flows/zones
```

---

## 📧 APRÈS RE-PAIRING

### Envoyer Nouveau Diagnostic:

1. Re-pair au moins **2-3 devices**
2. **Interagir avec eux** (ON/OFF, vérifier battery)
3. **Homey Developer Tools** → Submit Diagnostic
4. **Message**: 
   ```
   Re-paired 3 devices avec v4.9.53:
   - USB 2-port: ✅ 2 ports visibles
   - Switch 3-gang: ✅ 3 switches visibles
   - Climate sensor: ✅ Battery 85%
   
   Logs de pairing inclus.
   ```

### Infos à Inclure:

- ✅ Quels devices re-paired
- ✅ Résultat (OK ou problème)
- ✅ Battery % visible ou null
- ✅ Nombre ports/switches visibles
- ✅ Logs de pairing présents

---

## 🎊 RÉSULTAT FINAL ATTENDU

Après re-pairing de TOUS les devices avec v4.9.53:

```
✅ USB 2-port: 2 boutons (Port 1, Port 2)
✅ USB 3-port: 3 boutons (Port 1, 2, 3)
✅ Switch 2-gang: 2 switches indépendants
✅ Switch 3-gang: 3 switches indépendants
✅ Battery devices: measure_battery = 0-100%
✅ Tous devices: Logs verbeux de configuration
✅ Tous devices: Fonctionnement optimal
```

**Aucun `null`, aucun port manquant!** 🎉

---

## 💡 TIPS

1. **Faire par batch**: Re-pair 2-3 devices, tester, puis continuer
2. **Vérifier logs**: Après chaque pairing, check les logs verbeux
3. **Prendre photos**: Screenshot avant/après pour comparer
4. **Noter problèmes**: Si quelque chose ne marche pas, noter exactement quoi
5. **Patience**: Certains devices prennent 2-3 min pour pairing complet

---

**BONNE CHANCE!** 🍀

Si problème persiste après re-pairing, envoyer diagnostic avec logs détaillés!
