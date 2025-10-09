const fs = require('fs');

console.log('🔧 FIX SETTINGS VALIDATION');
console.log('═'.repeat(80));

const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));

// Remove invalid advanced settings (indices 2-6)
const settingsToKeep = appJson.settings.slice(0, 2); // Keep only the first 2 original settings

// Add corrected advanced settings with proper Homey SDK3 format
const correctedSettings = [
  {
    type: 'number',
    id: 'reporting_interval',
    title: {
      en: 'Reporting interval (seconds)',
      fr: 'Intervalle de rapport (secondes)',
      nl: 'Rapportage-interval (seconden)',
      de: 'Berichtsintervall (Sekunden)'
    },
    hint: {
      en: 'How often the device reports values (60-3600 seconds)',
      fr: 'Fréquence des rapports de valeurs (60-3600 secondes)'
    },
    value: 300,
    min: 60,
    max: 3600
  },
  {
    type: 'number',
    id: 'temperature_offset',
    title: {
      en: 'Temperature offset (°C)',
      fr: 'Décalage température (°C)',
      nl: 'Temperatuur offset (°C)',
      de: 'Temperatur-Offset (°C)'
    },
    hint: {
      en: 'Calibrate temperature readings (-10 to +10°C)',
      fr: 'Calibrer les lectures de température (-10 à +10°C)'
    },
    value: 0,
    min: -10,
    max: 10
  },
  {
    type: 'number',
    id: 'humidity_offset',
    title: {
      en: 'Humidity offset (%)',
      fr: 'Décalage humidité (%)',
      nl: 'Luchtvochtigheid offset (%)',
      de: 'Luftfeuchtigkeit-Offset (%)'
    },
    hint: {
      en: 'Calibrate humidity readings (-20 to +20%)',
      fr: 'Calibrer les lectures d\'humidité (-20 à +20%)'
    },
    value: 0,
    min: -20,
    max: 20
  },
  {
    type: 'dropdown',
    id: 'motion_sensitivity',
    title: {
      en: 'Motion sensitivity',
      fr: 'Sensibilité détection mouvement',
      nl: 'Bewegingsgevoeligheid',
      de: 'Bewegungsempfindlichkeit'
    },
    value: 'medium',
    values: [
      { id: 'low', title: { en: 'Low', fr: 'Faible', nl: 'Laag', de: 'Niedrig' } },
      { id: 'medium', title: { en: 'Medium', fr: 'Moyen', nl: 'Gemiddeld', de: 'Mittel' } },
      { id: 'high', title: { en: 'High', fr: 'Élevé', nl: 'Hoog', de: 'Hoch' } }
    ]
  },
  {
    type: 'number',
    id: 'motion_timeout',
    title: {
      en: 'Motion timeout (seconds)',
      fr: 'Délai mouvement (secondes)',
      nl: 'Bewegingstimeout (seconden)',
      de: 'Bewegungs-Timeout (Sekunden)'
    },
    hint: {
      en: 'Time to wait before clearing motion alarm',
      fr: 'Délai avant effacement de l\'alarme mouvement'
    },
    value: 60,
    min: 10,
    max: 600
  }
];

appJson.settings = [...settingsToKeep, ...correctedSettings];

fs.writeFileSync('./app.json', JSON.stringify(appJson, null, 2));

console.log('✅ Settings corrigés:');
console.log(`   - Conservés: ${settingsToKeep.length} settings originaux`);
console.log(`   - Ajoutés: ${correctedSettings.length} settings avancés corrigés`);
console.log(`   - Total: ${appJson.settings.length} settings`);

console.log('\n🔍 Validation en cours...');
const { execSync } = require('child_process');
try {
  execSync('homey app validate', { stdio: 'inherit', cwd: '.' });
  console.log('\n✅ VALIDATION RÉUSSIE !');
} catch (error) {
  console.log('\n❌ Validation échouée - vérifier les erreurs ci-dessus');
}
