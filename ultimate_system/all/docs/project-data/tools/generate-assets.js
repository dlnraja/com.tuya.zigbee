const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const driversPath = path.join(__dirname, '..', 'drivers', 'tuya_zigbee');
const reportPath = path.join(__dirname, 'asset-report.json');

// Lire le rapport des assets manquants
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Fonction pour générer une image SVG par défaut
function generateDefaultSVG(width, height, text) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Fond blanc
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  // Texte
  ctx.fillStyle = '#000000';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  
  return canvas.toBuffer('image/svg');
}

// Parcourir le rapport et générer les assets manquants
for (const [driver, missingFiles] of Object.entries(report)) {
  const driverPath = path.join(driversPath, driver);
  
  for (const file of missingFiles) {
    const filePath = path.join(driverPath, file);
    const dir = path.dirname(filePath);
    
    // Créer le dossier si nécessaire
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Générer l'asset par défaut selon le type
    if (file.includes('icon.svg')) {
      const svgBuffer = generateDefaultSVG(128, 128, 'ICON');
      fs.writeFileSync(filePath, svgBuffer);
    } else if (file.includes('learnmode.svg')) {
      const svgBuffer = generateDefaultSVG(256, 256, 'LEARNMODE');
      fs.writeFileSync(filePath, svgBuffer);
    } else {
      // Pour les autres fichiers, créer un fichier vide
      fs.writeFileSync(filePath, '');
    }
  }
}

console.log('Génération des assets manquants terminée.');
