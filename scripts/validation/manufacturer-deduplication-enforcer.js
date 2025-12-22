#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 🔧 ENFORCER RÈGLES MANUFACTURENAMES - DÉDUPLICATION STRICTE
 * Applique les règles mémoire pour manufacturerNames uniques entre drivers
 */
class ManufacturerDeduplicationEnforcer {
  constructor() {
    this.driversDir = path.join(process.cwd(), 'drivers');
    this.manufacturerMap = new Map();
    this.violations = [];
    this.fixes = [];
    this.rules = {
      // RÈGLES CRITIQUES (Memory Rules)
      enforceUniqueManufacturerNames: true,
      allowDuplicateOnlyWithDistinctProductIds: true,
      preventSameManufacturerSameProduct: true,
      prioritizeByDriverType: true,
      logAllChanges: true
    };
    this.driverPriorities = {
      // Priorités pour résolution conflits (plus haut = gardé)
      'switch_1gang': 100,
      'switch_2gang': 95,
      'switch_3gang': 90,
      'switch_4gang': 85,
      'switch_5gang': 80,
      'switch_6gang': 75,
      'plug_': 70,
      'socket_': 70,
      'gas_detector': 65,
      'smoke_detector': 60,
      'motion_sensor': 55,
      'temperature_humidity_sensor': 50,
      'door_window_sensor': 45,
      'water_leak_sensor': 40,
      'button_wireless': 35,
      'remote_': 30,
      'dimmer_': 25,
      'bulb_': 20,
      'led_strip': 15,
      'thermostat': 10
    };
  }

  log(message, type = 'info') {
    const icons = {
      info: '📝', success: '✅', error: '❌', warning: '⚠️',
      fix: '🔧', rule: '📋', enforce: '🚨', priority: '⭐'
    };
    console.log(`${icons[type]} ${message}`);
  }

  /**
   * Scan tous les drivers pour manufacturerNames
   */
  async scanAllDrivers() {
    this.log('🔍 Scan complet drivers pour manufacturerNames...', 'info');

    const drivers = fs.readdirSync(this.driversDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const driverName of drivers) {
      const composePath = path.join(this.driversDir, driverName, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        try {
          const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
          const manufacturerNames = compose.zigbee?.manufacturerName || [];
          const productIds = compose.zigbee?.productId || [];

          for (const manufacturerId of manufacturerNames) {
            if (!this.manufacturerMap.has(manufacturerId)) {
              this.manufacturerMap.set(manufacturerId, []);
            }

            this.manufacturerMap.get(manufacturerId).push({
              driver: driverName,
              productIds: productIds,
              composePath: composePath,
              priority: this.calculateDriverPriority(driverName)
            });
          }
        } catch (error) {
          this.log(`❌ Erreur lecture ${composePath}: ${error.message}`, 'error');
        }
      }
    }

    this.log(`📊 Scanné ${drivers.length} drivers, ${this.manufacturerMap.size} manufacturerIds`, 'info');
  }

  /**
   * Calcule priorité driver pour résolution conflits
   */
  calculateDriverPriority(driverName) {
    let priority = 0;

    for (const [pattern, points] of Object.entries(this.driverPriorities)) {
      if (driverName.includes(pattern)) {
        priority = points;
        break;
      }
    }

    return priority;
  }

  /**
   * Identifie violations règles manufacturerNames
   */
  identifyViolations() {
    this.log('🚨 Identification violations règles manufacturerNames...', 'enforce');

    for (const [manufacturerId, entries] of this.manufacturerMap.entries()) {
      if (entries.length > 1) {
        // Analyser si violation selon règles
        const violation = this.analyzeViolation(manufacturerId, entries);
        if (violation) {
          this.violations.push(violation);
        }
      }
    }

    this.log(`🚨 Identifié ${this.violations.length} violations règles`, 'warning');
    return this.violations;
  }

  /**
   * Analyse une violation potentielle
   */
  analyzeViolation(manufacturerId, entries) {
    // Vérifier si productIds sont réellement distincts
    const allProductIds = entries.flatMap(e => e.productIds);
    const uniqueProductIds = new Set(allProductIds);

    // Si même manufacturerId ET (pas de productIds OU productIds identiques)
    if (uniqueProductIds.size <= 1) {
      return {
        manufacturerId,
        entries,
        violationType: 'same_manufacturer_same_products',
        severity: 'high',
        description: `ManufacturerId ${manufacturerId} présent dans ${entries.length} drivers avec productIds identiques/absents`
      };
    }

    // Si manufacturerId critique avec productIds peu distincts
    if (this.isCriticalManufacturer(manufacturerId) && uniqueProductIds.size < entries.length) {
      return {
        manufacturerId,
        entries,
        violationType: 'critical_manufacturer_overlap',
        severity: 'medium',
        description: `ManufacturerId critique ${manufacturerId} avec overlap productIds`
      };
    }

    return null;
  }

  /**
   * Détermine si manufacturerId est critique
   */
  isCriticalManufacturer(manufacturerId) {
    // Patterns critiques nécessitant unicité stricte
    return manufacturerId.startsWith('_TZ3000_') ||
      manufacturerId.startsWith('_TZE200_') ||
      manufacturerId.startsWith('_TZE204_') ||
      manufacturerId.startsWith('_TZ3210_');
  }

