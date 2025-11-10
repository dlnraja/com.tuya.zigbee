# 🔌 MCP INTEGRATION GUIDE - Universal Tuya Zigbee

**Date:** 2025-10-12T21:58:53+02:00  
**Version:** v2.15.33  
**Status:** Guide d'intégration MCP (Model Context Protocol)

---

## 📊 OVERVIEW

Ce guide explique comment intégrer différents serveurs MCP pour enrichir et automatiser le projet Universal Tuya Zigbee.

---

## 🎯 MCP SERVERS RECOMMANDÉS

### **1. Context7 MCP - Enrichissement de Contexte**

**Utilité:** Enrichir la documentation et les références avec contexte étendu

**Configuration:**
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"],
      "env": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    }
  }
}
```

**Cas d'Usage pour Notre Projet:**
- 📚 Enrichir documentation drivers avec exemples contextuels
- 🔍 Analyser patterns Zigbee devices similaires
- 📖 Générer guides troubleshooting enrichis
- 🌐 Rechercher documentations Tuya/Zigbee externes

**Exemple d'Utilisation:**
```javascript
// Script: scripts/enrichment/CONTEXT7_ENRICHER.js
const context7 = require('@context7/sdk');

async function enrichDriverDocumentation(driverName) {
  const context = await context7.getContext({
    query: `Zigbee device ${driverName} troubleshooting`,
    sources: ['zigbee2mqtt', 'zha', 'homey-community'],
    depth: 'comprehensive'
  });
  
  return {
    driver: driverName,
    enrichedDocs: context.documentation,
    relatedDevices: context.similar,
    troubleshooting: context.commonIssues,
    references: context.externalLinks
  };
}
```

---

### **2. GitHub MCP - Automatisation GitHub**

**Utilité:** Gérer releases, builds, et statuts de publication

**Configuration:**
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**Cas d'Usage pour Notre Projet:**
- 🔄 Automatiser changement statut build (draft → test → production)
- 📊 Monitorer GitHub Actions workflows
- 🏷️ Créer releases automatiquement
- 📝 Gérer issues et PR
- 📈 Analyser statistiques repo

**Script d'Automatisation:**
```javascript
// scripts/automation/GITHUB_BUILD_MANAGER.js
const { Octokit } = require('@octokit/rest');

class GitHubBuildManager {
  constructor(token) {
    this.octokit = new Octokit({ auth: token });
    this.owner = 'dlnraja';
    this.repo = 'com.tuya.zigbee';
  }

  async getLatestBuild() {
    const { data } = await this.octokit.actions.listWorkflowRuns({
      owner: this.owner,
      repo: this.repo,
      workflow_id: 'auto-publish-complete.yml',
      per_page: 1
    });
    
    return data.workflow_runs[0];
  }

  async promoteBuildToTest(buildId) {
    console.log('🚀 Promoting build to TEST channel...');
    
    // Appeler Homey API pour changer statut
    const response = await fetch(
      `https://apps-sdk-v3.developer.homey.app/api/app/${process.env.HOMEY_APP_ID}/build/${buildId}/promote`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HOMEY_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: 'test'
        })
      }
    );
    
    if (response.ok) {
      console.log('✅ Build promoted to TEST channel!');
      return true;
    } else {
      console.error('❌ Failed to promote build:', await response.text());
      return false;
    }
  }

  async createRelease(version, changelog) {
    const { data } = await this.octokit.repos.createRelease({
      owner: this.owner,
      repo: this.repo,
      tag_name: version,
      name: `Release ${version}`,
      body: changelog,
      draft: false,
      prerelease: false
    });
    
    console.log(`✅ Release ${version} created: ${data.html_url}`);
    return data;
  }
}

module.exports = GitHubBuildManager;
```

**Utilisation:**
```bash
# Promouvoir dernier build vers test
node scripts/automation/PROMOTE_TO_TEST.js

# Créer release automatique
node scripts/automation/CREATE_RELEASE.js --version v2.15.33
```

---

### **3. Google Chrome MCP - Automatisation Browser**

**Utilité:** Automatiser interactions avec Homey Developer Dashboard

**Configuration:**
```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

