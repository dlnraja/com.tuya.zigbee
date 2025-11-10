# 🚨 PROBLÈME CRITIQUE: FLOW CARDS MANQUANTES!

## ROOT CAUSE IDENTIFIÉ

### Ce que le code essaie de faire:
```javascript
// ButtonDevice.js ligne 283
await this.homey.flow.getDeviceTriggerCard('button_pressed')
  .trigger(this, { button: button.toString() }, {});

// ButtonDevice.js ligne 294
const cardId = `${driverId}_button_pressed`; // "button_wireless_4_button_pressed"
await this.homey.flow.getDeviceTriggerCard(cardId)
  .trigger(this, { button: button.toString() }, {});
```

### Ce qui existe dans app.json:
```json
{
  "id": "button_wireless_4_button_4gang_button_pressed",
  "title": {
    "en": "Button pressed",
    "fr": "Bouton appuyé"
  }
}
```

## PROBLÈME: MISMATCH!

Le code cherche: `button_wireless_4_button_pressed`  
Mais app.json a: `button_wireless_4_button_4gang_button_pressed`

**Résultat**: Flow card NOT FOUND → Rien ne se déclenche!

## FLOWS BIZARRES AVEC TAGS

L'utilisateur voit des flows avec des champs "tags" mais ne peut pas les remplir.
Cela signifie que les flow cards ont un token `button` défini mais:
1. Le token n'est pas utilisable dans l'UI
2. Ou le flow card ID est incorrect

## SOLUTIONS POSSIBLES

### Option A: Corriger app.json
Changer ID dans app.json:
```
"button_wireless_4_button_4gang_button_pressed"
→ "button_wireless_4_button_pressed"
```

### Option B: Créer les flow cards manquantes
Ajouter dans app.json:
```json
{
  "id": "button_pressed",
  "title": { "en": "Button pressed" },
  "tokens": [
    {
      "name": "button",
      "type": "number",
      "title": { "en": "Button" }
    }
  ]
}
```

### Option C: Créer flow cards spécifiques par bouton
```json
{
  "id": "button_wireless_4_button_1_pressed",
  "title": { "en": "Button 1 pressed" }
},
{
  "id": "button_wireless_4_button_2_pressed",
  "title": { "en": "Button 2 pressed" }
}
```

## URGENCE

CRITICAL! Sans flow cards correctes, les boutons sont INUTILISABLES!
