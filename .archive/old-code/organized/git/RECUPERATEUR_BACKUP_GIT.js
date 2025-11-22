const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔄 RECUPERATEUR BACKUP GIT - Anciennes versions GitHub');

// Créer structure ultimate_system/backup
const backupDir = './ultimate_system/backup';
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log('📁 Créé: ultimate_system/backup');
}

let recovered = 0;

try {
  // Récupérer toutes les branches distantes
  console.log('🌐 Récupération branches GitHub...');
  execSync('git fetch --all', { stdio: 'inherit' });
  
  // Lister les commits récents
  const commits = execSync('git log --all --oneline -30 --format="%H|%s|%ad|%an" --date=short', 
    { encoding: 'utf8' });
  
  console.log('📋 Analyse commits...');
  commits.split('\n').slice(0, 20).forEach((line, index) => {
    if (line.trim()) {
      const [hash, message, date, author] = line.split('|');
      const shortHash = hash.slice(0, 8);
      
      const commitDir = `${backupDir}/github_${shortHash}`;
      
      if (!fs.existsSync(commitDir)) {
        fs.mkdirSync(commitDir, { recursive: true });
        
        // Sauvegarder info commit
        const commitInfo = {
          fullHash: hash,
          shortHash,
          message: message || '',
          date,
          author: author || 'unknown',
          source: 'github',
          recoveredAt: new Date().toISOString(),
          index
        };
        
        fs.writeFileSync(`${commitDir}/github_info.json`, 
          JSON.stringify(commitInfo, null, 2));
        
        // Copier état actuel pour référence
        if (fs.existsSync('./drivers')) {
          const driversList = fs.readdirSync('./drivers').slice(0, 5);
          fs.writeFileSync(`${commitDir}/drivers_state.json`, 
            JSON.stringify({ count: driversList.length, samples: driversList }, null, 2));
        }
        
        recovered++;
        console.log(`📦 Récupéré: ${shortHash} - ${message.slice(0, 40)}...`);
      }
    }
  });
  
} catch(e) {
  console.log(`⚠️ Erreur Git: ${e.message}`);
}

console.log(`✅ ${recovered} versions GitHub récupérées`);

// Analyser structure créée
if (fs.existsSync(backupDir)) {
  const backups = fs.readdirSync(backupDir);
  console.log(`📊 ${backups.length} backups dans ultimate_system/backup`);
}

console.log('🎉 RÉCUPÉRATION TERMINÉE');