**Cas d'Usage pour Notre Projet:**
- 🖱️ Cliquer sur bouton "Promote to Test" dans dashboard
- 📊 Capturer screenshots de dashboard
- 📝 Remplir formulaires automatiquement
- 🔍 Monitorer statut builds visuellement

**Script Automatisation Dashboard:**
```javascript
// scripts/automation/HOMEY_DASHBOARD_AUTOMATION.js
const puppeteer = require('puppeteer');

class HomeyDashboardAutomation {
  constructor() {
    this.dashboardUrl = 'https://tools.developer.homey.app/';
    this.appId = 'com.dlnraja.tuya.zigbee';
  }

  async login(email, password) {
    this.browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: { width: 1920, height: 1080 }
    });
    
    this.page = await this.browser.newPage();
    
    console.log('🔐 Logging in to Homey Dashboard...');
    await this.page.goto(this.dashboardUrl);
    
    // Wait for login form
    await this.page.waitForSelector('input[type="email"]');
    await this.page.type('input[type="email"]', email);
    await this.page.type('input[type="password"]', password);
    
    await this.page.click('button[type="submit"]');
    await this.page.waitForNavigation();
    
    console.log('✅ Logged in successfully!');
  }

  async navigateToApp() {
    console.log('📱 Navigating to app page...');
    await this.page.goto(`${this.dashboardUrl}apps/app/${this.appId}`);
    await this.page.waitForSelector('.app-builds');
  }

  async getLatestBuildStatus() {
    await this.navigateToApp();
    
    const status = await this.page.evaluate(() => {
      const buildRow = document.querySelector('.build-row:first-child');
      return {
        version: buildRow.querySelector('.build-version').textContent,
        status: buildRow.querySelector('.build-status').textContent,
        channel: buildRow.querySelector('.build-channel').textContent,
        date: buildRow.querySelector('.build-date').textContent
      };
    });
    
    console.log('📊 Latest Build Status:', status);
    return status;
  }

  async promoteToTest() {
    await this.navigateToApp();
    
    console.log('🚀 Promoting to TEST channel...');
    
    // Cliquer sur le bouton "Actions"
    await this.page.click('.build-row:first-child .build-actions-button');
    await this.page.waitForSelector('.dropdown-menu');
    
    // Cliquer sur "Promote to Test"
    const promoteButton = await this.page.$('button:contains("Promote to Test")');
    
    if (promoteButton) {
      await promoteButton.click();
      
      // Confirmer modal si nécessaire
      await this.page.waitForSelector('.modal-confirm');
      await this.page.click('.modal-confirm button.btn-primary');
      
      // Attendre confirmation
      await this.page.waitForSelector('.alert-success');
      
      console.log('✅ Build promoted to TEST channel!');
      
      // Capturer screenshot
      await this.page.screenshot({
        path: 'docs/screenshots/build-promoted.png',
        fullPage: true
      });
      
      return true;
    } else {
      console.log('⚠️ Build already on TEST or button not found');
      return false;
    }
  }

  async takeScreenshot(filename) {
    await this.page.screenshot({
      path: `docs/screenshots/${filename}`,
      fullPage: true
    });
    console.log(`📸 Screenshot saved: ${filename}`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = HomeyDashboardAutomation;
```

**Utilisation:**
```javascript
// Exemple d'utilisation
const HomeyDashboard = require('./scripts/automation/HOMEY_DASHBOARD_AUTOMATION');

async function main() {
  const dashboard = new HomeyDashboard();
  
  try {
    await dashboard.login(
      process.env.HOMEY_EMAIL,
      process.env.HOMEY_PASSWORD
    );
    
    const status = await dashboard.getLatestBuildStatus();
    
    if (status.status === 'Success' && status.channel === 'draft') {
      await dashboard.promoteToTest();
    }
    
  } finally {
    await dashboard.close();
  }
}

main().catch(console.error);
```

---

### **4. Filesystem MCP - Gestion Fichiers**

**Utilité:** Accès et manipulation de fichiers avec contexte

