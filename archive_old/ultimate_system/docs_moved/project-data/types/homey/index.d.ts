// Basic Homey type definitions
declare module 'homey' {
  interface HomeyLogger {
    info: (...args: any[]) => void;
    error: (...args: any[]) => void;
    debug: (...args: any[]) => void;
    log?: (...args: any[]) => void;
    warn?: (...args: any[]) => void;
  }

  interface HomeyDevice {
    // Core properties
    homey: any;
    logger: HomeyLogger;
    
    // Core methods
    getData(): any;
    getSettings(): Promise<any>;
    setSettings(settings: any): Promise<void>;
    getStore(): any;
    setStore(store: any): Promise<void>;
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
    
    // Events
    on(event: string, callback: (...args: any[]) => void): this;
    once(event: string, callback: (...args: any[]) => void): this;
    removeListener(event: string, callback: (...args: any[]) => void): this;
    removeAllListeners(event?: string): this;
    emit(event: string, ...args: any[]): boolean;
  }

  interface HomeyDriver {
    // Core properties
    homey: any;
    logger: HomeyLogger;
    
    // Core methods
    getDevices(): HomeyDevice[];
    getDevice(deviceId: string): HomeyDevice | null;
    getDeviceById(deviceId: string): HomeyDevice | null;
    getDevicesByDeviceData(deviceData: any): HomeyDevice[];
    getDevicesByData(data: any): HomeyDevice[];
    
    // Pairing
    onPair(session: any): void;
    onPairListDevices(session: any, data: any, callback: (error: Error | null, devices: any[]) => void): void;
    
    // Events
    on(event: string, callback: (...args: any[]) => void): this;
    once(event: string, callback: (...args: any[]) => void): this;
    removeListener(event: string, callback: (...args: any[]) => void): this;
    removeAllListeners(event?: string): this;
    emit(event: string, ...args: any[]): boolean;
  }

  interface HomeyApp {
    // Add app-specific methods and properties here
  }

  interface HomeyStatic {
    app: HomeyApp;
    __(key: string, tokens?: Record<string, any>): string;
  }
}

// Global Node.js types
declare namespace NodeJS {
  interface Timeout {}
  interface Process {
    env: {
      [key: string]: string | undefined;
    };
  }
}

// Global Homey instance
declare const Homey: import('homey').HomeyStatic;
