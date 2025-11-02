#!/usr/bin/env node

/**
 * AUTO-RUN COMPLETE BATCH
 * Automatic batch runner for all project tasks
 * Runs all maintenance, enrichment, validation, and optimization tasks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🚀 AUTO-RUN COMPLETE BATCH\n');
console.log('═'.repeat(70));

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const LOG_DIR = path.join(PROJECT_ROOT, 'reports', 'batch-runs');

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const BATCH_CONFIG = {
    // Core tasks that always run
    core: [
        {
            name: 'Project Analysis',
            script: 'scripts/core/project-analyzer.js',
            critical: false
        }
    ],
    
    // Validation tasks
    validation: [
        {
            name: 'App Structure Validation',
            script: 'scripts/validation/validate-app-structure.js',
            critical: true
        },
        {
            name: 'All Drivers Validation',
            script: 'scripts/validation/validate-all-drivers.js',
            critical: true
        },
        {
            name: 'All Discoveries Validation',
            script: 'scripts/validation/validate-all-discoveries.js',
            critical: false
        }
    ],
    
    // Enrichment tasks
    enrichment: [
        {
            name: 'Intelligent Multi-Driver Enrichment',
            script: 'scripts/enrichment/INTELLIGENT_MULTI_DRIVER_ENRICHER.js',
            critical: false
        },
        {
            name: 'Deep Intelligent Enrichment',
            script: 'scripts/enrichment/DEEP_INTELLIGENT_ENRICHMENT_BY_CATEGORY.js',
            critical: false
        }
    ],
    
    // Monitoring tasks
    monitoring: [
        {
            name: 'Device Counter',
            script: 'scripts/monitoring/count-devices.js',
            critical: false
        },
        {
            name: 'Generate Metrics Report',
            script: 'scripts/monitoring/generate-metrics-report.js',
            critical: false
        },
        {
            name: 'Update Dashboard',
            script: 'scripts/monitoring/update-dashboard.js',
            critical: false
        }
    ],
    
    // Analytics tasks
    analytics: [
        {
            name: 'Collect All Metrics',
            script: 'scripts/analytics/collect-all-metrics.js',
            critical: false
        }
    ],
    
    // Optimization tasks
    optimization: [
        {
            name: 'Optimize Patterns',
            script: 'scripts/optimization/optimize-patterns.js',
            critical: false
        }
    ],
    
    // AI tasks
    ai: [
        {
            name: 'Multi-AI Orchestration',
            script: 'scripts/ai/multi-ai-orchestrator.js',
            critical: false
        }
    ],
    
    // Automation tasks
    automation: [
        {
            name: 'Auto Version Check',
            script: 'scripts/automation/auto-version.js',
            critical: false
        },
        {
            name: 'Auto Changelog',
            script: 'scripts/automation/auto-changelog.js',
            critical: false
        }
    ],
    
    // Cleanup tasks
    cleanup: [
        {
            name: 'Project Cleanup',
            script: 'scripts/cleanup/cleanup-all.js',
            critical: false
        }
    ]
};

class BatchRunner {
    constructor() {
        this.results = {
            startTime: new Date(),
            tasks: [],
            summary: {
                total: 0,
                success: 0,
                failed: 0,
                skipped: 0
            }
        };
    }

    async run() {
        console.log(`\n📅 Batch Run Started: ${this.results.startTime.toLocaleString()}\n`);
        
        // Run tasks by category
        for (const [category, tasks] of Object.entries(BATCH_CONFIG)) {
            console.log(`\n📂 Category: ${category.toUpperCase()}\n`);
            
            for (const task of tasks) {
                await this.runTask(category, task);
            }
        }
        
        // Generate report
        this.generateReport();
        
        return this.results;
    }

    async runTask(category, task) {
        const taskPath = path.join(PROJECT_ROOT, task.script);
        
        this.results.summary.total++;
        
        console.log(`   🔧 ${task.name}...`);
        
        if (!fs.existsSync(taskPath)) {
            console.log(`      ⚠️  Script not found: ${task.script}`);
            this.results.tasks.push({
                category,
                name: task.name,
                script: task.script,
                status: 'skipped',
                reason: 'script_not_found',
                critical: task.critical
            });
            this.results.summary.skipped++;
            return;
        }
        
        try {
            const startTime = Date.now();
            
            execSync(`node "${taskPath}"`, {
                cwd: PROJECT_ROOT,
                stdio: 'pipe',
                timeout: 5 * 60 * 1000 // 5 minutes max per task
            });
            
            const duration = Date.now() - startTime;
            
            console.log(`      ✅ Success (${(duration / 1000).toFixed(1)}s)`);
            
            this.results.tasks.push({
                category,
                name: task.name,
                script: task.script,
                status: 'success',
                duration,
                critical: task.critical
            });
            
            this.results.summary.success++;
            
        } catch (error) {
            console.log(`      ❌ Failed: ${error.message}`);
            
            this.results.tasks.push({
                category,
                name: task.name,
                script: task.script,
                status: 'failed',
                error: error.message,
                critical: task.critical
            });
            
            this.results.summary.failed++;
            
            // If critical task fails, stop batch
            if (task.critical) {
                console.log(`\n❌ CRITICAL TASK FAILED - Stopping batch\n`);
                throw new Error(`Critical task failed: ${task.name}`);
            }
        }
    }

    generateReport() {
        this.results.endTime = new Date();
        this.results.duration = this.results.endTime - this.results.startTime;
        
        const report = `# 🚀 BATCH RUN REPORT

**Started**: ${this.results.startTime.toLocaleString()}  
**Ended**: ${this.results.endTime.toLocaleString()}  
**Duration**: ${(this.results.duration / 1000 / 60).toFixed(2)} minutes

---

## 📊 SUMMARY

| Metric | Count |
|--------|-------|
| **Total Tasks** | ${this.results.summary.total} |
| **✅ Success** | ${this.results.summary.success} |
| **❌ Failed** | ${this.results.summary.failed} |
| **⚠️  Skipped** | ${this.results.summary.skipped} |

**Success Rate**: ${((this.results.summary.success / this.results.summary.total) * 100).toFixed(1)}%

---

## 📋 TASK RESULTS

${Object.entries(BATCH_CONFIG).map(([category, tasks]) => `
### ${category.toUpperCase()}

${this.results.tasks
    .filter(t => t.category === category)
    .map(t => `- ${t.status === 'success' ? '✅' : t.status === 'failed' ? '❌' : '⚠️'} **${t.name}**${
        t.duration ? ` (${(t.duration / 1000).toFixed(1)}s)` : ''
    }${
        t.error ? `\n  - Error: ${t.error}` : ''
    }${
        t.reason ? `\n  - Reason: ${t.reason}` : ''
    }`)
    .join('\n')}
`).join('\n')}

---

## 🎯 NEXT ACTIONS

${this.results.summary.failed > 0 ? `
### Failed Tasks (${this.results.summary.failed})

${this.results.tasks
    .filter(t => t.status === 'failed')
    .map(t => `- Review: \`${t.script}\`\n  - Error: ${t.error}`)
    .join('\n')}
` : '✅ All tasks completed successfully!'}

${this.results.summary.skipped > 0 ? `
### Skipped Tasks (${this.results.summary.skipped})

${this.results.tasks
    .filter(t => t.status === 'skipped')
    .map(t => `- Create: \`${t.script}\``)
    .join('\n')}
` : ''}

---

**Status**: ${this.results.summary.failed === 0 ? '✅ SUCCESS' : '⚠️  REVIEW REQUIRED'}  
**Next Run**: In 24 hours
`;

        // Save report
        const reportFile = path.join(LOG_DIR, `batch-run-${Date.now()}.md`);
        fs.writeFileSync(reportFile, report);
        
        // Save latest symlink
        const latestFile = path.join(LOG_DIR, 'LATEST_BATCH_RUN.md');
        fs.writeFileSync(latestFile, report);
        
        console.log('\n' + '═'.repeat(70));
        console.log('\n📄 REPORT SUMMARY\n');
        console.log(`Total Tasks:  ${this.results.summary.total}`);
        console.log(`Success:      ${this.results.summary.success}`);
        console.log(`Failed:       ${this.results.summary.failed}`);
        console.log(`Skipped:      ${this.results.summary.skipped}`);
        console.log(`Duration:     ${(this.results.duration / 1000 / 60).toFixed(2)} minutes`);
        console.log(`\nReport: ${reportFile}\n`);
        
        if (this.results.summary.failed === 0) {
            console.log('✅ BATCH RUN COMPLETE!\n');
        } else {
            console.log('⚠️  BATCH RUN COMPLETE WITH FAILURES\n');
        }
    }
}

// Main execution
if (require.main === module) {
    const runner = new BatchRunner();
    
    runner.run().then(results => {
        process.exit(results.summary.failed > 0 ? 1 : 0);
    }).catch(error => {
        console.error('\n❌ Batch run failed:', error.message);
        process.exit(1);
    });
}

module.exports = BatchRunner;