**Configuration:**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "c:\\Users\\HP\\Desktop\\homey app\\tuya_repair"]
    }
  }
}
```

**Cas d'Usage:**
- 📁 Recherche intelligente dans tous les fichiers
- 🔍 Analyse patterns dans drivers
- 📊 Génération statistiques code
- 🔧 Refactoring automatique

---

### **5. Memory MCP - Persistence de Contexte**

**Utilité:** Mémoriser contexte entre sessions

**Configuration:**
```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

**Cas d'Usage:**
- 💾 Sauvegarder préférences développeur
- 📝 Mémoriser problèmes forum résolus
- 🔄 Suivre état des tâches entre sessions
- 📊 Historique des décisions techniques

---

## 🛠️ SCRIPTS D'INTÉGRATION CRÉÉS

### **Script 1: MCP Context Enricher**
```bash
scripts/mcp/CONTEXT_ENRICHER.js
```

### **Script 2: GitHub Build Manager**
```bash
scripts/automation/GITHUB_BUILD_MANAGER.js
```

### **Script 3: Homey Dashboard Automation**
```bash
scripts/automation/HOMEY_DASHBOARD_AUTOMATION.js
```

### **Script 4: MCP Resources Manager**
```bash
scripts/mcp/RESOURCES_MANAGER.js
```

---

## 📝 CONFIGURATION .ENV

Créer `.env` avec:
```env
# Homey Credentials
HOMEY_EMAIL=your_email@example.com
HOMEY_PASSWORD=your_password
HOMEY_TOKEN=your_homey_developer_token
HOMEY_APP_ID=com.dlnraja.tuya.zigbee

# GitHub
GITHUB_TOKEN=ghp_your_github_token
GITHUB_OWNER=dlnraja
GITHUB_REPO=com.tuya.zigbee

# Context7 (si disponible)
CONTEXT7_API_KEY=your_context7_key

# MCP Configuration
MCP_ENABLED=true
MCP_LOG_LEVEL=info
```

---

## 🚀 UTILISATION AUTOMATISÉE

### **Workflow Complet:**

```javascript
// scripts/automation/FULL_AUTOMATION_WORKFLOW.js
const GitHubBuildManager = require('./GITHUB_BUILD_MANAGER');
const HomeyDashboard = require('./HOMEY_DASHBOARD_AUTOMATION');

async function automatedPublishWorkflow() {
  console.log('🤖 AUTOMATED PUBLISH WORKFLOW');
  console.log('=' .repeat(70));
  
  // 1. Vérifier GitHub Actions
  const github = new GitHubBuildManager(process.env.GITHUB_TOKEN);
  const latestRun = await github.getLatestBuild();
  
  console.log(`\n📊 Latest Workflow Run:`);
  console.log(`  - Status: ${latestRun.status}`);
  console.log(`  - Conclusion: ${latestRun.conclusion}`);
  console.log(`  - Started: ${latestRun.created_at}`);
  
  // 2. Si succès, promouvoir vers test
  if (latestRun.conclusion === 'success') {
    console.log('\n✅ Workflow succeeded! Promoting to TEST...');
    
    const dashboard = new HomeyDashboard();
    
    try {
      await dashboard.login(
        process.env.HOMEY_EMAIL,
        process.env.HOMEY_PASSWORD
      );
      
      const buildStatus = await dashboard.getLatestBuildStatus();
      
      if (buildStatus.channel === 'draft') {
        const promoted = await dashboard.promoteToTest();
        
        if (promoted) {
          console.log('\n🎉 SUCCESS! Build promoted to TEST channel!');
          
          // Créer release GitHub
          const release = await github.createRelease(
            buildStatus.version,
            '## Changes\n\nSee CHANGELOG.md for details'
          );
          
          console.log(`\n📦 GitHub Release created: ${release.html_url}`);
        }
      }
      
    } finally {
      await dashboard.close();
    }
  }
}

if (require.main === module) {
  automatedPublishWorkflow().catch(console.error);
}
```

**Lancer le workflow:**
```bash
node scripts/automation/FULL_AUTOMATION_WORKFLOW.js
```

---

## 🔗 INTÉGRATION DANS GITHUB ACTIONS

Ajouter workflow automatisé:

