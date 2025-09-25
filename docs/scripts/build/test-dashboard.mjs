#!/usr/bin/env node
/**
 * 🧪 Test Dashboard
 * Teste le dashboard avec les données générées
 */

import fs from 'fs-extra';
import path from 'path';

console.log('🧪 Testing Dashboard...');

try {
  const docsDataPath = path.join(process.cwd(), 'docs', 'data');
  
  // Check if data files exist
  const requiredFiles = ['drivers.json', 'sources.json', 'kpi.json', 'categories.json'];
  
  for (const file of requiredFiles) {
    const filePath = path.join(docsDataPath, file);
    if (await fs.pathExists(filePath)) {
      const data = await fs.readJson(filePath);
      console.log(`✅ ${file}:`, JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ ${file}: Not found`);
    }
  }
  
  // Test dashboard HTML
  const dashboardPath = path.join(process.cwd(), 'docs', 'index.html');
  if (await fs.pathExists(dashboardPath)) {
    console.log('✅ Dashboard HTML exists');
    
    // Check if dashboard can load data
    const htmlContent = await fs.readFile(dashboardPath, 'utf8');
    if (htmlContent.includes('data/')) {
      console.log('✅ Dashboard references data files');
    } else {
      console.log('⚠️ Dashboard does not reference data files');
    }
  } else {
    console.log('❌ Dashboard HTML not found');
  }
  
  console.log('🎉 Dashboard test completed!');
  
} catch (error) {
  console.error('❌ Dashboard test failed:', error);
  process.exit(1);
}
