# 🔍 DIAGNOSTIC - Button 4-Gang Wireless (CR2032)

## DRIVER IDENTIFIÉ
- **Driver ID**: `button_wireless_4`
- **Nom**: "4-Boutons Contrôleur Sans Fil"
- **Batterie**: CR2032 ou CR2450
- **Fichier**: `drivers/button_wireless_4/device.js`

## CODE ANALYSIS

### ✅ Flow Triggers Implémentés
Le code `ButtonDevice.js` ligne 263-376 implémente:
1. ✅ `button_pressed` (générique avec token `button`)
2. ✅ `button_wireless_4_button_pressed` (driver-specific)
3. ✅ `button_wireless_4_button_1_pressed` (button-specific)
4. ✅ `button_wireless_4_button_2_pressed`
5. ✅ `button_wireless_4_button_3_pressed`
6. ✅ `button_wireless_4_button_4_pressed`
7. ✅ `button_double_press`
8. ✅ `button_long_press`

### ✅ Logging Ultra-Verbose
Quand un bouton est pressé, le code log:
```
════════════════════════════════════════
[FLOW-TRIGGER] 🔘 BUTTON PRESS DETECTED!
[FLOW-TRIGGER] Button: 1
[FLOW-TRIGGER] Type: single
[FLOW-TRIGGER] Driver ID: button_wireless_4
════════════════════════════════════════
[FLOW-TRIGGER] Trying: button_pressed (generic)
[FLOW-TRIGGER] ✅ button_pressed SUCCESS
[FLOW-TRIGGER] Trying: button_wireless_4_button_pressed
[FLOW-TRIGGER] ✅ button_wireless_4_button_pressed SUCCESS
```

### ✅ Battery Capability
- Ligne 15 du driver: `"measure_battery"` capability présente
- v4.9.220 corrige les bugs `setCapabilityValue`

## TESTS À FAIRE (version v4.9.220 requise!)

### Test 1: Vérifier Version Installée
```
Homey Developer Tools → Apps → Universal Tuya Zigbee
→ Version doit être: v4.9.220 (ou supérieure)
```

### Test 2: Vérifier Battery %
```
Homey → Devices → 4-Boutons Contrôleur Sans Fil
→ Regarder en haut à droite
→ Doit afficher un % (ex: 61%)
```

### Test 3: Tester Flow Trigger
```
1. Créer Flow:
   WHEN: "Bouton 1 a été pressé" (ou "button 1 pressed")
   THEN: Notification "Bouton 1 fonctionne!"
   
2. Cliquer physiquement bouton 1 sur device
3. Vérifier si notification arrive
```

### Test 4: Vérifier Logs
```
Homey → Settings → Apps → Universal Tuya Zigbee
→ View App Log
→ Cliquer physiquement bouton 1
→ Chercher dans logs:
   "[FLOW-TRIGGER] 🔘 BUTTON PRESS DETECTED!"
   
Si présent → Device détecte les clics
Si absent → Problème plus profond (pairing? Zigbee?)
```

## PROBLÈMES POSSIBLES

### Problème A: Version Ancienne Installée
**Symptôme**: Battery = null, Flows ne fonctionnent pas
**Cause**: Homey a v4.9.207 ou v4.9.214 (versions cassées)
**Solution**: Attendre v4.9.220 (déploiement en cours ~15 min)

### Problème B: Device Mal Appairé
**Symptôme**: Aucun event détecté quand on clique
**Cause**: Binding Zigbee raté pendant pairing
**Solution**: Re-pairer le device

### Problème C: Flow Card Manquante
**Symptôme**: Flow ne propose pas "button 1 pressed"
**Cause**: Flow cards pas générées pour ce driver
**Solution**: Utiliser flow générique "button pressed" avec condition

### Problème D: Battery Non Configurée
**Symptôme**: Battery % reste à null
**Cause**: Device n'envoie pas battery reports
**Solution**: Forcer read via settings (battery_report_interval)

## PROCHAINES ÉTAPES

1. **URGENT**: Confirmer quelle version est installée sur Homey
2. **CLARIFIER**: Quel est le problème exact?
   - Battery % absent?
   - Flows ne déclenchent pas?
   - Les deux?
3. **LOGS**: Envoyer logs après avoir cliqué bouton 1
