# 📚 MANUFACTURER DATABASE - GUIDE D'UTILISATION

## Vue d'Ensemble

Base de données complète et enrichie de **92 manufacturer IDs** ajoutés dans la version **v2.15.94**.

### Statistiques
- **92 entrées** avec descriptions détaillées
- **21 drivers** couverts
- **7+ marques** principales
- **10 catégories** de produits

---

## Structure de la Base de Données

```json
{
  "metadata": {
    "version": "2.15.94",
    "lastUpdated": "2025-10-15",
    "totalEntries": 92,
    "sources": [...]
  },
  "manufacturers": {
    "MANUFACTURER_ID": {
      "brand": "Nom de la marque",
      "productName": "Nom du produit",
      "productId": "TS0601",
      "category": "Catégorie",
      "description": "Description détaillée",
      "features": ["Feature 1", "Feature 2", ...],
      "driver": "nom_du_driver",
      "powerSource": "AC Mains / Battery",
      "region": "Global / Europe / ...",
      "verified": true/false,
      "batteryLife": "Optional: durée de vie",
      "retailer": "Optional: revendeur",
      "technology": "Optional: technologie",
      "certifications": ["Optional: certifications"]
    }
  }
}
```

---

## Catégories de Produits

### 🔆 Smart Lighting (42 IDs)
- **RGB Bulbs**: Ampoules couleur avec contrôle RGB+CCT
- **LED Strips**: Contrôleurs et strips LED
- **Tunable White**: Ampoules à température de couleur ajustable
- **Ceiling Lights**: Plafonniers RGB
- **Mood Lights**: Éclairage d'ambiance

### 🎛️ Dimmers & Controls (28 IDs)
- **1-Gang Dimmers**: Variateurs simple
- **2-Gang Dimmers**: Variateurs double
- **MCU Dimmers**: Variateurs avec MCU Tuya
- **Wall Dimmers**: Variateurs muraux

### 🚶 Motion & Presence (13 IDs)
- **PIR Sensors**: Détecteurs infrarouges passifs
- **mmWave Radar**: Capteurs radar avancés avec détection de présence statique
- **AI Sensors**: Capteurs avec intelligence artificielle

### ⚡ Power & Energy (6 IDs)
- **Power Strips**: Multiprises intelligentes (Silvercrest/Lidl)
- **Smart Plugs**: Prises avec mesure d'énergie

### 🌡️ Temperature & Climate (4 IDs)
- **LCD Sensors**: Capteurs avec écran LCD
- **Climate Monitors**: Moniteurs température/humidité

### 🔒 Contact & Security (1 ID)
- **Door/Window Sensors**: Capteurs d'ouverture magnétiques

### 🚨 Safety & Detection (2 IDs)
- **Smoke Detectors**: Détecteurs de fumée certifiés

### 🎯 Automation Control (3 IDs)
- **Wall Switches**: Interrupteurs muraux
- **Remote Controls**: Télécommandes sans fil

### 🏠 Curtains & Blinds (3 IDs)
- **Curtain Motors**: Moteurs pour rideaux (GIRIER, Lonsonho)

### 🌫️ Air Quality (3 IDs)
- **Air Monitors**: Stations de monitoring qualité de l'air

---

## Marques Principales

### 🏬 LIVARNO LUX (Lidl)
**Spécialité**: Éclairage intelligent
- RGB Bulbs (E27, E14, GU10)
- LED Strips & Light Bars
- Mood Lights
- Garden Lights
- Ceiling Lights
- Tunable White Bulbs

**Région**: Europe (exclusivité Lidl)
**Prix**: Budget-friendly
**Qualité**: Bon rapport qualité/prix

### 🔌 Silvercrest (Lidl)
**Spécialité**: Prises et multiprises
- 3-Socket Power Strips
- Smart Extension Sockets
- Energy Monitoring

**Région**: Europe (exclusivité Lidl)
**Prix**: Très abordable

### 🎄 Melinera (Lidl)
**Spécialité**: Éclairage saisonnier
- Christmas Tree Lights
- Festive Lighting

**Région**: Europe (exclusivité Lidl)
**Saisonnalité**: Disponible en période de fêtes

### 🏡 Woox
**Spécialité**: Appareils connectés premium
- RGB Bulbs
- Irrigation Controllers
- Smart Home Accessories

**Région**: Europe
**Site**: wooxhome.com
**Qualité**: Premium

### ⚙️ GIRIER
**Spécialité**: Motorisation
- Smart Curtain Motors
- Automation Systems

**Puissance**: 15kg max load
**Bruit**: <45dB

### 🎨 Lonsonho
**Spécialité**: Motorisation et contrôle
- Curtain Motors
- Smart Switches

**Features**: USB-C charging, Solar compatible

