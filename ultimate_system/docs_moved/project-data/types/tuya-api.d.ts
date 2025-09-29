/**
 * Tuya API Client Interface
 */
declare module 'tuyapi' {
  interface TuyaDeviceOptions {
    id: string;
    key: string;
    ip?: string;
    version?: string;
    issueRefreshOnConnect?: boolean;
    issueGetOnConnect?: boolean;
    issueGetOnPing?: boolean;
    issueGetOnPong?: boolean;
    issueGetOnConnectTimeout?: number;
    issueGetOnPingTimeout?: number;
    issueGetOnPongTimeout?: number;
    socketTimeout?: number;
    pingTimeout?: number;
    pingPongPeriod?: number;
    connectRetryTimeout?: number;
    maxRetryTime?: number;
    minRetryTime?: number;
    backoffFactor?: number;
    maxRetryCount?: number;
    retryCount?: number;
    maxRetryInterval?: number;
    minRetryInterval?: number;
    maxRetryJitter?: number;
    minRetryJitter?: number;
    maxRetryBackoff?: number;
    minRetryBackoff?: number;
    maxRetryBackoffJitter?: number;
    minRetryBackoffJitter?: number;
  }

  interface TuyaDeviceStatus {
    dps: {
      [key: string]: any;
    };
  }

  class TuyaDevice {
    constructor(options: TuyaDeviceOptions);
    
    /**
     * Find the device on the network
     * @returns {Promise<void>}
     */
    find(): Promise<void>;
    
    /**
     * Connect to the device
     * @returns {Promise<void>}
     */
    connect(): Promise<void>;
    
    /**
     * Disconnect from the device
     * @returns {Promise<void>}
     */
    disconnect(): Promise<void>;
    
    /**
     * Get device status
     * @param {Object} [options] - Options for the request
     * @returns {Promise<any>}
     */
    get(options?: any): Promise<any>;
    
    /**
     * Set device status
     * @param {Object} options - Options for the request
     * @returns {Promise<any>}
     */
    set(options: any): Promise<any>;
    
    /**
     * Refresh device status
     * @param {Object} [options] - Options for the request
     * @returns {Promise<any>}
     */
    refresh(options?: any): Promise<any>;
    
    /**
     * Get device info
     * @returns {Promise<any>}
     */
    getDevice(): Promise<any>;
    
    /**
     * Get device information
     * @returns {Promise<any>}
     */
    getDeviceInfo(): Promise<any>;
    
    /**
     * Get device state
     * @returns {Promise<any>}
     */
    getDeviceState(): Promise<any>;
    
    /**
     * Set device state
     * @param {Object} state - The state to set
     * @returns {Promise<any>}
     */
    setDeviceState(state: any): Promise<any>;
    
    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {void}
     */
    on(event: string, callback: (data: any) => void): void;
    
    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     * @returns {void}
     */
    removeListener(event: string, callback: (data: any) => void): void;
    
    /**
     * Remove all event listeners
     * @param {string} [event] - Optional event name
     * @returns {void}
     */
    removeAllListeners(event?: string): void;
  }

  export = TuyaDevice;
}
