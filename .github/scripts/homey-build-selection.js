'use strict';

function normalizeVersion(version) {
  return String(version || '').trim().replace(/^v/i, '');
}

function rawBuildId(build) {
  return build?.id || build?.buildId || build?._id || null;
}

function numericBuildId(build) {
  const raw = rawBuildId(build);
  if (raw == null) return 0;
  const match = String(raw).match(/\d+/g);
  return match ? Number(match[match.length - 1]) : 0;
}

function buildState(build) {
  return String(build?.state || build?.channel || build?.status || '').trim().toLowerCase();
}

function buildTimeMs(build) {
  for (const key of ['stateChangedAt', 'updatedAt', 'createdAt', 'lastUpdatedAt', 'lastUpdated']) {
    const value = build?.[key];
    if (!value) continue;
    const ms = Date.parse(value);
    if (Number.isFinite(ms)) return ms;
  }
  return 0;
}

function normalizeBuild(build) {
  return {
    ...build,
    id: rawBuildId(build),
    version: normalizeVersion(build?.version || build?.appVersion || build?.semver),
    state: buildState(build),
  };
}

function sortBuildsDesc(builds) {
  return [...builds].sort((a, b) => {
    const byId = numericBuildId(b) - numericBuildId(a);
    if (byId) return byId;
    return buildTimeMs(b) - buildTimeMs(a);
  });
}

function isDraft(build) {
  return buildState(build) === 'draft';
}

function isTest(build) {
  return buildState(build) === 'test';
}

function summarizeBuild(build) {
  if (!build) return 'none';
  return `#${rawBuildId(build) || '?'} v${normalizeVersion(build.version || build.appVersion || build.semver) || '?'} ${buildState(build) || 'unknown'}`;
}

function selectPromotionTarget(rawBuilds, expectedVersion) {
  const builds = sortBuildsDesc((rawBuilds || []).filter(Boolean).map(normalizeBuild));
  const expected = normalizeVersion(expectedVersion);

  if (expected) {
    const matching = builds.filter(build => normalizeVersion(build.version) === expected);
    const matchingTest = matching.find(isTest);
    if (matchingTest) {
      return { status: 'already-test', build: matchingTest, builds, expected };
    }

    const matchingDraft = sortBuildsDesc(matching.filter(isDraft))[0];
    if (matchingDraft) {
      return { status: 'promote', build: matchingDraft, builds, expected };
    }

    if (matching.length) {
      return { status: 'current-not-promotable', build: matching[0], builds, expected };
    }

    return { status: 'current-not-found', build: builds[0] || null, builds, expected };
  }

  const draft = sortBuildsDesc(builds.filter(isDraft))[0];
  if (draft) return { status: 'promote', build: draft, builds, expected: '' };
  return { status: 'no-draft', build: builds[0] || null, builds, expected: '' };
}

module.exports = {
  normalizeVersion,
  numericBuildId,
  buildState,
  normalizeBuild,
  sortBuildsDesc,
  isDraft,
  isTest,
  summarizeBuild,
  selectPromotionTarget,
};
