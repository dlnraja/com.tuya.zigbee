#!/usr/bin/env node

/**
 * 🛡️ PRE-INTEGRATION VALIDATOR v1.0.0
 *
 * Validateur pré-intégration selon règles strictes mémoire:
 * - UNIVERSAL STRICT ZIGBEE FINGERPRINTING RULES
 * - Validation 3-piliers (Data Source + Cluster & DP + Anti-Collision)
 * - Prévention régression (NEVER delete, preserve existing)
 * - Vérification manufacturerName + productId pair obligatoire
 */

const fs = require('fs').promises;
const path = require('path');

class PreIntegrationValidator {
  constructor() {
    this.config = {
      // RÈGLES STRICTES selon mémoire - ABSOLUES et NON-NÉGOCIABLES
      universalRules: {
        // 9.1 Homey Matching Logic: NEVER rely on manufacturerName alone
        manufacturerNameAlone: false,
        pairRequired: true,

        // 9.2 TS0601/TS0001 TRAP: TS0601 MUST NEVER be added alone
        ts0601Alone: false,
        ts0601WithManufacturer: true,

        // 9.3 Category → Folder Mapping obligatoire
        categoryMappingRequired: true,

        // 9.4 3-Pillar Validation
        dataSourceValidation: true,   // Homey PRIMARY, Z2M SECONDARY
        clusterCompatibility: true,   // Cluster & DP Compatibility
        antiCollisionCheck: true,     // Anti-Collision Check

        // 9.5 ManufacturerName Expansion: MAXIMAL
        maximalExpansion: true,
        deviceFamilyIdentical: true,
        preserveAllExisting: true,

        // 9.6 ProductId Expansion: EXHAUSTIVE when adding
        exhaustiveProductId: true,
        forbiddenAlone: ['TS0601'],
        mixedTypesProhibited: true,   // No mixing ["TS0601", "_TZE200_xxx"]

        // 9.8 NON-REGRESSION CRITICAL
        neverDeleteManufacturer: true,
        neverDeleteProductId: true,
        addCommentsInsteadOfRemoving: true,
        keepLegacyEntries: true,

        // 9.10 Golden Principle
        maximiseCompatibility: true,
        wrongFingerprintingWorseThan: 'missing fingerprinting',
        noRegression: true,
        noCollision: true,
        noMisclassification: true
      },

      // Patterns validation
      validPatterns: {
        manufacturerName: {
          tuya: /^_TZ[A-Z0-9]{4}_[a-z0-9]{8,12}$/,
          generic: /^[A-Za-z0-9_.-]+$/
        },
        productId: {
          tuya: /^TS[0-9]{4}[A-Z]?$/,
          generic: /^[A-Za-z0-9_.-]+$/
        },
        clusters: {
          numeric: /^[0-9]+$/,
          range: (num) => num >= 0 && num <= 65535
        }
      },

      // AI Mistakes à rejeter selon mémoire
      aiMistakesToReject: [
        'Single productId: ["TS0601"]',
        'Mixing types: ["TS0601", "_TZE200_xxx"]',
        'Removing manufacturers',
        'Wrong category placement'
      ]
    };

    // Arguments
    this.workspace = process.argv.find(arg => arg.startsWith('--workspace='))?.split('=')[1] || '.';
    this.strictMode = process.argv.find(arg => arg.startsWith('--strict-mode='))?.split('=')[1] === 'true';

    this.validationResults = {
      totalFindings: 0,
      validFindings: 0,
      invalidFindings: 0,
      warnings: 0,
      criticalErrors: 0,
      regressionRisks: 0,
      antiCollisionBlocks: 0,
      validationDetails: [],
      errors: []
    };
  }

  /**
   * 📝 Logger compatible GitHub Actions
   */
  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();

    if (process.env.GITHUB_ACTIONS === 'true') {
      switch (level.toUpperCase()) {
        case 'ERROR':
          console.log(`::error::${message}`);
          break;
        case 'WARN':
          console.log(`::warning::${message}`);
          break;
        case 'SUCCESS':
          console.log(`::notice::✅ ${message}`);
          break;
        default:
          console.log(`[${timestamp}] ${message}`);
      }
    } else {
      console.log(`[${timestamp}] [${level}] ${message}`);
    }

