'use strict';

const FAILED_STATES = new Set(['processing_failed', 'error', 'failed', 'revoked']);
const SUCCESS_STATES = new Set(['draft', 'test', 'live', 'published', 'ready']);
const TEST_STATES = new Set(['test', 'live', 'published']);

function normalizeText(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (typeof value !== 'object') return String(value);

  for (const key of ['message', 'error', 'reason', 'detail', 'details', 'description', 'statusText']) {
    if (value[key]) return normalizeText(value[key]);
  }

  try {
    const json = JSON.stringify(value);
    return json === '{}' ? '' : json;
  } catch {
    return String(value);
  }
}

function rawStateMeta(build) {
  return build?.stateMeta || build?.state_meta || build?.error || build?.errorMessage || build?.feedback || build?.message || '';
}

function stateMeta(build) {
  return normalizeText(rawStateMeta(build));
}

function isFailedBuild(build) {
  return FAILED_STATES.has(build?.state);
}

function isSuccessfulBuild(build) {
  return !isFailedBuild(build) && SUCCESS_STATES.has(build?.state);
}

function isTestBuild(build) {
  return TEST_STATES.has(build?.state);
}

function normalizeBuildId(build) {
  const id = Number(build?.id || build?.buildId || build?._id || 0);
  return Number.isFinite(id) ? id : 0;
}

function normalizeBuildTime(build) {
  return build?.stateChangedAt || build?.state_changed_at || build?.createdAt || build?.created_at || null;
}

function compareBuildsDesc(a, b) {
  const bid = normalizeBuildId(b);
  const aid = normalizeBuildId(a);
  if (bid !== aid) return bid - aid;
  return String(normalizeBuildTime(b) || '').localeCompare(String(normalizeBuildTime(a) || ''));
}

function summarizeBuild(build, appId = '') {
  if (!build) return null;
  const id = build.id || build.buildId || build._id || null;
  return {
    id,
    version: build.version || build.appVersion || build.semver || null,
    state: build.state || build.channel || build.status || null,
    stateMeta: rawStateMeta(build) || null,
    failureDetail: stateMeta(build) || null,
    createdAt: build.createdAt || build.created_at || null,
    stateChangedAt: build.stateChangedAt || build.state_changed_at || null,
    sdk: build.sdk ?? null,
    platforms: build.platforms || null,
    url: id && appId ? `https://tools.developer.homey.app/apps/app/${appId}/build/${id}` : null,
  };
}

function updateDateRange(summary, build) {
  const seenAt = normalizeBuildTime(build);
  if (!seenAt) return;
  if (!summary.firstSeenAt || String(seenAt).localeCompare(summary.firstSeenAt) < 0) {
    summary.firstSeenAt = seenAt;
  }
  if (!summary.lastSeenAt || String(seenAt).localeCompare(summary.lastSeenAt) > 0) {
    summary.lastSeenAt = seenAt;
  }
}

function compactVersionSummary(summary) {
  const failureDetails = Object.entries(summary.failureDetails)
    .map(([detail, count]) => ({ detail, count }))
    .sort((a, b) => b.count - a.count || a.detail.localeCompare(b.detail));

  return {
    version: summary.version,
    totalBuilds: summary.totalBuilds,
    successfulBuilds: summary.successfulBuilds,
    failedBuilds: summary.failedBuilds,
    testBuilds: summary.testBuilds,
    draftBuilds: summary.draftBuilds,
    latestBuildId: summary.latestBuild?.id || null,
    latestState: summary.latestBuild?.state || null,
    latestFailureDetail: summary.latestFailureDetail || null,
    firstSeenAt: summary.firstSeenAt,
    lastSeenAt: summary.lastSeenAt,
    lastSuccessfulAt: summary.lastSuccessfulAt,
    lastTestAt: summary.lastTestAt,
    states: summary.states,
    failureDetails,
    latestBuild: summary.latestBuild,
    latestSuccessfulBuild: summary.latestSuccessfulBuild,
    latestTestBuild: summary.latestTestBuild,
    working: summary.successfulBuilds > 0,
    inTest: summary.testBuilds > 0,
  };
}