### 🔵 YANDHI
**Spécialité**: Éclairage RGB
- RGB Smart Bulbs E27

---

## Technologies Spéciales

### 🔴 mmWave Radar
**Technologie**: Radar 24GHz millimétrique
**Avantages**:
- Détection de présence statique
- Détection de respiration
- Aucun angle mort
- Fonctionne à travers les murs
- Pas de faux positifs (animaux)

**Applications**:
- Détection d'occupation de pièce
- Monitoring de sommeil
- Détection de chute
- Comptage de personnes
- Automation avancée

**Manufacturer IDs avec mmWave**:
- _TZE200_holel4dk, _TZE200_ikvncluo, _TZE200_jva8ink8
- _TZE200_lyetpprm, _TZE200_sgpeacqp, _TZE200_wukb7rhc
- _TZE200_xpq2rzhq, _TZE204_ijxvkhd0, _TZE204_qasjif9e
- _TZE204_sxm7l9xa, _TZE204_xsm7l9xa

### 🤖 AI & Machine Learning
Certains capteurs intègrent des algorithmes d'IA:
- Auto-apprentissage des patterns
- Adaptation automatique
- Prédiction de comportement
- Filtrage intelligent

---

## Utilisation de la Base de Données

### 🔍 Recherche par Manufacturer ID

```javascript
// Exemple Node.js
const db = require('./MANUFACTURER_DATABASE.json');

function getManufacturerInfo(manufacturerId) {
  return db.manufacturers[manufacturerId];
}

const info = getManufacturerInfo('_TZ3000_12sxjap4');
console.log(info.brand); // "YANDHI"
console.log(info.productName); // "RGB Smart Bulb E27"
```

### 🏷️ Recherche par Catégorie

```javascript
function getByCategory(category) {
  return Object.entries(db.manufacturers)
    .filter(([id, data]) => data.category === category)
    .map(([id, data]) => ({ id, ...data }));
}

const lighting = getByCategory('Smart Lighting');
```

### 🏪 Recherche par Marque

```javascript
function getByBrand(brand) {
  return Object.entries(db.manufacturers)
    .filter(([id, data]) => data.brand === brand)
    .map(([id, data]) => ({ id, ...data }));
}

const lidlProducts = getByBrand('LIVARNO LUX');
```

### 🔧 Recherche par Driver

```javascript
function getByDriver(driverName) {
  return Object.entries(db.manufacturers)
    .filter(([id, data]) => data.driver === driverName)
    .map(([id, data]) => ({ id, ...data }));
}

const dimmerDevices = getByDriver('dimmer_switch_1gang_ac');
```

---

## Informations Support Utilisateur

### 📧 Réponses aux Demandes

Utilisez cette base de données pour répondre aux questions utilisateurs:

**Exemple**: "Mon capteur _TZ3000_12sxjap4 ne fonctionne pas"

**Réponse structurée**:
```
Appareil: YANDHI RGB Smart Bulb E27
Product ID: TS0505B
Driver: bulb_color_rgbcct_ac

Caractéristiques:
- 16 million de couleurs
- Température ajustable (2700K-6500K)
- Contrôle par app et voix
- Zigbee 3.0

Vérifications:
1. L'ampoule est-elle correctement alimentée?
2. Le driver "bulb_color_rgbcct_ac" est-il installé?
3. L'ampoule est-elle en mode appairage (5 clignotements)?
4. Distance du hub Zigbee < 10m?
```

### 🆘 Troubleshooting

#### Problème: Appareil ne s'appaire pas
1. Vérifier compatibilité driver dans la base de données
2. Confirmer le productId correspond
3. Vérifier la source d'alimentation (Battery vs AC)
4. Pour batteries: vérifier niveau de charge

#### Problème: Appareil déconnecté fréquemment
1. Vérifier distance hub (surtout Battery devices)
2. Pour mmWave: vérifier interférences
3. Pour Lidl products: vérifier version firmware hub

---

## Maintenance de la Base de Données

### ✅ Ajout d'un Nouveau Manufacturer ID

```json
"_TZxxxx_nouveauid": {
  "brand": "Nom Marque",
  "productName": "Nom Produit",
  "productId": "TSxxxx",
  "category": "Catégorie",
  "description": "Description détaillée du produit",
  "features": [
    "Feature 1",
    "Feature 2",
    "Feature 3"
  ],
  "driver": "nom_driver",
  "powerSource": "AC Mains / Battery",
  "region": "Global / Europe / ...",
  "verified": true
}
```

### 🔄 Mise à Jour d'une Entrée

1. Localiser l'entrée par manufacturer ID
2. Mettre à jour les champs nécessaires
3. Ajouter un commentaire de version si changement majeur
4. Mettre à jour `metadata.lastUpdated`

### 🗑️ Suppression (Rare)

