#!/usr/bin/env node

/**
 * 🔄 GITHUB BUILD MANAGER
 * 
 * Gère les builds et releases GitHub:
 * - Monitor GitHub Actions workflows
 * - Créer releases automatiques
 * - Gérer statuts builds
 * - Integration avec Homey API
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

class GitHubBuildManager {
  constructor(token, options = {}) {
    this.octokit = new Octokit({ auth: token });
    this.owner = options.owner || process.env.GITHUB_OWNER || 'dlnraja';
    this.repo = options.repo || process.env.GITHUB_REPO || 'com.tuya.zigbee';
    this.appId = options.appId || process.env.HOMEY_APP_ID || 'com.dlnraja.tuya.zigbee';
  }

  async getLatestWorkflowRun(workflowName = 'auto-publish-complete.yml') {
    console.log(`🔍 Getting latest workflow run for: ${workflowName}...`);
    
    try {
      const { data } = await this.octokit.actions.listWorkflowRuns({
        owner: this.owner,
        repo: this.repo,
        workflow_id: workflowName,
        per_page: 1
      });
      
      const run = data.workflow_runs[0];
      
      if (run) {
        console.log('📊 Latest Workflow Run:');
        console.log(`  ID: ${run.id}`);
        console.log(`  Status: ${run.status}`);
        console.log(`  Conclusion: ${run.conclusion || 'N/A'}`);
        console.log(`  Branch: ${run.head_branch}`);
        console.log(`  Started: ${run.created_at}`);
        console.log(`  URL: ${run.html_url}`);
        
        return run;
      } else {
        console.log('⚠️  No workflow runs found');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting workflow run:', error.message);
      return null;
    }
  }

  async waitForWorkflowCompletion(runId, timeout = 600000) {
    console.log(`⏳ Waiting for workflow ${runId} to complete...`);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const { data } = await this.octokit.actions.getWorkflowRun({
          owner: this.owner,
          repo: this.repo,
          run_id: runId
        });
        
        if (data.status === 'completed') {
          console.log(`✅ Workflow completed with: ${data.conclusion}`);
          return data;
        }
        
        console.log(`  Status: ${data.status}... waiting...`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
        
      } catch (error) {
        console.error('❌ Error checking workflow:', error.message);
        return null;
      }
    }
    
    console.log('⏱️  Timeout waiting for workflow');
    return null;
  }

  async triggerWorkflow(workflowName, ref = 'master', inputs = {}) {
    console.log(`🚀 Triggering workflow: ${workflowName}...`);
    
    try {
      await this.octokit.actions.createWorkflowDispatch({
        owner: this.owner,
        repo: this.repo,
        workflow_id: workflowName,
        ref: ref,
        inputs: inputs
      });
      
      console.log('✅ Workflow triggered successfully!');
      return true;
    } catch (error) {
      console.error('❌ Error triggering workflow:', error.message);
      return false;
    }
  }

  async createRelease(version, changelog) {
    console.log(`📦 Creating release: ${version}...`);
    
    try {
      const { data } = await this.octokit.repos.createRelease({
        owner: this.owner,
        repo: this.repo,
        tag_name: version,
        name: `Release ${version}`,
        body: changelog,
        draft: false,
        prerelease: false
      });
      
      console.log(`✅ Release created: ${data.html_url}`);
      return data;
    } catch (error) {
      console.error('❌ Error creating release:', error.message);
      return null;
    }
  }

  async getLatestRelease() {
    console.log('📦 Getting latest release...');
    
    try {
      const { data } = await this.octokit.repos.getLatestRelease({
        owner: this.owner,
        repo: this.repo
      });
      
      console.log(`Latest Release: ${data.tag_name}`);
      console.log(`  Published: ${data.published_at}`);
      console.log(`  URL: ${data.html_url}`);
      
      return data;
    } catch (error) {
      console.error('❌ Error getting release:', error.message);
      return null;
    }
  }

  async promoteBuildToHomeyTest(buildId) {
    console.log(`🚀 Promoting build ${buildId} to Homey TEST channel...`);
    
    const homeyToken = process.env.HOMEY_TOKEN;
    
    if (!homeyToken) {
      console.error('❌ HOMEY_TOKEN not set in environment');
      return false;
    }
    
    try {
      const response = await fetch(
        `https://apps-sdk-v3.developer.homey.app/api/app/${this.appId}/build/${buildId}/promote`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${homeyToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: 'test'
          })
        }
      );
      
      if (response.ok) {
        console.log('✅ Build promoted to TEST channel via API!');
        return true;
      } else {
        const error = await response.text();
        console.error(`❌ API Error: ${error}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error calling Homey API:', error.message);
      return false;
    }
  }

  async getWorkflowArtifacts(runId) {
    console.log(`📦 Getting artifacts for workflow ${runId}...`);
    
    try {
      const { data } = await this.octokit.actions.listWorkflowRunArtifacts({
        owner: this.owner,
        repo: this.repo,
        run_id: runId
      });
      
      console.log(`Found ${data.artifacts.length} artifacts:`);
      data.artifacts.forEach(artifact => {
        console.log(`  - ${artifact.name} (${artifact.size_in_bytes} bytes)`);
      });
      
      return data.artifacts;
    } catch (error) {
      console.error('❌ Error getting artifacts:', error.message);
      return [];
    }
  }

  async downloadArtifact(artifactId, outputPath) {
    console.log(`⬇️  Downloading artifact ${artifactId}...`);
    
    try {
      const { data } = await this.octokit.actions.downloadArtifact({
        owner: this.owner,
        repo: this.repo,
        artifact_id: artifactId,
        archive_format: 'zip'
      });
      
      fs.writeFileSync(outputPath, Buffer.from(data));
      console.log(`✅ Artifact downloaded: ${outputPath}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error downloading artifact:', error.message);
      return false;
    }
  }

  generateChangelog() {
    // Lire CHANGELOG.md ou générer depuis commits
    const changelogPath = path.join(__dirname, '../../CHANGELOG.md');
    
    if (fs.existsSync(changelogPath)) {
      const content = fs.readFileSync(changelogPath, 'utf8');
      // Extraire dernière version
      const match = content.match(/## \[([^\]]+)\].*?\n([\s\S]*?)(?=\n## |$)/);
      
      if (match) {
        return {
          version: match[1],
          changes: match[2].trim()
        };
      }
    }
    
    return {
      version: 'Unknown',
      changes: 'See CHANGELOG.md for details'
    };
  }
}

// CLI Usage
if (require.main === module) {
  const action = process.argv[2];
  const manager = new GitHubBuildManager(process.env.GITHUB_TOKEN);
  
  async function main() {
    switch (action) {
      case 'status':
        await manager.getLatestWorkflowRun();
        break;
        
      case 'wait':
        const run = await manager.getLatestWorkflowRun();
        if (run) {
          await manager.waitForWorkflowCompletion(run.id);
        }
        break;
        
      case 'release':
        const changelog = manager.generateChangelog();
        await manager.createRelease(`v${changelog.version}`, changelog.changes);
        break;
        
      case 'promote':
        const buildId = process.argv[3];
        if (!buildId) {
          console.error('Usage: node GITHUB_BUILD_MANAGER.js promote <build_id>');
          process.exit(1);
        }
        await manager.promoteBuildToHomeyTest(buildId);
        break;
        
      case 'trigger':
        const workflow = process.argv[3] || 'auto-publish-complete.yml';
        await manager.triggerWorkflow(workflow);
        break;
        
      default:
        console.log('Usage: node GITHUB_BUILD_MANAGER.js [status|wait|release|promote|trigger]');
        break;
    }
  }
  
  main().catch(error => {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  });
}

module.exports = GitHubBuildManager;
