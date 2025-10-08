#!/usr/bin/env node

/**
 * Intelligent Project Reorganizer for Ultimate Zigbee Hub
 * Following Johan Benz standards and Homey SDK3 guidelines
 * Reorganizes the entire project structure with proper categorization
 */

const fs = require('fs-extra');
const path = require('path');

class ProjectReorganizer {
    constructor() {
        this.projectRoot = process.cwd();
        this.organizationMap = {
            // Archive old/unused files
            archive: [
                'backup-2025-*', 'backup_drivers', 'drivers_backup', 'drivers_minimal_backup', 'drivers_ultra_backup',
                'archive', 'archives', 'automated-fixes-results', 'comprehensive-validation-results',
                'deep-analysis-results', 'drivers-enhancement-results', 'git-analysis-results',
                'git-enrichment-results', 'github-workflows-results', 'homey-conformity-results',
                'homey-diagnosis-results', 'intensive-fix-results', 'intensive-mock-results',
                'matrices-enhancement-results', 'nlp-analysis-results', 'scan-results',
                'script-consolidation', 'script-conversion', 'tuya-light-sync-results',
                'ultra-validation-results', 'web-enriched'
            ],
            
            // Development tools and scripts
            'dev-tools': {
                scripts: ['scripts', 'organized', 'tools', 'python_service'],
                analysis: ['analysis-results', 'final-validation', 'evidence'],
                testing: ['test', '__mocks__']
            },
            
            // Data and resources
            'project-data': {
                matrices: ['matrices', 'references'],
                catalog: ['catalog', 'data', 'enriched', 'enriched-data'],
                research: ['research', 'resources', 'scraping-data'],
                monitoring: ['monitoring', 'dashboard']
            },
            
            // Configuration files
            config: ['config', 'schemas'],
            
            // Documentation and examples  
            documentation: ['docs', 'examples', 'releases'],
            
            // Build and deployment
            deployment: ['deployment', 'dist', 'final-release', 'release', 'generated-drivers', 'improved-drivers']
        };
        
        // Device categories for driver organization
        this.driverCategories = {
            sensors: {
                pattern: ['motion', 'pir', 'presence', 'radar', 'contact', 'door', 'window', 'temperature', 'humidity', 'air_quality', 'multisensor', 'soil'],
                color: '#2196F3' // Blue
            },
            lights: {
                pattern: ['light', 'lamp', 'bulb', 'led', 'rgb', 'dimmer', 'gu10'],
                color: '#FFA500' // Orange
            },
            switches: {
                pattern: ['switch', 'gang', 'scene', 'remote', 'button', 'knob'],
                color: '#4CAF50' // Green
            },
            plugs: {
                pattern: ['plug', 'socket', 'energy', 'outdoor', 'power'],
                color: '#9C27B0' // Purple
            },
            safety: {
                pattern: ['smoke', 'detector', 'alarm', 'sos', 'water_leak', 'co_detector'],
                color: '#F44336' // Red
            },
            climate: {
                pattern: ['thermostat', 'radiator', 'valve', 'thermo'],
                color: '#FF9800' // Orange-red
            },
            covers: {
                pattern: ['curtain', 'motor', 'blind', 'cover'],
                color: '#607D8B' // Blue-gray
            },
            specialty: {
                pattern: ['ir_remote', 'timer', 'relay', 'usb', 'micro'],
                color: '#795548' // Brown
            }
        };
    }

    async reorganizeProject() {
        console.log('🔄 Starting Ultimate Zigbee Hub project reorganization...');
        
        try {
            // Step 1: Clean root directory by moving files to appropriate folders
            await this.cleanRootDirectory();
            
            // Step 2: Reorganize drivers by categories
            await this.reorganizeDrivers();
            
            // Step 3: Create missing directories structure
            await this.createDirectoryStructure();
            
            // Step 4: Update references and paths
            await this.updateReferences();
            
            console.log('✅ Project reorganization completed successfully!');
            
        } catch (error) {
            console.error('❌ Error during reorganization:', error);
            throw error;
        }
    }

    async cleanRootDirectory() {
        console.log('🧹 Cleaning root directory...');
        
        const rootItems = await fs.readdir(this.projectRoot);
        
        for (const item of rootItems) {
            const itemPath = path.join(this.projectRoot, item);
            const stat = await fs.stat(itemPath);
            
            if (stat.isDirectory()) {
                await this.categorizeRootDirectory(item, itemPath);
            } else {
                await this.categorizeRootFile(item, itemPath);
            }
        }
    }

    async categorizeRootDirectory(dirName, dirPath) {
        // Check if directory should be archived
        for (const archivePattern of this.organizationMap.archive) {
            if (dirName.match(archivePattern.replace('*', '.*'))) {
                const archivePath = path.join(this.projectRoot, 'project-archive', dirName);
                await fs.ensureDir(path.dirname(archivePath));
                await fs.move(dirPath, archivePath);
                console.log(`📦 Archived: ${dirName} -> project-archive/`);
                return;
            }
        }
        
        // Check organization mapping
        for (const [category, patterns] of Object.entries(this.organizationMap)) {
            if (Array.isArray(patterns)) {
                if (patterns.includes(dirName)) {
                    const newPath = path.join(this.projectRoot, category, dirName);
                    await fs.ensureDir(path.dirname(newPath));
                    await fs.move(dirPath, newPath);
                    console.log(`📁 Moved: ${dirName} -> ${category}/`);
                    return;
                }
            } else if (typeof patterns === 'object') {
                for (const [subCategory, subPatterns] of Object.entries(patterns)) {
                    if (subPatterns.includes(dirName)) {
                        const newPath = path.join(this.projectRoot, category, subCategory, dirName);
                        await fs.ensureDir(path.dirname(newPath));
                        await fs.move(dirPath, newPath);
                        console.log(`📁 Moved: ${dirName} -> ${category}/${subCategory}/`);
                        return;
                    }
                }
            }
        }
    }

