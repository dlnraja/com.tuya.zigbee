/// <reference types="homey" />

/**
 * Device status interface
 */
interface DeviceStatus {
  onoff?: boolean;
  power?: number;
  voltage?: number;
  current?: number;
  [key: string]: any;
}

/**
 * Device data interface
 */
interface DeviceData {
  id: string;
  name: string;
  [key: string]: any;
}

/**
 * Base device class for Tuya devices
 */
declare class BaseDevice {
  // Device properties
  id: string;
  name: string;
  data: DeviceData;
  settings: Record<string, any>;
  store: Record<string, any>;
  
  // Status properties
  available: boolean;
  
  // Polling
  pollingInterval: number;
  pollingTimer: any; // Using any to avoid NodeJS.Timeout dependency
  
  // API client
  api: any;
  
  // Device capabilities
  capabilities: string[];
  
  // Status
  status: DeviceStatus;
  
  // Logger
  logger: {
    info: (...args: any[]) => void;
    error: (...args: any[]) => void;
    debug: (...args: any[]) => void;
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
  };
  
  // Homey instance
  homey: any;

  /**
   * Create a new BaseDevice
   * @param device - Device configuration
   * @param api - Tuya API client
   */
  constructor(device: DeviceData, api: any);

  // Core methods
  getData(): DeviceData;
  getSettings(): Promise<Record<string, any>>;
  setSettings(settings: Record<string, any>): Promise<void>;
  getStore(): Record<string, any>;
  setStore(store: Record<string, any>): Promise<void>;
  getStoreKeys(): string[];
  getStoreValue(key: string): any;
  setStoreValue(key: string, value: any): Promise<void>;
  unsetStoreValue(key: string): Promise<void>;
  
  // Capability methods
  hasCapability(capability: string): boolean;
  addCapability(capability: string): Promise<void>;
  removeCapability(capability: string): Promise<void>;
  getCapabilityValue(capability: string): any;
  setCapabilityValue(capability: string, value: any): Promise<void>;
  registerCapabilityListener(capability: string, callback: (value: any, opts?: any) => Promise<void>): Promise<void>;
  
  // Device status
  setAvailable(): Promise<void>;
  setUnavailable(reason?: string): Promise<void>;
  
  // Custom methods
  onInit(): Promise<void>;
  onDeleted(): Promise<void>;
  updateCapabilities(status: DeviceStatus): Promise<void>;
  syncStatus(): Promise<void>;
  onPoll(): Promise<void>;
  turnOn(): Promise<void>;
  turnOff(): Promise<void>;
  togglePower(): Promise<void>;
  
  // Event handling
  on(event: string, callback: (...args: any[]) => void): this;
  once(event: string, callback: (...args: any[]) => void): this;
  removeListener(event: string, callback: (...args: any[]) => void): this;
  removeAllListeners(event?: string): this;
  emit(event: string, ...args: any[]): boolean;
}

export = BaseDevice;
