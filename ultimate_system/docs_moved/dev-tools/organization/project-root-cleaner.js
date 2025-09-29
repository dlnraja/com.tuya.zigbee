#!/usr/bin/env node

/**
 * Project Root Cleaner - Moves excessive files from root to organized folders
 * Keeps only essential files at root level for clean project structure
 */

const fs = require('fs-extra');
const path = require('path');

class ProjectRootCleaner {
    constructor() {
        this.projectRoot = process.cwd();
        this.movedFiles = [];
    }

    async cleanRootDirectory() {
        console.log('🧹 Cleaning project root directory...');
        
        await this.moveConfigFiles();
        await this.moveScriptFiles();
        await this.moveDocumentationFiles();
        await this.moveArchiveFiles();
        await this.moveTestFiles();
        await this.removeEmptyDirectories();
        
        console.log(`✅ Root cleaning completed - moved ${this.movedFiles.length} items`);
        return this.movedFiles;
    }

    async moveConfigFiles() {
        const configFiles = [
            'babel.config.js',
            'eslint.config.js', 
            'jest.config.js',
            'nodemon.json',
            'test-env.js',
            'tsconfig.json',
            'enhanced_locales_en.json'
        ];

        const configDir = path.join(this.projectRoot, 'config');
        await fs.ensureDir(configDir);

        for (const file of configFiles) {
            await this.moveIfExists(file, path.join('config', file));
        }
    }

    async moveScriptFiles() {
        const scriptFiles = [
            'final-push.js'
        ];

        const scriptsDir = path.join(this.projectRoot, 'dev-tools', 'scripts');
        await fs.ensureDir(scriptsDir);

        for (const file of scriptFiles) {
            await this.moveIfExists(file, path.join('dev-tools', 'scripts', file));
        }
    }

    async moveDocumentationFiles() {
        // Move loose folders to organized structure
        const docFolders = [
            'docs',
            'examples',
            'schemas'
        ];

        const docsDir = path.join(this.projectRoot, 'documentation');
        await fs.ensureDir(docsDir);

        for (const folder of docFolders) {
            await this.moveIfExists(folder, path.join('documentation', folder));
        }
    }

    async moveArchiveFiles() {
        const archiveFolders = [
            'backup-2025-09-11T18-15-11-470Z',
            'tuya-light',
            'tuya_refactor_patch',
            'homey-ultimate-zigbee-hub',
            'script_env',
            'scripts_tools'
        ];

        const archiveDir = path.join(this.projectRoot, 'project-archive');
        await fs.ensureDir(archiveDir);

        for (const folder of archiveFolders) {
            await this.moveIfExists(folder, path.join('project-archive', folder));
        }
    }

    async moveTestFiles() {
        const testFolders = [
            'test',
            '__mocks__',
            '__pycache__'
        ];

        const testDir = path.join(this.projectRoot, 'test-suite');
        await fs.ensureDir(testDir);

        for (const folder of testFolders) {
            await this.moveIfExists(folder, path.join('test-suite', folder));
        }
    }

    async moveIfExists(source, target) {
        const sourcePath = path.join(this.projectRoot, source);
        const targetPath = path.join(this.projectRoot, target);

        if (await fs.pathExists(sourcePath)) {
            try {
                await fs.move(sourcePath, targetPath, { overwrite: true });
                this.movedFiles.push({ from: source, to: target });
                console.log(`   📦 Moved: ${source} → ${target}`);
            } catch (error) {
                console.log(`   ⚠️  Failed to move ${source}: ${error.message}`);
            }
        }
    }

    async removeEmptyDirectories() {
        const emptyDirs = [
            'analysis-results',
            'dashboard', 
            'lib',
            'locales',
            'logs',
            'monitoring',
            'organized',
            'public',
            'python_service',
            'ref',
            'releases',
            'reports',
            'settings',
            'src',
            'sync',
            'tools',
            'types'
        ];

        for (const dir of emptyDirs) {
            const dirPath = path.join(this.projectRoot, dir);
            if (await fs.pathExists(dirPath)) {
                const items = await fs.readdir(dirPath);
                if (items.length === 0) {
                    await fs.remove(dirPath);
                    console.log(`   🗑️  Removed empty directory: ${dir}`);
                } else {
                    // Move non-empty directories to appropriate locations
                    const targetPath = path.join(this.projectRoot, 'project-data', dir);
                    await fs.move(dirPath, targetPath, { overwrite: true });
                    console.log(`   📦 Moved to project-data: ${dir}`);
                }
            }
        }
    }

    async generateCleanupReport() {
        const report = {
            timestamp: new Date().toISOString(),
            total_moved: this.movedFiles.length,
            moved_files: this.movedFiles,
            remaining_root_structure: await this.getRootStructure()
        };

        await fs.ensureDir(path.join(this.projectRoot, 'reports'));
        await fs.writeJson(
            path.join(this.projectRoot, 'reports', 'root-cleanup-report.json'),
            report,
            { spaces: 2 }
        );

        console.log('\n📊 Clean Root Structure:');
        report.remaining_root_structure.forEach(item => {
            console.log(`   ${item}`);
        });
    }

    async getRootStructure() {
        const items = await fs.readdir(this.projectRoot);
        const structure = [];

        for (const item of items) {
            const itemPath = path.join(this.projectRoot, item);
            const stat = await fs.stat(itemPath);
            
            if (stat.isDirectory()) {
                structure.push(`📁 ${item}/`);
            } else {
                structure.push(`📄 ${item}`);
            }
        }

        return structure.sort();
    }
}

// Execute if run directly
if (require.main === module) {
    const cleaner = new ProjectRootCleaner();
    cleaner.cleanRootDirectory()
        .then(() => cleaner.generateCleanupReport())
        .catch(console.error);
}

module.exports = ProjectRootCleaner;
