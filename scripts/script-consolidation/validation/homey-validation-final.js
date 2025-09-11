// Performance optimized
#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
// Configuration
const TIMEOUT = 60000; // 60 secondes
const MAX_RETRIES = 3;

// Fonction de validation des clusters
function validateClusters() {
    if (!fs.existsSync('app.json')) {
        return false;
    }

    const content = fs.readFileSync('app.json', 'utf8');
    const clusterMatches = content.match(/"clusters":\s*\[[^\]]*\]/g);

    if (!clusterMatches) {
        return false;
    }
    // Vérifier si les clusters sont numériques
    const numericClusters = clusterMatches.filter(match =>
        match.match(/"clusters":\s*\[\s*\d+/)
    );

    const nonNumericClusters = clusterMatches.filter(match =>
        !match.match(/"clusters":\s*\[\s*\d+/)
    );
    if (nonNumericClusters.length > 0) {
        nonNumericClusters.slice(0, 3).forEach((cluster, index) => {
        });
        return false;
    }
    return true;
}

// Fonction de validation Homey
function validateHomey() {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = execSync('homey app validate', {
                encoding: 'utf8',
                stdio: 'pipe',
                timeout: TIMEOUT
            });
            return { success: true, output: result };

        } catch (error) {
            if (error.stdout) {
            }

            if (error.stderr) {
            }

            if (error.message) {
            }

            if (attempt < MAX_RETRIES) {
                // Attendre 2 secondes entre les tentatives
                setTimeout(() => {}, 2000);
            }
        }
    }
    return { success: false, error: 'Toutes les tentatives ont échoué' };
}

// Fonction de génération de rapport
function generateReport(results) {
    const report = {
        timestamp: new Date().toISOString(),
        validation: {
            clusters: results.clusters,
            homey: results.homey.success,
            overall: results.clusters && results.homey.success
        },
        details: {
            clustersValid: results.clusters,
            homeyValid: results.homey.success,
            homeyOutput: results.homey.output || results.homey.error
        },
        recommendations: []
    };

    if (results.clusters && results.homey.success) {
        report.recommendations.push(
            '🎉 VALIDATION COMPLÈTE RÉUSSIE !',
            '🚀 Prêt pour les prochaines étapes',
            '📋 Continuer avec les tests des drivers',
            '📋 Procéder à l\'enrichissement continu'
        );
    } else if (results.clusters && !results.homey.success) {
        report.recommendations.push(
            '⚠️  Clusters valides mais validation Homey échouée',
            '🔧 Vérifier la configuration Homey',
            '🔧 Relancer la validation après correction'
        );
    } else {
        report.recommendations.push(
            '❌ Validation des clusters échouée',
            '🔧 Corriger les clusters avant validation Homey',
            '🔧 Utiliser les scripts de correction'
        );
    }

    // Sauvegarder le rapport
    const reportPath = 'homey-validation-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    return report;
}

// Exécution principale
async function main() {
    try {
        // Validation des clusters
        const clustersValid = validateClusters();

        // Validation Homey
        const homeyResult = validateHomey();

        // Résultats
        const results = {
            clusters: clustersValid,
            homey: homeyResult
        };

        // Rapport final
        const report = generateReport(results);

        // Affichage du résumé
        if (report.validation.overall) {
        } else {
        }
    } catch (error) {
        process.exit(1);
    }
}

// Exécution
main();