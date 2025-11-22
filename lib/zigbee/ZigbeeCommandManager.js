'use strict';

/**
 * ZigbeeCommandManager - Inspired by ZiGate Command Handling
 * 
 * Robust command execution with:
 * - Automatic retry on resource errors (0x80-0x86, 0x8B)
 * - Queue management for concurrent requests
 * - Error code handling (all 0x80-0xCA codes)
 * - Rate limiting and throttling
 * - Command history and statistics
 * 
 * Based on ZiGate error handling and resource management
 */

const ZigbeeErrorCodes = require('./ZigbeeErrorCodes');

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
    
    // Command queue
    this.queue = [];
    this.executing = new Set();
    this.processing = false;
    
    // Statistics
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      retried: 0,
      errors: {},
      lastCommand: null
    };
    
    // Rate limiting
    this.commandTimestamps = [];
    this.rateLimitWindow = 1000; // 1 second
  }
  
  // ========================================================================
  // COMMAND EXECUTION
  // ========================================================================
  
  /**
   * Execute a Zigbee command with automatic retry and error handling
   * @param {Function} commandFn - Function that executes the command
   * @param {Object} options - Execution options
   * @returns {Promise} Command result
   */
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
    
    // Add to queue
    this.queue.push(command);
    this.stats.total++;
    
    // Start processing
    if (!this.processing) {
      this.processQueue();
    }
    
    // Wait for result
    return new Promise((resolve, reject) => {
      command.resolve = resolve;
      command.reject = reject;
      
      // Timeout
      command.timeoutId = this.homey.setTimeout(() => {
        this.removeFromQueue(command.id);
        reject(new Error(`Command timeout after ${command.options.timeout}ms`));
      }, command.options.timeout);
    });
  }
  
  /**
   * Process command queue
   */
  async processQueue() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.length > 0 || this.executing.size > 0) {
      // Check rate limit
      await this.enforceRateLimit();
      
      // Check concurrent limit
      if (this.executing.size >= this.options.maxConcurrent) {
        await this.sleep(100);
        continue;
      }
      
      // Get next command
      const command = this.getNextCommand();
      if (!command) {
        await this.sleep(100);
        continue;
      }
      
      // Execute command
      this.executeCommandInternal(command);
    }
    
    this.processing = false;
  }
  
  /**
   * Internal command execution with retry logic
   */
  async executeCommandInternal(command) {
    this.executing.add(command.id);
    command.startedAt = Date.now();
    command.attempts++;
    
    try {
      // Execute command function
      const result = await command.fn();
      
      // Success
      this.handleSuccess(command, result);
      
    } catch (error) {
      // Handle error
      await this.handleError(command, error);
    }
  }
  
  /**
   * Handle command success
   */
  handleSuccess(command, result) {
    command.completedAt = Date.now();
    
    // Clear timeout
    if (command.timeoutId) {
      this.homey.clearTimeout(command.timeoutId);
    }
    
    // Remove from execution
    this.executing.delete(command.id);
    
    // Update stats
    this.stats.success++;
    this.stats.lastCommand = command.id;
    
    // Resolve promise
    if (command.resolve) {
      command.resolve(result);
    }
    
    this.log(`Command ${command.id} succeeded after ${command.attempts} attempt(s)`);
  }
  
  /**
   * Handle command error with retry logic
   */
  async handleError(command, error) {
    // Extract error code
    const errorCode = this.extractErrorCode(error);
    
    // Get error info
    const errorInfo = ZigbeeErrorCodes.getError(errorCode);
    
    // Track error
    if (!this.stats.errors[errorCode]) {
      this.stats.errors[errorCode] = 0;
    }
    this.stats.errors[errorCode]++;
    
    this.error(`Command ${command.id} failed: ${errorInfo.name} (${errorInfo.code})`);
    
    // Check if retryable
    const shouldRetry = errorInfo.retryable && 
                       command.attempts < command.options.maxRetries;
    
    if (shouldRetry) {
      // Retry with delay
      this.stats.retried++;
      this.log(`Retrying command ${command.id} (attempt ${command.attempts + 1}/${command.options.maxRetries})`);
      
      // Remove from executing
      this.executing.delete(command.id);
      
      // Re-add to queue with delay
      await this.sleep(command.options.retryDelay * command.attempts);
      this.queue.unshift(command); // Priority retry
      
    } else {
      // Failed permanently
      command.completedAt = Date.now();
      
      // Clear timeout
      if (command.timeoutId) {
        this.homey.clearTimeout(command.timeoutId);
      }
      
      // Remove from execution
      this.executing.delete(command.id);
      
      // Update stats
      this.stats.failed++;
      
      // Check for autofix
      const autofixStrategy = ZigbeeErrorCodes.getAutofixStrategy(errorCode);
      if (autofixStrategy) {
        this.log(`Autofix available: ${autofixStrategy}`);
        await this.applyAutofix(autofixStrategy, command);
      }
      
      // Reject promise
      if (command.reject) {
        command.reject(error);
      }
      
      this.error(`Command ${command.id} failed permanently after ${command.attempts} attempt(s)`);
    }
  }
  
  // ========================================================================
  // QUEUE MANAGEMENT
  // ========================================================================
  
  /**
   * Get next command from queue (priority-based)
   */
  getNextCommand() {
    if (this.queue.length === 0) return null;
    
    // Sort by priority
    this.queue.sort((a, b) => {
      const priorities = { high: 3, normal: 2, low: 1 };
      const priorityA = priorities[a.options.priority] || 2;
      const priorityB = priorities[b.options.priority] || 2;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      
      // Same priority - FIFO
      return a.createdAt - b.createdAt;
    });
    
    return this.queue.shift();
  }
  
  /**
   * Remove command from queue
   */
  removeFromQueue(commandId) {
    this.queue = this.queue.filter(cmd => cmd.id !== commandId);
    this.executing.delete(commandId);
  }
  
  // ========================================================================
  // RATE LIMITING
  // ========================================================================
  
  /**
   * Enforce rate limit
   */
  async enforceRateLimit() {
    const now = Date.now();
    
    // Clean old timestamps
    this.commandTimestamps = this.commandTimestamps.filter(
      t => now - t < this.rateLimitWindow
    );
    
    // Check limit
    if (this.commandTimestamps.length >= this.options.rateLimit) {
      const oldestTimestamp = this.commandTimestamps[0];
      const waitTime = this.rateLimitWindow - (now - oldestTimestamp);
      
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
    }
    
    // Add current timestamp
    this.commandTimestamps.push(now);
  }
  
  // ========================================================================
  // AUTOFIX STRATEGIES
  // ========================================================================
  
  /**
   * Apply autofix strategy
   */
  async applyAutofix(strategy, command) {
    try {
      switch (strategy) {
      case 'cleanupAddressTable':
        await this.cleanupAddressTable();
        break;
        
      case 'cleanupRoutingTable':
        await this.cleanupRoutingTable();
        break;
        
      case 'queueBroadcast':
        // Already handled by queue system
        break;
        
      default:
        this.log(`Unknown autofix strategy: ${strategy}`);
      }
    } catch (err) {
      this.error(`Autofix ${strategy} failed:`, err);
    }
  }
  
  /**
   * Cleanup address table (for 0x87 error)
   */
  async cleanupAddressTable() {
    this.log('[Autofix] Cleaning up address table...');
    
    // Notify health monitor
    if (this.homey.app && this.homey.app.healthMonitor) {
      await this.homey.app.healthMonitor.handle0x87Error();
    }
  }
  
  /**
   * Cleanup routing table (for 0x8A error)
   */
  async cleanupRoutingTable() {
    this.log('[Autofix] Cleaning up routing table...');
    
    // Implementation depends on Homey API
    // This is a placeholder for the actual cleanup logic
  }
  
  // ========================================================================
  // UTILITIES
  // ========================================================================
  
  /**
   * Extract error code from error object
   */
  extractErrorCode(error) {
    // Try various error formats
    if (error.code) return error.code;
    if (error.statusCode) return error.statusCode;
    if (error.errorCode) return error.errorCode;
    
    // Try to extract from message
    const match = error.message && error.message.match(/0x([0-9A-Fa-f]{2})/);
    if (match) {
      return parseInt(match[1], 16);
    }
    
    return 0xFF; // Unknown error
  }
  
  /**
   * Generate unique command ID
   */
  generateCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.queue.length,
      executing: this.executing.size,
      successRate: this.stats.total > 0 
        ? ((this.stats.success / this.stats.total) * 100).toFixed(2) + '%'
        : '0%',
      retryRate: this.stats.total > 0
        ? ((this.stats.retried / this.stats.total) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
  
  /**
   * Reset statistics
   */
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
  
  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => this.homey.setTimeout(resolve, ms));
  }
  
  // Logging helpers
  log(...args) {
    console.log('[ZigbeeCommandManager]', ...args);
  }
  
  error(...args) {
    console.error('[ZigbeeCommandManager]', ...args);
  }
}

module.exports = ZigbeeCommandManager;
