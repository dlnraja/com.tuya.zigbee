#!/usr/bin/env node

/**
 * Extract all manufacturer IDs from drivers
 * Converted from EXTRACT_ALL_MANUFACTURER_IDS.ps1
 */

import path from 'path';
import { logger } from './lib/logger.js';
import { readJSON, writeJSON, findFiles, getProjectRoot } from './lib/file-utils.js';

const PROJECT_ROOT = getProjectRoot();
const DRIVERS_PATH = path.join(PROJECT_ROOT, 'drivers');

async function extractManufacturerIDs() {
  logger.title('EXTRACTION DES MANUFACTURER IDs');
  
  const allIds = {
    _TZ3000: {},
    _TZE200: {},
    _TZE204: {},
    _TZE284: {},
    other: {}
  };

  // Find all driver.compose.json files
  const driverFiles = await findFiles('**/driver.compose.json', {
    cwd: DRIVERS_PATH
  });

  logger.info(`Scanning ${driverFiles.length} driver files...`);

  for (const file of driverFiles) {
    const driverName = path.basename(path.dirname(file));
    
    try {
      const content = await readJSON(file);
      
      if (content.zigbee?.manufacturerName) {
        for (const id of content.zigbee.manufacturerName) {
          let category = 'other';
          
          if (id.startsWith('_TZ3000_')) category = '_TZ3000';
          else if (id.startsWith('_TZE200_')) category = '_TZE200';
          else if (id.startsWith('_TZE204_')) category = '_TZE204';
          else if (id.startsWith('_TZE284_')) category = '_TZE284';
          
          if (!allIds[category][id]) {
            allIds[category][id] = [];
          }
          
          if (!allIds[category][id].includes(driverName)) {
            allIds[category][id].push(driverName);
          }
        }
      }
    } catch (error) {
      logger.error(`Error reading ${path.basename(file)}: ${error.message}`);
    }
  }

  // Display statistics
  logger.section('STATISTIQUES PAR CATÉGORIE');
  
  const stats = [];
  for (const category of ['_TZ3000', '_TZE200', '_TZE204', '_TZE284']) {
    const count = Object.keys(allIds[category]).length;
    stats.push({ category, count, status: count > 0 ? 'success' : 'warning' });
    logger.log(`  ${category}: ${count} IDs`, {
      color: count > 0 ? 'green' : 'gray'
    });
  }
  console.log('');

  // Focus on _TZE204_ and _TZE284_
  logger.section('FOCUS _TZE204_ et _TZE284_');
  
  if (Object.keys(allIds._TZE204).length > 0) {
    logger.info('📋 _TZE204_ IDs trouvés:\n');
    Object.keys(allIds._TZE204).sort().forEach(id => {
      const drivers = allIds._TZE204][id].join(', ');
      logger.log(`  • ${id}`, { color: 'white' });
      logger.log(`    Drivers: ${drivers}`, { color: 'gray' });
    });
  }

  console.log('');

  if (Object.keys(allIds._TZE284).length > 0) {
    logger.info('📋 _TZE284_ IDs trouvés:\n');
    Object.keys(allIds._TZE284).sort().forEach(id => {
      const drivers = allIds._TZE284][id].join(', ');
      logger.log(`  • ${id}`, { color: 'green' });
      logger.log(`    Drivers: ${drivers}`, { color: 'gray' });
    });
  }

  // Mapping analysis
  logger.section('ANALYSE DE MAPPING _TZE204_ → _TZE284_');
  
  const tze204List = Object.keys(allIds._TZE204).sort();
  const tze284List = Object.keys(allIds._TZE284).sort();
  
  logger.log(`  Total _TZE204_: ${tze204List.length}`, { color: 'yellow' });
  logger.log(`  Total _TZE284_: ${tze284List.length}`, { color: 'green' });
  logger.log(`  Gap: ${tze204List.length - tze284List.length} variants potentiels\n`, {
    color: 'red'
  });

  // Export report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(PROJECT_ROOT, 'project-data', `ALL_MANUFACTURER_IDS_${timestamp}.json`);
  
  const report = {
    metadata: {
      generated_at: new Date().toISOString(),
      total_drivers: driverFiles.length,
      total_ids: Object.values(allIds).reduce((sum, cat) => sum + Object.keys(cat).length, 0)
    },
    statistics: {
      _TZ3000_count: Object.keys(allIds._TZ3000).length,
      _TZE200_count: Object.keys(allIds._TZE200).length,
      _TZE204_count: Object.keys(allIds._TZE204).length,
      _TZE284_count: Object.keys(allIds._TZE284).length
    },
    ids: allIds,
    tze204_list: tze204List,
    tze284_list: tze284List
  };

  await writeJSON(reportPath, report);
  logger.success(`Rapport exporté: ${reportPath}\n`);

  return report;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  extractManufacturerIDs()
    .then(() => {
      logger.success('✓ Extraction terminée avec succès!');
      process.exit(0);
    })
    .catch(error => {
      logger.error(`Erreur fatale: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    });
}

export default extractManufacturerIDs;
