# Response to Lalla80111 - Issue #114 (Smart Button)

## 🔧 Fix Applied in v5.6.1

Hi @Lalla80111,

Thank you for the detailed investigation and the interview data! You found the exact issue.

### The Problem

Homey's Zigbee fingerprint matching is **case-sensitive**. Your devices report:
- `_TZ3000_b4awzgct` (uppercase TZ, lowercase rest)
- `_TZ3000_fllyghyj` (uppercase TZ, lowercase rest)

But the driver only had:
- `_TZ3000_B4AWZGCT` (full uppercase suffix)
- `_tz3000_b4awzgct` (full lowercase)

### The Fix

I've added the **exact mixed-case format** that your devices report:
- ✅ `_TZ3000_b4awzgct` added to `button_wireless_1` driver
- ✅ `_TZ3000_fllyghyj` added to `climate_sensor` driver

### Next Steps

1. **Update the app** from the Homey App Store (v5.6.1)
2. **Remove your devices** from Homey
3. **Re-pair the devices** - they should now be recognized correctly

### About the Button Flows

The TS0041 button should work with these flow triggers:
- **Button pressed** (single press)
- **Button double-pressed**
- **Button long-pressed**

If flows still don't work after re-pairing:
1. Check the device logs in **Homey Developer Tools** → **Devices** → your button → **Logs**
2. Press the button and look for `[BUTTON1-ONOFF]` or `[BUTTON1-SCENE]` log entries
3. Share the logs here if you see issues

### Technical Details

Your TS0041 button uses:
- Endpoint 1: Power Configuration (battery), OnOff, Basic, Custom cluster 57344
- The driver listens for `onOff` attribute changes and commands to detect button presses

Thank you for helping improve the app! 🙏

---

## 🇫🇷 Réponse en Français

Bonjour @Lalla80111,

Merci pour votre investigation détaillée et les données d'interview ! Vous avez trouvé le problème exact.

### Le Problème

La correspondance des empreintes Zigbee de Homey est **sensible à la casse**. Vos appareils rapportent :
- `_TZ3000_b4awzgct` (TZ majuscule, reste minuscule)
- `_TZ3000_fllyghyj` (TZ majuscule, reste minuscule)

Mais le driver n'avait que :
- `_TZ3000_B4AWZGCT` (suffixe tout majuscule)
- `_tz3000_b4awzgct` (tout minuscule)

### Le Correctif

J'ai ajouté le **format mixte exact** que vos appareils rapportent :
- ✅ `_TZ3000_b4awzgct` ajouté au driver `button_wireless_1`
- ✅ `_TZ3000_fllyghyj` ajouté au driver `climate_sensor`

### Prochaines Étapes

1. **Mettez à jour l'app** depuis le Homey App Store (v5.6.1)
2. **Supprimez vos appareils** de Homey
3. **Réappairez les appareils** - ils devraient maintenant être reconnus correctement

### À Propos des Flows du Bouton

Le bouton TS0041 devrait fonctionner avec ces déclencheurs de flow :
- **Bouton appuyé** (simple clic)
- **Bouton double-cliqué**
- **Bouton pressé longtemps**

Si les flows ne fonctionnent toujours pas après le réappairage :
1. Vérifiez les logs de l'appareil dans **Homey Developer Tools** → **Devices** → votre bouton → **Logs**
2. Appuyez sur le bouton et cherchez les entrées `[BUTTON1-ONOFF]` ou `[BUTTON1-SCENE]`
3. Partagez les logs ici si vous voyez des problèmes

Merci d'aider à améliorer l'app ! 🙏
