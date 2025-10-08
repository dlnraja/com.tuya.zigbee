#!/usr/bin/env node
/**
 * 📊 Export Dashboard Data - FINAL VERSION
 * Génère les données JSON pour le dashboard GitHub Pages
 *
 * @author dlnraja
 * @version 3.4.0
 * @date 2025-01-13
 */
import fs from 'fs-extra';
import path from 'path';

class DashboardDataExporter {
  constructor() {
    this.projectRoot = process.cwd();
    this.catalogPath = path.join(this.projectRoot, 'catalog');
    this.driversPath = path.join(this.projectRoot, 'drivers');
    this.docsDataPath = path.join(this.projectRoot, 'docs', 'data');
    this.sourcesPath = path.join(this.projectRoot, 'sources.json');

    this.stats = {
      totalDrivers: 0,
      totalVendors: 0,
      totalCategories: 0,
      assetsCompleteness: 0,
      integrationBySource: {},
      lastUpdated: new Date().toISOString()
    };
  }

  async ensureDirectoryExists(dirPath) {
    try {
      await fs.ensureDir(dirPath);
      console.log(`📁 Directory ensured: ${dirPath}`);
    } catch (error) {
      console.error(`❌ Error creating directory ${dirPath}:`, error);
      throw error;
    }
  }

