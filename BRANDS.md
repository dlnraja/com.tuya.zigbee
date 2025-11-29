# 🏭 Zigbee Brands & Manufacturers Database

## 📊 Statistics
- **Total Vendors (Zigbee2MQTT):** 529+
- **Total Devices Supported:** 4797+
- **Tuya White-Label Brands:** 100+

---

## 🔷 TUYA WHITE-LABEL BRANDS

Tuya provides a platform that enables OEMs to create smart home devices. These brands use Tuya's Zigbee modules with manufacturer IDs like `_TZ3000_*`, `_TZE200_*`, `_TZE204_*`, etc.

### Premium Tuya Brands
| Brand | Country | Products | Website |
|-------|---------|----------|---------|
| **Moes** | China | TRV, Switches, Sensors | moes.co |
| **Zemismart** | China | Curtains, Switches, Plugs | zemismart.com |
| **BSEED** | China | Wall Switches, Sockets | bfrankelectron.com |
| **Lonsonho** | China | Switches, Dimmers, Plugs | lonsonho.com |
| **Aubess** | China | Sensors, Switches | - |
| **Girier** | China | Dimmers, Switches | girier.com |
| **Avatto** | China | TRV, Thermostats | avatto.com |
| **Blitzwolf** | China | Plugs, Power Strips | blitzwolf.com |

### European Retail Brands (Tuya-based)
| Brand | Country | Retailer | Products |
|-------|---------|----------|----------|
| **Silvercrest** | Germany | Lidl | Plugs, Sensors, Bulbs |
| **Livarno Lux** | Germany | Lidl | LED Bulbs, Strips |
| **Melinera** | Germany | Lidl | Decorative Lighting |
| **Malmbergs** | Sweden | - | Lighting, Plugs |
| **Nedis** | Netherlands | - | Smart Home Range |
| **Nous** | - | - | Plugs, Sensors |
| **Woox** | Netherlands | - | Security, Sensors |
| **Immax Neo** | Czech | - | Full Smart Home |
| **Niceboy** | Czech | - | Sensors |
| **TESLA Smart** | Czech | - | Sensors, Plugs |

### Other Tuya White-Label Brands
| Brand | Products |
|-------|----------|
| Smart9 | Switches, Dimmers |
| Luminea | Bulbs |
| Tenky | Sensors |
| Tongou | DIN Rail Relays |
| UseeLink | Power Strips |
| YANDHI | - |
| eWeLight | Bulbs |
| GiEX | Soil Sensors |
| Hangzlou | Water Sensors |
| ONENUO | Water Sensors |
| Samotech | Dimmers |
| LoraTap | Buttons, Remotes |
| Candeo | Dimmers |
| CASAIA | Sensors |
| Alice | Sockets |

---

## 🔶 NATIVE ZIGBEE BRANDS (Non-Tuya)

### Major Ecosystem Brands
| Brand | Protocol | Products | Proprietary Overlay? |
|-------|----------|----------|---------------------|
| **Aqara** | Zigbee 3.0 | Sensors, Switches, Hubs | ✅ Oui (rapports batterie, commandes) |
| **Sonoff / ITEAD** | Zigbee 3.0 | Prises, Switches, Dongles | ❌ Non (standard) |
| **Tuya / Moes** | Zigbee 3.0 | Prises, Switches, Variateurs | ✅ Oui (mesure énergie, commandes) |
| **Philips Hue** | Zigbee 3.0 | Bulbs, Strips, Accessories | ✅ Oui (mises à jour firmware) |
| **IKEA TRÅDFRI** | Zigbee 3.0 | Bulbs, Plugs, Blinds | ❌ Non (standard) |
| **Innr** | Zigbee 3.0 | Bulbs, Strips | ❌ Non (standard) |
| **Gledopto** | Zigbee | LED Controllers RGB/RGBW | ✅ Oui (gestion couleurs) |
| **Samsung SmartThings** | Zigbee | Capteurs, Prises, Hubs | ✅ Oui (intégration écosystème) |
| **Schneider Electric / Wiser** | Zigbee | Switches, Variateurs | ❌ Non (standard) |
| **Legrand / Bticino** | Zigbee | Switches, Prises, Modules | ❌ Non (standard) |
| **OSRAM/LEDVANCE** | Zigbee | Bulbs | ❌ Non (LIGHTIFY) |
| **HEIMAN** | Zigbee | Safety Sensors | ❌ Non (standard) |
| **Develco** | Zigbee | Professional | ❌ Non (commercial) |

