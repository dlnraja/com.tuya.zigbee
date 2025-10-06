# SDK3 ENERGY RULES

**Source:** https://apps.developer.homey.app/the-basics/devices/energy

## RÈGLES OBLIGATOIRES

1. **Battery capability → energy.batteries REQUIS**
   - Si `measure_battery` ou `alarm_battery` présent
   - DOIT avoir `energy: { batteries: ["TYPE"] }`

2. **Pas battery → PAS de champ energy**
   - Si aucune capability battery
   - Supprimer complètement le champ energy

3. **Types batteries valides:**
   - CR2032, CR2450, AA, AAA, AAAA, INTERNAL, OTHER

## CHAMPS OPTIONNELS

**undefined = NORMAL** pour:
- Energy Cumulative (solar, meters)
- EV Charger (véhicules électriques)
- Home Battery (Tesla Powerwall)

**Notre app:** Tuya Zigbee → Ces champs ne s'appliquent pas

## VALIDATION

```bash
✓ energy.batteries présent SI battery capability
✓ energy absent SI pas battery capability
✓ homey app validate --level=publish PASS
```
