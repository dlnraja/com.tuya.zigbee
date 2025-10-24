#!/usr/bin/env node

/**
 * Diagnose driver image paths
 * Converted from DIAGNOSE_DRIVER_IMAGES.ps1
 */

import path from 'path';
import { logger } from './lib/logger.js';
import { readJSON, writeJSON, exists, getProjectRoot } from './lib/file-utils.js';
import { glob } from 'glob';

const PROJECT_ROOT = getProjectRoot();
const DRIVERS_PATH = path.join(PROJECT_ROOT, 'drivers');

async function diagnoseDriverImages(options = {}) {
  const { verbose = false, exportReport = true } = options;
  
  logger.title('DIAGNOSTIC PROFOND DES IMAGES DE DRIVERS');
  
  logger.info('🔍 Scanning drivers directory...\n');

  // Find all driver.compose.json files
  const driverFiles = await glob('**/driver.compose.json', {
    cwd: DRIVERS_PATH,
    absolute: true
  });

  const results = {
    driversScanned: 0,
    driversWithImages: 0,
    driversWithoutImages: 0,
    totalImageRefs: 0,
    validImages: 0,
    missingImages: 0,
    imagePatterns: {},
    issues: []
  };

  for (const file of driverFiles) {
    const driverName = path.basename(path.dirname(file));
    const driverDir = path.dirname(file);
    
    results.driversScanned++;
    
    try {
      const content = await readJSON(file);
      
      if (content.images) {
        results.driversWithImages++;
        
        // Check each image reference
        for (const [type, imagePath] of Object.entries(content.images)) {
          results.totalImageRefs++;
          
          // Track pattern
          const pattern = String(imagePath).replace(/\/[^/]+$/, '/*');
          results.imagePatterns[pattern] = (results.imagePatterns[pattern] || 0) + 1;
          
          // Check if image exists
          const fullImagePath = path.join(driverDir, imagePath);
          const imageExists = await exists(fullImagePath);
          
          if (imageExists) {
            results.validImages++;
          } else {
            results.missingImages++;
            results.issues.push({
              driver: driverName,
              type,
              path: imagePath,
              issue: 'File not found'
            });
            
            if (verbose) {
              logger.warning(`Missing: ${driverName} - ${imagePath}`);
            }
          }
        }
      } else {
        results.driversWithoutImages++;
      }
    } catch (error) {
      logger.error(`Error processing ${driverName}: ${error.message}`);
      results.issues.push({
        driver: driverName,
        issue: error.message
      });
    }
  }

  // Display results
  logger.section('RÉSULTATS DU DIAGNOSTIC');
  
  logger.summary('📊 Statistiques Globales', [
    { label: 'Total drivers scannés', value: results.driversScanned, status: 'success' },
    { label: 'Drivers avec images', value: results.driversWithImages, status: 'success' },
    { label: 'Drivers sans images', value: results.driversWithoutImages, status: results.driversWithoutImages > 0 ? 'warning' : 'success' },
    { label: 'Total références d\'images', value: results.totalImageRefs, status: 'success' },
    { label: 'Images valides', value: results.validImages, status: 'success' },
    { label: 'Images manquantes', value: results.missingImages, status: results.missingImages > 0 ? 'error' : 'success' }
  ]);

  // Image patterns
  if (Object.keys(results.imagePatterns).length > 0) {
    logger.section('📁 Patterns de chemins d\'images');
    Object.entries(results.imagePatterns)
      .sort((a, b) => b[1] - a[1])
      .forEach(([pattern, count]) => {
        logger.log(`  • ${pattern}: ${count} drivers`);
      });
    console.log('');
  }

  // Issues
  if (results.issues.length > 0) {
    logger.section('⚠️  Problèmes détectés');
    results.issues.forEach(issue => {
      logger.warning(`Driver: ${issue.driver}`);
      if (issue.path) logger.log(`  Path: ${issue.path}`);
      logger.log(`  Issue: ${issue.issue}\n`);
    });
  } else {
    logger.success('💡 Aucun problème détecté!\n');
  }

  // Export report
  if (exportReport) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const reportPath = path.join(PROJECT_ROOT, 'project-data', `IMAGE_DIAGNOSTIC_REPORT_${timestamp}.json`);
    
    await writeJSON(reportPath, {
      metadata: {
        generated_at: new Date().toISOString(),
        project_version: '2.15.96'
      },
      results
    });
    
    logger.success(`✅ Rapport exporté: ${reportPath}`);
  }

  logger.success('✅ Diagnostic terminé!\n');

  return results;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = {
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    exportReport: !process.argv.includes('--no-export')
  };

  diagnoseDriverImages(options)
    .then(() => process.exit(0))
    .catch(error => {
      logger.error(`Erreur fatale: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    });
}

export default diagnoseDriverImages;
