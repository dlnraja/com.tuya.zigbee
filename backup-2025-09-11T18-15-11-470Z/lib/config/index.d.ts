#!/usr/bin/env node
export namespace app {
    let name: string;
    let version: string;
    let minHomeyVersion: string;
}
export namespace logging {
    let level: string;
    let maxFiles: number;
    let maxSize: string;
    let file: string;
    let console: boolean;
    let fileTransport: boolean;
}
export namespace tuya {
    let defaultRegion: string;
    namespace endpoints {
        export let us: string;
        export let eu: string;
        export let cn: string;
        let _in: string;
        export { _in as in };
    }
    namespace timeouts {
        let request: number;
        let refreshToken: number;
    }
    namespace rateLimit {
        let windowMs: number;
        let max: number;
    }
}
export namespace devices {
    export let pollingInterval: number;
    export namespace timeouts_1 {
        let command: number;
        let discovery: number;
    }
    export { timeouts_1 as timeouts };
    export namespace types {
        export let plug: string;
        export let light: string;
        let _switch: string;
        export { _switch as switch };
        export let sensor: string;
    }
}
export namespace flows {
    namespace triggers {
        let deviceDiscovered: string;
        let deviceStateChanged: string;
        let deviceError: string;
    }
    namespace conditions {
        let deviceIsOn: string;
        let deviceIsOff: string;
    }
    namespace actions {
        let turnOn: string;
        let turnOff: string;
        let toggle: string;
    }
}
export namespace errors {
    let AUTH_FAILED: string;
    let DEVICE_NOT_FOUND: string;
    let DEVICE_OFFLINE: string;
    let RATE_LIMIT: string;
    let NETWORK_ERROR: string;
    let INVALID_RESPONSE: string;
    let UNKNOWN_ERROR: string;
}
export namespace defaultSettings {
    export let debug: boolean;
    export let region: string;
    let pollingInterval_1: number;
    export { pollingInterval_1 as pollingInterval };
}
//# sourceMappingURL=index.d.ts.map