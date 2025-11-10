# 🔋 GUIDE DES CAPACITÉS ÉNERGÉTIQUES

## 📊 Système Intelligent de Détection

Le système détecte automatiquement les mesures disponibles sur chaque device:

### Types de Mesures Détectées

#### 🔌 Alimentation AC (Secteur)
- **Voltage** (measure_voltage): Tension en Volts (V)
- **Current** (measure_current): Courant en Ampères (A)
- **Power** (measure_power): Puissance instantanée en Watts (W)
- **Energy** (meter_power): Énergie cumulée en kWh

#### 🔋 Batterie
- **Battery %** (measure_battery): Pourcentage batterie (%)
- **Battery Voltage** (measure_voltage.battery): Tension batterie (V)

#### ⚡ Sources d'Énergie
- **Mains**: Alimentation secteur AC
- **Battery**: Alimentation batterie
- **DC**: Alimentation DC (USB, etc.)

---

## 🎯 KPIs par Type de Device

### Smart Plug / Relay (AC)
**KPIs Principaux**:
- 📊 Puissance: `measure_power` (W)
- 📈 Énergie: `meter_power` (kWh)
- ⚡ Voltage: `measure_voltage` (V)

**KPIs Secondaires**:
- 🔌 Courant: `measure_current` (A)

### Sensor (Batterie)
**KPIs Principaux**:
- 🔋 Batterie: `measure_battery` (%)

**KPIs Secondaires**:
- ⚡ Voltage Batterie: `measure_voltage.battery` (V)

### Climate Monitor
**KPIs**:
- 🌡️ Température: `measure_temperature` (°C)
- 💧 Humidité: `measure_humidity` (%)
- 🔋 Batterie: `measure_battery` (%)

---

## 🔍 Détection Automatique

### Clusters Zigbee Utilisés

```javascript
// Electrical Measurement (0x0B04)
- rmsVoltage (0x0505): Voltage RMS
- rmsCurrent (0x0508): Current RMS
- activePower (0x050B): Active Power

// Metering (0x0702)
- currentSummationDelivered: Energy totale

// Power Configuration (0x0001)
- batteryPercentageRemaining (0x0021): Battery %
- batteryVoltage (0x0020): Battery Voltage

// Basic (0x0000)
- powerSource (0x0007): Type d'alimentation
```

### DataPoints Tuya

```
DP 0x01: Switch state
DP 0x06: Current (mA)
DP 0x09: Power (W)  
DP 0x0A: Voltage (V)
DP 0x11: Energy (kWh)
```

---

## 📱 Affichage dans Homey

### Device Tile (Carte Device)
**Affichage automatique selon mesures**:
- Battery device: % batterie + icône
- AC device: Puissance (W) + état
- Multi-outlet: État ON/OFF + consommation totale

### Advanced Settings
**KPIs détaillés disponibles**:
- Voltage instantané
- Courant instantané
- Puissance instantanée
- Énergie cumulée
- Historique (via Homey Insights)

---

## 🛠️ Exemples d'Utilisation

### Switch 2gang (Node 1)
```
Type: Router AC
PowerSource: mains
Capabilities:
  - onoff (x2 endpoints)
  - measure_power
  - meter_power
  
KPIs visibles:
  Primary: Puissance totale (W)
  Secondary: Énergie cumulée (kWh)
```

### 4-Button Controller (Node 2)
```
Type: End Device Battery
PowerSource: battery
Capabilities:
  - measure_battery
  
KPIs visibles:
  Primary: Batterie (%)
```

### Climate Monitor (Node 3)
```
Type: End Device Battery
PowerSource: battery
Capabilities:
  - measure_temperature
  - measure_humidity
  - measure_battery
  
KPIs visibles:
  Primary: Temp (°C), Humidity (%)
  Secondary: Batterie (%)
```

---

## 🔧 Configuration Manuelle

Si la détection automatique échoue, vous pouvez forcer les capabilities:

### Via Developer Tools Interview

```javascript
const EnergyDetector = require('./lib/EnergyCapabilityDetector');
const capabilities = EnergyDetector.detectEnergyCapabilities(this.zclNode);
console.log(capabilities);
```

### Ajout Manuel Capabilities

Dans `driver.compose.json`:

```json
{
  "capabilities": [
    "onoff",
    "measure_power",
    "measure_voltage",
    "measure_current",
    "meter_power"
  ]
}
```

---

## 📊 Formats d'Affichage

### Voltage
- **Unit**: V (Volts)
- **Format**: `230.5 V`
- **Decimals**: 1

### Current
- **Unit**: A (Ampères)
- **Format**: `0.87 A`
- **Decimals**: 2

### Power
- **Unit**: W (Watts)
- **Format**: `120 W`
- **Decimals**: 0

### Energy
- **Unit**: kWh
- **Format**: `45.32 kWh`
- **Decimals**: 2

### Battery
- **Unit**: %
- **Format**: `85%`
- **Decimals**: 0

---

## 🚨 Troubleshooting

### Aucune mesure affichée

1. **Vérifier power source**:
   - Developer Tools → Interview
   - Chercher `powerSource` dans `basic` cluster

2. **Vérifier clusters actifs**:
   ```javascript
   const report = EnergyDetector.generateReport(this.zclNode);
   console.log(report);
   ```

3. **Re-pairing**:
   - Supprimer device
   - Reset device (factory reset)
   - Re-pair en restant proche (< 2m)

### Mesures incorrectes

**Voltage trop élevé**: Multiplier par divisor
**Current en mA**: Diviser par 1000
**Power incorrect**: Vérifier activePower vs apparentPower

### Battery pas mise à jour

**Reporting non configuré**:
- Battery devices envoient updates tous les X heures
- Forcer update: appuyer bouton device
- Check `batteryPercentageRemaining` reporting config

---

## 📚 Références

**Zigbee Clusters**:
- Electrical Measurement: ZCL 0x0B04
- Metering: ZCL 0x0702
- Power Configuration: ZCL 0x0001

**Tuya Specs**:
- DataPoint Protocol v3.4
- Tuya Zigbee Gateway Protocol

**Homey SDK**:
- Capabilities: https://apps.developer.homey.app/the-basics/capabilities
- Zigbee: https://apps.developer.homey.app/zigbee

---

## ✅ Checklist Validation

- [ ] Power source détecté correctement
- [ ] Capabilities energy présentes
- [ ] KPIs affichés dans tile
- [ ] Valeurs numériques cohérentes
- [ ] Updates réguliers (< 5 min pour AC, < 1h pour battery)
- [ ] Homey Insights fonctionne
- [ ] Flow cards energy disponibles

**Tout OK?** Device prêt! 🎉
