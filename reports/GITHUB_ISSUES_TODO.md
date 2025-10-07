# GitHub Issues à Traiter

## HOBEIAN Devices

### ZG-204ZV (Valve)
- **Type:** Smart Valve
- **Status:** Generic device detection
- **Action:** Extraire manufacturer ID du handshake data
- **Target Driver:** smart_valve_controller

### ZG-204ZM (Valve)
- **Type:** Smart Valve  
- **Status:** Generic device detection
- **Action:** Extraire manufacturer ID du handshake data
- **Target Driver:** smart_valve_controller

## Process
1. Aller sur GitHub Issues
2. Trouver les issues pour ZG-204ZV et ZG-204ZM
3. Copier handshake data
4. Extraire manufacturerName et modelId
5. Ajouter au driver smart_valve_controller
6. Valider et publier

## Commande Rapide
```bash
# Après extraction des IDs
node FIX_GENERIC_DEVICES.js
homey app validate --level=publish
git add -A && git commit -m "fix: Add HOBEIAN valve manufacturer IDs"
git push origin master
```