function summarizeVersionHistory(builds, options = {}) {
  const appId = options.appId || '';
  const sorted = (Array.isArray(builds) ? builds : []).slice().sort(compareBuildsDesc);
  const byVersion = new Map();
  const failurePatternMap = new Map();

  for (const build of sorted) {
    const version = String(build.version || build.appVersion || build.semver || 'unknown');
    if (!byVersion.has(version)) {
      byVersion.set(version, {
        version,
        totalBuilds: 0,
        successfulBuilds: 0,
        failedBuilds: 0,
        testBuilds: 0,
        draftBuilds: 0,
        states: {},
        failureDetails: {},
        firstSeenAt: null,
        lastSeenAt: null,
        lastSuccessfulAt: null,
        lastTestAt: null,
        latestBuild: null,
        latestSuccessfulBuild: null,
        latestTestBuild: null,
        latestFailureDetail: null,
      });
    }

    const summary = byVersion.get(version);
    const buildSummary = summarizeBuild(build, appId);
    const state = buildSummary.state || 'unknown';
    const failureDetail = stateMeta(build);

    summary.totalBuilds += 1;
    summary.states[state] = (summary.states[state] || 0) + 1;
    updateDateRange(summary, build);

    if (!summary.latestBuild || normalizeBuildId(buildSummary) > normalizeBuildId(summary.latestBuild)) {
      summary.latestBuild = buildSummary;
    }

    if (isSuccessfulBuild(build)) {
      summary.successfulBuilds += 1;
      summary.lastSuccessfulAt = summary.lastSuccessfulAt && normalizeBuildTime(build)
        ? [summary.lastSuccessfulAt, normalizeBuildTime(build)].sort().pop()
        : normalizeBuildTime(build) || summary.lastSuccessfulAt;
      if (!summary.latestSuccessfulBuild || normalizeBuildId(buildSummary) > normalizeBuildId(summary.latestSuccessfulBuild)) {
        summary.latestSuccessfulBuild = buildSummary;
      }
    }

    if (isTestBuild(build)) {
      summary.testBuilds += 1;
      summary.lastTestAt = summary.lastTestAt && normalizeBuildTime(build)
        ? [summary.lastTestAt, normalizeBuildTime(build)].sort().pop()
        : normalizeBuildTime(build) || summary.lastTestAt;
      if (!summary.latestTestBuild || normalizeBuildId(buildSummary) > normalizeBuildId(summary.latestTestBuild)) {
        summary.latestTestBuild = buildSummary;
      }
    }

    if (state === 'draft') summary.draftBuilds += 1;

    if (isFailedBuild(build)) {
      summary.failedBuilds += 1;
      if (failureDetail) {
        summary.failureDetails[failureDetail] = (summary.failureDetails[failureDetail] || 0) + 1;
        summary.latestFailureDetail = summary.latestFailureDetail || failureDetail;
        if (!failurePatternMap.has(failureDetail)) {
          failurePatternMap.set(failureDetail, {
            detail: failureDetail,
            count: 0,
            latestBuildId: null,
            latestVersion: null,
            latestAt: null,
          });
        }
        const pattern = failurePatternMap.get(failureDetail);
        pattern.count += 1;
        if (!pattern.latestBuildId || normalizeBuildId(build) > pattern.latestBuildId) {
          pattern.latestBuildId = normalizeBuildId(build);
          pattern.latestVersion = version;
          pattern.latestAt = normalizeBuildTime(build);
        }
      }
    }
  }

  const versionHistory = Array.from(byVersion.values())
    .map(compactVersionSummary)
    .sort((a, b) => (b.latestBuildId || 0) - (a.latestBuildId || 0));
  const workingVersions = versionHistory.filter(item => item.working);
  const testVersions = versionHistory.filter(item => item.inTest);
  const failedOnlyVersions = versionHistory.filter(item => !item.working && item.failedBuilds > 0);
  const failurePatterns = Array.from(failurePatternMap.values())
    .sort((a, b) => b.count - a.count || (b.latestBuildId || 0) - (a.latestBuildId || 0));

  return {
    totalVersions: versionHistory.length,
    workingVersionCount: workingVersions.length,
    testVersionCount: testVersions.length,
    failedOnlyVersionCount: failedOnlyVersions.length,
    latestWorkingVersion: workingVersions[0] || null,
    latestTestVersion: testVersions[0] || null,
    workingVersions,
    testVersions,
    failedOnlyVersions,
    failurePatterns,
    versionHistory,
  };
}

module.exports = {
  FAILED_STATES,
  SUCCESS_STATES,
  TEST_STATES,
  normalizeText,
  rawStateMeta,
  stateMeta,
  isFailedBuild,
  isSuccessfulBuild,
  isTestBuild,
  compareBuildsDesc,
  summarizeBuild,
  summarizeVersionHistory,
};
