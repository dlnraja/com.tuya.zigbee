#!/usr/bin/env node
'use strict';

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const EventEmitter = require('events');

/**
 * Python Microservice Manager
 * Manages the lifecycle of the Python microservice
 */
class PythonService extends EventEmitter {
  /**
   * Create a new PythonService instance
   * @param {Object} options - Service options
   * @param {string} options.path - Path to Python service directory
   * @param {number} options.port - Port to run the service on
   * @param {string} options.apiKey - API key for authentication
   * @param {Object} options.logger - Logger instance
   */
  constructor({ path, port, apiKey, logger }) {
    super();
    this.path = path;
    this.port = port;
    this.apiKey = apiKey;
    this.logger = logger || console;
    this.process = null;
    this.isRunning = false;
  }

  /**
   * Start the Python service
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isRunning) {
      this.logger.warn('Python service is already running');
      return;
    }

    try {
      this.logger.info(`Starting Python service from ${this.path}...`);
      
      // Install dependencies
      await this._installDependencies();
      
      // Start the service
      await this._startService();
      
      // Verify service is running
      await this._waitForService();
      
      this.isRunning = true;
      this.emit('started');
      this.logger.info('Python service started successfully');
      
    } catch (error) {
      this.logger.error('Failed to start Python service:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop the Python service
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.process) {
      return;
    }

    try {
      this.logger.info('Stopping Python service...');
      
      // Try graceful shutdown first
      const isWindows = process.platform === 'win32';
      const killed = this.process.kill(isWindows ? 'SIGTERM' : 'SIGINT');
      
      if (killed) {
        // Wait for process to exit
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (this.process && !this.process.killed) {
              this.logger.warn('Force killing Python service...');
              this.process.kill('SIGKILL');
            }
            resolve();
          }, 5000);
          
          this.process.once('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
      
    } catch (error) {
      this.logger.error('Error stopping Python service:', error);
    } finally {
      this.process = null;
      this.isRunning = false;
      this.emit('stopped');
      this.logger.info('Python service stopped');
    }
  }

  /**
   * Restart the Python service
   * @returns {Promise<void>}
   */
  async restart() {
    this.logger.info('Restarting Python service...');
    await this.stop();
    await this.start();
  }

  /**
   * Check if the service is running
   * @returns {boolean}
   */
  isServiceRunning() {
    return this.isRunning && this.process && !this.process.killed;
  }

  /**
   * Install Python dependencies
   * @private
   * @returns {Promise<void>}
   */
  _installDependencies() {
    return new Promise((resolve, reject) => {
      const requirementsPath = path.join(this.path, 'requirements.txt');
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      
      this.logger.debug(`Installing Python dependencies from ${requirementsPath}...`);
      
      const pip = spawn(pythonCmd, ['-m', 'pip', 'install', '--upgrade', '-r', requirementsPath], {
        cwd: this.path,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let output = '';
      
      pip.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pip.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      pip.on('close', (code) => {
        if (code === 0) {
          this.logger.debug('Python dependencies installed successfully');
          resolve();
        } else {
          const error = new Error(`Failed to install Python dependencies (code ${code}): ${output}`);
          this.logger.error(error.message);
          reject(error);
        }
      });
    });
  }

  /**
   * Start the Python service process
   * @private
   * @returns {Promise<void>}
   */
  _startService() {
    return new Promise((resolve, reject) => {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const mainScript = path.join(this.path, 'main.py');
      
      this.process = spawn(pythonCmd, [mainScript], {
        cwd: this.path,
        env: {
          ...process.env,
          PORT: this.port,
          API_KEY: this.apiKey,
          PYTHONUNBUFFERED: '1',
          PYTHONPATH: this.path,
          DEBUG: process.env.DEBUG || '0'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      // Log process output
      this.process.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          this.logger.debug(`[Python] ${output}`);
        }
      });
      
      this.process.stderr.on('data', (data) => {
        const error = data.toString().trim();
        if (error) {
          this.logger.error(`[Python Error] ${error}`);
        }
      });
      
      // Handle process exit
      this.process.on('exit', (code, signal) => {
        this.isRunning = false;
        if (code !== null) {
          this.logger.warn(`Python service exited with code ${code}`);
        } else if (signal) {
          this.logger.warn(`Python service was terminated by signal: ${signal}`);
        }
        this.emit('exit', { code, signal });
      });
      
      // Handle process error
      this.process.on('error', (error) => {
        this.logger.error('Python service process error:', error);
        reject(error);
      });
      
      // Resolve when process starts
      setTimeout(resolve, 1000);
    });
  }

  /**
   * Wait for the service to be ready
   * @private
   * @returns {Promise<void>}
   */
  _waitForService() {
    return new Promise((resolve, reject) => {
      const maxAttempts = 30;
      let attempts = 0;
      
      const checkService = () => {
        attempts++;
        
        const client = net.createConnection({ port: this.port }, () => {
          client.end();
          clearTimeout(timeout);
          resolve();
        });
        
        client.on('error', () => {
          if (attempts >= maxAttempts) {
            clearTimeout(timeout);
            reject(new Error(`Service did not start after ${maxAttempts} attempts`));
          } else {
            setTimeout(checkService, 1000);
          }
        });
      };
      
      const timeout = setTimeout(() => {
        reject(new Error('Service startup timed out'));
      }, 30000);
      
      checkService();
    });
  }
}

module.exports = PythonService;
