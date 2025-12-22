#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 🔒 WORKFLOW SECURITY HARDENER - PROTECTION ANTI-INJECTION
 * Sécurise tous les workflows contre injections malveillantes et accès non autorisés
 */
class WorkflowSecurityHardener {
  constructor() {
    this.workflowsDir = path.join(process.cwd(), '.github', 'workflows');
    this.securityViolations = [];
    this.securityFixes = [];
    this.trustedSources = new Set([
      'github.com',
      'api.github.com',
      'actions/checkout',
      'actions/setup-node',
      'actions/upload-artifact'
    ]);
    this.dangerousPatterns = [
      // Injection patterns
      /\$\{\{.*github\.event\./g,
      /\$\{\{.*github\.head_ref\./g,
      /\$\{\{.*github\.base_ref\./g,
      /\$\{\{.*inputs\.\w+\}\}.*\|/g,
      /\$\{\{.*\}\}.*>/g,

      // Command injection
      /curl.*\$\{/g,
      /wget.*\$\{/g,
      /bash.*\$\{/g,
      /sh.*\$\{/g,
      /eval.*\$\{/g,

      // Secrets exposure
      /echo.*\$\{\{.*secrets/gi,
      /printf.*\$\{\{.*secrets/gi,
      /cat.*\$\{\{.*secrets/gi,

      // Dangerous permissions
      /permissions:[\s\S]*?write-all/g,
      /permissions:[\s\S]*?admin/g
    ];
  }

  log(message, type = 'info') {
    const icons = {
      info: '📝', success: '✅', error: '❌', warning: '⚠️',
      security: '🔒', fix: '🛠️', scan: '🔍', critical: '🚨'
    };
    console.log(`${icons[type]} ${message}`);
  }

  /**
   * Scan tous les workflows pour vulnérabilités de sécurité
   */
  async scanAllWorkflows() {
    this.log('🔍 Scan sécuritaire complet workflows...', 'scan');

    if (!fs.existsSync(this.workflowsDir)) {
      this.log('❌ Répertoire workflows non trouvé', 'error');
      return [];
    }

    const workflowFiles = fs.readdirSync(this.workflowsDir)
      .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

    for (const workflowFile of workflowFiles) {
      await this.scanWorkflowSecurity(workflowFile);
    }

    this.log(`🔍 Scan terminé: ${this.securityViolations.length} violations trouvées`, 'scan');
    return this.securityViolations;
  }

  /**
   * Scan sécurité d'un workflow spécifique
   */
  async scanWorkflowSecurity(workflowFile) {
    const workflowPath = path.join(this.workflowsDir, workflowFile);
    const content = fs.readFileSync(workflowPath, 'utf8');

    this.log(`🔍 Scan sécurité: ${workflowFile}`, 'scan');

    // 1. Vérifier patterns dangereux
    await this.checkDangerousPatterns(workflowFile, content);

    // 2. Vérifier permissions excessives
    await this.checkExcessivePermissions(workflowFile, content);

    // 3. Vérifier sources externes
    await this.checkExternalSources(workflowFile, content);

    // 4. Vérifier exposition de secrets
    await this.checkSecretsExposure(workflowFile, content);

    // 5. Vérifier validation des entrées
    await this.checkInputValidation(workflowFile, content);
  }

  /**
   * Vérifie patterns d'injection dangereux
   */
  async checkDangerousPatterns(workflowFile, content) {
    for (const pattern of this.dangerousPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        this.securityViolations.push({
          file: workflowFile,
          type: 'dangerous_pattern',
          severity: 'high',
          pattern: pattern.toString(),
          matches: matches,
          description: 'Pattern potentiellement dangereux détecté - risque d\'injection'
        });
      }
    }
  }

  /**
   * Vérifie permissions excessives
   */
  async checkExcessivePermissions(workflowFile, content) {
    const permissionsMatch = content.match(/permissions:\s*([\s\S]*?)(?=\n\w|\n$)/);
    if (permissionsMatch) {
      const permissions = permissionsMatch[1];

      // Vérifier permissions dangereuses
      if (permissions.includes('write-all') || permissions.includes(': write') && permissions.split(':').length > 3) {
        this.securityViolations.push({
          file: workflowFile,
          type: 'excessive_permissions',
          severity: 'medium',
          permissions: permissions.trim(),
          description: 'Permissions trop larges - principe du moindre privilège non respecté'
        });
      }
    }
  }

  /**
   * Vérifie sources externes non approuvées
   */
  async checkExternalSources(workflowFile, content) {
    const urlMatches = content.match(/https?:\/\/[^\s\)]+/g);
    if (urlMatches) {
      for (const url of urlMatches) {
        const domain = new URL(url).hostname;
        if (!this.trustedSources.has(domain) && !domain.includes('github')) {
          this.securityViolations.push({
            file: workflowFile,
            type: 'untrusted_external_source',
            severity: 'medium',
            url: url,
            description: `Source externe non approuvée: ${domain}`
          });
        }
      }
    }
  }

  /**
   * Vérifie exposition potentielle de secrets
   */
  async checkSecretsExposure(workflowFile, content) {
    const secretPatterns = [
      /echo.*secrets\./gi,
      /printf.*secrets\./gi,
      /\$\{\{.*secrets\..*\}\}.*>/g
    ];

    for (const pattern of secretPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        this.securityViolations.push({
          file: workflowFile,
          type: 'potential_secret_exposure',
          severity: 'critical',
          matches: matches,
          description: 'Risque d\'exposition de secrets dans les logs'
        });
      }
    }
  }

  /**
   * Vérifie validation des entrées utilisateur
   */
  async checkInputValidation(workflowFile, content) {
    const inputMatches = content.match(/\$\{\{\s*inputs\.\w+\s*\}\}/g);
    if (inputMatches) {
      // Vérifier si les inputs sont utilisés directement dans des commandes
      const commandPatterns = [
        /run:\s*[\s\S]*?\$\{\{\s*inputs\.\w+\s*\}\}/g,
        /curl[\s\S]*?\$\{\{\s*inputs\.\w+\s*\}\}/g
      ];

      for (const cmdPattern of commandPatterns) {
        if (content.match(cmdPattern)) {
          this.securityViolations.push({
            file: workflowFile,
            type: 'unvalidated_input',
            severity: 'high',
            description: 'Entrées utilisateur utilisées sans validation - risque d\'injection'
          });
        }
      }
    }
  }

  /**
   * Applique corrections de sécurité automatiques
   */
  async applySecurityFixes() {
    this.log('🛠️ Application corrections sécurité...', 'fix');

    for (const violation of this.securityViolations) {
      const fix = await this.generateSecurityFix(violation);
      if (fix) {
        this.securityFixes.push(fix);
      }
    }

    this.log(`🛠️ ${this.securityFixes.length} corrections générées`, 'fix');
    return this.securityFixes;
  }

  /**
   * Génère correction pour une violation spécifique
   */
  async generateSecurityFix(violation) {
    const workflowPath = path.join(this.workflowsDir, violation.file);
    let content = fs.readFileSync(workflowPath, 'utf8');
    let modified = false;

    switch (violation.type) {
      case 'dangerous_pattern':
        content = this.fixDangerousPatterns(content, violation);
        modified = true;
        break;

      case 'excessive_permissions':
        content = this.fixExcessivePermissions(content);
        modified = true;
        break;

      case 'potential_secret_exposure':
        content = this.fixSecretExposure(content);
        modified = true;
        break;

      case 'unvalidated_input':
        content = this.fixUnvalidatedInput(content);
        modified = true;
        break;
    }

    if (modified) {
      fs.writeFileSync(workflowPath, content);
      return {
        file: violation.file,
        type: violation.type,
        severity: violation.severity,
        action: 'fixed',
        description: `Correction appliquée pour ${violation.type}`
      };
    }

    return null;
  }

  /**
   * Corrige patterns dangereux
   */
  fixDangerousPatterns(content, violation) {
    // Remplacer github.event par des alternatives sécurisées
    content = content.replace(/\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\}\}/g, '${{ github.sha }}');
    content = content.replace(/\$\{\{\s*github\.event\.head_commit\.message\s*\}\}/g, '"Auto-generated commit"');
    content = content.replace(/\$\{\{\s*github\.event\..*?\}\}/g, '"sanitized-value"');

    return content;
  }

  /**
   * Corrige permissions excessives
   */
  fixExcessivePermissions(content) {
    // Remplacer permissions larges par permissions minimales
    content = content.replace(/permissions:\s*write-all/g, 'permissions:\n  contents: read\n  actions: read');
    content = content.replace(/permissions:\s*([\s\S]*?)\n(\w)/g, (match, perms, nextLine) => {
      const lines = perms.split('\n');
      const minimalPerms = lines.filter(line =>
        line.includes('contents:') ||
        line.includes('actions:') ||
        line.includes('read')
      );
      return `permissions:\n${minimalPerms.join('\n')}\n${nextLine}`;
    });

    return content;
  }

  /**
   * Corrige exposition potentielle de secrets
   */
  fixSecretExposure(content) {
    // Remplacer echo/printf de secrets par logging sécurisé
    content = content.replace(/echo.*\$\{\{\s*secrets\..*?\}\}/gi, 'echo "Secret configured (hidden)"');
    content = content.replace(/printf.*\$\{\{\s*secrets\..*?\}\}/gi, 'echo "Secret configured (hidden)"');

    return content;
  }

  /**
   * Corrige validation des entrées
   */
  fixUnvalidatedInput(content) {
    // Ajouter validation pour les inputs utilisés dans run
    content = content.replace(
      /(run:\s*\|[\s\S]*?)(\$\{\{\s*inputs\.(\w+)\s*\}\})/g,
      (match, runBlock, inputVar, inputName) => {
        return runBlock.replace(inputVar, `"\${${inputName}//[^a-zA-Z0-9._-]/}"`);
      }
    );

    return content;
  }

  /**
   * Génère whitelist de sources approuvées
   */
  generateTrustedSourcesConfig() {
    const config = {
      trusted_domains: Array.from(this.trustedSources),
      trusted_actions: [
        'actions/checkout@v4',
        'actions/setup-node@v4',
        'actions/upload-artifact@v4'
      ],
      security_policies: {
        max_permissions: ['contents: write', 'actions: read'],
        require_input_validation: true,
        block_secret_exposure: true,
        require_https: true
      }
    };

    const configPath = path.join(process.cwd(), '.github', 'security-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    this.log(`🔒 Configuration sécurité générée: .github/security-config.json`, 'security');
    return config;
  }

  /**
   * Génère rapport de sécurité détaillé
   */
  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      scan_summary: {
        workflows_scanned: fs.readdirSync(this.workflowsDir).filter(f => f.endsWith('.yml')).length,
        violations_found: this.securityViolations.length,
        fixes_applied: this.securityFixes.length
      },
      security_violations: this.securityViolations.map(v => ({
        file: v.file,
        type: v.type,
        severity: v.severity,
        description: v.description
      })),
      security_fixes: this.securityFixes,
      security_score: this.calculateSecurityScore(),
      recommendations: this.generateSecurityRecommendations()
    };

    const reportPath = path.join(process.cwd(), 'project-data', 'WORKFLOW_SECURITY_REPORT.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Calcule score de sécurité
   */
  calculateSecurityScore() {
    const totalViolations = this.securityViolations.length;
    const criticalViolations = this.securityViolations.filter(v => v.severity === 'critical').length;
    const highViolations = this.securityViolations.filter(v => v.severity === 'high').length;

    if (totalViolations === 0) return 100;

    const penalty = (criticalViolations * 30) + (highViolations * 20) + ((totalViolations - criticalViolations - highViolations) * 10);
    return Math.max(0, 100 - penalty);
  }

  /**
   * Génère recommandations de sécurité
   */
  generateSecurityRecommendations() {
    const recommendations = [
      'Utilisez toujours des versions fixes des actions (ex: @v4 au lieu de @main)',
      'Appliquez le principe du moindre privilège pour les permissions',
      'Validez toutes les entrées utilisateur avant utilisation',
      'Ne jamais exposer de secrets dans les logs ou outputs',
      'Utilisez des runners auto-hébergés avec prudence',
      'Implémentez une review obligatoire pour les modifications de workflows'
    ];

    return recommendations;
  }

  /**
   * Exécution principale
   */
  async run() {
    this.log('🚀 DÉMARRAGE HARDENING SÉCURITÉ WORKFLOWS...', 'security');

    try {
      // 1. Scan sécurité complet
      await this.scanAllWorkflows();

      // 2. Application corrections automatiques
      await this.applySecurityFixes();

      // 3. Génération configuration sécurité
      this.generateTrustedSourcesConfig();

      // 4. Génération rapport
      const report = this.generateSecurityReport();

      // 5. Résumé final
      this.log('📋 === RÉSUMÉ SÉCURITÉ WORKFLOWS ===', 'success');
      this.log(`🔍 Workflows scannés: ${report.scan_summary.workflows_scanned}`, 'success');
      this.log(`🚨 Violations trouvées: ${report.scan_summary.violations_found}`, 'warning');
      this.log(`🛠️ Corrections appliquées: ${report.scan_summary.fixes_applied}`, 'success');
      this.log(`🔒 Score sécurité: ${report.security_score}/100`, 'security');
      this.log(`📄 Rapport: project-data/WORKFLOW_SECURITY_REPORT.json`, 'success');

      return {
        violations: this.securityViolations.length,
        fixes: this.securityFixes.length,
        securityScore: report.security_score,
        success: true
      };

    } catch (error) {
      this.log(`❌ Erreur hardening sécurité: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Exécution si script appelé directement
if (require.main === module) {
  const hardener = new WorkflowSecurityHardener();
  hardener.run().catch(console.error);
}

module.exports = WorkflowSecurityHardener;
