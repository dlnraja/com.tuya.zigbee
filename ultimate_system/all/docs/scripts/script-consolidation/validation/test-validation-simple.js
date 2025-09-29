// Performance optimized
#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
// Vérifier app.json
if (fs.existsSync('app.json')) {
    const stats = fs.statSync('app.json');
    // Vérifier les clusters
    const content = fs.readFileSync('app.json', 'utf8');
    const clusterMatches = content.match(/"clusters":\s*\[[^\]]*\]/g);

    if (clusterMatches) {
        // Vérifier si les clusters sont numériques
        const numericClusters = clusterMatches.filter(match =>
            match.match(/"clusters":\s*\[\s*\d+/)
        );
        if (numericClusters.length === clusterMatches.length) {
        } else {
            // Afficher les clusters non numériques
            const nonNumericClusters = clusterMatches.filter(match =>
                !match.match(/"clusters":\s*\[\s*\d+/)
            );
            nonNumericClusters.slice(0, 5).forEach((cluster, index) => {
            });
        }
    }
} else {
    process.exit(1);
}
try {
    const result = execSync('homey app validate', {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 30000
    });
} catch (error) {
    if (error.stdout) {
    }

    if (error.stderr) {
    }

    if (error.message) {
    }
}