const fs = require('fs');
const path = require('path');

class FileEnsurer {
    static ensureRequiredFilesExist() {
        const requiredFiles = [
            'app.js',
            'app.json',
            'package.json',
            'README.md',
            'CHANGELOG.md'
        ];
        
        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                console.log('❌ Fichier manquant:', file);
                return false;
            }
        }
        
        console.log('✅ Tous les fichiers requis existent');
        return true;
    }
}

module.exports = FileEnsurer;