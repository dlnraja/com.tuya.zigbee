#!/usr/bin/env node

/**
 * 🔄 MIGRATION SYSTEM
 * 📅 Date: 2025-08-04
 * 🎯 Mode: YOLO MIGRATION
 * 📦 Système de migration automatique pour tuya-light
 */

const fs = require('fs');
const path = require('path');

class MigrationSystem {
    constructor() {
        this.projectRoot = process.cwd();
        this.migrationsDir = path.join(this.projectRoot, 'migrations');
        this.ensureMigrationsDirectory();
    }
    
    ensureMigrationsDirectory() {
        if (!fs.existsSync(this.migrationsDir)) {
            fs.mkdirSync(this.migrationsDir, { recursive: true });
        }
    }
    
    async runMigrations() {
        console.log('🔄 Running migrations...');
        
        const migrations = this.getAvailableMigrations();
        const appliedMigrations = this.getAppliedMigrations();
        
        for (const migration of migrations) {
            if (!appliedMigrations.includes(migration.name)) {
                await this.runMigration(migration);
            }
        }
        
        console.log('✅ All migrations completed');
    }
    
    getAvailableMigrations() {
        if (!fs.existsSync(this.migrationsDir)) {
            return [];
        }
        
        return fs.readdirSync(this.migrationsDir)
            .filter(file => file.endsWith('.js'))
            .map(file => ({
                name: file,
                path: path.join(this.migrationsDir, file)
            }))
            .sort();
    }
    
    getAppliedMigrations() {
        const appliedFile = path.join(this.projectRoot, 'data', 'applied-migrations.json');
        
        if (fs.existsSync(appliedFile)) {
            try {
                return JSON.parse(fs.readFileSync(appliedFile, 'utf8'));
            } catch (error) {
                console.error('Error reading applied migrations:', error.message);
            }
        }
        
        return [];
    }
    
    async runMigration(migration) {
        console.log(`🔄 Running migration: ${migration.name}`);
        
        try {
            // Charger et exécuter la migration
            const migrationModule = require(migration.path);
            
            if (typeof migrationModule.up === 'function') {
                await migrationModule.up();
                this.markMigrationAsApplied(migration.name);
                console.log(`✅ Migration completed: ${migration.name}`);
            } else {
                console.warn(`⚠️ Migration ${migration.name} has no 'up' function`);
            }
            
        } catch (error) {
            console.error(`❌ Migration failed: ${migration.name} - ${error.message}`);
            throw error;
        }
    }
    
    markMigrationAsApplied(migrationName) {
        const appliedFile = path.join(this.projectRoot, 'data', 'applied-migrations.json');
        const dataDir = path.dirname(appliedFile);
        
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        let appliedMigrations = [];
        if (fs.existsSync(appliedFile)) {
            try {
                appliedMigrations = JSON.parse(fs.readFileSync(appliedFile, 'utf8'));
            } catch (error) {
                console.error('Error reading applied migrations:', error.message);
            }
        }
        
        appliedMigrations.push({
            name: migrationName,
            appliedAt: new Date().toISOString()
        });
        
        fs.writeFileSync(appliedFile, JSON.stringify(appliedMigrations, null, 2));
    }
    
    createMigration(name) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const migrationName = `${timestamp}-${name}.js`;
        const migrationPath = path.join(this.migrationsDir, migrationName);
        
        const migrationTemplate = `module.exports = {
    up: async function() {
        // Migration logic here
        console.log('Running migration: ${name}');
        
        // Example: Update drivers
        // Example: Update configuration
        // Example: Add new features
    },
    
    down: async function() {
        // Rollback logic here
        console.log('Rolling back migration: ${name}');
    }
};`;
        
        fs.writeFileSync(migrationPath, migrationTemplate);
        console.log(`✅ Migration created: ${migrationName}`);
        
        return migrationName;
    }
}

module.exports = MigrationSystem;
