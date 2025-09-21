const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 SCANNER HISTORIQUE COMPLET');

// Scan git log
try {
    const log = execSync('git log --oneline -50', {encoding: 'utf8'});
    const commits = log.split('\n').filter(l => l.trim());
    console.log(`📈 ${commits.length} commits analysés`);
    
    // Extraire infos importantes
    const versions = [];
    const improvements = [];
    
    commits.forEach(commit => {
        if (commit.includes('v1.') || commit.includes('driver') || commit.includes('endpoint')) {
            const [hash, ...msg] = commit.split(' ');
            improvements.push({hash: hash.substring(0,8), message: msg.join(' ')});
        }
        
        const vMatch = commit.match(/v(\d+\.\d+\.?\d*)/);
        if (vMatch) versions.push(vMatch[1]);
    });
    
    console.log(`✅ ${versions.length} versions trouvées: ${versions.slice(0,5).join(', ')}`);
    console.log(`✅ ${improvements.length} améliorations identifiées`);
    
    // Créer rapport enrichissement
    const report = {
        timestamp: new Date().toISOString(),
        totalCommits: commits.length,
        versions: [...new Set(versions)],
        improvements: improvements.slice(0,10),
        enrichmentApplied: true
    };
    
    if (!fs.existsSync('project-data/reports')) fs.mkdirSync('project-data/reports', {recursive: true});
    fs.writeFileSync('project-data/reports/historical-enrichment.json', JSON.stringify(report, null, 2));
    
    console.log('📊 Rapport historique créé');
    
} catch(e) {
    console.log('⚠️ Erreur:', e.message);
}

console.log('🎉 SCAN TERMINÉ');
