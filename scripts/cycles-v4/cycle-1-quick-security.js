// CYCLE 1/10: AUDIT SÉCURITÉ RAPIDE HOMEY
const fs = require('fs');

console.log('🔒 AUDIT SÉCURITÉ RAPIDE');

// Scan patterns dangereux
const patterns = [
    /password: "REDACTED",}/gi,
    /api[_-]?key\s*[=:]\s*["\'][^"\']{8,}/gi,
    /token: "REDACTED",}/gi,
    /ghp_[a-zA-Z0-9]{36}/g
];

let found = [];

// Scan fichiers JS principaux
['app.js', 'lib/TuyaApi.js', 'lib/TuyaApiMqtt.js'].forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        patterns.forEach((p, i) => {
            const matches = content.match(p);
            if (matches) found.push({file, matches: matches.length});
        });
    }
});

console.log('Résultats:', found.length ? found : '✅ Aucun credential trouvé');

// Mise à jour .gitignore
const gitignore = `
.env
.env.local
*.key
*.pem
credentials.json
config/secret: "REDACTED"
.homeycompose/
.homeybuild/
project-data/publish-*.txt
project-data/auth-*.json
`;

fs.writeFileSync('.gitignore', gitignore);
console.log('✅ .gitignore mis à jour');
console.log('✅ CYCLE 1/10 TERMINÉ');