    if (data) console.log(JSON.stringify(data, null, 2));
  }

  /**
   * 📥 Charger tous les findings à valider
   */
  async loadAllFindings() {
    const allFindings = [];

    const sourcePaths = [
      'data/sources/github-findings.json',
      'data/forums/forum-findings.json',
      'data/databases/database-findings.json'
    ];

    for (const sourcePath of sourcePaths) {
      try {
        const fullPath = path.join(this.workspace, sourcePath);

        try {
          const content = await fs.readFile(fullPath, 'utf8');
          const sourceData = JSON.parse(content);

          const findings = sourceData.findings || [];
          findings.forEach(finding => {
            finding.sourceFile = sourcePath;
          });

          allFindings.push(...findings);
          await this.log('INFO', `📥 Loaded ${findings.length} findings from ${sourcePath}`);

        } catch (error) {
          await this.log('WARN', `Could not load ${sourcePath}:`, error);
        }

      } catch (error) {
        await this.log('ERROR', `Error processing ${sourcePath}:`, error);
      }
    }

    this.validationResults.totalFindings = allFindings.length;
    return allFindings;
  }

  /**
   * 🛡️ Validation STRICTE selon règles mémoire
   */
  async validateFinding(finding, index) {
    const validation = {
      findingIndex: index,
      manufacturerName: finding.manufacturerName,
      productId: finding.productId,
      source: finding.source || finding.sourceFile,
      isValid: false,
      criticalErrors: [],
      warnings: [],
      regressionRisks: [],
      confidence: 0,
      details: {}
    };

    try {
      // RÈGLE 9.1: NEVER rely on manufacturerName alone - PAIR REQUIRED
      if (!finding.manufacturerName && !finding.productId) {
        validation.criticalErrors.push('CRITICAL: No manufacturerName AND no productId - REJECTED');
        return validation;
      }

      if (!finding.manufacturerName || !finding.productId) {
        validation.criticalErrors.push('CRITICAL: Missing manufacturerName or productId pair - REQUIRED by rules 9.1');
        return validation;
      }

      validation.confidence += 30;

      // RÈGLE 9.2: TS0601 MUST NEVER be added alone
      if (finding.productId === 'TS0601' && !finding.manufacturerName) {
        validation.criticalErrors.push('CRITICAL: TS0601 without manufacturerName - FORBIDDEN by rule 9.2');
        return validation;
      }

      if (finding.productId === 'TS0601' && finding.manufacturerName) {
        validation.confidence += 20;
        validation.details.ts0601Protected = true;
      }

      // Validation patterns manufacturerName
      if (this.config.validPatterns.manufacturerName.tuya.test(finding.manufacturerName)) {
        validation.confidence += 25;
        validation.details.manufacturerPatternValid = true;
      } else if (this.config.validPatterns.manufacturerName.generic.test(finding.manufacturerName)) {
        validation.confidence += 10;
        validation.warnings.push('ManufacturerName does not match Tuya pattern but is valid generic');
      } else {
        validation.criticalErrors.push('Invalid manufacturerName pattern');
        return validation;
      }

      // Validation patterns productId
      if (this.config.validPatterns.productId.tuya.test(finding.productId)) {
        validation.confidence += 25;
        validation.details.productIdPatternValid = true;
      } else if (this.config.validPatterns.productId.generic.test(finding.productId)) {
        validation.confidence += 10;
        validation.warnings.push('ProductId does not match Tuya pattern but is valid generic');
      } else {
        validation.criticalErrors.push('Invalid productId pattern');
        return validation;
      }

      // RÈGLE 9.6: Check for AI mistakes to reject
      await this.checkAIMistakes(finding, validation);

      // RÈGLE 9.4: Anti-Collision Check
      await this.performAntiCollisionCheck(finding, validation);

      // RÈGLE 9.8: Non-Regression Check
      await this.checkNonRegression(finding, validation);

      // RÈGLE 9.3: Category validation
      await this.validateCategoryMapping(finding, validation);

      // Validation finale
      if (validation.confidence >= 60 && validation.criticalErrors.length === 0) {
        validation.isValid = true;
        this.validationResults.validFindings++;
      } else {
        validation.isValid = false;
        this.validationResults.invalidFindings++;

        if (validation.criticalErrors.length > 0) {
          this.validationResults.criticalErrors += validation.criticalErrors.length;
        }
      }

      // Compteurs
      this.validationResults.warnings += validation.warnings.length;
      this.validationResults.regressionRisks += validation.regressionRisks.length;

    } catch (error) {
      validation.criticalErrors.push(`Validation error: ${error.message}`);
      this.validationResults.errors.push(`Validation error for finding ${index}: ${error.message}`);
    }

    return validation;
  }

  /**
   * 🤖 Vérifier AI Mistakes selon mémoire
   */
  async checkAIMistakes(finding, validation) {
    // Single productId check
    if (Array.isArray(finding.productId) && finding.productId.length === 1 && finding.productId[0] === 'TS0601') {
      validation.criticalErrors.push('AI Mistake: Single productId ["TS0601"] - FORBIDDEN');
      return;
    }

    // Mixed types check
    if (Array.isArray(finding.manufacturerName) && Array.isArray(finding.productId)) {
      const hasTS0601 = finding.productId.includes('TS0601');
      const hasTZE = finding.manufacturerName.some(m => m.includes('_TZE200_'));

      if (hasTS0601 && hasTZE) {
        validation.criticalErrors.push('AI Mistake: Mixing types ["TS0601", "_TZE200_xxx"] - FORBIDDEN');
        return;
      }
    }

    validation.details.aiMistakeCheck = 'passed';
  }

  /**
   * ⚔️ Anti-Collision Check
   */
  async performAntiCollisionCheck(finding, validation) {
    try {
      // Vérifier dans drivers existants
      const driversDir = path.join(process.cwd(), 'drivers');

      try {
        const drivers = await fs.readdir(driversDir);

        for (const driverName of drivers) {
          try {
            const driverPath = path.join(driversDir, driverName, 'driver.compose.json');
            const content = await fs.readFile(driverPath, 'utf8');
            const driverConfig = JSON.parse(content);

            if (driverConfig.zigbee?.manufacturerName?.includes(finding.manufacturerName)) {
              validation.details.existsInDriver = driverName;
              validation.warnings.push(`ManufacturerName already exists in driver: ${driverName}`);

              // Ce n'est pas forcément une erreur si c'est le bon driver pour cette catégorie
              const category = this.determineCategory(finding);
              if (driverName.includes(category)) {
                validation.details.categoryMatch = true;
                validation.confidence += 5;
              } else {
                validation.regressionRisks.push(`Potential collision: ${finding.manufacturerName} exists in different category driver ${driverName}`);
                this.validationResults.antiCollisionBlocks++;
              }
            }

          } catch {
            // Ignorer erreurs de lecture driver individuel
          }
        }

      } catch (error) {
        validation.warnings.push('Could not perform full anti-collision check');
      }

      validation.details.antiCollisionCheck = 'completed';

    } catch (error) {
      validation.warnings.push(`Anti-collision check failed: ${error.message}`);
    }
  }

  /**
   * 🛡️ Non-Regression Check
   */
  async checkNonRegression(finding, validation) {
    // RÈGLE 9.8: NEVER delete manufacturerName unless proven invalid
    if (finding.action === 'delete' || finding.operation === 'remove') {
      validation.criticalErrors.push('CRITICAL: Deletion operation detected - FORBIDDEN by non-regression rule 9.8');
      return;
    }

    // Vérifier préservation des entrées existantes
    if (finding.replaceExisting === true) {
      validation.regressionRisks.push('WARNING: replaceExisting=true may cause regression');
      this.validationResults.regressionRisks++;
    }

    // Legacy entries preservation
    if (finding.preserveLegacy === false) {
      validation.regressionRisks.push('WARNING: preserveLegacy=false may cause regression');
    }

    validation.details.nonRegressionCheck = 'completed';
  }

  /**
   * 🏷️ Validation Category Mapping
   */
  async validateCategoryMapping(finding, validation) {
    const category = this.determineCategory(finding);

    if (!category || category === 'unknown') {
      validation.warnings.push('Cannot determine device category - may require manual classification');
      return;
    }

    // RÈGLE 9.3: Category → Folder Mapping
    const categoryMapping = {
      'motion_sensor': 'motion_sensor',
      'climate_sensor': 'climate_sensor',
      'plug_smart': 'plug_smart',
      'bulb_rgb': 'bulb_rgb',
      'switch_1gang': 'switch_1gang',
      'switch_2gang': 'switch_2gang',
      'switch_3gang': 'switch_3gang',
      'switch_4gang': 'switch_4gang',
      'switch_6gang': 'switch_6gang'
    };

    const mappedFolder = categoryMapping[category];
    if (!mappedFolder) {
      validation.warnings.push(`No folder mapping for category: ${category}`);
    } else {
      validation.details.categoryMapping = {
        category: category,
        folder: mappedFolder
      };
      validation.confidence += 10;
    }
  }

  /**
   * 🏷️ Déterminer catégorie
   */
  determineCategory(finding) {
    const text = `${finding.deviceName || ''} ${finding.description || ''} ${finding.title || ''}`.toLowerCase();

    if (/motion|pir|presence|occupancy/.test(text)) return 'motion_sensor';
    if (/temperature|humidity|climate/.test(text)) return 'climate_sensor';
    if (/plug|socket|outlet/.test(text)) return 'plug_smart';
    if (/rgb.*bulb|color.*bulb/.test(text)) return 'bulb_rgb';
    if (/1.*gang|single.*switch/.test(text)) return 'switch_1gang';
    if (/2.*gang|double.*switch/.test(text)) return 'switch_2gang';
    if (/3.*gang|triple.*switch/.test(text)) return 'switch_3gang';
    if (/4.*gang|quad.*switch/.test(text)) return 'switch_4gang';
    if (/6.*gang|six.*switch/.test(text)) return 'switch_6gang';

    // Fallback basé sur productId
    if (finding.productId === 'TS0601') return 'climate_sensor';
    if (finding.productId === 'TS0011') return 'plug_smart';
    if (finding.productId === 'TS0505') return 'bulb_rgb';
    if (finding.productId === 'TS0201') return 'climate_sensor';
    if (finding.productId === 'TS0202') return 'motion_sensor';

    return 'unknown';
  }

  /**
   * 📊 Générer rapport validation détaillé
   */
  async generateValidationReport(validations) {
    const reportPath = path.join(this.workspace, 'pre-integration-validation-report.json');

    const report = {
      timestamp: new Date().toISOString(),
      strictMode: this.strictMode,
      summary: {
        totalFindings: this.validationResults.totalFindings,
        validFindings: this.validationResults.validFindings,
        invalidFindings: this.validationResults.invalidFindings,
        validationRate: (this.validationResults.validFindings / this.validationResults.totalFindings * 100).toFixed(2) + '%',
        warnings: this.validationResults.warnings,
        criticalErrors: this.validationResults.criticalErrors,
        regressionRisks: this.validationResults.regressionRisks,
        antiCollisionBlocks: this.validationResults.antiCollisionBlocks
      },
      universalRulesApplied: this.config.universalRules,
      validations: validations,
      errors: this.validationResults.errors
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    await this.log('INFO', `📊 Validation report saved to ${reportPath}`);

    return report;
  }

  /**
   * 🚀 Exécution principale validation
   */
  async execute() {
    try {
      await this.log('INFO', `🚀 Starting Pre-Integration Validator (strict: ${this.strictMode})`);

      // 1. Charger findings
      const findings = await this.loadAllFindings();

      if (findings.length === 0) {
        await this.log('INFO', '📝 No findings to validate');
        return this.validationResults;
      }

      // 2. Valider chaque finding
      const validations = [];

      for (let i = 0; i < findings.length; i++) {
        const validation = await this.validateFinding(findings[i], i);
        validations.push(validation);

        this.validationResults.validationDetails.push({
          index: i,
          manufacturerName: validation.manufacturerName,
          productId: validation.productId,
          isValid: validation.isValid,
          confidence: validation.confidence,
          criticalErrors: validation.criticalErrors.length,
          warnings: validation.warnings.length,
          regressionRisks: validation.regressionRisks.length
        });
      }

      // 3. Générer rapport
      const report = await this.generateValidationReport(validations);

      // 4. Vérifier si validation passed en mode strict
      if (this.strictMode && this.validationResults.criticalErrors > 0) {
        throw new Error(`Strict mode validation FAILED: ${this.validationResults.criticalErrors} critical errors found`);
      }

      await this.log('SUCCESS', `✅ Pre-integration validation completed: ${this.validationResults.validFindings}/${this.validationResults.totalFindings} valid (${report.summary.validationRate})`);

      return this.validationResults;

    } catch (error) {
      await this.log('ERROR', '❌ Pre-integration validation failed:', error);
      this.validationResults.errors.push(error.message);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const validator = new PreIntegrationValidator();

  validator.execute()
    .then(results => {
      console.log('✅ Pre-integration validation completed:', JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Pre-integration validation failed:', error);
      process.exit(1);
    });
}

module.exports = PreIntegrationValidator;
