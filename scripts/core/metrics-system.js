#!/usr/bin/env node

/**
 * 📊 METRICS SYSTEM
 * 📅 Date: 2025-08-04
 * 🎯 Mode: YOLO METRICS
 * 📦 Système de métriques pour tuya-light
 */

const fs = require('fs');
const path = require('path');

class MetricsSystem {
    constructor() {
        this.projectRoot = process.cwd();
        this.metricsFile = path.join(this.projectRoot, 'data', 'metrics.json');
        this.metrics = this.loadMetrics();
    }
    
    loadMetrics() {
        if (fs.existsSync(this.metricsFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
            } catch (error) {
                console.error('Error loading metrics:', error.message);
            }
        }
        return {
            devices: {},
            performance: {},
            errors: [],
            timestamps: []
        };
    }
    
    saveMetrics() {
        const dataDir = path.dirname(this.metricsFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(this.metricsFile, JSON.stringify(this.metrics, null, 2));
    }
    
    recordDeviceMetric(deviceId, metric, value) {
        if (!this.metrics.devices[deviceId]) {
            this.metrics.devices[deviceId] = {};
        }
        this.metrics.devices[deviceId][metric] = value;
        this.metrics.devices[deviceId].lastUpdate = new Date().toISOString();
        this.saveMetrics();
    }
    
    recordPerformanceMetric(metric, value) {
        this.metrics.performance[metric] = value;
        this.metrics.performance.lastUpdate = new Date().toISOString();
        this.saveMetrics();
    }
    
    recordError(error) {
        this.metrics.errors.push({
            timestamp: new Date().toISOString(),
            error: error.message || error,
            stack: error.stack
        });
        
        // Garder seulement les 100 dernières erreurs
        if (this.metrics.errors.length > 100) {
            this.metrics.errors = this.metrics.errors.slice(-100);
        }
        
        this.saveMetrics();
    }
    
    getMetrics() {
        return this.metrics;
    }
    
    getDeviceMetrics(deviceId) {
        return this.metrics.devices[deviceId] || {};
    }
    
    getPerformanceMetrics() {
        return this.metrics.performance;
    }
    
    getRecentErrors(limit = 10) {
        return this.metrics.errors.slice(-limit);
    }
}

module.exports = MetricsSystem;
