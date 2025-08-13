# 🪟 Tuya Smart Cover TS0601 Driver

## 🇬🇧 English

### Overview
The **Tuya Smart Cover TS0601** driver provides comprehensive support for Tuya Zigbee cover devices, including motorized blinds, curtains, and shades. This driver automatically maps Tuya Data Points to Homey capabilities and offers advanced cover management features.

### ✨ Features
- **Position Control**: Precise 0-100% position control
- **Tilt Control**: Adjustable tilt angle for slatted blinds
- **State Management**: Open, close, and stop functionality
- **Tuya DP Mapping**: Automatic Data Point to capability mapping
- **Flow Integration**: Rich automation triggers and actions
- **Multi-language**: English and French support

### 🔧 Supported Devices
- **Model**: TS0601_cover
- **Manufacturer**: Tuya (_TZE200_*)
- **Protocol**: Zigbee 3.0
- **Power**: Mains powered or battery

### 📋 Capabilities
- `windowcoverings_state` - Cover state (open/close/stop)
- `windowcoverings_set` - Position control (0-100%)
- `windowcoverings_tilt_set` - Tilt control (0-100%)

### ⚙️ Settings
- **Tuya DP Logging**: Enable debug logging for Tuya Data Points
- **Cover Speed**: Adjust movement speed (10-100%)

### 🔄 Flow Cards

#### Triggers
- **Cover Position Changed**: Fired when position changes
  - Arguments: `position` (0-100%)

#### Actions
- **Set Cover Position**: Set specific position
  - Arguments: `position` (0-100%)
- **Send Tuya DP**: Send custom Data Point
  - Arguments: `dp_id`, `value`

### 🧪 Development
- **SDK**: Homey SDK 3.0+
- **Dependencies**: homey-meshdriver, tuya-dp-mapper
- **Architecture**: Modular with fallback support

---

## 🇫🇷 Français

### Aperçu
Le driver **Tuya Smart Cover TS0601** fournit un support complet pour les appareils de volet Zigbee Tuya, incluant les stores motorisés, rideaux et volets. Ce driver mappe automatiquement les Data Points Tuya vers les capabilities Homey et offre des fonctionnalités avancées de gestion des volets.

### ✨ Fonctionnalités
- **Contrôle de Position**: Contrôle précis de 0 à 100%
- **Contrôle d'Inclinaison**: Angle d'inclinaison ajustable pour les stores à lamelles
- **Gestion d'État**: Fonctionnalités d'ouverture, fermeture et arrêt
- **Mapping DP Tuya**: Mapping automatique des Data Points vers les capabilities
- **Intégration Flow**: Triggers et actions d'automatisation riches
- **Multi-langue**: Support anglais et français

### 🔧 Appareils Supportés
- **Modèle**: TS0601_cover
- **Fabricant**: Tuya (_TZE200_*)
- **Protocole**: Zigbee 3.0
- **Alimentation**: Secteur ou batterie

### 📋 Capabilities
- `windowcoverings_state` - État du volet (ouvert/fermé/arrêt)
- `windowcoverings_set` - Contrôle de position (0-100%)
- `windowcoverings_tilt_set` - Contrôle d'inclinaison (0-100%)

### ⚙️ Paramètres
- **Logging DP Tuya**: Activer la journalisation de débogage pour les Data Points Tuya
- **Vitesse du Volet**: Ajuster la vitesse de mouvement (10-100%)

### 🔄 Cartes Flow

#### Déclencheurs
- **Position du Volet Changée**: Déclenché quand la position change
  - Arguments: `position` (0-100%)

#### Actions
- **Définir Position du Volet**: Définir une position spécifique
  - Arguments: `position` (0-100%)
- **Envoyer DP Tuya**: Envoyer un Data Point personnalisé
  - Arguments: `dp_id`, `value`

### 🧪 Développement
- **SDK**: Homey SDK 3.0+
- **Dépendances**: homey-meshdriver, tuya-dp-mapper
- **Architecture**: Modulaire avec support de fallback

---

## 📚 Technical Notes

### Tuya Data Points
- **DP1**: Cover State (enum: open/close/stop)
- **DP2**: Cover Position (value: 0-100)
- **DP3**: Cover Tilt (value: 0-100)

### Zigbee Clusters
- `genBasic`: Basic device information
- `genIdentify`: Device identification
- `manuSpecificTuya`: Tuya-specific functionality

### Error Handling
- Automatic retry with exponential backoff
- Graceful fallback for missing capabilities
- Comprehensive logging for debugging

### Performance
- Debounced commands to prevent network overload
- Efficient capability updates
- Memory-optimized event handling

---

## 📄 License
MIT License - see [LICENSE](../../../LICENSE) for details.

## 🤝 Contributing
Contributions welcome! Please see [CONTRIBUTING.md](../../../CONTRIBUTING.md) for guidelines.

## 📞 Support
- **Issues**: [GitHub Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dlnraja/com.tuya.zigbee/discussions)
- **Documentation**: [Wiki](https://github.com/dlnraja/com.tuya.zigbee/wiki)
