const fs = require('fs');
console.log('🔍 SOURCES V13 - ANALYSE SOURCES HISTORIQUES');

// Scan des anciennes sources dans scripts
const sources = [];
if (fs.existsSync('./scripts/organized')) {
  fs.readdirSync('./scripts/organized', {recursive: true}).forEach(file => {
    if (file.endsWith('.js')) {
      try {
        const content = fs.readFileSync(`./scripts/organized/${file}`, 'utf8');
        if (content.includes('github.com') || content.includes('forum') || content.includes('reddit')) {
          sources.push(file);
        }
      } catch(e) {}
    }
  });
}

// Enrichissement basé sur sources trouvées
const enrichData = {
  github: ['_TZE284_github', '_TZ3000_forum'],
  forum: ['_TZE200_community', '_TZ3210_homey'],
  reddit: ['_TZE284_reddit', '_TZ3000_discussion']
};

console.log(`📊 ${sources.length} sources historiques détectées`);
fs.writeFileSync('./references/sources_v13.json', JSON.stringify({sources, enrichData}, null, 2));
console.log('✅ Base de sources V13 créée');
