# Branching strategy — master vs stable-v5 (P51)

## Key insight
The 2 branches share the SAME codebase (both v9.0.x architecture). But they are different **apps** with different goals.

## Master
- **Channel**: development / bleeding edge
- **Version**: v9.0.x (auto-bumped by auto-fix-all bot)
- **Audience**: users who want latest features immediately
- **Receives**: ALL commits (features + fixes)
- **Publish workflow**: 🚀 Publish Master to Test

## stable-v5
- **Channel**: stable / LTS backport
- **Version**: v9.0.x-stable (manual suffix to distinguish)
- **Audience**: users who want stability, LTS-like
- **Receives**: ONLY safe bug fixes (TITAN, typo, FPs, battery profiles, TITAN warnings)
- **Does NOT receive**: new architecture features (multi-channel, AVE, daily-digest, new chem profiles)
- **Publish workflow**: 🚀 Publish Stable to Test

## Sync strategy (NEW)

### What to sync to stable-v5 (safe):
- Driver typo corrections (doorwindowsensor_2 → doorwindowsensor2)
- New FPs from #439 (when validated)
- Battery chem/mfr profiles (additions only)
- TITAN v5 violations in actively-used scripts
- TITAN v5 violations in lib/ (multi-channel engine improvements)

### What NOT to sync to stable-v5 (new features):
- New architecture (MultiChannelManager, TransmissionManager, etc.)
- New tools (daily-digest, smart-variant-handler improvements)
- AI bonus layer (LocalFirstEngine.callAI)
- Sacred Couple refactor
- New workflows (autonomous-verification.yml, etc.)

### Sync procedure
1. Identify safe changes (look for [fix] or [chore] commits only)
2. Cherry-pick individually OR apply via dedicated script
3. NEVER `git reset --hard origin/master` on stable-v5
4. Let stable-v5 maintain its own commit history
5. Auto-fix-all bot will handle version bumps independently

## Implementation
- A new tool `tools/ci/safe-sync-to-stable.js` identifies and applies safe commits
- Or use cherry-pick manually for each safe change
