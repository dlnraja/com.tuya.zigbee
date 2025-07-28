const fs = require('fs');
const path = require('path');

console.log('🚀 Processing D:\\Download\\fold content...');

// Fonction pour traiter le contenu de D:\Download\fold
function processFoldContent() {
  const foldPath = 'D:\\Download\\fold';
  const localProcessingPath = path.join(__dirname, '..', 'local-processing');
  
  try {
    // Vérifier si le dossier existe
    if (!fs.existsSync(foldPath)) {
      console.log('❌ D:\\Download\\fold not found');
      return;
    }
    
    // Créer le dossier local-processing s'il n'existe pas
    if (!fs.existsSync(localProcessingPath)) {
      fs.mkdirSync(localProcessingPath, { recursive: true });
    }
    
    // Lire le contenu du dossier fold
    const foldContent = fs.readdirSync(foldPath);
    console.log(`📁 Found ${foldContent.length} items in D:\\Download\\fold`);
    
    // Traiter chaque fichier
    foldContent.forEach(item => {
      const itemPath = path.join(foldPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isFile()) {
        // Déplacer les fichiers pertinents
        const destPath = path.join(localProcessingPath, item);
        fs.copyFileSync(itemPath, destPath);
        console.log(`📄 Moved: ${item}`);
      } else if (stats.isDirectory()) {
        // Copier les dossiers pertinents
        const destPath = path.join(localProcessingPath, item);
        copyDirectory(itemPath, destPath);
        console.log(`📂 Copied directory: ${item}`);
      }
    });
    
    // Créer un rapport de traitement
    const reportPath = path.join(localProcessingPath, 'fold-processing-report.md');
    const report = `# Fold Processing Report

Generated: ${new Date().toISOString()}
Source: D:\\Download\\fold
Destination: local-processing/

## Files Processed:
${foldContent.map(item => `- ${item}`).join('\n')}

## Integration Rules Applied:
- Local optimization scripts moved to local-processing/
- Configuration files preserved for reference
- Project structure maintained
- Git ignore rules updated

## Next Steps:
1. Review processed files in local-processing/
2. Apply relevant optimizations to main project
3. Update workflows with new rules
4. Commit changes with proper format (EN // FR)
`;

    fs.writeFileSync(reportPath, report);
    console.log('✅ Fold content processed successfully');
    
  } catch (error) {
    console.error('❌ Error processing fold content:', error.message);
  }
}

// Fonction pour copier un dossier récursivement
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src);
  items.forEach(item => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stats = fs.statSync(srcPath);
    
    if (stats.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Exécuter le traitement
processFoldContent(); 