Seulement si:
- Produit complètement discontinué
- Manufacturer ID erroné
- Doublon détecté

---

## Intégration avec Homey

### Flow Cards

Créer des flow cards personnalisés basés sur les catégories:

```javascript
// Exemple pour motion sensors
this.homey.flow.getDeviceTriggerCard('motion_detected')
  .registerRunListener(async (args, state) => {
    const deviceInfo = db.manufacturers[args.device.manufacturerId];
    
    if (deviceInfo.technology === 'mmWave radar') {
      // Logic spéciale pour radar
      return state.presenceType === 'static';
    }
    return true;
  });
```

### Device Pairing

Afficher les informations produit pendant le pairing:

```javascript
async onPairListDevices() {
  const devices = await this.discoverDevices();
  
  return devices.map(device => {
    const info = db.manufacturers[device.manufacturerName];
    
    return {
      name: info ? info.productName : device.name,
      data: { id: device.id },
      store: {
        manufacturerInfo: info
      },
      capabilities: this.getCapabilitiesForProduct(info)
    };
  });
}
```

---

## Exemples d'Utilisation

### 🎨 Créer un Catalogue HTML

```javascript
function generateCatalog() {
  const categories = {};
  
  Object.entries(db.manufacturers).forEach(([id, data]) => {
    if (!categories[data.category]) {
      categories[data.category] = [];
    }
    categories[data.category].push({ id, ...data });
  });
  
  // Générer HTML par catégorie
  return Object.entries(categories).map(([cat, products]) => `
    <h2>${cat}</h2>
    ${products.map(p => `
      <div class="product">
        <h3>${p.brand} - ${p.productName}</h3>
        <p>${p.description}</p>
        <ul>
          ${p.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
    `).join('')}
  `).join('');
}
```

### 📊 Statistiques par Région

```javascript
function getRegionStats() {
  const stats = {};
  
  Object.values(db.manufacturers).forEach(product => {
    stats[product.region] = (stats[product.region] || 0) + 1;
  });
  
  return stats;
}

// Résultat:
// { "Global": 67, "Europe (Lidl)": 23, "Europe": 2 }
```

### 🔋 Filtrer par Source d'Alimentation

```javascript
function getBatteryDevices() {
  return Object.entries(db.manufacturers)
    .filter(([id, data]) => data.powerSource.includes('Battery'))
    .map(([id, data]) => ({
      id,
      name: data.productName,
      batteryLife: data.batteryLife || 'Unknown'
    }));
}
```

---

## FAQ Base de Données

**Q: Tous les manufacturer IDs sont-ils vérifiés?**
R: Oui, tous les IDs avec `verified: true` sont confirmés via Zigbee2MQTT, Homey Forum ou tests physiques.

**Q: Que signifie "Generic Tuya"?**
R: Produits Tuya white-label vendus sous différentes marques. Fonctionnalité identique, branding différent.

**Q: Pourquoi certains produits Lidl sont saisonniers?**
R: Produits comme les Christmas Lights ne sont disponibles que pendant les périodes de fêtes.

**Q: Différence entre TS0601 et autres Product IDs?**
R: TS0601 utilise le protocole MCU Tuya (cluster 0xEF00) avec datapoints. Les autres utilisent des clusters Zigbee standard.

**Q: Les produits mmWave radar fonctionnent-ils avec des animaux?**
R: Non, la plupart filtrent les petits mouvements pour éviter les faux positifs causés par les animaux domestiques.

**Q: Puis-je utiliser cette base pour d'autres projets?**
R: Oui, la base de données est open source et peut être utilisée pour tout projet Zigbee/Tuya.

---

## Ressources Externes

### 📚 Documentation
- **Zigbee2MQTT**: https://www.zigbee2mqtt.io/supported-devices/
- **Homey SDK3**: https://apps-sdk-v3.developer.homey.app/
- **Tuya IoT**: https://developer.tuya.com/

### 🛠️ Outils
- **Zigbee Device Interview**: https://developer.athom.com/tools/zigbee
- **Product ID Decoder**: Inclus dans Homey Developer Tools

### 👥 Communauté
- **Homey Forum**: https://community.homey.app/
- **GitHub Issues**: https://github.com/dlnraja/com.tuya.zigbee/issues

---

## Changelog Base de Données

### v2.15.94 (2025-10-15)
- ✅ Initial release: 92 manufacturer IDs
- ✅ 10 catégories de produits
- ✅ 7+ marques principales
- ✅ Descriptions détaillées en anglais
- ✅ Features complètes pour chaque produit
- ✅ Informations techniques (batteryLife, certifications, etc.)

---

**📝 Note**: Cette base de données est maintenue activement. Pour suggérer des ajouts ou corrections, créer une issue sur GitHub.
