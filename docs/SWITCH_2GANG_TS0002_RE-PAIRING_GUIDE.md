# 🔌 GUIDE RE-PAIRING SWITCH 2-GANG TS0002

**Device:** TS0002 Switch 2-Gang
**Manufacturer:** _TZ3000_h1ipgkwn
**Problème:** Device pairé dans `switch_basic_1gang` au lieu de `switch_2gang`

---

## ❌ PROBLÈME IDENTIFIÉ

Votre switch TS0002 a été pairé avec une ancienne version de l'app qui avait TS0002 dans le driver `switch_basic_1gang`. Ce driver ne supporte qu'un seul gang.

**Symptômes:**
```
✅ onoff: fonctionne (Gang 1)
❌ onoff.l1: null (Gang 1 - endpoint 1)
❌ onoff.l2: null (Gang 2 - endpoint 2)
```

**Résultat:** Seulement 1 gang sur 2 fonctionne.

---

## ✅ SOLUTION

Le driver correct existe déjà dans l'app v4.9.339+: **`switch_2gang`**

Ce driver supporte:
- ✅ TS0002 productId
- ✅ _TZ3000_h1ipgkwn manufacturerName
- ✅ 2 endpoints (gang 1 + gang 2)
- ✅ Capabilities: `onoff` + `onoff.gang2`

**Vous devez RE-PAIRER le device** pour qu'il soit détecté par le bon driver.

---

## 📋 ÉTAPES RE-PAIRING

### 1. Noter les Flows
Avant de supprimer le device:
- ✅ Prenez une capture d'écran de tous les flows qui utilisent ce switch
- ✅ Notez les automations associées
- ✅ Notez la position du switch dans vos groupes

### 2. Supprimer le Device de Homey
```
Homey App → Appareils → Switch 1gang (TS0002)
→ Paramètres (⚙️) → Supprimer l'appareil
```

### 3. Factory Reset du Switch
**Méthode 1:** Reset via bouton physique
```
1. Couper l'alimentation électrique du switch
2. Maintenir le bouton APPUYÉ
3. Remettre l'alimentation TOUT EN MAINTENANT le bouton
4. Maintenir 5-10 secondes
5. LED clignote rapidement = Reset OK
```

**Méthode 2:** Reset via on/off rapide (si accessible)
```
1. Allumer/Éteindre le switch 5 fois rapidement (< 1s entre chaque)
2. LED clignote rapidement = Mode pairing actif
```

### 4. Re-Pairer avec Homey
```
1. Homey App → Appareils → Ajouter appareil
2. Chercher: "Universal Tuya Zigbee"
3. Sélectionner: "Switch 2-Gang" (PAS "Switch 1-Gang"!)
4. Suivre instructions pairing
5. Attendre détection (LED arrête de clignoter)
```

### 5. Vérifier le Bon Driver
Après pairing, vérifiez dans les paramètres du device:
```
✅ Driver: switch_2gang
✅ Capabilities: onoff, onoff.gang2
✅ Manufacturer: _TZ3000_h1ipgkwn
✅ Model: TS0002
```

### 6. Tester les 2 Gangs
```
Gang 1 (onoff): On/Off → Doit fonctionner
Gang 2 (onoff.gang2): On/Off → Doit fonctionner
```

### 7. Recréer les Flows
- ✅ Recréez les flows notés à l'étape 1
- ✅ Ajoutez le device aux groupes
- ✅ Testez toutes les automations

---

## 🎯 RÉSULTAT ATTENDU

Après re-pairing:
```
✅ Driver: switch_2gang
✅ onoff (Gang 1): Fonctionne
✅ onoff.gang2 (Gang 2): Fonctionne
✅ Les 2 gangs sont contrôlables indépendamment
✅ Flows fonctionnent correctement
```

---

## ⚠️ NOTES IMPORTANTES

### Pourquoi Re-Pairing au lieu de Migration Automatique?

**Homey SDK3 ne permet PAS de migrer un device entre drivers différents.**

Options possibles:
1. ❌ Migration automatique → IMPOSSIBLE (SDK3 limitation)
2. ✅ Re-pairing manuel → SAFE et GARANTI de fonctionner
3. ❌ Forcer changement driver → RISQUÉ (peut casser le device)

Nous avons choisi la méthode SAFE: re-pairing manuel.

### Est-ce que mes autres devices sont affectés?

**NON.** Ce problème affecte uniquement:
- ✅ Devices TS0002 pairés AVANT la v4.9.339
- ✅ Qui sont actuellement dans `switch_basic_1gang`

Tous les autres devices fonctionnent normalement et n'ont PAS besoin de re-pairing.

### Je ne veux pas refaire mes flows...

Nous comprenons! Malheureusement, c'est la seule méthode safe. Mais:
- ✅ Le re-pairing ne prend que 5 minutes
- ✅ Vos flows peuvent être recréés rapidement
- ✅ Une fois fait, le device fonctionnera parfaitement pour toujours

**Alternative:** Si vous ne voulez pas re-pairer maintenant, le Gang 1 continuera à fonctionner avec le driver actuel. Vous pouvez attendre une prochaine maintenance pour faire le re-pairing.

---

## 🆘 TROUBLESHOOTING

### Le device ne passe pas en mode pairing
```
→ Essayez les 2 méthodes de reset (bouton + on/off rapide)
→ Vérifiez que l'alimentation est stable
→ Assurez-vous que le LED clignote rapidement
→ Distance < 2m de Homey pendant pairing
```

### Homey ne détecte pas le device
```
→ Vérifiez que vous sélectionnez "Switch 2-Gang" et PAS "Switch 1-Gang"
→ Le device doit être à moins de 2m de Homey
→ Attendez 1-2 minutes (détection parfois lente)
→ Essayez de re-faire le factory reset
```

### Le device est détecté mais ne fonctionne pas
```
→ Vérifiez le driver dans les paramètres (doit être switch_2gang)
→ Attendez 5 minutes pour l'initialisation complète
→ Envoyez un rapport diagnostic si le problème persiste
```

### Gang 2 ne fonctionne toujours pas après re-pairing
```
→ Vérifiez que le switch supporte bien 2 gangs physiquement
→ Vérifiez le modèle: TS0002 = 2-gang, TS0001 = 1-gang
→ Envoyez un rapport diagnostic via Homey Developer Tools
```

---

## 📞 SUPPORT

Si le problème persiste après re-pairing:

1. **Envoyez un rapport diagnostic:**
   ```
   Homey Developer Tools → Devices → Switch 2gang
   → Diagnostics → Generate Report
   ```

2. **Incluez dans le rapport:**
   - ✅ Manufacturer Name
   - ✅ Product ID
   - ✅ Driver actuel
   - ✅ Capabilities actuelles
   - ✅ Logs des dernières 24h

3. **Contactez-nous:**
   - GitHub Issues: https://github.com/dlnraja/com.tuya.zigbee/issues
   - Forum Homey: https://community.homey.app

---

**Version:** v4.9.339+
**Date:** 2025-11-15
**Status:** ✅ Solution validée et testée
