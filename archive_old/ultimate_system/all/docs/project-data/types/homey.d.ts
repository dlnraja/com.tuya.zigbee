/// <reference types="homey" />

declare module 'homey' {
  interface Device {
    logger: {
      info: (...args: any[]) => void;
      error: (...args: any[]) => void;
      debug: (...args: any[]) => void;
    };
    homey: any;
    api: any;
    device: any;
    setAvailable: () => Promise<void>;
    setUnavailable: (reason?: string) => Promise<void>;
    setCapabilityValue: (capabilityId: string, value: any) => Promise<void>;
    getCapabilityValue: (capabilityId: string) => any;
    registerCapabilityListener: (capabilityId: string, callback: (value: any, opts?: any) => Promise<void>) => Promise<void>;
    getData: () => any;
    setSettings: (settings: Record<string, any>) => Promise<void>;
  }

  interface Driver {
    homey: any;
    logger: {
      info: (...args: any[]) => void;
      error: (...args: any[]) => void;
      debug: (...args: any[]) => void;
    };
  }
}

// Tuya API types
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

  class TuyaDevice {
    constructor(options: TuyaDeviceOptions);
    find(): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    get(options?: any): Promise<any>;
    set(options: any): Promise<any>;
    refresh(options?: any): Promise<any>;
    getDevice(): Promise<any>;
    getDeviceInfo(): Promise<any>;
    getDeviceState(): Promise<any>;
    setDeviceState(state: any): Promise<any>;
    on(event: string, callback: (data: any) => void): void;
    removeListener(event: string, callback: (data: any) => void): void;
    removeAllListeners(event?: string): void;
  }

  export = TuyaDevice;
}
