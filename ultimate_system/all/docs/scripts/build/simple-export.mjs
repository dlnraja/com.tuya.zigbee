#!/usr/bin/env node

console.log('🚀 Simple Export Starting...');

import fs from 'fs-extra';
import path from 'path';

console.log('✅ Imports successful');

try {
  const projectRoot = process.cwd();
  const docsDataPath = path.join(projectRoot, 'docs', 'data');
  
  console.log('📁 Project root:', projectRoot);
  console.log('📁 Docs data path:', docsDataPath);
  
  // Create directory
  await fs.ensureDir(docsDataPath);
  console.log('✅ Directory created');
  
  // Create simple test files
  const testData = {
    drivers: { total: 0, drivers: [], generated: new Date().toISOString() },
    sources: { total: 0, sources: [], generated: new Date().toISOString() },
    kpi: { totalDrivers: 0, totalCategories: 0, assetsCompleteness: 0, generated: new Date().toISOString() },
    categories: { total: 0, categories: {}, generated: new Date().toISOString() }
  };
  
  // Write each file
  await fs.writeJson(path.join(docsDataPath, 'drivers.json'), testData.drivers, { spaces: 2 });
  console.log('✅ drivers.json written');
  
  await fs.writeJson(path.join(docsDataPath, 'sources.json'), testData.sources, { spaces: 2 });
  console.log('✅ sources.json written');
  
  await fs.writeJson(path.join(docsDataPath, 'kpi.json'), testData.kpi, { spaces: 2 });
  console.log('✅ kpi.json written');
  
  await fs.writeJson(path.join(docsDataPath, 'categories.json'), testData.categories, { spaces: 2 });
  console.log('✅ categories.json written');
  
  console.log('🎉 Simple export completed successfully!');
  
} catch (error) {
  console.error('❌ Simple export failed:', error);
  process.exit(1);
}
