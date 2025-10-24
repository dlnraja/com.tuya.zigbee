const fs = require('fs');
const path = require('path');

console.log('📝 Ajout section "images" dans tous les driver.compose.json\n');

const driversPath = path.join(__dirname, 'drivers');
const drivers = fs.readdirSync(driversPath).filter(d => 
  fs.statSync(path.join(driversPath, d)).isDirectory()
);

let fixed = 0;

drivers.forEach(driver => {
  const composePath = path.join(driversPath, driver, 'driver.compose.json');
  
  if (fs.existsSync(composePath)) {
    let content = fs.readFileSync(composePath, 'utf8');
    
    // Si "images" n'existe pas déjà
    if (!content.includes('"images"')) {
      // Ajouter avant "platforms" ou à la fin
      if (content.includes('"platforms"')) {
        content = String(content).replace(
          '"platforms"',
          '"images": {\n    "small": "./assets/images/small.png",\n    "large": "./assets/images/large.png"\n  },\n  "platforms"'
        );
      } else {
        // Ajouter avant la dernière accolade
        content = String(content).replace(/\n}$/, ',\n  "images": {\n    "small": "./assets/images/small.png",\n    "large": "./assets/images/large.png"\n  }\n}');
      }
      
      fs.writeFileSync(composePath, content);
      fixed++;
    }
  }
});

console.log(`✅ ${fixed} drivers mis à jour`);
console.log(`   Section "images" ajoutée avec chemins corrects\n`);
