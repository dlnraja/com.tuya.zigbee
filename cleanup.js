const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class RepoCleaner {
    constructor() {
        this.rootDir = __dirname;
        this.requiredRootFiles = [
            'app.js', 'app.json', 'package.json', 'package-lock.json',
            'README.md', 'mega_script.js', '.gitignore'
        ];
    }

    async run() {
        try {
            console.log('🚀 Starting repository cleanup...');
            await this.cleanupBranches();
            await this.organizeFiles();
            await this.optimizeMegaScript();
            await this.commitAndPush();
            console.log('✅ Repository cleanup completed successfully!');
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
            process.exit(1);
        }
    }

    async cleanupBranches() {
        console.log('\n🌿 Cleaning up branches...');
        execSync('git checkout master', { stdio: 'inherit' });
        
        // Delete local branches except master and tuya-light
        const branches = execSync('git branch')
            .toString()
            .split('\n')
            .map(b => b.trim().replace('* ', ''))
            .filter(b => b && !['master', 'tuya-light'].includes(b));
            
        for (const branch of branches) {
            try {
                console.log(`Deleting branch: ${branch}`);
                execSync(`git branch -D ${branch}`, { stdio: 'inherit' });
            } catch (e) {
                console.warn(`⚠️ Could not delete branch ${branch}:`, e.message);
            }
        }
    }

    async organizeFiles() {
        console.log('\n🗂 Organizing files...');
        
        // Create necessary directories
        const dirs = [
            'scripts', 'config', 'docs', 'tools', 'data',
            'drivers', 'assets', 'tests', 'utils'
        ];
        
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(path.join(this.rootDir, dir), { recursive: true });
            }
        });

        // Define file organization rules
        const moveRules = {
            'docs': ['.md', '.txt', '.rst'],
            'config': ['.json', '.yaml', '.yml', '.env'],
            'scripts': ['.js', '.mjs', '.cjs'],
            'assets': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'],
            'data': ['.csv', '.xlsx', '.db', '.sqlite']
        };

        // Move files to appropriate directories
        const files = fs.readdirSync(this.rootDir, { withFileTypes: true });
        
        for (const file of files) {
            if (file.isDirectory() || this.requiredRootFiles.includes(file.name)) {
                continue;
            }

            const ext = path.extname(file.name).toLowerCase();
            const targetDir = Object.entries(moveRules).find(([_, exts]) => 
                exts.includes(ext)
            )?.[0];

            if (targetDir) {
                const source = path.join(this.rootDir, file.name);
                const target = path.join(this.rootDir, targetDir, file.name);
                
                try {
                    fs.renameSync(source, target);
                    console.log(`Moved: ${file.name} -> ${targetDir}/`);
                } catch (e) {
                    console.warn(`⚠️ Could not move ${file.name}:`, e.message);
                }
            }
        }
    }

    async optimizeMegaScript() {
        console.log('\n⚙️  Optimizing mega_script.js...');
        const scriptPath = path.join(this.rootDir, 'mega_script.js');
        
        if (fs.existsSync(scriptPath)) {
            let content = fs.readFileSync(scriptPath, 'utf8');
            
            // Add error handling and sequential execution
            const optimizations = [
                {
                    pattern: /async execute\(/,
                    replacement: 'async execute() {\n    try {'
                },
                {
                    pattern: /(\s*\/\/.*$)/gm,
                    replacement: ''
                },
                {
                    pattern: /(\s*console\.log\([^)]+\);)/g,
                    replacement: ''
                },
                {
                    pattern: /(\s*\/\*[\s\S]*?\*\/)/g,
                    replacement: ''
                },
                {
                    pattern: /\n{3,}/g,
                    replacement: '\n\n'
                }
            ];
            
            optimizations.forEach(opt => {
                content = content.replace(opt.pattern, opt.replacement);
            });
            
            fs.writeFileSync(scriptPath, content);
            console.log('✓ mega_script.js optimized');
        }
    }

    async commitAndPush() {
        console.log('\n💾 Committing and pushing changes...');
        try {
            execSync('git add .', { stdio: 'inherit' });
            execSync('git commit -m "🔧 Cleanup: Organized repository structure and optimized scripts"', 
                   { stdio: 'inherit' });
            execSync('git push origin master', { stdio: 'inherit' });
            console.log('✓ Changes pushed to master');
        } catch (e) {
            console.warn('⚠️ Could not commit/push changes:', e.message);
            console.log('Please commit and push manually if needed.');
        }
    }
}

// Run the cleaner
new RepoCleaner().run().catch(console.error);
