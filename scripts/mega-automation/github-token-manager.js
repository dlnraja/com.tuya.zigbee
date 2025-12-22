#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 🔑 GITHUB TOKEN MANAGER
 * Gestion sécurisée et configuration automatique des tokens GitHub
 */
class GitHubTokenManager {
  constructor() {
    this.tokenSources = [
      'GITHUB_TOKEN',
      'GH_TOKEN',
      'GITHUB_PAT',
      'PERSONAL_ACCESS_TOKEN'
    ];
    this.configPath = path.join(process.cwd(), '.env');
    this.secretsPath = path.join(process.cwd(), '.github', 'secrets.example');
  }

  log(message, type = 'info') {
    const icons = { info: '📝', success: '✅', error: '❌', warning: '⚠️', fix: '🔧' };
    console.log(`${icons[type]} ${message}`);
  }

  /**
   * Détecte et valide le token GitHub depuis différentes sources
   */
  detectGitHubToken() {
    this.log('🔍 Détection du token GitHub...', 'info');

    // 1. Variables d'environnement
    for (const envVar of this.tokenSources) {
      if (process.env[envVar]) {
        this.log(`✅ Token trouvé dans ${envVar}`, 'success');
        return {
          source: envVar,
          token: process.env[envVar],
          masked: process.env[envVar].substring(0, 8) + '***'
        };
      }
    }

    // 2. Fichier .env local
    if (fs.existsSync(this.configPath)) {
      const envContent = fs.readFileSync(this.configPath, 'utf8');
      for (const envVar of this.tokenSources) {
        const match = envContent.match(new RegExp(`^${envVar}=(.+)$`, 'm'));
        if (match) {
          this.log(`✅ Token trouvé dans .env (${envVar})`, 'success');
          return {
            source: `.env:${envVar}`,
            token: match[1],
            masked: match[1].substring(0, 8) + '***'
          };
        }
      }
    }

    // 3. Git config global
    try {
      const { execSync } = require('child_process');
      const gitToken = execSync('git config --global github.token', {
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim();

      if (gitToken) {
        this.log('✅ Token trouvé dans git config global', 'success');
        return {
          source: 'git-config',
          token: gitToken,
          masked: gitToken.substring(0, 8) + '***'
        };
      }
    } catch (error) {
      // Git config pas configuré - normal
    }

    this.log('❌ Aucun token GitHub détecté', 'error');
    return null;
  }

  /**
   * Valide le token GitHub via l'API
   */
  async validateToken(token) {
    this.log('🔐 Validation du token via API GitHub...', 'info');

    try {
      const { Octokit } = require('@octokit/rest');
      const octokit = new Octokit({ auth: token });

      const response = await octokit.rest.users.getAuthenticated();

      this.log(`✅ Token valide - Utilisateur: ${response.data.login}`, 'success');
      return {
        valid: true,
        user: response.data.login,
        scopes: response.headers['x-oauth-scopes']?.split(', ') || [],
        rateLimit: response.headers['x-ratelimit-limit'] || 'unknown'
      };
    } catch (error) {
      this.log(`❌ Token invalide: ${error.message}`, 'error');
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Génère la configuration automatique pour GitHub Actions
   */
  generateGitHubActionsConfig() {
    this.log('🔧 Génération configuration GitHub Actions...', 'fix');

    const secretsDir = path.dirname(this.secretsPath);
    if (!fs.existsSync(secretsDir)) {
      fs.mkdirSync(secretsDir, { recursive: true });
    }

    const secretsConfig = `# 🔑 CONFIGURATION SECRETS GITHUB ACTIONS
# Copiez ce contenu dans les Settings > Secrets and variables > Actions de votre repo

# TOKENS OBLIGATOIRES
GITHUB_TOKEN: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Token GitHub avec permissions repo
HOMEY_TOKEN: "your_homey_developer_token_here"            # Token Homey Developer API

# TOKENS IA OPTIONNELS (pour résolution automatique)
GEMINI_API_KEY: "your_gemini_api_key_here"                # Google Gemini API (gratuit)
OPENAI_API_KEY: "your_openai_api_key_here"                # OpenAI API (payant)

# INSTRUCTIONS CONFIGURATION GITHUB_TOKEN:
# 1. Aller sur https://github.com/settings/personal-access-tokens/tokens
# 2. Cliquer "Generate new token" > "Generate new token (classic)"
# 3. Sélectionner les scopes:
#    ✅ repo (Full control of private repositories)
#    ✅ workflow (Update GitHub Action workflows)
#    ✅ write:packages (Upload packages to GitHub Package Registry)
#    ✅ delete:packages (Delete packages from GitHub Package Registry)
#    ✅ admin:org (Full control of orgs and teams, read and write org projects)
#    ✅ gist (Create gists)
# 4. Copier le token généré dans GITHUB_TOKEN ci-dessus
# 5. Dans votre repo GitHub: Settings > Secrets and variables > Actions
# 6. Cliquer "New repository secret"
# 7. Name: GITHUB_TOKEN, Secret: coller le token

# VERIFICATION TOKEN:
# Exécuter: node scripts/mega-automation/github-token-manager.js verify
`;

    fs.writeFileSync(this.secretsPath, secretsConfig);
    this.log(`📄 Configuration générée: ${this.secretsPath}`, 'success');
  }

  /**
   * Génère un fichier .env local de développement
   */
  generateLocalEnvConfig(tokenData) {
    this.log('🔧 Génération configuration .env locale...', 'fix');

    let envContent = '';

    if (fs.existsSync(this.configPath)) {
      envContent = fs.readFileSync(this.configPath, 'utf8');
    }

    // Ajouter GITHUB_TOKEN si pas présent
    if (!envContent.includes('GITHUB_TOKEN=') && tokenData) {
      envContent += `\n# GitHub Token pour développement local\nGITHUB_TOKEN=${tokenData.token}\n`;
    }

    // Ajouter template pour autres tokens
    if (!envContent.includes('HOMEY_TOKEN=')) {
      envContent += `\n# Homey Developer Token\n# HOMEY_TOKEN=your_homey_token_here\n`;
    }

    if (!envContent.includes('GEMINI_API_KEY=')) {
      envContent += `\n# Google Gemini API (gratuit)\n# GEMINI_API_KEY=your_gemini_key_here\n`;
    }

    if (!envContent.includes('OPENAI_API_KEY=')) {
      envContent += `\n# OpenAI API (payant)\n# OPENAI_API_KEY=your_openai_key_here\n`;
    }

    fs.writeFileSync(this.configPath, envContent);
    this.log(`📄 Configuration .env mise à jour: ${this.configPath}`, 'success');

    // Ajouter .env au .gitignore
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    let gitignoreContent = '';

    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    }

    if (!gitignoreContent.includes('.env')) {
      gitignoreContent += '\n# Environment variables\n.env\n.env.local\n';
      fs.writeFileSync(gitignorePath, gitignoreContent);
      this.log('🔒 .env ajouté au .gitignore pour sécurité', 'success');
    }
  }

  /**
   * Configuration automatique complète
   */
  async setupGitHubToken() {
    this.log('🚀 CONFIGURATION AUTOMATIQUE GITHUB_TOKEN', 'info');
    this.log('=' + '='.repeat(50), 'info');

    // 1. Détection du token
    const tokenData = this.detectGitHubToken();

    // 2. Génération de la configuration GitHub Actions
    this.generateGitHubActionsConfig();

    if (tokenData) {
      // 3. Validation du token
      const validation = await this.validateToken(tokenData.token);

      if (validation.valid) {
        this.log(`🎉 Token GitHub configuré et valide!`, 'success');
        this.log(`👤 Utilisateur: ${validation.user}`, 'info');
        this.log(`🔑 Scopes: ${validation.scopes.join(', ') || 'unknown'}`, 'info');
        this.log(`⚡ Rate limit: ${validation.rateLimit}/hour`, 'info');

        // 4. Génération .env local
        this.generateLocalEnvConfig(tokenData);

        return {
          success: true,
          token: tokenData,
          validation: validation
        };
      } else {
        this.log(`❌ Token détecté mais invalide: ${validation.error}`, 'error');
        this.log('🔧 Génération du template de configuration...', 'fix');
        this.generateLocalEnvConfig(null);

        return {
          success: false,
          error: 'Invalid token',
          validation: validation
        };
      }
    } else {
      this.log('🔧 Aucun token détecté - génération du template...', 'fix');
      this.generateLocalEnvConfig(null);

      return {
        success: false,
        error: 'No token found'
      };
    }
  }

  /**
   * Résolution automatique des problèmes de token
   */
  async autoFixTokenIssues() {
    this.log('🔧 RÉSOLUTION AUTOMATIQUE PROBLÈMES TOKEN', 'fix');

    const setup = await this.setupGitHubToken();

    if (setup.success) {
      this.log('✅ Token GitHub configuré avec succès!', 'success');
      return true;
    } else {
      this.log('⚠️ Configuration manuelle requise:', 'warning');

      if (setup.error === 'No token found') {
        this.log('1. 🔑 Créer un Personal Access Token sur GitHub:', 'info');
        this.log('   → https://github.com/settings/personal-access-tokens/tokens', 'info');
        this.log('2. 📋 Copier le token dans les GitHub Secrets:', 'info');
        this.log('   → Repository Settings > Secrets and variables > Actions', 'info');
        this.log('3. 📄 Suivre les instructions dans:', 'info');
        this.log(`   → ${this.secretsPath}`, 'info');
      } else if (setup.error === 'Invalid token') {
        this.log('1. 🔄 Vérifier la validité du token existant', 'info');
        this.log('2. 🔑 Générer un nouveau token si nécessaire', 'info');
        this.log('3. ✅ Vérifier les scopes requis (repo, workflow, packages)', 'info');
      }

      return false;
    }
  }
}

// Exécution directe
if (require.main === module) {
  const tokenManager = new GitHubTokenManager();
  const action = process.argv[2] || 'setup';

  switch (action) {
    case 'detect':
      const tokenData = tokenManager.detectGitHubToken();
      console.log('Token Detection Result:', tokenData ? tokenData.masked : 'Not found');
      break;

    case 'verify':
      (async () => {
        const tokenData = tokenManager.detectGitHubToken();
        if (tokenData) {
          const validation = await tokenManager.validateToken(tokenData.token);
          console.log('Token Validation:', validation);
        } else {
          console.log('No token to verify');
        }
      })();
      break;

    case 'setup':
    default:
      tokenManager.autoFixTokenIssues().then(success => {
        process.exit(success ? 0 : 1);
      });
      break;
  }
}

module.exports = GitHubTokenManager;
