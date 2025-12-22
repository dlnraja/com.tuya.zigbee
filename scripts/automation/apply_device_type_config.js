#!/usr/bin/env node
'use strict';

/**
 * 🔧 Script d'automation - Application configuration type device
 * Applique la configuration changement type device à tous les drivers switch
 *
 * Usage: node scripts/automation/apply_device_type_config.js
 */

const fs = require('fs').promises;
const path = require('path');

const DEVICE_TYPE_CONFIG = {
  "type": "group",
  "label": {
    "en": "Device Type Configuration",
    "fr": "Configuration Type d'Appareil"
  },
  "children": [
    {
      "id": "device_type",
      "type": "dropdown",
      "label": {
        "en": "Connected Device Type",
        "fr": "Type d'Appareil Connecté"
      },
      "hint": {
        "en": "Select the type of device connected to this module. Radiator will invert the ON/OFF logic.",
        "fr": "Sélectionnez le type d'appareil connecté à ce module. Radiateur inversera la logique MARCHE/ARRÊT."
      },
      "value": "light",
      "values": [
        {
          "id": "light",
          "label": {
            "en": "💡 Éclairage",
            "fr": "💡 Éclairage"
          }
        },
        {
          "id": "radiator",
          "label": {
            "en": "🔥 Radiateur électrique",
            "fr": "🔥 Radiateur électrique"
          }
        },
        {
          "id": "fan",
          "label": {
            "en": "🌀 Ventilation",
            "fr": "🌀 Ventilation"
          }
        },
        {
          "id": "other",
          "label": {
            "en": "⚙️ Autre appareil",
            "fr": "⚙️ Autre appareil"
          }
        }
      ]
    },
    {
      "id": "invert_logic_manual",
      "type": "checkbox",
      "label": {
        "en": "Manual Logic Inversion",
        "fr": "Inversion Logique Manuelle"
      },
      "hint": {
        "en": "Force invert ON/OFF logic regardless of device type (advanced users only)",
        "fr": "Forcer l'inversion de la logique MARCHE/ARRÊT indépendamment du type (utilisateurs avancés uniquement)"
      },
      "value": false
    }
  ]
};

async function main() {
  console.log('🔧 🚀 DÉMARRAGE APPLICATION CONFIG TYPE DEVICE...');

  const driversDir = path.join(process.cwd(), 'drivers');
  const drivers = await fs.readdir(driversDir);

  // Filtrer les drivers switch
  const switchDrivers = drivers.filter(driver => driver.startsWith('switch_'));

  console.log(`🔍 📋 ${switchDrivers.length} drivers switch trouvés:`);
  switchDrivers.forEach(driver => console.log(`   - ${driver}`));

  let processed = 0;
  let skipped = 0;

  for (const driverName of switchDrivers) {
    const driverPath = path.join(driversDir, driverName);
    const composePath = path.join(driverPath, 'driver.compose.json');

    try {
      // Vérifier si le fichier existe
      await fs.access(composePath);

      // Lire le fichier
      const content = await fs.readFile(composePath, 'utf8');
      const config = JSON.parse(content);

      // Vérifier si déjà configuré
      if (config.settings && config.settings.some(s => s.children && s.children.some(c => c.id === 'device_type'))) {
        console.log(`✅ ${driverName}: Déjà configuré`);
        skipped++;
        continue;
      }

      // Ajouter la configuration
      if (!config.settings) {
        config.settings = [];
      }

      // Insérer en première position
      config.settings.unshift(DEVICE_TYPE_CONFIG);

      // Sauvegarder
      const updatedContent = JSON.stringify(config, null, 2) + '\n';
      await fs.writeFile(composePath, updatedContent, 'utf8');

      console.log(`🔧 ${driverName}: Configuration ajoutée`);
      processed++;

    } catch (error) {
      console.log(`❌ ${driverName}: Erreur - ${error.message}`);
    }
  }

  console.log('');
  console.log('📊 === RÉSUMÉ APPLICATION CONFIG TYPE DEVICE ===');
  console.log(`✅ Drivers traités: ${processed}`);
  console.log(`⏭️ Drivers ignorés: ${skipped}`);
  console.log(`🎯 Total: ${processed + skipped}/${switchDrivers.length}`);

  if (processed > 0) {
    console.log('');
    console.log('🔥 FONCTIONNALITÉS AJOUTÉES:');
    console.log('   💡 Sélection type appareil (Éclairage/Radiateur/Ventilation/Autre)');
    console.log('   🔄 Inversion logique automatique pour radiateurs');
    console.log('   ⚙️ Inversion manuelle pour cas spéciaux');
    console.log('   🏠 Interface utilisateur intuitive avec icônes');
  }

  console.log('');
  console.log('✅ Script terminé avec succès');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DEVICE_TYPE_CONFIG };
