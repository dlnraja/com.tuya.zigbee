#!/usr/bin/env node
export = ScoringEngine;
declare class ScoringEngine {
    weights: {
        official_manufacturer: number;
        official_platform: number;
        upstream_repo: number;
        reputable_forum: number;
        local_pairing_log: number;
        local_event_log: number;
        retailer: number;
        blog_video: number;
    };
    bonuses: {
        diversity_consensus: number;
        dp_evidence: number;
        recent_data: number;
    };
    penalties: {
        contradictions: number;
        single_source: number;
        outdated_data: number;
    };
    calculateDeviceScore(deviceData: any, sources: any): number;
    _calculateBaseScore(sources: any): number;
    _applyBonuses(score: any, sources: any, deviceData: any): any;
    _applyPenalties(score: any, sources: any, deviceData: any): any;
    _hasDiversityConsensus(sources: any): boolean;
    _hasDPEvidence(deviceData: any): any;
    _hasRecentData(sources: any): any;
    _detectContradictions(sources: any): boolean;
    _isSingleSourceNonLocal(sources: any): boolean;
    _hasOutdatedData(sources: any): any;
    _extractDomain(url: any): any;
    getRecommendedStatus(score: any): "confirmed" | "proposed" | "tracking";
    generateScoringReport(deviceData: any, sources: any, score: any): {
        deviceId: string;
        score: any;
        status: string;
        confidence: string;
        sources: any;
        domains: number;
        hasDPEvidence: any;
        hasContradictions: boolean;
        recommendations: string[];
        timestamp: string;
    };
    _getConfidenceLevel(score: any): "excellent" | "very_good" | "good" | "fair" | "poor";
    _generateRecommendations(score: any, sources: any): string[];
}
//# sourceMappingURL=scoringEngine.d.ts.map