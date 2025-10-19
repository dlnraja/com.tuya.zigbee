#!/usr/bin/env node
'use strict';

/**
 * ADD DEBUG SETTINGS TO ALL DRIVERS
 * 
 * Ajoute un setting "debug_level" à tous les drivers
 * Permet aux users de choisir niveau de verbosity:
 * - TRACE (très verbeux)
 * - DEBUG (verbeux)
 * - INFO (normal)
 * - WARN (warnings seulement)
 * - ERROR (erreurs seulement)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 ADDING DEBUG SETTINGS TO ALL DRIVERS\n');
console.log('='.repeat(70));

const DEBUG_SETTING = {
  "type": "dropdown",
  "id": "debug_level",
  "value": "INFO",
  "label": {
    "en": "Debug Level",
    "nl": "Debug Niveau",
    "de": "Debug-Ebene",
    "fr": "Niveau de Debug",
    "it": "Livello Debug",
    "sv": "Felsökningsnivå",
    "no": "Feilsøkingsnivå",
    "es": "Nivel de Depuración",
    "da": "Fejlsøgningsniveau"
  },
  "hint": {
    "en": "Set logging verbosity. TRACE is very detailed, ERROR shows only critical issues.",
    "nl": "Stel logging verbositeit in. TRACE is zeer gedetailleerd, ERROR toont alleen kritieke problemen.",
    "de": "Protokollierungsstufe festlegen. TRACE ist sehr detailliert, ERROR zeigt nur kritische Probleme.",
    "fr": "Définir la verbosité des logs. TRACE est très détaillé, ERROR montre uniquement les problèmes critiques.",
    "it": "Imposta verbosità logging. TRACE è molto dettagliato, ERROR mostra solo problemi critici.",
    "sv": "Ställ in loggningsnivå. TRACE är mycket detaljerad, ERROR visar bara kritiska problem.",
    "no": "Angi loggingsnivå. TRACE er svært detaljert, ERROR viser bare kritiske problemer.",
    "es": "Establecer nivel de registro. TRACE es muy detallado, ERROR muestra solo problemas críticos.",
    "da": "Indstil logningsniveau. TRACE er meget detaljeret, ERROR viser kun kritiske problemer."
  },
  "values": [
    {
      "id": "TRACE",
      "label": {
        "en": "TRACE (Very Verbose)",
        "nl": "TRACE (Zeer Uitgebreid)",
        "de": "TRACE (Sehr Ausführlich)",
        "fr": "TRACE (Très Verbeux)",
        "it": "TRACE (Molto Verboso)",
        "sv": "TRACE (Mycket Utförlig)",
        "no": "TRACE (Veldig Detaljert)",
        "es": "TRACE (Muy Detallado)",
        "da": "TRACE (Meget Detaljeret)"
      }
    },
    {
      "id": "DEBUG",
      "label": {
        "en": "DEBUG (Verbose)",
        "nl": "DEBUG (Uitgebreid)",
        "de": "DEBUG (Ausführlich)",
        "fr": "DEBUG (Verbeux)",
        "it": "DEBUG (Verboso)",
        "sv": "DEBUG (Utförlig)",
        "no": "DEBUG (Detaljert)",
        "es": "DEBUG (Detallado)",
        "da": "DEBUG (Detaljeret)"
      }
    },
    {
      "id": "INFO",
      "label": {
        "en": "INFO (Normal)",
        "nl": "INFO (Normaal)",
        "de": "INFO (Normal)",
        "fr": "INFO (Normal)",
        "it": "INFO (Normale)",
        "sv": "INFO (Normal)",
        "no": "INFO (Normal)",
        "es": "INFO (Normal)",
        "da": "INFO (Normal)"
      }
    },
    {
      "id": "WARN",
      "label": {
        "en": "WARN (Warnings Only)",
        "nl": "WARN (Alleen Waarschuwingen)",
        "de": "WARN (Nur Warnungen)",
        "fr": "WARN (Avertissements Uniquement)",
        "it": "WARN (Solo Avvisi)",
        "sv": "WARN (Endast Varningar)",
        "no": "WARN (Bare Advarsler)",
        "es": "WARN (Solo Advertencias)",
        "da": "WARN (Kun Advarsler)"
      }
    },
    {
      "id": "ERROR",
      "label": {
        "en": "ERROR (Errors Only)",
        "nl": "ERROR (Alleen Fouten)",
        "de": "ERROR (Nur Fehler)",
        "fr": "ERROR (Erreurs Uniquement)",
        "it": "ERROR (Solo Errori)",
        "sv": "ERROR (Endast Fel)",
        "no": "ERROR (Bare Feil)",
        "es": "ERROR (Solo Errores)",
        "da": "ERROR (Kun Fejl)"
      }
    }
  ]
};

const stats = {
  processed: 0,
  modified: 0,
  skipped: 0,
  errors: 0
};

function processDriver(driverName) {
  stats.processed++;
  
  const driverDir = path.join(DRIVERS_DIR, driverName);
  const driverCompose = path.join(driverDir, 'driver.compose.json');
  
  if (!fs.existsSync(driverCompose)) {
    console.log(`⚠️  [${driverName}] No driver.compose.json found`);
    stats.skipped++;
    return;
  }
  
  try {
    const content = JSON.parse(fs.readFileSync(driverCompose, 'utf8'));
    
    // Check if already has debug_level
    if (content.settings && content.settings.find(s => s.id === 'debug_level')) {
      console.log(`⏭️  [${driverName}] Already has debug_level setting`);
      stats.skipped++;
      return;
    }
    
    // Initialize settings array if not present
    if (!content.settings) {
      content.settings = [];
    }
    
    // Add debug_level as first setting
    content.settings.unshift(DEBUG_SETTING);
    
    // Write back
    fs.writeFileSync(
      driverCompose,
      JSON.stringify(content, null, 2) + '\n',
      'utf8'
    );
    
    console.log(`✅ [${driverName}] Debug setting added`);
    stats.modified++;
    
  } catch (err) {
    console.error(`❌ [${driverName}] Error:`, err.message);
    stats.errors++;
  }
}

function main() {
  if (!fs.existsSync(DRIVERS_DIR)) {
    console.error('❌ Drivers directory not found!');
    process.exit(1);
  }
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(name => {
      const stat = fs.statSync(path.join(DRIVERS_DIR, name));
      return stat.isDirectory();
    });
  
  console.log(`\n📁 Found ${drivers.length} drivers\n`);
  
  for (const driver of drivers) {
    processDriver(driver);
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY:\n');
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Modified:  ${stats.modified} ✅`);
  console.log(`   Skipped:   ${stats.skipped} ⏭️`);
  console.log(`   Errors:    ${stats.errors} ❌`);
  
  const successRate = ((stats.modified / stats.processed) * 100).toFixed(1);
  console.log(`\n   Success Rate: ${successRate}%`);
  
  if (stats.modified > 0) {
    console.log('\n✅ Debug settings successfully added!');
    console.log('\n📝 Users can now choose debug level in device settings');
    console.log('   TRACE → Very detailed (troubleshooting)');
    console.log('   DEBUG → Detailed (development)');
    console.log('   INFO  → Normal (default)');
    console.log('   WARN  → Warnings only');
    console.log('   ERROR → Errors only');
  }
  
  console.log('\n' + '='.repeat(70));
}

main();
