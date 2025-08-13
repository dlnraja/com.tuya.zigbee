// !/usr/bin/env node
/**
 * @file organize-reports.js
 * @description Organise automatiquement tous les rapports JSON dans le dossier reports/
 * @author dlnraja
 * @date 2025-01-29
 */

const fs = require('fs');
const path = require('path');

const log = (msg) => console.log(`[organize-reports] ${msg}`);

// Structure des dossiers de rapports
const reportDirs = {
    'diagnose': ['DIAGNOSE_REPORT_', 'diagnose-report.json'],
    'mega': ['MEGA_SOURCES_REPORT_', 'mega-sources-report.json'],
    'cleanup': ['CLEANUP_REPORT', 'cleanup-report.json'],
    'reorganize': ['REORGANIZATION_REPORT', 'drivers-reorganize-report.json', 'FINAL_REORGANIZATION_REPORT'],
    'analysis': ['analysis-report.json', 'tmp-sources-analysis-report.json', 'sources-analysis'],
    'validation': ['VERIFY_REPORT', 'validate-report.json', 'validation-report.json'],
    'assets': ['assets-report.json', 'ASSETS_REPORT'],
    'fingerprints': ['fingerprints-report.json', 'FINGERPRINTS_REPORT']
};

function createReportDirs() {
    const reportsDir = 'reports';
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
        log('Created reports directory');
    }

    // Créer tous les sous-dossiers
    for (const dir of Object.keys(reportDirs)) {
        const dirPath = path.join(reportsDir, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            log(`Created ${dirPath}`);
        }
    }
}

function organizeReports() {
    const rootFiles = fs.readdirSync('.').filter(f => f.endsWith('.json'));
    let moved = 0;

    for (const file of rootFiles) {
        for (const [dirName, patterns] of Object.entries(reportDirs)) {
            const shouldMove = patterns.some(pattern => {
                if (pattern.endsWith('_')) {
                    return file.startsWith(pattern);
                } else {
                    return file === pattern || file.includes(pattern);
                }
            });

            if (shouldMove) {
                const sourcePath = file;
                const destPath = path.join('reports', dirName, file);
                
                try {
                    fs.renameSync(sourcePath, destPath);
                    log(`Moved ${file} → reports/${dirName}/`);
                    moved++;
                    break;
                } catch (err) {
                    log(`Error moving ${file}: ${err.message}`);
                }
            }
        }
    }

    log(`Organized ${moved} report files`);
    return moved;
}

function cleanOldReports() {
    // Nettoyer les anciens rapports (garder seulement les 5 plus récents par catégorie)
    for (const dirName of Object.keys(reportDirs)) {
        const dirPath = path.join('reports', dirName);
        if (!fs.existsSync(dirPath)) continue;

        const files = fs.readdirSync(dirPath)
            .filter(f => f.endsWith('.json'))
            .map(f => ({
                name: f,
                path: path.join(dirPath, f),
                mtime: fs.statSync(path.join(dirPath, f)).mtime
            }))
            .sort((a, b) => b.mtime - a.mtime);

        // Garder les 5 plus récents, supprimer les autres
        const toDelete = files.slice(5);
        for (const file of toDelete) {
            try {
                fs.unlinkSync(file.path);
                log(`Cleaned old report: ${file.name}`);
            } catch (err) {
                log(`Error cleaning ${file.name}: ${err.message}`);
            }
        }
    }
}

function generateReportsIndex() {
    const index = {
        generated: new Date().toISOString(),
        categories: {}
    };

    for (const dirName of Object.keys(reportDirs)) {
        const dirPath = path.join('reports', dirName);
        if (!fs.existsSync(dirPath)) continue;

        const files = fs.readdirSync(dirPath)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const filePath = path.join(dirPath, f);
                const stats = fs.statSync(filePath);
                return {
                    name: f,
                    size: stats.size,
                    modified: stats.mtime.toISOString(),
                    path: \reports/${dirName}/${f}`
                };
            })
            .sort((a, b) => new Date(b.modified) - new Date(a.modified));

        index.categories[dirName] = {
            count: files.length,
            files: files
        };
    }

    fs.writeFileSync('reports/index.json', JSON.stringify(index, null, 2));
    log('Generated reports index');
}

// Exécution principale
function main() {
    log('Starting report organization');
    
    createReportDirs();
    const moved = organizeReports();
    cleanOldReports();
    generateReportsIndex();
    
    log(`Organization complete - ${moved} files moved`);
}

if (require.main === module) {
    main();
}

module.exports = { organizeReports, createReportDirs, cleanOldReports, generateReportsIndex };
