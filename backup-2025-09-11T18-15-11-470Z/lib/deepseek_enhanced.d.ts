#!/usr/bin/env node
export = DeepSeekEnhancer;
declare class DeepSeekEnhancer {
    constructor(config: any);
    mode: any;
    analysisDepth: any;
    timeout: any;
    analyzeCommits(commitMessages: any): Promise<{
        deviceAdditions: any;
        bugFixes: any;
        enhancements: any;
        metadataChanges: any;
    }>;
    processTechnicalDocs(docs: any): Promise<any>;
}
//# sourceMappingURL=deepseek_enhanced.d.ts.map