#!/usr/bin/env node
export = TuyaAPI;
declare class TuyaAPI {
    constructor({ clientId, clientSecret, region, logger, accessToken, refreshToken }: {
        clientId: any;
        clientSecret: any;
        region?: string | undefined;
        logger: any;
        accessToken?: null | undefined;
        refreshToken?: null | undefined;
    });
    clientId: any;
    clientSecret: any;
    region: string;
    logger: any;
    accessToken: any;
    refreshToken: any;
    baseUrl: any;
    http: any;
    _getBaseUrl(region: any): any;
    _sign(method: any, path: any, params?: {}, body?: {}): {
        sign: any;
        timestamp: string;
        nonce: string;
    };
    authenticate(): Promise<{
        accessToken: any;
        refreshToken: any;
        expiresIn: number;
    }>;
    refreshTimer: number | null | undefined;
    refreshAccessToken(): Promise<{
        accessToken: any;
        refreshToken: any;
        expiresIn: number;
    }>;
    getDevice(deviceId: any): Promise<any>;
    getDeviceStatus(deviceId: any): Promise<any>;
    sendCommand(deviceId: any, commands: any): Promise<any>;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=TuyaAPI.d.ts.map