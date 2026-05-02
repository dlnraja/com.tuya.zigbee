'use strict';

const { safeDivide, safeMultiply } = require('../utils/tuyaUtils.js');
const ZigbeeErrorCodes = require('./ZigbeeErrorCodes');

/**
 * ZigbeeCommandManager - Inspired by ZiGate Command Handling
 * 
 * Robust command execution with:
 * - Automatic retry on resource errors
 * - Queue management for concurrent requests
 * - Rate limiting and throttling
 */
class ZigbeeCommandManager {
  
  constructor(homey, options = {}) {
    this.homey = homey;
    this.options = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      maxConcurrent: options.maxConcurrent || 5,
      rateLimit: options.rateLimit || 10, // commands per second
      queueTimeout: options.queueTimeout || 30000, // 30 seconds
      ...options
    };
    
    this.queue = [];
    this.executing = new Set();
    this.processing = false;
    
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      retried: 0,
      errors: {},
      lastCommand: null
    };
    
    this.commandTimestamps = [];
    this.rateLimitWindow = 1000;
  }
  
  async executeCommand(commandFn, options = {}) {
    const command = {
      id: this.generateCommandId(),
      fn: commandFn,
      options: {
        priority: options.priority || 'normal',
        maxRetries: options.maxRetries || this.options.maxRetries,
        retryDelay: options.retryDelay || this.options.retryDelay,
        timeout: options.timeout || this.options.queueTimeout,
        context: options.context || {}
      },
      attempts: 0,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null
    };
    
    this.queue.push(command);
    this.stats.total++;
    
    if (!this.processing) {
      this.processQueue().catch(() => {});
    }
    
    return new Promise((resolve, reject) => {
      command.resolve = resolve;
      command.reject = reject;
      
      command.timeoutId = this.homey.setTimeout(() => {
        this.removeFromQueue(command.id);
        reject(new Error(`Command timeout after ${command.options.timeout}ms`));
      }, command.options.timeout);
    });
  }
  
  async processQueue() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.length > 0 || this.executing.size > 0) {
      await this.enforceRateLimit();
      
      if (this.executing.size >= this.options.maxConcurrent) {
        await this.sleep(100);
        continue;
      }
      
      const command = this.getNextCommand();
      if (!command) {
        if (this.executing.size === 0) break;
        await this.sleep(100);
        continue;
      }
      
      this.executeCommandInternal(command).catch(() => {});
    }
    
    this.processing = false;
  }
  
  async executeCommandInternal(command) {
    this.executing.add(command.id);
    command.startedAt = Date.now();
    command.attempts++;
    
    try {
      const result = await command.fn();
      this.handleSuccess(command, result);
    } catch (error) {
      await this.handleError(command, error);
    }
  }
  
  handleSuccess(command, result) {
    command.completedAt = Date.now();
    if (command.timeoutId) this.homey.clearTimeout(command.timeoutId);
    this.executing.delete(command.id);
    this.stats.success++;
    this.stats.lastCommand = command.id;
    if (command.resolve) command.resolve(result);
    this.log(`Command ${command.id} succeeded after ${command.attempts} attempt(s)`);
  }
  
  async handleError(command, error) {
    const errorCode = this.extractErrorCode(error);
    const errorInfo = ZigbeeErrorCodes.getError(errorCode);
    
    if (!this.stats.errors[errorCode]) this.stats.errors[errorCode] = 0;
    this.stats.errors[errorCode]++;
    
    this.error(`Command ${command.id} failed: ${errorInfo.name} (${errorInfo.code})`);
    
    const shouldRetry = errorInfo.retryable && command.attempts < command.options.maxRetries;
    
    if (shouldRetry) {
      this.stats.retried++;
      this.log(`Retrying command ${command.id} (attempt ${command.attempts + 1}/${command.options.maxRetries})`);
      this.executing.delete(command.id);
      await this.sleep(command.options.retryDelay);
      this.queue.unshift(command);
    } else {
      command.completedAt = Date.now();
      if (command.timeoutId) this.homey.clearTimeout(command.timeoutId);
      this.executing.delete(command.id);
      this.stats.failed++;
      
      const autofixStrategy = ZigbeeErrorCodes.getAutofixStrategy(errorCode);
      if (autofixStrategy) {
        this.log(`Autofix available: ${autofixStrategy}`);
        await this.applyAutofix(autofixStrategy, command).catch(() => {});
      }
      
      if (command.reject) command.reject(error);
      this.error(`Command ${command.id} failed permanently after ${command.attempts} attempt(s)`);
    }
  }
  
  getNextCommand() {
    if (this.queue.length === 0) return null;
    this.queue.sort((a, b) => {
      const priorities = { high: 3, normal: 2, low: 1 };
      const priorityA = priorities[a.options.priority] || 2;
      const priorityB = priorities[b.options.priority] || 2;
      if (priorityA !== priorityB) return priorityB - priorityA;
      return a.createdAt - b.createdAt;
    });
    return this.queue.shift();
  }
  
  removeFromQueue(commandId) {
    this.queue = this.queue.filter(cmd => cmd.id !== commandId);
    this.executing.delete(commandId);
  }
  
  async enforceRateLimit() {
    const now = Date.now();
    this.commandTimestamps = this.commandTimestamps.filter(t => now - t < this.rateLimitWindow);
    if (this.commandTimestamps.length >= this.options.rateLimit) {
      const oldestTimestamp = this.commandTimestamps[0];
      const waitTime = this.rateLimitWindow - (now - oldestTimestamp);
      if (waitTime > 0) await this.sleep(waitTime);
    }
    this.commandTimestamps.push(Date.now());
  }
  
  async applyAutofix(strategy, command) {
    try {
      switch (strategy) {
        case 'cleanupAddressTable':
          await this.cleanupAddressTable();
          break;
        case 'cleanupRoutingTable':
          await this.cleanupRoutingTable();
          break;
        default:
          this.log(`Unknown autofix strategy: ${strategy}`);
      }
    } catch (err) {
      this.error(`Autofix ${strategy} failed:`, err);
    }
  }
  
  async cleanupAddressTable() {
    this.log('[Autofix] Cleaning up address table...');
    if (this.homey.app && this.homey.app.healthMonitor) {
      await this.homey.app.healthMonitor.handle0x87Error();
    }
  }
  
  async cleanupRoutingTable() {
    this.log('[Autofix] Cleaning up routing table...');
  }
  
  extractErrorCode(error) {
    if (error.code) return error.code;
    if (error.statusCode) return error.statusCode;
    if (error.errorCode) return error.errorCode;
    const match = error.message && error.message.match(/0x([0-9A-Fa-f]{2})/);
    if (match) return parseInt(match[1], 16);
    return 0xFF;
  }
  
  generateCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getStats() {
    const successRate = this.stats.total > 0 ? (safeMultiply(safeDivide(this.stats.success, this.stats.total), 100)).toFixed(2) + '%' : '0%';
    const retryRate = this.stats.total > 0 ? (safeMultiply(safeDivide(this.stats.retried, this.stats.total), 100)).toFixed(2) + '%' : '0%';
    return {
      ...this.stats,
      queueLength: this.queue.length,
      executing: this.executing.size,
      successRate,
      retryRate
    };
  }
  
  resetStats() {
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      retried: 0,
      errors: {},
      lastCommand: null
    };
  }
  
  sleep(ms) {
    return new Promise(resolve => this.homey.setTimeout(resolve, ms));
  }
  
  log(...args) {
    console.log('[ZigbeeCommandManager]', ...args);
  }
  
  error(...args) {
    console.error('[ZigbeeCommandManager]', ...args);
  }
}

module.exports = ZigbeeCommandManager;
