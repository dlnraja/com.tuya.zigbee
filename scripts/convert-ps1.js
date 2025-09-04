#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔄 Conversion des scripts PowerShell...');

// Recherche des fichiers .ps1
const findPS1Files = (dir) => {
  const files = [];
  const entries = fs.readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
      files.push(...findPS1Files(fullPath));
    } else if (stat.isFile() && entry.endsWith('.ps1')) {
      files.push(fullPath);
    }
  }
  
  return files;
};

const ps1Files = findPS1Files('.');
console.log(`📁 ${ps1Files.length} fichiers .ps1 trouvés`);

// Conversion
for (const file of ps1Files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const jsFile = file.replace('.ps1', '.js');
    
    // Conversion basique
    let converted = content
      .replace(/Write-Host/g, 'console.log')
      .replace(/Write-Error/g, 'console.error')
      .replace(/Write-Warning/g, 'console.warn')
      .replace(/Get-ChildItem/g, 'fs.readdirSync')
      .replace(/New-Item/g, 'fs.mkdirSync')
      .replace(/Remove-Item/g, 'fs.rmSync')
      .replace(/Copy-Item/g, 'fs.copyFileSync')
      .replace(/Move-Item/g, 'fs.renameSync')
      .replace(/Test-Path/g, 'fs.existsSync')
      .replace(/Get-Content/g, 'fs.readFileSync')
      .replace(/Set-Content/g, 'fs.writeFileSync');
    
    // Ajout du header JavaScript
    converted = `#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement de PowerShell vers JavaScript
 * Original: ${path.basename(file)}
 * Converti le: ${new Date().toISOString()}
 */

const fs = require('fs');
const path = require('path');

${converted}`;
    
    fs.writeFileSync(jsFile, converted);
    fs.unlinkSync(file); // Suppression du fichier original
    
    console.log(`✅ ${file} → ${jsFile}`);
  } catch (error) {
    console.log(`❌ Erreur ${file}: ${error.message}`);
  }
}

console.log('✅ Conversion terminée !');
