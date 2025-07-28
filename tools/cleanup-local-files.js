#!/usr/bin/env node

/**
 * Local Files Cleanup Tool
 * Moves local/machine-specific files to local-processing directory
 * 
 * @author dlnraja
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class LocalFilesCleanup {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.localProcessingPath = path.join(this.projectRoot, 'local-processing');
        this.movedFiles = [];
        this.errors = [];
    }

    /**
     * Main cleanup process
     */
    async cleanup() {
        console.log('🧹 Starting local files cleanup...');
        
        try {
            // Ensure local-processing directory exists
            this.ensureLocalProcessingDir();
            
            // Define patterns to move
            const patterns = this.getCleanupPatterns();
            
            // Process each pattern
            for (const pattern of patterns) {
                await this.processPattern(pattern);
            }
            
            // Generate cleanup report
            this.generateReport();
            
            console.log('✅ Local files cleanup completed');
            
        } catch (error) {
            console.error('❌ Cleanup failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Ensure local-processing directory structure exists
     */
    ensureLocalProcessingDir() {
        const subdirs = ['scripts', 'logs', 'temp', 'config', 'backup'];
        
        for (const subdir of subdirs) {
            const dirPath = path.join(this.localProcessingPath, subdir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        }
    }

    /**
     * Get cleanup patterns
     */
    getCleanupPatterns() {
        return [
            {
                name: 'PowerShell Scripts',
                pattern: '*.ps1',
                destination: 'scripts',
                description: 'PowerShell automation scripts'
            },
            {
                name: 'Shell Scripts',
                pattern: '*.sh',
                destination: 'scripts',
                description: 'Shell automation scripts'
            },
            {
                name: 'Log Files',
                pattern: '*.log',
                destination: 'logs',
                description: 'Log files and debug output'
            },
            {
                name: 'Temporary Files',
                pattern: '*.tmp',
                destination: 'temp',
                description: 'Temporary files'
            },
            {
                name: 'Backup Files',
                pattern: '*.bak',
                destination: 'backup',
                description: 'Backup files'
            },
            {
                name: 'Backup Files (backup)',
                pattern: '*.backup',
                destination: 'backup',
                description: 'Backup files with .backup extension'
            },
            {
                name: 'Cursor Files',
                pattern: '*.cursor',
                destination: 'config',
                description: 'Cursor IDE configuration files'
            },
            {
                name: 'Text Files',
                pattern: '*.txt',
                destination: 'logs',
                description: 'Text files and reports',
                exclude: ['README.txt', 'CHANGELOG.txt', 'LICENSE.txt']
            },
            {
                name: 'Markdown Files',
                pattern: '*.md',
                destination: 'logs',
                description: 'Markdown files and documentation',
                exclude: ['README.md', 'CHANGELOG.md', 'LICENSE.md', 'PROJECT_RULES.md', 'tuya-light-README.md']
            },
            {
                name: 'JavaScript Files',
                pattern: '*.js',
                destination: 'scripts',
                description: 'JavaScript files',
                exclude: ['app.js', 'index.js', 'main.js']
            }
        ];
    }

    /**
     * Process a cleanup pattern
     */
    async processPattern(pattern) {
        console.log(`\n🔍 Processing ${pattern.name}...`);
        
        try {
            const files = this.findFiles(pattern.pattern, pattern.exclude);
            
            if (files.length === 0) {
                console.log(`  ⚪ No ${pattern.name} found`);
                return;
            }
            
            console.log(`  📁 Found ${files.length} ${pattern.name} files`);
            
            for (const file of files) {
                await this.moveFile(file, pattern.destination, pattern.description);
            }
            
        } catch (error) {
            this.errors.push({
                pattern: pattern.name,
                error: error.message
            });
            console.error(`  ❌ Error processing ${pattern.name}:`, error.message);
        }
    }

    /**
     * Find files matching pattern
     */
    findFiles(pattern, exclude = []) {
        const files = [];
        
        const scanDirectory = (dir) => {
            if (!fs.existsSync(dir)) return;
            
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const relativePath = path.relative(this.projectRoot, fullPath);
                
                // Skip .git and local-processing directories
                if (relativePath.startsWith('.git') || relativePath.startsWith('local-processing')) {
                    continue;
                }
                
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDirectory(fullPath);
                } else if (stat.isFile()) {
                    // Check if file matches pattern
                    if (this.matchesPattern(item, pattern)) {
                        // Check if file should be excluded
                        if (!exclude.includes(item)) {
                            files.push(fullPath);
                        }
                    }
                }
            }
        };
        
        scanDirectory(this.projectRoot);
        return files;
    }

    /**
     * Check if filename matches pattern
     */
    matchesPattern(filename, pattern) {
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(filename);
    }

    /**
     * Move file to local-processing directory
     */
    async moveFile(filePath, destination, description) {
        try {
            const fileName = path.basename(filePath);
            const relativePath = path.relative(this.projectRoot, filePath);
            const destinationDir = path.join(this.localProcessingPath, destination);
            const destinationPath = path.join(destinationDir, fileName);
            
            // Ensure destination directory exists
            if (!fs.existsSync(destinationDir)) {
                fs.mkdirSync(destinationDir, { recursive: true });
            }
            
            // Check if destination file already exists
            if (fs.existsSync(destinationPath)) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const nameWithoutExt = path.parse(fileName).name;
                const ext = path.parse(fileName).ext;
                const newFileName = `${nameWithoutExt}_${timestamp}${ext}`;
                const newDestinationPath = path.join(destinationDir, newFileName);
                
                fs.renameSync(filePath, newDestinationPath);
                
                this.movedFiles.push({
                    original: relativePath,
                    destination: path.relative(this.projectRoot, newDestinationPath),
                    description: description,
                    renamed: true
                });
                
                console.log(`  ✅ Moved ${fileName} (renamed to ${newFileName})`);
            } else {
                fs.renameSync(filePath, destinationPath);
                
                this.movedFiles.push({
                    original: relativePath,
                    destination: path.relative(this.projectRoot, destinationPath),
                    description: description,
                    renamed: false
                });
                
                console.log(`  ✅ Moved ${fileName}`);
            }
            
        } catch (error) {
            this.errors.push({
                file: filePath,
                error: error.message
            });
            console.error(`  ❌ Error moving ${path.basename(filePath)}:`, error.message);
        }
    }

    /**
     * Generate cleanup report
     */
    generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = path.join(this.localProcessingPath, 'logs', `cleanup-report-${timestamp}.md`);
        
        const report = this.formatReport();
        fs.writeFileSync(reportFile, report);
        
        console.log(`\n📊 Report generated: ${reportFile}`);
    }

    /**
     * Format cleanup report
     */
    formatReport() {
        const timestamp = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
        
        let report = `# Local Files Cleanup Report

**Generated:** ${timestamp}  
**Total Files Moved:** ${this.movedFiles.length}  
**Errors:** ${this.errors.length}

## 📁 Files Moved

${this.movedFiles.map(file => 
    `### ${path.basename(file.original)}
- **Original:** ${file.original}
- **Destination:** ${file.destination}
- **Description:** ${file.description}
- **Renamed:** ${file.renamed ? 'Yes' : 'No'}`
).join('\n\n')}

## ❌ Errors

${this.errors.map(error => 
    `### ${error.file || error.pattern}
- **Error:** ${error.error}`
).join('\n\n')}

## 📊 Summary

- **Successfully Moved:** ${this.movedFiles.length}
- **Errors:** ${this.errors.length}
- **Success Rate:** ${((this.movedFiles.length / (this.movedFiles.length + this.errors.length)) * 100).toFixed(1)}%

## 📁 Directory Structure

\`\`\`
local-processing/
├── scripts/     # PowerShell, Shell, JavaScript files
├── logs/        # Log files, text files, markdown files
├── temp/        # Temporary files
├── config/      # Configuration files
└── backup/      # Backup files
\`\`\`

---

*Report generated by Local Files Cleanup Tool*
`;

        return report;
    }

    /**
     * Display summary in console
     */
    displaySummary() {
        console.log('\n📊 Cleanup Summary:');
        console.log(`✅ Files moved: ${this.movedFiles.length}`);
        console.log(`❌ Errors: ${this.errors.length}`);
        
        if (this.movedFiles.length > 0) {
            console.log('\n📁 Moved files:');
            this.movedFiles.forEach(file => {
                console.log(`  - ${path.basename(file.original)} → ${file.destination}`);
            });
        }
        
        if (this.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.errors.forEach(error => {
                console.log(`  - ${error.file || error.pattern}: ${error.error}`);
            });
        }
    }
}

// CLI Interface
if (require.main === module) {
    const cleanup = new LocalFilesCleanup();
    
    const args = process.argv.slice(2);
    const command = args[0] || 'cleanup';
    
    switch (command) {
        case 'cleanup':
            cleanup.cleanup().then(() => {
                cleanup.displaySummary();
            });
            break;
        case 'help':
            console.log(`
Local Files Cleanup Tool

Usage:
  node cleanup-local-files.js [command]

Commands:
  cleanup    Clean up local files (default)
  help       Show this help message

Examples:
  node cleanup-local-files.js cleanup
  node cleanup-local-files.js help
            `);
            break;
        default:
            console.error(`Unknown command: ${command}`);
            console.log('Use "help" for available commands');
            process.exit(1);
    }
}

module.exports = LocalFilesCleanup; 