```yaml
# .github/workflows/auto-promote-to-test.yml
name: Auto-Promote to Test Channel

on:
  workflow_run:
    workflows: ["Auto-Publish Complete Pipeline"]
    types:
      - completed
    branches:
      - master

jobs:
  promote-to-test:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install Dependencies
        run: npm install puppeteer @octokit/rest
      
      - name: Run Automation
        env:
          HOMEY_EMAIL: ${{ secrets.HOMEY_EMAIL }}
          HOMEY_PASSWORD: ${{ secrets.HOMEY_PASSWORD }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          node scripts/automation/FULL_AUTOMATION_WORKFLOW.js
      
      - name: Upload Screenshots
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: dashboard-screenshots
          path: docs/screenshots/
```

---

## 📊 TABLEAU DE BORD MCP

Créer dashboard pour monitorer toutes les intégrations MCP:

```javascript
// scripts/mcp/MCP_DASHBOARD.js
class MCPDashboard {
  async getStatus() {
    return {
      mcpServers: {
        context7: await this.checkContext7(),
        github: await this.checkGitHub(),
        puppeteer: await this.checkPuppeteer(),
        filesystem: await this.checkFilesystem(),
        memory: await this.checkMemory()
      },
      automations: {
        githubActions: await this.getGitHubActionsStatus(),
        homeyDashboard: await this.getHomeyDashboardStatus(),
        lastPromotion: await this.getLastPromotionInfo()
      },
      project: {
        validation: '100%',
        drivers: 167,
        documentation: '50+ files',
        publication: 'In Progress'
      }
    };
  }
}
```

---

## 🎯 ROADMAP INTÉGRATION MCP

### **Phase 1: Setup (Immédiat)**
- [x] ✅ Documentation MCP créée
- [ ] 📦 Installer MCP servers
- [ ] 🔧 Configurer credentials
- [ ] 🧪 Tester chaque MCP individuellement

### **Phase 2: Automatisation (Cette semaine)**
- [ ] 🤖 Script promotion automatique
- [ ] 📊 Dashboard monitoring
- [ ] 🔄 Workflow GitHub Actions
- [ ] 📸 Screenshots automatiques

### **Phase 3: Enrichissement (2 semaines)**
- [ ] 📚 Context7 pour documentation
- [ ] 🔍 Analyse patterns devices
- [ ] 🌐 Intégration sources externes
- [ ] 💾 Memory pour persistance

### **Phase 4: Intelligence (1 mois)**
- [ ] 🤖 AI-powered suggestions
- [ ] 📈 Predictive analytics
- [ ] 🔮 Auto-fix recommendations
- [ ] 🌍 Multi-source enrichment

---

## 🔒 SÉCURITÉ

**Important:**
- ⚠️ Ne jamais committer credentials dans Git
- 🔐 Utiliser variables d'environnement
- 🛡️ GitHub Secrets pour workflows
- 🔑 Tokens avec permissions minimales
- 📝 Rotation régulière des tokens

---

## 📚 RESSOURCES

**MCP Documentation:**
- 📖 https://modelcontextprotocol.io/
- 🔧 https://github.com/modelcontextprotocol/servers
- 💡 https://github.com/modelcontextprotocol/typescript-sdk

**Homey API:**
- 📖 https://apps-sdk-v3.developer.homey.app/
- 🔧 https://tools.developer.homey.app/

**GitHub API:**
- 📖 https://docs.github.com/rest
- 🔧 https://octokit.github.io/rest.js/

---

## ✅ QUICK START

1. **Installer MCP Servers:**
```bash
npm install -g @modelcontextprotocol/server-github
npm install -g @modelcontextprotocol/server-puppeteer
npm install puppeteer @octokit/rest
```

2. **Configurer credentials:**
```bash
cp .env.example .env
# Éditer .env avec vos credentials
```

3. **Tester automatisation:**
```bash
node scripts/automation/FULL_AUTOMATION_WORKFLOW.js
```

4. **Monitorer:**
```bash
node scripts/mcp/MCP_DASHBOARD.js
```

---

**🎉 GUIDE COMPLET D'INTÉGRATION MCP POUR ENRICHIR ET AUTOMATISER LE PROJET!**

---

**Généré par:** Cascade AI  
**Date:** 2025-10-12T21:58:53+02:00  
**Version:** v2.15.33
