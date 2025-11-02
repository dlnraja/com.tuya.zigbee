#!/usr/bin/env node

/**
 * CLEANUP ALL - Intelligent Project Cleanup
 * Clean temporary files, logs, and artifacts
 * With smart exceptions handling
 */

const fs = require('fs');
const path = require('path');

console.log('\n🧹 PROJECT CLEANUP\n');
console.log('═'.repeat(70));

const PROJECT_ROOT = path.join(__dirname, '..', '..');

// Files and patterns to ALWAYS keep (exceptions)
const EXCEPTIONS = [
    'README.md',
    'README.txt',          // CRITICAL: Required for Homey validate!
    'readme.txt',          // Case variations
    'README.TXT',
    '.gitkeep',
    '.npmignore',
    'LICENSE',
    'LICENSE.txt',
    'CHANGELOG.md',
    '.homeychangelog.json',
    'app.json',
    'package.json',
    'package-lock.json'
];

// Directories to NEVER delete
const PROTECTED_DIRS = [
    'node_modules',
    '.git',
    '.github',
    'drivers',
    'lib',
    'locales',
    'assets',
    'docs'
];

// Patterns to clean
const CLEANUP_PATTERNS = {
    temp_files: [
        '*.tmp',
        '*.temp',
        '*~',
        '*.bak',
        '*.swp',
        '*.swo'
    ],
    
    log_files: [
        '*.log',
        'logs/**/*.log',
        'reports/**/*.log'
    ],
    
    cache_files: [
        '.cache/**',
        '*.cache',
        '.DS_Store',
        'Thumbs.db',
        'desktop.ini'
    ],
    
    old_reports: [
        'reports/**/batch-run-*.md',  // Keep only last 10
        'reports/**/consensus-*.md',   // Keep only last 10
        'reports/**/metrics-*.json'    // Keep only last 30
    ],
    
    test_artifacts: [
        'coverage/**',
        '.nyc_output/**',
        'TEST_*.md'
    ]
};

class CleanupManager {
    constructor() {
        this.stats = {
            filesDeleted: 0,
            bytesFreed: 0,
            errors: []
        };
    }

    isProtected(filePath) {
        const fileName = path.basename(filePath);
        const relativePath = path.relative(PROJECT_ROOT, filePath);
        
        // Check if file is in exceptions
        if (EXCEPTIONS.includes(fileName)) {
            return true;
        }
        
        // Check if in protected directory
        for (const protectedDir of PROTECTED_DIRS) {
            if (relativePath.startsWith(protectedDir)) {
                return true;
            }
        }
        
        return false;
    }

    matchesPattern(filePath, pattern) {
        const fileName = path.basename(filePath);
        const relativePath = path.relative(PROJECT_ROOT, filePath);
        
        // Convert glob pattern to regex
        const regex = new RegExp(
            '^' + pattern
                .replace(/\./g, '\\.')
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.')
            + '$'
        );
        
        return regex.test(fileName) || regex.test(relativePath);
    }

    shouldClean(filePath) {
        // Never clean protected files
        if (this.isProtected(filePath)) {
            return false;
        }
        
        // Check against cleanup patterns
        for (const [category, patterns] of Object.entries(CLEANUP_PATTERNS)) {
            for (const pattern of patterns) {
                if (this.matchesPattern(filePath, pattern)) {
                    return { should: true, category };
                }
            }
        }
        
        return { should: false };
    }

    getFileSize(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    deleteFile(filePath, category) {
        try {
            const size = this.getFileSize(filePath);
            fs.unlinkSync(filePath);
            
            this.stats.filesDeleted++;
            this.stats.bytesFreed += size;
            
            console.log(`   ✅ Deleted [${category}]: ${path.relative(PROJECT_ROOT, filePath)}`);
            
            return true;
        } catch (error) {
            this.stats.errors.push({
                file: filePath,
                error: error.message
            });
            
            console.log(`   ❌ Failed to delete: ${path.relative(PROJECT_ROOT, filePath)}`);
            return false;
        }
    }

    cleanDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            return;
        }
        
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory()) {
                this.cleanDirectory(fullPath);
                
                // Try to remove empty directory
                try {
                    const remaining = fs.readdirSync(fullPath);
                    if (remaining.length === 0 && !this.isProtected(fullPath)) {
                        fs.rmdirSync(fullPath);
                        console.log(`   ✅ Removed empty dir: ${path.relative(PROJECT_ROOT, fullPath)}`);
                    }
                } catch (error) {
                    // Directory not empty or error, skip
                }
            } else {
                const cleanCheck = this.shouldClean(fullPath);
                
                if (cleanCheck.should) {
                    this.deleteFile(fullPath, cleanCheck.category);
                }
            }
        }
    }

    cleanOldReports() {
        console.log('\n📊 Cleaning old reports (keeping last 10)...\n');
        
        const reportsDir = path.join(PROJECT_ROOT, 'reports');
        
        if (!fs.existsSync(reportsDir)) {
            return;
        }
        
        // Clean batch runs (keep last 10)
        const batchRunsDir = path.join(reportsDir, 'batch-runs');
        if (fs.existsSync(batchRunsDir)) {
            const batchFiles = fs.readdirSync(batchRunsDir)
                .filter(f => f.startsWith('batch-run-') && f.endsWith('.md'))
                .map(f => ({
                    name: f,
                    path: path.join(batchRunsDir, f),
                    mtime: fs.statSync(path.join(batchRunsDir, f)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);
            
            if (batchFiles.length > 10) {
                batchFiles.slice(10).forEach(file => {
                    this.deleteFile(file.path, 'old_reports');
                });
            }
        }
        
        // Clean AI consensus (keep last 10)
        const consensusDir = path.join(reportsDir, 'ai-consensus');
        if (fs.existsSync(consensusDir)) {
            const consensusFiles = fs.readdirSync(consensusDir)
                .filter(f => f.startsWith('consensus-') && f.endsWith('.md'))
                .map(f => ({
                    name: f,
                    path: path.join(consensusDir, f),
                    mtime: fs.statSync(path.join(consensusDir, f)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);
            
            if (consensusFiles.length > 10) {
                consensusFiles.slice(10).forEach(file => {
                    this.deleteFile(file.path, 'old_reports');
                });
            }
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    run() {
        console.log('\n🔍 Scanning project for cleanup...\n');
        
        // Clean main directories
        console.log('📂 Cleaning temp files...\n');
        this.cleanDirectory(PROJECT_ROOT);
        
        // Clean old reports
        this.cleanOldReports();
        
        // Generate summary
        console.log('\n' + '═'.repeat(70));
        console.log('\n📊 CLEANUP SUMMARY\n');
        console.log(`Files Deleted:  ${this.stats.filesDeleted}`);
        console.log(`Space Freed:    ${this.formatBytes(this.stats.bytesFreed)}`);
        console.log(`Errors:         ${this.stats.errors.length}`);
        
        if (this.stats.errors.length > 0) {
            console.log('\n❌ ERRORS:\n');
            this.stats.errors.forEach(err => {
                console.log(`   ${err.file}: ${err.error}`);
            });
        }
        
        console.log('\n✅ CLEANUP COMPLETE!\n');
        
        return this.stats;
    }
}

// Main execution
if (require.main === module) {
    const cleanup = new CleanupManager();
    cleanup.run();
    
    process.exit(0);
}

module.exports = CleanupManager;
