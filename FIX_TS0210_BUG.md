# 🐛 FIX CRITIQUE - Issue #33

## PROBLÈME IDENTIFIÉ

**TS0210 Vibration Sensor détecté comme "switch" au lieu de "vibration sensor"**

### Cause Root
Le productId `TS0210` est présent dans **MULTIPLE drivers** :
- ✅ `vibration_sensor` (CORRECT - doit rester)
- ❌ `wireless_switch_1gang_cr2032` (INCORRECT - doit être retiré)
- ❌ `wireless_switch_2gang_cr2032` (INCORRECT - doit être retiré)  
- ❌ `wireless_switch_3gang_cr2032` (INCORRECT - doit être retiré)
- ❌ `wireless_switch_4gang_cr2032` (INCORRECT - doit être retiré)
- ❌ `wireless_switch_4gang_cr2450` (INCORRECT - doit être retiré)
- ❌ `wireless_switch_5gang_cr2032` (INCORRECT - doit être retiré)
- ❌ `wireless_switch_6gang_cr2032` (INCORRECT - doit être retiré)
- ❌ `wall_switch_1gang_ac` (visible ligne 18445 app.json - INCORRECT)
- ❌ `switch_*gang_battery` (plusieurs drivers - INCORRECT)
- ❌ `scene_controller_*button` (plusieurs - INCORRECT)
- ❌ `sos_emergency_button` (INCORRECT)
- ❌ `garage_door_controller` (INCORRECT)
- ❌ `ceiling_fan` (INCORRECT)

### Impact
Lorsque l'utilisateur tente d'ajouter le TS0210:
1. Homey scanne les drivers dans l'ordre de app.json
2. Un driver générique (ex: wall_switch) capture le device AVANT vibration_sensor
3. Le device est ajouté comme "switch" au lieu de "vibration sensor"
4. Les capabilities vibration ne fonctionnent pas

## SOLUTION

**Retirer TS0210 de TOUS les drivers sauf `vibration_sensor`**

## DRIVERS À CORRIGER

Total: ~20 drivers à nettoyer
