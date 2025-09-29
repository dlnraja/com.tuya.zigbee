declare namespace Homey {
  /**
   * Base device class for Homey devices
   */
  interface Device {
    // Core properties
    id: string;
    name: string;
    data: Record<string, any>;
    settings: Record<string, any>;
    store: Record<string, any>;
    available: boolean;
    
    // Logger methods
    log(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    debug(...args: any[]): void;
    silly(...args: any[]): void;
    
    // Device state
    setAvailable(): Promise<void>;
    setUnavailable(error?: string): Promise<void>;
    
    // Settings
    getSettings(): Promise<Record<string, any>>;
    setSettings(settings: Record<string, any>): Promise<void>;
    
    // Store
    getStore(): Record<string, any>;
    setStore(store: Record<string, any>): Promise<void>;
    getStoreValue(key: string): any;
    setStoreValue(key: string, value: any): Promise<void>;
    unsetStoreValue(key: string): Promise<void>;
    
    // Capabilities
    hasCapability(capability: string): boolean;
    addCapability(capability: string): Promise<void>;
    removeCapability(capability: string): Promise<void>;
    getCapabilityValue(capability: string): any;
    setCapabilityValue(capability: string, value: any): Promise<void>;
    registerCapabilityListener(
      capability: string, 
      callback: (value: any, opts?: any) => Promise<void>
    ): Promise<void>;
    
    // Events
    on(event: string, callback: (...args: any[]) => void): this;
    once(event: string, callback: (...args: any[]) => void): this;
    off(event: string, callback: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
    
    // Lifecycle methods
    onInit(): Promise<void>;
    onAdded(): Promise<void>;
    onRenamed(name: string): Promise<void>;
    onSettings(oldSettings: Record<string, any>, newSettings: Record<string, any>, changedKeys: string[]): Promise<void>;
    onUninit(): Promise<void>;
    onDeleted(): Promise<void>;
  }
}

declare module 'homey' {
  export = {
    Device: Homey.Device,
  };
}
