#!/usr/bin/env node

/**
 * 💾 BACKUP SYSTEM
 * 📅 Date: 2025-08-04
 * 🎯 Mode: YOLO BACKUP
 * 📦 Système de backup automatique pour tuya-light
 */

const fs = require('fs');
const path = require('path');

class BackupSystem {
    constructor() {
        this.projectRoot = process.cwd();
        this.backupDir = path.join(this.projectRoot, 'backups');
        this.ensureBackupDirectory();
    }
    
    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }
    
    async createBackup(type = 'full') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup-${type}-${timestamp}`;
        const backupPath = path.join(this.backupDir, backupName);
        
        console.log(`Creating ${type} backup: ${backupName}`);
        
        try {
            fs.mkdirSync(backupPath, { recursive: true });
            
            if (type === 'full') {
                await this.backupFullProject(backupPath);
            } else if (type === 'drivers') {
                await this.backupDrivers(backupPath);
            } else if (type === 'config') {
                await this.backupConfig(backupPath);
            }
            
            console.log(`✅ Backup created: ${backupName}`);
            return backupName;
            
        } catch (error) {
            console.error(`❌ Backup failed: ${error.message}`);
            throw error;
        }
    }
    
    async backupFullProject(backupPath) {
        const itemsToBackup = [
            'drivers',
            'scripts',
            'tools',
            'assets',
            'app.json',
            'app.js',
            'README.md',
            'CHANGELOG.md',
            'drivers.json',
            'package.json'
        ];
        
        for (const item of itemsToBackup) {
            const sourcePath = path.join(this.projectRoot, item);
            const targetPath = path.join(backupPath, item);
            
            if (fs.existsSync(sourcePath)) {
                if (fs.statSync(sourcePath).isDirectory()) {
                    this.copyDirectoryRecursive(sourcePath, targetPath);
                } else {
                    fs.copyFileSync(sourcePath, targetPath);
                }
            }
        }
    }
    
    async backupDrivers(backupPath) {
        const driversPath = path.join(this.projectRoot, 'drivers');
        const targetPath = path.join(backupPath, 'drivers');
        
        if (fs.existsSync(driversPath)) {
            this.copyDirectoryRecursive(driversPath, targetPath);
        }
    }
    
    async backupConfig(backupPath) {
        const configFiles = [
            'app.json',
            'app.js',
            'drivers.json',
            'package.json',
            'sdk-config.json'
        ];
        
        for (const file of configFiles) {
            const sourcePath = path.join(this.projectRoot, file);
            const targetPath = path.join(backupPath, file);
            
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, targetPath);
            }
        }
    }
    
    copyDirectoryRecursive(source, target) {
        if (!fs.existsSync(target)) {
            fs.mkdirSync(target, { recursive: true });
        }
        
        const items = fs.readdirSync(source);
        
        for (const item of items) {
            const sourcePath = path.join(source, item);
            const targetPath = path.join(target, item);
            
            if (fs.statSync(sourcePath).isDirectory()) {
                this.copyDirectoryRecursive(sourcePath, targetPath);
            } else {
                fs.copyFileSync(sourcePath, targetPath);
            }
        }
    }
    
    listBackups() {
        if (!fs.existsSync(this.backupDir)) {
            return [];
        }
        
        return fs.readdirSync(this.backupDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .sort()
            .reverse();
    }
    
    restoreBackup(backupName) {
        const backupPath = path.join(this.backupDir, backupName);
        
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup not found: ${backupName}`);
        }
        
        console.log(`Restoring backup: ${backupName}`);
        
        try {
            // Restaurer les fichiers
            const items = fs.readdirSync(backupPath);
            
            for (const item of items) {
                const sourcePath = path.join(backupPath, item);
                const targetPath = path.join(this.projectRoot, item);
                
                if (fs.statSync(sourcePath).isDirectory()) {
                    this.copyDirectoryRecursive(sourcePath, targetPath);
                } else {
                    fs.copyFileSync(sourcePath, targetPath);
                }
            }
            
            console.log(`✅ Backup restored: ${backupName}`);
            
        } catch (error) {
            console.error(`❌ Restore failed: ${error.message}`);
            throw error;
        }
    }
}

module.exports = BackupSystem;
