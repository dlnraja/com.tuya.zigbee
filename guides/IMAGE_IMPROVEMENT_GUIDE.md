# 🎨 GUIDE D'AMÉLIORATION DES IMAGES

Ce guide explique comment améliorer les images des drivers pour rendre l'application plus cohérente et professionnelle.

---

## 📏 Spécifications Techniques

### Images Requises pour Chaque Driver

1. **small.png**: 75x75 pixels
   - Format: PNG avec transparence si possible
   - Taille minimum: 2 KB
   - Usage: Icône dans la liste des devices

2. **large.png**: 500x500 pixels
   - Format: PNG haute qualité
   - Taille minimum: 15 KB
   - Usage: Image détaillée lors de l'ajout d'un device

## 🎨 Standards Visuels par Catégorie

### motion_sensor

- **Description**: PIR Motion Sensor
- **Icône suggérée**: 🏃
- **Couleur de fond**: #FFFFFF
- **Couleur d'icône**: #4A90E2

### contact_sensor

- **Description**: Door/Window Sensor
- **Icône suggérée**: 🚪
- **Couleur de fond**: #FFFFFF
- **Couleur d'icône**: #50C878

### smart_plug

- **Description**: Smart Plug
- **Icône suggérée**: 🔌
- **Couleur de fond**: #FFFFFF
- **Couleur d'icône**: #FF6B6B

### smart_switch

- **Description**: Smart Switch
- **Icône suggérée**: 💡
- **Couleur de fond**: #FFFFFF
- **Couleur d'icône**: #FFB84D

### bulb

- **Description**: Smart Bulb
- **Icône suggérée**: 💡
- **Couleur de fond**: #FFF8E1
- **Couleur d'icône**: #FFB300

### led_strip

- **Description**: LED Strip
- **Icône suggérée**: 🌈
- **Couleur de fond**: #FFFFFF
- **Couleur d'icône**: #9B59B6

### curtain

- **Description**: Curtain Motor
- **Icône suggérée**: 🪟
- **Couleur de fond**: #FFFFFF
- **Couleur d'icône**: #3498DB

### wireless_switch

- **Description**: Wireless Switch
- **Icône suggérée**: 🎮
- **Couleur de fond**: #FFFFFF
- **Couleur d'icône**: #34495E

### thermostat

- **Description**: Thermostat
- **Icône suggérée**: 🌡️
- **Couleur de fond**: #FFFFFF
- **Couleur d'icône**: #E74C3C

## 🔗 Sources d'Images de Qualité

### Repos GitHub de Johan Bendz

Johan Bendz maintient des applications Homey de haute qualité avec des images professionnelles.

**TUYA**
```
https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/master/drivers```

**LIDL**
```
https://raw.githubusercontent.com/JohanBendz/com.lidl/master/drivers```

**IKEA**
```
https://raw.githubusercontent.com/JohanBendz/com.ikea.tradfri/master/drivers```

**PHILIPS**
```
https://raw.githubusercontent.com/JohanBendz/com.philips.hue.zigbee/master/drivers```

### Applications Officielles

1. **SmartLife / Tuya**
   - Application mobile officielle de Tuya
   - Source: https://www.tuya.com/
   - Contient des images officielles pour tous les produits Tuya

2. **Lidl Home / Smart Home**
   - Application pour les produits Silvercrest/Lidl
   - Compatible avec les produits LSC

3. **MOES Smart Home**
   - Application officielle MOES
   - Images de qualité pour produits MOES

## 📋 Procédure d'Amélioration

### Étape 1: Identifier le Type de Produit

Déterminez la catégorie du driver:
- Motion Sensor
- Contact Sensor
- Smart Plug
- Smart Switch
- Bulb / LED
- LED Strip
- Curtain Motor
- Wireless Switch/Remote
- Thermostat

### Étape 2: Trouver l'Image Source

1. **Vérifier les repos de Johan Bendz**
   - Chercher un driver similaire dans ses repos
   - Copier les images small.png et large.png

2. **Rechercher dans les applications officielles**
   - Capturer des screenshots haute résolution
   - Isoler l'icône du produit

3. **Sites web des fabricants**
   - Tuya: https://www.tuya.com/
   - MOES: https://www.moeshouse.com/
   - LSC: https://www.action.com/

### Étape 3: Préparer les Images

1. **Redimensionner**
   ```bash
   # Pour small.png (75x75)
   convert source.png -resize 75x75 small.png

   # Pour large.png (500x500)
   convert source.png -resize 500x500 large.png
   ```

2. **Optimiser**
   ```bash
   # Compresser sans perte de qualité
   pngquant --quality=80-100 *.png
   ```

### Étape 4: Appliquer les Images

1. Placer les images dans le dossier du driver:
   ```
   drivers/[driver_name]/assets/images/
   ├── small.png
   └── large.png
   ```

2. Vérifier les chemins dans app.json

## 🛠️ Outils Recommandés

- **ImageMagick**: Redimensionnement et conversion
- **pngquant**: Optimisation PNG
- **GIMP**: Édition d'images avancée
- **Figma**: Design d'icônes personnalisées

## ✅ Liste de Vérification

Avant de finaliser:

- [ ] Images aux bonnes dimensions (75x75 et 500x500)
- [ ] Tailles de fichiers correctes (>2KB et >15KB)
- [ ] Format PNG avec transparence si approprié
- [ ] Style cohérent avec la catégorie
- [ ] Fond blanc ou transparent
- [ ] Qualité professionnelle
- [ ] Validation Homey réussie

## 📊 Priorités d'Amélioration

1. **Haute priorité**: Drivers sans images ou images corrompues
2. **Priorité moyenne**: Images de moins de 5KB (basse qualité)
3. **Priorité basse**: Images fonctionnelles mais non standardisées

## 💡 Conseils

- Privilégiez la cohérence visuelle entre drivers similaires
- Utilisez des images officielles quand c'est possible
- Maintenez un fond blanc ou transparent pour l'uniformité
- Testez les images dans l'app Homey avant de finaliser
- Documentez les sources des images pour référence future