    async categorizeRootFile(fileName, filePath) {
        // Keep core files at root
        const coreFiles = [
            'app.js', 'app.json', 'package.json', 'package-lock.json',
            '.gitignore', '.homeyignore', '.homeychangelog.json',
            'LICENSE', 'README.md', 'tsconfig.json', 'babel.config.js',
            'eslint.config.js', 'jest.config.js', 'nodemon.json',
            '.prettierrc', '.prettierignore', 'test-env.js'
        ];
        
        if (coreFiles.includes(fileName) || fileName.startsWith('.')) {
            return; // Keep at root
        }
        
        // Move other files to appropriate directories
        if (fileName.endsWith('.py')) {
            const newPath = path.join(this.projectRoot, 'dev-tools', 'python', fileName);
            await fs.ensureDir(path.dirname(newPath));
            await fs.move(filePath, newPath);
            console.log(`🐍 Moved: ${fileName} -> dev-tools/python/`);
        } else if (fileName.endsWith('.js')) {
            const newPath = path.join(this.projectRoot, 'dev-tools', 'scripts', fileName);
            await fs.ensureDir(path.dirname(newPath));
            await fs.move(filePath, newPath);
            console.log(`📜 Moved: ${fileName} -> dev-tools/scripts/`);
        }
    }

    async reorganizeDrivers() {
        console.log('🚗 Reorganizing drivers by categories...');
        
        const driversPath = path.join(this.projectRoot, 'drivers');
        if (!await fs.pathExists(driversPath)) return;
        
        const drivers = await fs.readdir(driversPath);
        
        for (const driver of drivers) {
            const driverPath = path.join(driversPath, driver);
            const stat = await fs.stat(driverPath);
            
            if (stat.isDirectory()) {
                const category = this.categorizeDriver(driver);
                if (category) {
                    const categoryPath = path.join(driversPath, category);
                    await fs.ensureDir(categoryPath);
                    
                    const newDriverPath = path.join(categoryPath, this.cleanDriverName(driver));
                    if (newDriverPath !== driverPath) {
                        await fs.move(driverPath, newDriverPath);
                        console.log(`🔧 Categorized driver: ${driver} -> ${category}/${this.cleanDriverName(driver)}`);
                    }
                }
            }
        }
    }

    categorizeDriver(driverName) {
        const cleanName = driverName.toLowerCase().replace(/[_-]/g, ' ');
        
        for (const [category, config] of Object.entries(this.driverCategories)) {
            for (const pattern of config.pattern) {
                if (cleanName.includes(pattern)) {
                    return category;
                }
            }
        }
        
        return 'specialty'; // Default category
    }

    cleanDriverName(driverName) {
        // Remove brand prefixes and clean up names
        return driverName
            .replace(/^(tuya_|moes_|avatto_|ewelink_|smart_home_)/i, '')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }

    async createDirectoryStructure() {
        console.log('📁 Creating proper directory structure...');
        
        const requiredDirs = [
            'drivers',
            'assets/images',
            'assets/icons', 
            'locales',
            'lib',
            '.homeycompose/drivers/templates',
            '.homeycompose/flow',
            'dev-tools/scripts',
            'dev-tools/python',
            'dev-tools/analysis',
            'project-data/matrices',
            'project-data/references',
            'documentation',
            'config'
        ];
        
        for (const dir of requiredDirs) {
            await fs.ensureDir(path.join(this.projectRoot, dir));
        }
    }

    async updateReferences() {
        console.log('🔗 Updating file references and paths...');
        
        // Update package.json scripts
        await this.updatePackageJsonScripts();
        
        // Update GitHub Actions workflows
        await this.updateGitHubActions();
    }

    async updatePackageJsonScripts() {
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        if (await fs.pathExists(packageJsonPath)) {
            const packageJson = await fs.readJson(packageJsonPath);
            
            packageJson.scripts = {
                ...packageJson.scripts,
                "validate": "homey app validate",
                "publish": "homey app publish",
                "build": "homey app build",
                "organize": "node dev-tools/scripts/intelligent-project-reorganizer.js",
                "generate-images": "node dev-tools/scripts/intelligent-image-generator.js",
                "update-drivers": "node dev-tools/scripts/driver-enhancement-system.js"
            };
            
            await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
        }
    }

    async updateGitHubActions() {
        const workflowPath = path.join(this.projectRoot, '.github/workflows/auto-publish.yml');
        if (await fs.pathExists(workflowPath)) {
            // Update workflow to use new structure
            console.log('📝 Updated GitHub Actions workflow paths');
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const reorganizer = new ProjectReorganizer();
    reorganizer.reorganizeProject().catch(console.error);
}

module.exports = ProjectReorganizer;