  /**
   * Résout toutes les violations
   */
  async resolveAllViolations() {
    this.log('🔧 Résolution de toutes les violations...', 'fix');

    for (const violation of this.violations) {
      const fix = await this.resolveViolation(violation);
      if (fix) {
        this.fixes.push(fix);
      }
    }

    this.log(`✅ Appliqué ${this.fixes.length} corrections`, 'success');
    return this.fixes;
  }

  /**
   * Résout une violation spécifique
   */
  async resolveViolation(violation) {
    const { manufacturerId, entries, violationType } = violation;

    // Trier par priorité (plus haute priorité gardée)
    const sortedEntries = entries.sort((a, b) => b.priority - a.priority);
    const keepEntry = sortedEntries[0];
    const removeEntries = sortedEntries.slice(1);

    this.log(`🔧 ${manufacturerId}: garder dans ${keepEntry.driver} (priorité ${keepEntry.priority})`, 'fix');

    const changes = [];
    for (const entry of removeEntries) {
      const change = await this.removeManufacturerFromDriver(manufacturerId, entry);
      if (change) {
        changes.push(change);
      }
    }

    return {
      manufacturerId,
      violationType,
      keptIn: keepEntry.driver,
      removedFrom: removeEntries.map(e => e.driver),
      changes
    };
  }

  /**
   * Retire manufacturerId d'un driver spécifique
   */
  async removeManufacturerFromDriver(manufacturerId, entry) {
    try {
      const compose = JSON.parse(fs.readFileSync(entry.composePath, 'utf8'));
      const manufacturerNames = compose.zigbee?.manufacturerName || [];

      // Filtrer manufacturerId
      const originalLength = manufacturerNames.length;
      const filteredNames = manufacturerNames.filter(name => name !== manufacturerId);

      if (filteredNames.length < originalLength) {
        compose.zigbee.manufacturerName = filteredNames;
        fs.writeFileSync(entry.composePath, JSON.stringify(compose, null, 2) + '\n');

        this.log(`  ✅ Retiré de ${entry.driver}`, 'success');
        return {
          driver: entry.driver,
          file: entry.composePath,
          action: 'removed_manufacturer',
          manufacturerId,
          originalCount: originalLength,
          newCount: filteredNames.length
        };
      }
    } catch (error) {
      this.log(`  ❌ Erreur modification ${entry.driver}: ${error.message}`, 'error');
    }

    return null;
  }

  /**
   * Valide résolution (post-correction)
   */
  async validateResolution() {
    this.log('🔍 Validation post-résolution...', 'info');

    // Re-scan après corrections
    this.manufacturerMap.clear();
    await this.scanAllDrivers();

    const newViolations = this.identifyViolations();

    if (newViolations.length === 0) {
      this.log('✅ TOUTES violations résolues avec succès!', 'success');
      return true;
    } else {
      this.log(`❌ ${newViolations.length} violations persistent`, 'error');
      return false;
    }
  }

  /**
   * Génère rapport détaillé
   */
  generateDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      rules_enforced: this.rules,
      scan_results: {
        drivers_scanned: fs.readdirSync(this.driversDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory()).length,
        manufacturer_ids_found: this.manufacturerMap.size,
        violations_identified: this.violations.length
      },
      violations: this.violations.map(v => ({
        manufacturerId: v.manufacturerId,
        violationType: v.violationType,
        severity: v.severity,
        affected_drivers: v.entries.map(e => e.driver),
        description: v.description
      })),
      fixes_applied: this.fixes.map(f => ({
        manufacturerId: f.manufacturerId,
        violationType: f.violationType,
        keptIn: f.keptIn,
        removedFrom: f.removedFrom,
        changes_count: f.changes.length
      })),
      driver_priorities: this.driverPriorities
    };

    const reportPath = path.join(process.cwd(), 'project-data', 'MANUFACTURER_DEDUPLICATION_REPORT.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Exécution principale
   */
  async run() {
    this.log('🚀 DÉMARRAGE ENFORCER RÈGLES MANUFACTURENAMES...', 'info');

    try {
      // 1. Scan complet drivers
      await this.scanAllDrivers();

      // 2. Identifier violations
      this.identifyViolations();

      if (this.violations.length === 0) {
        this.log('✅ Aucune violation trouvée - règles respectées!', 'success');
        return { violations: 0, fixes: 0, success: true };
      }

      // 3. Résoudre violations
      await this.resolveAllViolations();

      // 4. Valider résolution
      const resolved = await this.validateResolution();

      // 5. Générer rapport
      const report = this.generateDetailedReport();

      // 6. Résumé final
      this.log('📋 === RÉSUMÉ ENFORCER MANUFACTURENAMES ===', 'success');
      this.log(`✅ Violations identifiées: ${this.violations.length}`, 'success');
      this.log(`✅ Corrections appliquées: ${this.fixes.length}`, 'success');
      this.log(`✅ Résolution réussie: ${resolved ? 'OUI' : 'NON'}`, resolved ? 'success' : 'error');
      this.log(`✅ Rapport: project-data/MANUFACTURER_DEDUPLICATION_REPORT.json`, 'success');

      return {
        violations: this.violations.length,
        fixes: this.fixes.length,
        success: resolved,
        report
      };

    } catch (error) {
      this.log(`❌ Erreur enforcer manufacturerNames: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Exécution si script appelé directement
if (require.main === module) {
  const enforcer = new ManufacturerDeduplicationEnforcer();
  enforcer.run().catch(console.error);
}

module.exports = ManufacturerDeduplicationEnforcer;
