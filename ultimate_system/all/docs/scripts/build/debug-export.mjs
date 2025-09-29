#!/usr/bin/env node

console.log('🚀 Debug Export Starting...');

import fs from 'fs-extra';
import path from 'path';

try {
  
  console.log('✅ Imports successful');
  
  const projectRoot = process.cwd();
  console.log('📁 Project root:', projectRoot);
  
  const catalogPath = path.join(projectRoot, 'catalog');
  const driversPath = path.join(projectRoot, 'drivers');
  const docsDataPath = path.join(projectRoot, 'docs', 'data');
  
  console.log('📁 Catalog path:', catalogPath);
  console.log('📁 Drivers path:', driversPath);
  console.log('📁 Docs data path:', docsDataPath);
  
  // Check if directories exist
  console.log('🔍 Checking directory existence...');
  console.log('Catalog exists:', await fs.pathExists(catalogPath));
  console.log('Drivers exists:', await fs.pathExists(driversPath));
  console.log('Docs data exists:', await fs.pathExists(docsDataPath));
  
  // Create docs/data directory
  await fs.ensureDir(docsDataPath);
  console.log('✅ Docs data directory ensured');
  
  // Scan catalog
  if (await fs.pathExists(catalogPath)) {
    const categories = await fs.readdir(catalogPath);
    console.log('📂 Categories found:', categories);
    
    let totalProducts = 0;
    for (const category of categories) {
      const categoryPath = path.join(catalogPath, category);
      const categoryStats = await fs.stat(categoryPath);
      
      if (categoryStats.isDirectory()) {
        const vendors = await fs.readdir(categoryPath);
        console.log(`📂 Category ${category} has vendors:`, vendors);
        
        for (const vendor of vendors) {
          const vendorPath = path.join(categoryPath, vendor);
          const vendorStats = await fs.stat(vendorPath);
          
          if (vendorStats.isDirectory()) {
            const products = await fs.readdir(vendorPath);
            totalProducts += products.length;
            console.log(`🏭 Vendor ${vendor} in ${category} has products:`, products);
          }
        }
      }
    }
    console.log(`📊 Total products in catalog: ${totalProducts}`);
  }
  
  // Scan drivers
  if (await fs.pathExists(driversPath)) {
    const driverDirs = await fs.readdir(driversPath);
    console.log('🚗 Driver directories found:', driverDirs);
    
    let validDrivers = 0;
    for (const driverDir of driverDirs) {
      if (!driverDir.startsWith('_')) {
        const driverPath = path.join(driversPath, driverDir);
        const driverStats = await fs.stat(driverPath);
        
        if (driverStats.isDirectory()) {
          const files = await fs.readdir(driverPath);
          console.log(`📁 Driver ${driverDir} files:`, files);
          
          if (files.includes('driver.compose.json') && files.includes('driver.js') && files.includes('device.js')) {
            validDrivers++;
          }
        }
      }
    }
    console.log(`✅ Valid drivers found: ${validDrivers}`);
  }
  
  // Generate sample data
  const sampleData = {
    drivers: { total: 4, drivers: [], generated: new Date().toISOString() },
    sources: { total: 4, sources: [], generated: new Date().toISOString() },
    kpi: { totalDrivers: 4, totalCategories: 2, assetsCompleteness: 75, generated: new Date().toISOString() },
    categories: { total: 2, categories: {}, generated: new Date().toISOString() }
  };
  
  // Write files
  await fs.writeJson(path.join(docsDataPath, 'drivers.json'), sampleData.drivers, { spaces: 2 });
  console.log('✅ drivers.json written');
  
  await fs.writeJson(path.join(docsDataPath, 'sources.json'), sampleData.sources, { spaces: 2 });
  console.log('✅ sources.json written');
  
  await fs.writeJson(path.join(docsDataPath, 'kpi.json'), sampleData.kpi, { spaces: 2 });
  console.log('✅ kpi.json written');
  
  await fs.writeJson(path.join(docsDataPath, 'categories.json'), sampleData.categories, { spaces: 2 });
  console.log('✅ categories.json written');
  
  console.log('🎉 Debug export completed successfully!');
  
} catch (error) {
  console.error('❌ Debug export failed:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
