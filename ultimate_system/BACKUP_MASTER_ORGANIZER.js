const { execSync } = require('child_process');
const fs = require('fs');

console.log('🗂️ BACKUP MASTER ORGANIZER');

// Nettoyage complet du backup mal organisé
if (fs.existsSync('./backup')) {
  const items = fs.readdirSync('./backup');
  items.forEach(item => {
    const path = `./backup/${item}`;
    if (!item.match(/^[a-z]+_[a-f0-9]{7,}$/)) {
      fs.rmSync(path, {recursive: true, force: true});
      console.log(`🗑️ Supprimé: ${item}`);
    }
  });
}

// Dump correct par branche et commit
try {
  // Get current branch
  const currentBranch = execSync('git branch --show-current', {encoding: 'utf8'}).trim();
  
  // Get commits with full details
  const commits = execSync('git log --oneline --format="%H|%s|%ad|%an" --date=short -20', {encoding: 'utf8'});
  
  let dumped = 0;
  commits.split('\n').slice(0, 12).forEach(line => {
    if (line.trim()) {
      const [fullHash, message, date, author] = line.split('|');
      const shortHash = fullHash.slice(0, 8);
      
      const backupDir = `./backup/${currentBranch}_${shortHash}`;
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, {recursive: true});
        
        // Créer fichier info complet
        const info = {
          branch: currentBranch,
          commitHash: fullHash,
          shortHash,
          message: message || '',
          date,
          author: author || 'unknown',
          timestamp: new Date().toISOString(),
          version: `v${dumped + 1}.0.0`
        };
        
        fs.writeFileSync(`${backupDir}/version_info.json`, JSON.stringify(info, null, 2));
        
        // Copier état des drivers à ce moment
        if (fs.existsSync('./drivers')) {
          const driverCount = fs.readdirSync('./drivers').length;
          const driversList = fs.readdirSync('./drivers').slice(0, 10);
          
          fs.writeFileSync(`${backupDir}/drivers_snapshot.json`, JSON.stringify({
            count: driverCount,
            samples: driversList,
            capturedAt: new Date().toISOString()
          }, null, 2));
        }
        
        dumped++;
      }
    }
  });
  
  console.log(`✅ ${dumped} versions dumpées pour branche ${currentBranch}`);
  
} catch(e) {
  console.log(`⚠️ Erreur Git: ${e.message}`);
}

// Analyser structure créée
if (fs.existsSync('./backup')) {
  const backups = fs.readdirSync('./backup');
  console.log(`📊 ${backups.length} backups organisés`);
  
  backups.slice(0, 5).forEach(backup => {
    const infoPath = `./backup/${backup}/version_info.json`;
    if (fs.existsSync(infoPath)) {
      const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
      console.log(`   📋 ${backup}: ${info.message.slice(0, 40)}...`);
    }
  });
}

console.log('🎉 BACKUP ORGANISATION TERMINÉE');
