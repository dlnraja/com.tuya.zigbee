#!/usr/bin/env node

/**
 * FIX ALL ARGS TITLES - SDK3 Compliance
 * 
 * Converts all args.title from string to object with translations
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

function fixArgsTitle() {
  console.log('🔧 FIXING ALL ARGS TITLES FOR SDK3...\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d =>
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory() &&
    !d.startsWith('.') &&
    !d.includes('archived')
  );
  
  let fixed = 0;
  
  for (const driverId of drivers) {
    const flowPath = path.join(DRIVERS_DIR, driverId, 'driver.flow.compose.json');
    
    if (!fs.existsSync(flowPath)) continue;
    
    try {
      const flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
      let modified = false;
      
      // Check all sections
      ['triggers', 'conditions', 'actions'].forEach(section => {
        if (!flow[section]) return;
        
        flow[section].forEach(card => {
          if (!card.args) return;
          
          card.args.forEach(arg => {
            if (arg.title && typeof arg.title === 'string') {
              // Convert string to object
              const titleString = arg.title;
              arg.title = {
                en: titleString,
              };
              
              // Add common translations based on English
              if (titleString.toLowerCase().includes('threshold')) {
                arg.title = {
                  en: titleString,
                  fr: 'Seuil',
                  nl: 'Drempel',
                  de: 'Schwellenwert',
                  it: 'Soglia',
                  es: 'Umbral'
                };
              } else if (titleString.toLowerCase().includes('temperature')) {
                arg.title = {
                  en: titleString,
                  fr: 'Température',
                  nl: 'Temperatuur',
                  de: 'Temperatur',
                  it: 'Temperatura',
                  es: 'Temperatura'
                };
              } else if (titleString.toLowerCase().includes('humidity')) {
                arg.title = {
                  en: titleString,
                  fr: 'Humidité',
                  nl: 'Luchtvochtigheid',
                  de: 'Feuchtigkeit',
                  it: 'Umidità',
                  es: 'Humedad'
                };
              } else if (titleString.toLowerCase().includes('brightness') || titleString.toLowerCase().includes('level')) {
                arg.title = {
                  en: titleString,
                  fr: 'Luminosité',
                  nl: 'Helderheid',
                  de: 'Helligkeit',
                  it: 'Luminosità',
                  es: 'Brillo'
                };
              } else if (titleString.toLowerCase().includes('duration')) {
                arg.title = {
                  en: titleString,
                  fr: 'Durée',
                  nl: 'Duur',
                  de: 'Dauer',
                  it: 'Durata',
                  es: 'Duración'
                };
              }
              
              modified = true;
              console.log(`  ✅ ${driverId} - ${card.id} - arg: ${arg.name}`);
            }
          });
        });
      });
      
      if (modified) {
        fs.writeFileSync(flowPath, JSON.stringify(flow, null, 2) + '\n', 'utf8');
        fixed++;
      }
      
    } catch (err) {
      console.error(`  ❌ ${driverId}: ${err.message}`);
    }
  }
  
  console.log(`\n✅ Fixed ${fixed} drivers\n`);
}

fixArgsTitle();
