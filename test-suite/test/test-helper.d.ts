#!/usr/bin/env node
export namespace mockHomey {
    function __(key: any): any;
    namespace homey {
        export function ___1(key: any): any;
        export { ___1 as __ };
        export function __n(key: any): any;
    }
    namespace log {
        let info: any;
        let error: any;
        let warn: any;
        let debug: any;
        let verbose: any;
        let silly: any;
    }
    namespace settings {
        let get: any;
        let set: any;
        let unset: any;
    }
    namespace cloud {
        let getLocalAddress: any;
    }
}
export class HomeyAPI {
    static create(version?: string): Promise<{
        devices: {
            on: any;
            getDevice: any;
            getDevices: any;
        };
        zones: {
            on: any;
            getZones: any;
        };
        i18n: {
            __: (key: any) => any;
        };
        version: string;
    }>;
}
export class HomeyApp {
    homey: {
        __: (key: any) => any;
        homey: {
            __: (key: any) => any;
            __n: (key: any) => any;
        };
        log: {
            info: any;
            error: any;
            warn: any;
            debug: any;
            verbose: any;
            silly: any;
        };
        settings: {
            get: any;
            set: any;
            unset: any;
        };
        cloud: {
            getLocalAddress: any;
        };
    };
    log: {
        info: any;
        error: any;
        warn: any;
        debug: any;
        verbose: any;
        silly: any;
    };
    error: any;
    debug: any;
}
export class HomeyDevice {
    constructor(deviceData?: {});
    id: any;
    name: any;
    data: any;
    store: any;
    settings: any;
    capabilities: any;
    capabilityObj: any;
    getStoreValue: any;
    setStoreValue: any;
    unsetStoreValue: any;
    getSettings: any;
    setSettings: any;
    getSetting: any;
    setSetting: any;
    hasCapability: any;
    addCapability: any;
    removeCapability: any;
    getCapabilityValue: any;
    setCapabilityValue: any;
    registerCapabilityListener: any;
    registerMultipleCapabilityListener: any;
    registerSetting: any;
    registerReportListener: any;
    registerAttrReportListener: any;
    unregisterReportListener: any;
    setUnavailable: any;
    setAvailable: any;
    setWarning: any;
    unsetWarning: any;
    destroy: any;
}
export class FlowCardAction {
    register: any;
    registerRunListener: any;
    trigger: any;
}
export class FlowCardCondition {
    register: any;
    registerRunListener: any;
}
export class FlowCardTrigger {
    register: any;
    registerRunListener: any;
    trigger: any;
}
export class SimpleClass {
    log: {
        info: any;
        error: any;
        warn: any;
        debug: any;
        verbose: any;
        silly: any;
    };
}
export const expect: any;
export { sinon };
//# sourceMappingURL=test-helper.d.ts.map