  async scanCatalog() {
    console.log('🔍 Scanning catalog structure...');
    
    try {
      if (!(await fs.pathExists(this.catalogPath))) {
        console.log('⚠️ Catalog directory does not exist, skipping...');
        return;
      }

      const categories = await fs.readdir(this.catalogPath);
      this.stats.totalCategories = categories.length;
      console.log(`📂 Found ${categories.length} categories`);
      
      for (const category of categories) {
        const categoryPath = path.join(this.catalogPath, category);
        const categoryStats = await fs.stat(categoryPath);
        
        if (categoryStats.isDirectory()) {
          console.log(`📂 Processing category: ${category}`);
          
          const vendors = await fs.readdir(categoryPath);
          for (const vendor of vendors) {
            const vendorPath = path.join(categoryPath, vendor);
            const vendorStats = await fs.stat(vendorPath);
            
            if (vendorStats.isDirectory()) {
              console.log(`🏭 Processing vendor: ${vendor} in ${category}`);
              
              const products = await fs.readdir(vendorPath);
              for (const product of products) {
                const productPath = path.join(vendorPath, product);
                const productStats = await fs.stat(productPath);
                
                if (productStats.isDirectory()) {
                  console.log(`📦 Processing product: ${product} (${vendor}/${category})`);
                  this.stats.totalDrivers++;
                  
                  // Check for sources.json
                  const sourcesFile = path.join(productPath, 'sources.json');
                  if (await fs.pathExists(sourcesFile)) {
                    try {
                      const sourcesData = await fs.readJson(sourcesFile);
                      this.updateIntegrationStats(sourcesData);
                    } catch (error) {
                      console.log(`⚠️ Error reading sources.json for ${product}: ${error.message}`);
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      console.log(`✅ Catalog scan complete: ${this.stats.totalDrivers} products found`);
    } catch (error) {
      console.error('❌ Error scanning catalog:', error);
    }
  }

  async scanDrivers() {
    console.log('🔍 Scanning drivers directory...');
    
    try {
      if (!(await fs.pathExists(this.driversPath))) {
        console.log('⚠️ Drivers directory does not exist, skipping...');
        return;
      }

      const driverDirs = await fs.readdir(this.driversPath);
      let validDrivers = 0;
      
      for (const driverDir of driverDirs) {
        const driverPath = path.join(this.driversPath, driverDir);
        const driverStats = await fs.stat(driverPath);
        
        if (driverStats.isDirectory() && !driverDir.startsWith('_')) {
          console.log(`🚗 Processing driver: ${driverDir}`);
          
          // Check required files
          const requiredFiles = [
            'driver.compose.json',
            'driver.js',
            'device.js'
          ];
          
          let hasAllFiles = true;
          for (const file of requiredFiles) {
            if (!(await fs.pathExists(path.join(driverPath, file)))) {
              hasAllFiles = false;
              break;
            }
          }
          
          if (hasAllFiles) {
            validDrivers++;
            console.log(`✅ Driver ${driverDir} is valid`);
          } else {
            console.log(`⚠️ Driver ${driverDir} missing required files`);
          }
        }
      }
      
      console.log(`✅ Drivers scan complete: ${validDrivers} valid drivers found`);
    } catch (error) {
      console.error('❌ Error scanning drivers:', error);
    }
  }

  async scanSources() {
    console.log('🔍 Scanning global sources...');
    
    try {
      if (await fs.pathExists(this.sourcesPath)) {
        const sourcesData = await fs.readJson(this.sourcesPath);
        console.log('📚 Global sources found:', sourcesData);
        
        // Update integration stats
        if (sourcesData.sources) {
          for (const source of sourcesData.sources) {
            if (source.name && source.integration) {
              this.stats.integrationBySource[source.name] = {
                percentage: source.integration.percentage || 0,
                lastSync: source.integration.lastSync || 'Unknown',
                status: source.integration.status || 'Unknown'
              };
            }
          }
        }
      } else {
        console.log('⚠️ No global sources.json found, using defaults');
        this.stats.integrationBySource = {
          'Zigbee2MQTT': { percentage: 0, lastSync: 'Never', status: 'Not Started' },
          'Blakadder': { percentage: 0, lastSync: 'Never', status: 'Not Started' },
          'Homey Forum': { percentage: 0, lastSync: 'Never', status: 'Not Started' },
          'JohanBenz Repos': { percentage: 0, lastSync: 'Never', status: 'Not Started' }
        };
      }
    } catch (error) {
      console.error('❌ Error scanning sources:', error);
    }
  }

  async calculateAssetsCompleteness() {
    console.log('🔍 Calculating assets completeness...');
    
    try {
      if (!(await fs.pathExists(this.driversPath))) {
        console.log('⚠️ Drivers directory does not exist, skipping assets calculation...');
        this.stats.assetsCompleteness = 0;
        return;
      }

      let totalAssets = 0;
      let completeAssets = 0;
      
      const driverDirs = await fs.readdir(this.driversPath);
      
      for (const driverDir of driverDirs) {
        const driverPath = path.join(this.driversPath, driverDir);
        const driverStats = await fs.stat(driverPath);
        
        if (driverStats.isDirectory() && !driverDir.startsWith('_')) {
          const assetsPath = path.join(driverPath, 'assets');
          
          if (await fs.pathExists(assetsPath)) {
            totalAssets++;
            
            const requiredAssets = [
              'icon.svg',
              'images/small.png',
              'images/large.png',
              'images/xlarge.png'
            ];
            
            let hasAllAssets = true;
            for (const asset of requiredAssets) {
              if (!(await fs.pathExists(path.join(assetsPath, asset)))) {
                hasAllAssets = false;
                break;
              }
            }
            
            if (hasAllAssets) {
              completeAssets++;
            }
          }
        }
      }
      
      this.stats.assetsCompleteness = totalAssets > 0 ? Math.round((completeAssets / totalAssets) * 100) : 0;
      console.log(`✅ Assets completeness: ${this.stats.assetsCompleteness}% (${completeAssets}/${totalAssets})`);
    } catch (error) {
      console.error('❌ Error calculating assets completeness:', error);
      this.stats.assetsCompleteness = 0;
    }
  }

  async generateDriversJson() {
    console.log('📊 Generating drivers.json...');
    
    try {
      const drivers = [];
      
      if (await fs.pathExists(this.driversPath)) {
        const driverDirs = await fs.readdir(this.driversPath);
        
        for (const driverDir of driverDirs) {
          const driverPath = path.join(this.driversPath, driverDir);
          const driverStats = await fs.stat(driverPath);
          
          if (driverStats.isDirectory() && !driverDir.startsWith('_')) {
            try {
              const composePath = path.join(driverPath, 'driver.compose.json');
              if (await fs.pathExists(composePath)) {
                const composeData = await fs.readJson(composePath);
                
                const driver = {
                  slug: driverDir,
                  name: composeData.name || driverDir,
                  category: composeData.category || 'Unknown',
                  vendor: composeData.vendor || 'Unknown',
                  capabilities: composeData.capabilities || [],
                  hasAssets: await fs.pathExists(path.join(driverPath, 'assets')),
                  lastModified: (await fs.stat(driverPath)).mtime.toISOString()
                };
                
                drivers.push(driver);
                console.log(`📝 Added driver: ${driver.name} (${driver.category}/${driver.vendor})`);
              }
            } catch (error) {
              console.log(`⚠️ Error processing driver ${driverDir}: ${error.message}`);
            }
          }
        }
      }
      
      const driversData = {
        total: drivers.length,
        drivers: drivers,
        generated: new Date().toISOString()
      };
      
      await fs.writeJson(path.join(this.docsDataPath, 'drivers.json'), driversData, { spaces: 2 });
      console.log(`✅ drivers.json generated with ${drivers.length} drivers`);
      
      return driversData;
    } catch (error) {
      console.error('❌ Error generating drivers.json:', error);
      return { total: 0, drivers: [], generated: new Date().toISOString() };
    }
  }

  async generateSourcesJson() {
    console.log('📊 Generating sources.json...');
    
    try {
      const sourcesData = {
        total: Object.keys(this.stats.integrationBySource).length,
        sources: Object.entries(this.stats.integrationBySource).map(([name, data]) => ({
          name,
          ...data
        })),
        generated: new Date().toISOString()
      };
      
      await fs.writeJson(path.join(this.docsDataPath, 'sources.json'), sourcesData, { spaces: 2 });
      console.log(`✅ sources.json generated with ${sourcesData.total} sources`);
      
      return sourcesData;
    } catch (error) {
      console.error('❌ Error generating sources.json:', error);
      return { total: 0, sources: [], generated: new Date().toISOString() };
    }
  }

  async generateKpiJson() {
    console.log('📊 Generating kpi.json...');
    
    try {
      const kpiData = {
        totalDrivers: this.stats.totalDrivers,
        totalVendors: this.stats.totalVendors,
        totalCategories: this.stats.totalCategories,
        assetsCompleteness: this.stats.assetsCompleteness,
        integrationBySource: this.stats.integrationBySource,
        lastUpdated: this.stats.lastUpdated,
        generated: new Date().toISOString()
      };
      
      await fs.writeJson(path.join(this.docsDataPath, 'kpi.json'), kpiData, { spaces: 2 });
      console.log(`✅ kpi.json generated with KPI data`);
      
      return kpiData;
    } catch (error) {
      console.error('❌ Error generating kpi.json:', error);
      return { totalDrivers: 0, totalVendors: 0, totalCategories: 0, assetsCompleteness: 0, integrationBySource: {}, lastUpdated: new Date().toISOString(), generated: new Date().toISOString() };
    }
  }

  async generateCategoriesJson() {
    console.log('📊 Generating categories.json...');
    
    try {
      const categories = {};
      
      if (await fs.pathExists(this.catalogPath)) {
        const categoryDirs = await fs.readdir(this.catalogPath);
        
        for (const category of categoryDirs) {
          const categoryPath = path.join(this.catalogPath, category);
          const categoryStats = await fs.stat(categoryPath);
          
          if (categoryStats.isDirectory()) {
            categories[category] = {
              name: category,
              count: 0,
              vendors: {}
            };
            
            const vendorDirs = await fs.readdir(categoryPath);
            for (const vendor of vendorDirs) {
              const vendorPath = path.join(categoryPath, vendor);
              const vendorStats = await fs.stat(vendorPath);
              
              if (vendorStats.isDirectory()) {
                const productDirs = await fs.readdir(vendorPath);
                let validProducts = 0;
                
                for (const product of productDirs) {
                  const productPath = path.join(vendorPath, product);
                  const productStats = await fs.stat(productPath);
                  if (productStats.isDirectory()) {
                    validProducts++;
                  }
                }
                
                categories[category].vendors[vendor] = validProducts;
                categories[category].count += validProducts;
              }
            }
          }
        }
      }
      
      const categoriesData = {
        total: Object.keys(categories).length,
        categories: categories,
        generated: new Date().toISOString()
      };
      
      await fs.writeJson(path.join(this.docsDataPath, 'categories.json'), categoriesData, { spaces: 2 });
      console.log(`✅ categories.json generated with ${categoriesData.total} categories`);
      
      return categoriesData;
    } catch (error) {
      console.error('❌ Error generating categories.json:', error);
      return { total: 0, categories: {}, generated: new Date().toISOString() };
    }
  }

  updateIntegrationStats(sourcesData) {
    if (sourcesData.sources) {
      for (const source of sourcesData.sources) {
        if (source.name && source.integration) {
          if (!this.stats.integrationBySource[source.name]) {
            this.stats.integrationBySource[source.name] = {
              percentage: 0,
              lastSync: 'Never',
              status: 'Not Started'
            };
          }
          
          // Update with latest data
          if (source.integration.percentage > this.stats.integrationBySource[source.name].percentage) {
            this.stats.integrationBySource[source.name].percentage = source.integration.percentage;
          }
          
          if (source.integration.lastSync && source.integration.lastSync !== 'Never') {
            this.stats.integrationBySource[source.name].lastSync = source.integration.lastSync;
          }
          
          if (source.integration.status) {
            this.stats.integrationBySource[source.name].status = source.integration.status;
          }
        }
      }
    }
  }

  async run() {
    console.log('🚀 Starting Dashboard Data Export...');
    console.log(`📁 Project root: ${this.projectRoot}`);
    console.log(`📁 Catalog path: ${this.catalogPath}`);
    console.log(`📁 Drivers path: ${this.driversPath}`);
    console.log(`📁 Docs data path: ${this.docsDataPath}`);
    
    try {
      // Ensure docs/data directory exists
      await this.ensureDirectoryExists(this.docsDataPath);
      
      // Scan all data sources
      await this.scanCatalog();
      await this.scanDrivers();
      await this.scanSources();
      await this.calculateAssetsCompleteness();
      
      // Generate JSON files
      const driversData = await this.generateDriversJson();
      const sourcesData = await this.generateSourcesJson();
      const kpiData = await this.generateKpiJson();
      const categoriesData = await this.generateCategoriesJson();
      
      // Generate summary report
      const summary = {
        export: {
          timestamp: new Date().toISOString(),
          totalFiles: 4,
          files: [
            'drivers.json',
            'sources.json',
            'kpi.json',
            'categories.json'
          ]
        },
        stats: this.stats,
        generated: new Date().toISOString()
      };
      
      await fs.writeJson(path.join(this.docsDataPath, 'export-summary.json'), summary, { spaces: 2 });
      
      console.log('✅ Dashboard Data Export Complete!');
      console.log(`📊 Generated ${summary.export.totalFiles} files in ${this.docsDataPath}`);
      console.log(`📈 Stats: ${this.stats.totalDrivers} drivers, ${this.stats.totalCategories} categories, ${this.stats.assetsCompleteness}% assets complete`);
      
      return summary;
      
    } catch (error) {
      console.error('❌ Dashboard Data Export failed:', error);
      throw error;
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const exporter = new DashboardDataExporter();
  exporter.run().catch(console.error);
}

export default DashboardDataExporter;
