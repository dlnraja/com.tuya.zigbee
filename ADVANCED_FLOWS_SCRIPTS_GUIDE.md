# 📝 Advanced Flows & Scripts Guide - Universal Tuya Zigbee

**Guide complet pour utiliser des scripts avec vos devices Tuya Zigbee dans Advanced Flows**

---

## 📚 **TABLE DES MATIÈRES**

1. [Introduction](#introduction)
2. [Passer des Arguments aux Scripts](#passer-des-arguments)
3. [Accéder aux Device Values](#accéder-aux-device-values)
4. [Exemples Pratiques](#exemples-pratiques)
5. [Troubleshooting](#troubleshooting)
6. [Ressources](#ressources)

---

## 🎯 **INTRODUCTION**

Cette documentation explique comment utiliser des scripts dans Advanced Flows avec vos devices Tuya Zigbee.

### Cas d'Usage Courants

- ✅ Automatisation basée sur plusieurs sensors
- ✅ Calculs complexes (moyennes, totaux, etc.)
- ✅ Logique conditionnelle avancée
- ✅ Manipulation de données (températures, prix, etc.)
- ✅ Notifications personnalisées

---

## 🔧 **PASSER DES ARGUMENTS AUX SCRIPTS**

### Méthode de Base

**1. Dans Advanced Flow, utilisez:**
```
"Start script with argument" card
```

**2. Sélectionnez votre argument:**
- Cliquez sur le bouton "Label"
- Sélectionnez la valeur (ex: température du sensor)

**3. Dans votre script, récupérez l'argument:**

```javascript
// ✅ CORRECT - Utiliser args[0]
const argumentValue = args[0];

// ❌ INCORRECT - Ces syntaxes NE fonctionnent PAS
// const value = argument;
// const value = arg;
// const value = args;
```

### Pourquoi `args[0]` ?

`args` est un **tableau** (array) qui contient tous les arguments passés au script:
- `args[0]` = Premier argument
- `args[1]` = Deuxième argument (si présent)
- `args[2]` = Troisième argument (si présent)
- etc.

---

## 📊 **ACCÉDER AUX DEVICE VALUES**

### Exemple: Lire la Température d'un Sensor Tuya

```javascript
// Script dans Advanced Flow
const temperature = args[0]; // Température passée en argument

// Afficher dans les logs
console.log('Temperature:', temperature);

// Retourner la valeur (pour l'utiliser dans le flow)
return temperature;
```

### Exemple: Calculer la Moyenne de Plusieurs Sensors

```javascript
// Passer 3 températures en arguments
const temp1 = args[0];
const temp2 = args[1];
const temp3 = args[2];

// Calculer la moyenne
const average = (temp1 + temp2 + temp3) / 3;

// Arrondir à 1 décimale
const roundedAverage = Math.round(average * 10) / 10;

console.log('Average temperature:', roundedAverage);

return roundedAverage;
```

---

## 💡 **EXEMPLES PRATIQUES**

### 1. Vérifier si une Température est dans une Plage

```javascript
// Arguments: température actuelle, min, max
const currentTemp = args[0];
const minTemp = args[1] || 18; // Défaut: 18°C
const maxTemp = args[2] || 24; // Défaut: 24°C

// Vérifier la plage
if (currentTemp < minTemp) {
  tag('temperature_status', 'TOO_COLD');
  return 'TOO_COLD';
} else if (currentTemp > maxTemp) {
  tag('temperature_status', 'TOO_HOT');
  return 'TOO_HOT';
} else {
  tag('temperature_status', 'OK');
  return 'OK';
}
```

**Utilisation dans Advanced Flow:**
```
IF: Temperature changed
THEN: Run script with arguments
  - args[0] = {{Temperature}}
  - args[1] = 18 (min)
  - args[2] = 24 (max)
THEN: Use {{temperature_status}} tag in notifications
```

---

### 2. Calculer le Coût Énergétique

```javascript
// Arguments: consommation (kWh), prix par kWh
const consumption = args[0]; // en kWh
const pricePerKwh = args[1] || 0.20; // Prix par défaut: 0.20€

// Calculer le coût
const cost = consumption * pricePerKwh;

// Arrondir à 2 décimales
const roundedCost = Math.round(cost * 100) / 100;

// Créer un tag pour utiliser dans le flow
tag('energy_cost', roundedCost);

// Retourner le coût formaté
return `${roundedCost}€`;
```

**Utilisation dans Advanced Flow:**
```
IF: Power consumption changed
THEN: Run script with arguments
  - args[0] = {{Power consumption}}
  - args[1] = {{Current price per kWh}}
THEN: Send notification "Energy cost: {{energy_cost}}"
```

---

### 3. Détecter un Mouvement Prolongé (Sécurité)

```javascript
// Arguments: motion sensor status, timestamp
const motionDetected = args[0]; // true/false
const timestamp = args[1] || Date.now();

// Variables globales (stocker l'état)
let motionStartTime = await get('motion_start_time') || null;

if (motionDetected) {
  if (!motionStartTime) {
    // Premier mouvement détecté
    motionStartTime = timestamp;
    await set('motion_start_time', motionStartTime);
    tag('motion_duration', 0);
    return 'MOTION_STARTED';
  } else {
    // Mouvement en cours - calculer la durée
    const duration = (timestamp - motionStartTime) / 1000; // en secondes
    tag('motion_duration', Math.round(duration));
    
    if (duration > 300) { // 5 minutes
      return 'PROLONGED_MOTION_ALERT';
    }
    return 'MOTION_ONGOING';
  }
} else {
  // Motion cleared
  await set('motion_start_time', null);
  tag('motion_duration', 0);
  return 'MOTION_CLEARED';
}
```

---

### 4. Moyenne Mobile (Rolling Average)

```javascript
// Arguments: nouvelle valeur
const newValue = args[0];

// Récupérer l'historique (max 10 valeurs)
let history = await get('temperature_history') || [];

// Ajouter la nouvelle valeur
history.push(newValue);

// Garder seulement les 10 dernières valeurs
if (history.length > 10) {
  history.shift(); // Retirer la plus ancienne
}

// Sauvegarder l'historique
await set('temperature_history', history);

// Calculer la moyenne
const average = history.reduce((a, b) => a + b, 0) / history.length;
const roundedAverage = Math.round(average * 10) / 10;

// Créer un tag
tag('temperature_avg', roundedAverage);

console.log('History:', history);
console.log('Average:', roundedAverage);

return roundedAverage;
```

---

### 5. Alertes Multi-Conditions

```javascript
// Arguments: température, humidité, battery level
const temperature = args[0];
const humidity = args[1];
const battery = args[2];

// Définir les seuils
const TEMP_MIN = 15;
const TEMP_MAX = 30;
const HUMIDITY_MAX = 70;
const BATTERY_MIN = 20;

// Vérifier les conditions
const alerts = [];

if (temperature < TEMP_MIN) {
  alerts.push('🥶 Temperature too low');
}
if (temperature > TEMP_MAX) {
  alerts.push('🔥 Temperature too high');
}
if (humidity > HUMIDITY_MAX) {
  alerts.push('💧 Humidity too high');
}
if (battery < BATTERY_MIN) {
  alerts.push('🔋 Battery low');
}

// Créer le message
if (alerts.length > 0) {
  const message = alerts.join('\n');
  tag('device_alerts', message);
  return `ALERT: ${alerts.length} issues detected`;
} else {
  tag('device_alerts', 'All OK');
  return 'ALL_OK';
}
```

---

## 🔍 **ACCÉDER AUX HOMEY APIs**

### Lire toutes les Variables Logic

```javascript
// Récupérer toutes les variables
const variables = await Homey.logic.getVariables();

// Afficher dans les logs
console.log('All variables:', variables);

// Accéder à une variable spécifique
const myVar = variables.find(v => v.name === 'MyVariable');
if (myVar) {
  console.log('MyVariable value:', myVar.value);
  return myVar.value;
}

return null;
```

### Modifier une Variable Logic

```javascript
// Créer ou modifier une variable
const variableName = 'my_variable';
const variableValue = args[0];

await Homey.logic.createVariable({
  name: variableName,
  value: variableValue
});

tag('updated_variable', variableValue);
return `Variable ${variableName} updated to ${variableValue}`;
```

### Contrôler un Device

```javascript
// Récupérer tous les devices
const devices = await Homey.devices.getDevices();

// Trouver un device par nom
const myDevice = Object.values(devices).find(d => d.name === 'Living Room Light');

if (myDevice) {
  // Allumer le device
  await myDevice.setCapabilityValue('onoff', true);
  console.log('Device turned on');
  return 'DEVICE_ON';
}

return 'DEVICE_NOT_FOUND';
```

---

## ❌ **TROUBLESHOOTING**

### Erreur: "args is not defined"

**Cause:** Le script n'est pas appelé avec des arguments.

**Solution:**
```javascript
// Vérifier si args existe
const value = (typeof args !== 'undefined' && args[0]) ? args[0] : 0;
```

### Erreur: "Cannot read property '0' of undefined"

**Cause:** `args` est undefined ou vide.

**Solution:**
```javascript
// Vérification défensive
if (!args || args.length === 0) {
  console.log('No arguments provided');
  return null;
}

const value = args[0];
```

### Les Tags ne s'affichent pas dans le Flow

**Cause:** Le tag n'est pas créé correctement.

**Solution:**
```javascript
// ✅ CORRECT
tag('my_tag', value);

// ❌ INCORRECT
tags('my_tag', value); // "tags" n'existe pas
setTag('my_tag', value); // mauvaise syntaxe
```

### Le Script retourne toujours "-"

**Cause:** Le script ne retourne pas de valeur ou retourne `undefined`.

**Solution:**
```javascript
// Toujours retourner une valeur
const result = args[0] * 2;

// ❌ INCORRECT - pas de return
// tag('result', result);

// ✅ CORRECT - avec return
tag('result', result);
return result;
```

---

## 🎓 **BONNES PRATIQUES**

### 1. Validation des Arguments

```javascript
// Toujours valider les arguments
const temperature = args[0];

if (typeof temperature !== 'number' || isNaN(temperature)) {
  console.error('Invalid temperature value');
  return null;
}

// Continuer avec le traitement...
```

### 2. Gestion des Erreurs

```javascript
try {
  const value = args[0];
  const result = complexCalculation(value);
  tag('result', result);
  return result;
} catch (error) {
  console.error('Script error:', error.message);
  tag('script_error', error.message);
  return null;
}
```

### 3. Logs Informatifs

```javascript
// Logs au début
console.log('=== Script started ===');
console.log('Arguments:', args);

// Logs pendant le traitement
const result = doSomething(args[0]);
console.log('Result:', result);

// Logs à la fin
console.log('=== Script completed ===');

return result;
```

### 4. Documentation dans le Code

```javascript
/**
 * SCRIPT: Calculate Energy Cost
 * 
 * Arguments:
 *   args[0] - Power consumption in kWh (number)
 *   args[1] - Price per kWh in € (number, optional, default: 0.20)
 * 
 * Returns:
 *   Formatted cost string (e.g., "5.40€")
 * 
 * Tags Created:
 *   - energy_cost: Cost as number
 *   - energy_consumption: Consumption in kWh
 */

const consumption = args[0];
const price = args[1] || 0.20;

// ... rest of code
```

---

## 📚 **RESSOURCES**

### Documentation Officielle

- **Homey Scripts API:** https://homey.app/docs/apps/homeyscript
- **Advanced Flows:** https://homey.app/docs/tools/flow/advanced-flow
- **Device Capabilities:** https://apps.developer.homey.app/the-basics/capabilities

### Forum Homey Community

- **Advanced Flows Script Questions:** https://community.homey.app/c/questions-help/8
- **Developers Section:** https://community.homey.app/c/developers/10

### Exemples de Code

- **GitHub Homey Community Scripts:** https://github.com/search?q=homey+script
- **Script Examples:** https://community.homey.app/t/homeyscript-functionality/30066

---

## 🎯 **CAS D'USAGE SPÉCIFIQUES - TUYA ZIGBEE**

### Exemple: Moyenner 3 Temperature Sensors

```javascript
// Arguments: 3 températures de sensors Tuya différents
const temp1 = args[0]; // Salon
const temp2 = args[1]; // Cuisine
const temp3 = args[2]; // Chambre

// Calculer moyenne
const avg = (temp1 + temp2 + temp3) / 3;
const rounded = Math.round(avg * 10) / 10;

// Créer des tags
tag('avg_temperature', rounded);
tag('temp_salon', temp1);
tag('temp_cuisine', temp2);
tag('temp_chambre', temp3);

// Déterminer la pièce la plus chaude
const hottest = Math.max(temp1, temp2, temp3);
let hottestRoom = '';
if (hottest === temp1) hottestRoom = 'Salon';
if (hottest === temp2) hottestRoom = 'Cuisine';
if (hottest === temp3) hottestRoom = 'Chambre';

tag('hottest_room', hottestRoom);

return `Avg: ${rounded}°C, Hottest: ${hottestRoom}`;
```

### Exemple: Smart Battery Monitoring

```javascript
// Arguments: battery levels from multiple devices
const batteries = [
  { name: 'Motion Sensor 1', level: args[0] },
  { name: 'Motion Sensor 2', level: args[1] },
  { name: 'Door Sensor', level: args[2] },
  { name: 'Window Sensor', level: args[3] }
];

// Filtrer les batteries faibles (< 20%)
const lowBatteries = batteries.filter(b => b.level < 20);

if (lowBatteries.length > 0) {
  const message = lowBatteries
    .map(b => `${b.name}: ${b.level}%`)
    .join(', ');
  
  tag('low_battery_devices', message);
  tag('low_battery_count', lowBatteries.length);
  
  return `ALERT: ${lowBatteries.length} devices with low battery`;
} else {
  tag('low_battery_devices', 'None');
  tag('low_battery_count', 0);
  return 'ALL_BATTERIES_OK';
}
```

---

## ✅ **CHECKLIST SCRIPT**

Avant de déployer votre script:

- [ ] ✅ Arguments validés (type, range)
- [ ] ✅ Gestion des erreurs (try/catch)
- [ ] ✅ Logs informatifs (console.log)
- [ ] ✅ Tags créés pour réutilisation
- [ ] ✅ Valeur de retour définie
- [ ] ✅ Documentation dans le code
- [ ] ✅ Testé avec valeurs réelles
- [ ] ✅ Testé avec valeurs limites
- [ ] ✅ Testé avec valeurs invalides

---

**Guide créé pour Universal Tuya Zigbee v3.0.63+**  
**Dernière mise à jour:** October 18, 2025  
**Documentation:** https://github.com/dlnraja/com.tuya.zigbee
