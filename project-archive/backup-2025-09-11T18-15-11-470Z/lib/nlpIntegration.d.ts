#!/usr/bin/env node
export = NLPIntegration;
declare class NLPIntegration {
    constructor(app: any);
    app: any;
    api: any;
    init(): Promise<void>;
    processQuery(query: any): Promise<any[]>;
    _cleanQuery(query: any): any;
    _tokenize(query: any): any;
    _extractFeatures(tokens: any): {
        type: never[];
        capability: never[];
        room: never[];
        state: never[];
        brand: never[];
    };
    _matchDevices(features: any): Promise<any[]>;
}
//# sourceMappingURL=nlpIntegration.d.ts.map