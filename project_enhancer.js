const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectEnhancer {
    constructor() {
        this.rootDir = __dirname;
        this.maxAttempts = 5;
        this.attempt = 0;
        this.keepBranches = ['master', 'tuya-light'];
    }

    async run() {
        console.log('🚀 Starting project enhancement...');
        
        while (this.attempt < this.maxAttempts) {
            this.attempt++;
            console.log(`\n🔄 Attempt ${this.attempt} of ${this.maxAttempts}`);
            
            try {
                await this.cleanupBranches();
                await this.organizeFiles();
                await this.runMegaScript();
                
                if (await this.isProjectStable()) {
                    console.log('✅ Project is now stable and fully functional!');
                    await this.pushChanges();
                    break;
                }
                
            } catch (error) {
                console.error(`❌ Attempt ${this.attempt} failed:`, error.message);
                if (this.attempt >= this.maxAttempts) {
                    console.error('Max attempts reached. Please review the issues and try again.');
                    process.exit(1);
                }
            }
        }
    }

    async cleanupBranches() {
        console.log('\n🌿 Cleaning up branches...');
        execSync('git checkout master', { stdio: 'inherit' });
        
        // Delete local branches
        const branches = execSync('git branch')
            .toString()
            .split('\n')
            .map(b => b.trim().replace('* ', ''))
            .filter(b => b && !this.keepBranches.includes(b));
            
        for (const branch of branches) {
            try {
                execSync(`git branch -D ${branch}`, { stdio: 'inherit' });
            } catch (e) {
                console.warn(`⚠️ Could not delete branch ${branch}:`, e.message);
            }
        }
    }

    async organizeFiles() {
        console.log('\n🗂 Organizing files...');
        
        // Create standard directories
        const dirs = [
            'drivers', 'config', 'docs', 'tools', 
            'utils', 'tests', 'assets', 'scripts'
        ];
        
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(path.join(this.rootDir, dir), { recursive: true });
            }
        });
    }

    async runMegaScript() {
        console.log('\n🚀 Running mega_script.js...');
        try {
            execSync('node mega_script.js', { stdio: 'inherit' });
        } catch (e) {
            console.warn('mega_script.js encountered issues, but continuing...');
        }
    }

    async isProjectStable() {
        console.log('\n🔍 Checking project stability...');
        try {
            // Check if app is valid
            execSync('homey app validate', { stdio: 'pipe' });
            
            // Check if tests pass
            execSync('npm test', { stdio: 'pipe' });
            
            return true;
        } catch (e) {
            console.warn('Project validation failed:', e.message);
            return false;
        }
    }

    async pushChanges() {
        console.log('\n💾 Pushing changes to master...');
        try {
            execSync('git add .', { stdio: 'inherit' });
            execSync('git commit -m "🔧 Project enhancement completed"', { stdio: 'inherit' });
            execSync('git push origin master', { stdio: 'inherit' });
            console.log('✅ Changes pushed successfully!');
        } catch (e) {
            console.warn('⚠️ Could not push changes:', e.message);
        }
    }
}

// Run the enhancer
new ProjectEnhancer().run().catch(console.error);
