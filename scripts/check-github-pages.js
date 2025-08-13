// !/usr/bin/env node
/**
 * @file check-github-pages.js
 * @description Vérification et diagnostic GitHub Pages
 * @author dlnraja
 * @date 2025-01-29
 */

const fs = require('fs');
const path = require('path');

const log = (msg) => console.log(`[gh-pages] ${msg}`);

function checkDashboardFiles() {
    const requiredFiles = [
        'dashboard/index.html',
        'dashboard/summary.json',
        'dashboard/README.md',
        'dashboard/_config.yml'
    ];

    log('Vérification des fichiers dashboard...');
    let allPresent = true;

    for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
            const stats = fs.statSync(file);
            log(`✅ ${file} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
        } else {
            log(`❌ ${file} - MANQUANT`);
            allPresent = false;
        }
    }

    return allPresent;
}

function checkWorkflows() {
    const workflowFiles = [
        '.github/workflows/pages.yml',
        '.github/workflows/deploy.yml'
    ];

    log('Vérification des workflows GitHub...');
    let workflowsOk = true;

    for (const workflow of workflowFiles) {
        if (fs.existsSync(workflow)) {
            log(`✅ ${workflow}`);
        } else {
            log(`❌ ${workflow} - MANQUANT`);
            workflowsOk = false;
        }
    }

    return workflowsOk;
}

function checkPackageScripts() {
    log('Vérification des scripts npm...');
    
    try {
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const requiredScripts = ['dashboard', 'organize-reports'];
        
        let scriptsOk = true;
        for (const script of requiredScripts) {
            if (pkg.scripts[script]) {
                log(`✅ npm run ${script}: ${pkg.scripts[script]}`);
            } else {
                log(`❌ Script manquant: ${script}`);
                scriptsOk = false;
            }
        }
        
        return scriptsOk;
    } catch (err) {
        log(`❌ Erreur lecture package.json: ${err.message}`);
        return false;
    }
}

function generateDiagnosticReport() {
    const report = {
        timestamp: new Date().toISOString(),
        github_pages: {
            repository: 'https://github.com/dlnraja/com.tuya.zigbee',
            pages_url: 'https://dlnraja.github.io/com.tuya.zigbee/',
            settings_url: 'https://github.com/dlnraja/com.tuya.zigbee/settings/pages'
        },
        dashboard_files: {},
        workflows: {},
        npm_scripts: {},
        recommendations: []
    };

    // Vérifier les fichiers dashboard
    const dashboardFiles = ['index.html', 'summary.json', 'README.md', '_config.yml'];
    for (const file of dashboardFiles) {
        const filePath = `dashboard/${file}`;
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            report.dashboard_files[file] = {
                exists: true,
                size: stats.size,
                modified: stats.mtime.toISOString()
            };
        } else {
            report.dashboard_files[file] = { exists: false };
            report.recommendations.push(`Créer ${filePath}`);
        }
    }

    // Vérifier les workflows
    const workflows = ['pages.yml', 'deploy.yml'];
    for (const workflow of workflows) {
        const workflowPath = `.github/workflows/${workflow}`;
        report.workflows[workflow] = {
            exists: fs.existsSync(workflowPath)
        };
    }

    // Ajouter des recommandations
    report.recommendations.push(
        'Vérifier que GitHub Pages est activé dans Settings > Pages',
        'Configurer Source: GitHub Actions',
        'Activer "Enforce HTTPS" si disponible',
        'Vérifier les permissions du workflow dans Settings > Actions'
    );

    fs.writeFileSync('reports/validation/github-pages-diagnostic.json', JSON.stringify(report, null, 2));
    log('Rapport diagnostic sauvegardé: reports/validation/github-pages-diagnostic.json');
    
    return report;
}

function main() {
    log('🔍 Diagnostic GitHub Pages');
    
    const dashboardOk = checkDashboardFiles();
    const workflowsOk = checkWorkflows();
    const scriptsOk = checkPackageScripts();
    
    log('\n📊 RÉSUMÉ:');
    log(`Dashboard: ${dashboardOk ? '✅' : '❌'}`);
    log(`Workflows: ${workflowsOk ? '✅' : '❌'}`);
    log(`Scripts npm: ${scriptsOk ? '✅' : '❌'}`);
    
    const report = generateDiagnosticReport();
    
    log('\n🌐 URLs importantes:');
    log('Repository: https://github.com/dlnraja/com.tuya.zigbee');
    log('Pages: https://dlnraja.github.io/com.tuya.zigbee/');
    log('Settings: https://github.com/dlnraja/com.tuya.zigbee/settings/pages');
    log('Actions: https://github.com/dlnraja/com.tuya.zigbee/actions');
    
    if (dashboardOk && workflowsOk && scriptsOk) {
        log('\n🎉 Configuration GitHub Pages complète !');
        process.exit(0);
    } else {
        log('\n⚠️  Corrections nécessaires détectées');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { checkDashboardFiles, checkWorkflows, checkPackageScripts, generateDiagnosticReport };