### Chinese Ecosystem Brands
| Brand | Products |
|-------|----------|
| **Aqara** | Full smart home range |
| **Xiaomi Mijia** | Sensors, switches |
| **Yeelight** | Smart lighting |
| **Konke** | Sensors |
| **Livolo** | Touch switches |

### European Brands
| Brand | Country | Products |
|-------|---------|----------|
| **ELKO** | Norway | Switches |
| **Schneider Electric** | France | Wiser system |
| **Legrand** | France | Switches |
| **Busch-Jaeger** | Germany | Switches |
| **BTicino** | Italy | Switches |
| **Danfoss** | Denmark | TRV |
| **Eurotronic** | Germany | TRV |
| **Dresden Elektronik** | Germany | ConBee, Phoscon |

### American Brands
| Brand | Products |
|-------|----------|
| **Centralite** | Sensors |
| **SmartThings** | Sensors (Samsung) |
| **Iris** | Sensors (Lowe's - discontinued) |
| **Sengled** | Bulbs |
| **GE/Jasco** | Switches |
| **Lutron** | Dimmers (proprietary) |
| **Kwikset** | Smart locks |
| **Yale** | Smart locks |
| **Schlage** | Smart locks |

---

## 📋 MANUFACTURER NAME PREFIXES

### Tuya Prefixes
| Prefix | Description | Example |
|--------|-------------|---------|
| `_TZ3000_*` | Tuya Zigbee 3.0 | `_TZ3000_kdi2o9m6` |
| `_TZ3210_*` | Tuya Zigbee 3.0 variant | `_TZ3210_fgwhjm9j` |
| `_TZ3400_*` | Tuya Zigbee variant | `_TZ3400_keyjhapk` |
| `_TZE200_*` | Tuya DP (TS0601) | `_TZE200_ztc6ggyl` |
| `_TZE204_*` | Tuya DP variant | `_TZE204_qasjif9e` |
| `_TZE284_*` | Tuya DP variant | `_TZE284_sgabhwa6` |
| `_TYZB01_*` | Tuya Zigbee v1 | `_TYZB01_kvwjujy9` |
| `_TYST11_*` | Tuya legacy | `_TYST11_qq9mpfhw` |
| `TUYATEC-*` | Tuya Tech | `TUYATEC-g3gl6cgy` |

### Model ID Patterns
| ModelId | Device Type |
|---------|-------------|
| `TS0001` | 1-gang switch |
| `TS0002` | 2-gang switch |
| `TS0003` | 3-gang switch |
| `TS0004` | 4-gang switch |
| `TS0011` | 1-gang switch module |
| `TS0012` | 2-gang switch module |
| `TS0013` | 3-gang switch module |
| `TS0014` | 4-gang switch module |
| `TS0041` | 1-button remote |
| `TS0042` | 2-button remote |
| `TS0043` | 3-button remote |
| `TS0044` | 4-button remote |
| `TS0101` | Outdoor plug |
| `TS011F` | Smart plug (various) |
| `TS0115` | Power strip |
| `TS0121` | Smart plug with metering |
| `TS0201` | Temperature/humidity sensor |
| `TS0202` | Motion sensor |
| `TS0203` | Door/window sensor |
| `TS0205` | Smoke sensor |
| `TS0207` | Water leak sensor |
| `TS0222` | Light sensor |
| `TS0225` | Presence sensor |
| `TS0501*` | Dimmers |
| `TS0502*` | CCT lights |
| `TS0503*` | RGB lights |
| `TS0504*` | RGBW lights |
| `TS0505*` | RGBCCT lights |
| `TS0601` | Tuya DP device (varies) |
| `TS110*` | Dimmers |
| `TS130F` | Curtain motor |

---

## 🌐 DATA SOURCES

### 🗃️ Sources Principales pour les Drivers Zigbee

| Source | Description | Contributeurs Clés |
|--------|-------------|-------------------|
| **Zigbee2MQTT** | **Source la plus exhaustive** : 4797 appareils de 529 fabricants. Inclut les "converters" pour gérer les surcouches propriétaires. | **@Koenkk** (créateur), **@tube0013**, **@kiwinick**, **@hedger**, **@robertsLando** |
| **Blakadder Database** | Base communautaire alternative, compatible ZHA, Z2M et autres. 2693+ appareils. | **@blakadder** (créateur) |
| **CSA (Connectivity Standards Alliance)** | Organisation officielle derrière la norme Zigbee. Spécifications techniques et liste des membres. | [csa-iot.org](https://csa-iot.org/all-solutions/zigbee/) |
| **ZHA Device Handlers** | Quirks pour Home Assistant | **@dmulcahey** (créateur), **@Adminiuga**, **@puddly** |

### Primary Sources
| Source | URL | Data |
|--------|-----|------|
| **Zigbee2MQTT** | github.com/Koenkk/zigbee2mqtt | 4797+ devices |
| **Zigbee2MQTT Converters** | github.com/Koenkk/zigbee-herdsman-converters | Device definitions |
| **ZHA Device Handlers** | github.com/zigpy/zha-device-handlers | Quirks |
| **Blakadder DB** | zigbee.blakadder.com | Compatibility matrix |
| **CSA** | csa-iot.org | Official Zigbee specs |

### Secondary Sources
| Source | URL |
|--------|-----|
| **JohanBendz Tuya** | github.com/JohanBendz/com.tuya.zigbee |
| **SmartThings Community** | community.smartthings.com |
| **Home Assistant Forum** | community.home-assistant.io |
| **Tuya Developer** | developer.tuya.com |

---

## 📊 DEVICE CATEGORIES

| Category | Tuya Devices | Native Devices |
|----------|--------------|----------------|
| 💡 **Lighting** | 179 | 500+ |
| 🎛️ **Switches** | 228 | 300+ |
| 🔌 **Plugs** | 76 | 200+ |
| 🌡️ **Climate Sensors** | 85 | 100+ |
| 🚪 **Contact Sensors** | 65 | 150+ |
| 👤 **Presence/Motion** | 86 | 200+ |
| 🪟 **Covers/Blinds** | 115 | 100+ |
| 🏠 **Thermostats/TRV** | 106 | 50+ |
| 🚨 **Safety Sensors** | 45 | 80+ |
| ⚡ **Energy Meters** | 69 | 50+ |
| 🎮 **Remotes/Buttons** | 58 | 100+ |

---

## 🔗 USEFUL LINKS

### Device Databases
- https://www.zigbee2mqtt.io/supported-devices/
- https://zigbee.blakadder.com/
- https://www.phoscon.de/en/conbee2/compatible

### Documentation
- https://www.zigbee2mqtt.io/advanced/support-new-devices/02_support_new_tuya_devices.html
- https://developer.tuya.com/en/docs/iot/
- https://github.com/zigpy/zha-device-handlers/wiki

### Communities
- https://community.home-assistant.io/
- https://community.smartthings.com/
- https://community.homey.app/

---

## 💡 COMMENT INTÉGRER CES SOURCES

Pour l'application Universal Tuya Zigbee :

1. **Consulter régulièrement les dépôts** : Les listes de Zigbee2MQTT et Blakadder sont constamment mises à jour avec de nouveaux appareils et correctifs.

2. **Étudier les "converters" et "quirks"** : Le code source de Zigbee2MQTT est une mine d'or pour comprendre comment gérer les surcouches propriétaires des fabricants comme Tuya ou Aqara.

3. **Adapter la logique** : L'adaptation de cette logique peut résoudre les problèmes de données et de batterie.

4. **Contribuer en retour** : Si vous parvenez à ajouter le support d'un appareil manquant, soumettez une "pull request" à ces projets.

### 🔧 Gestion des Surcouches Propriétaires

| Fabricant | Type de Surcouche | Solution |
|-----------|-------------------|----------|
| **Tuya** | DP (DataPoints) via cluster 0xEF00 | Converters Z2M, TuyaQuirkBuilder ZHA |
| **Aqara** | Rapports batterie custom | Quirks ZHA spécifiques |
| **Gledopto** | Gestion couleurs non-standard | Converters dédiés |
| **Philips Hue** | Firmware updates | OTA repository |

---

*Last updated: 2025-11-29*
*Data sources: Zigbee2MQTT, Blakadder, JohanBendz, SmartThings, CSA*
