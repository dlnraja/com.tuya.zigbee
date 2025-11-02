# TEST PR INSTRUCTIONS

**Branch**: test-pr-handler-1762088084385
**Created**: 02/11/2025 13:55:00

## Create PR

### Option 1: GitHub Web

1. Visit: https://github.com/dlnraja/com.tuya.zigbee/compare/test-pr-handler-1762088084385
2. Click "Create Pull Request"
3. Title: "Test: Auto-PR Handler"
4. Description: "Testing auto-pr-handler workflow"
5. Click "Create Pull Request"

### Option 2: GitHub CLI

```bash
gh pr create --base master --head test-pr-handler-1762088084385 --title "Test: Auto-PR Handler" --body "Testing auto-pr-handler workflow"
```

## Monitor

1. **Workflow Run**: https://github.com/dlnraja/com.tuya.zigbee/actions
2. **PR Page**: Will be created after PR creation

## Expected Results

1. ✅ PR opened
2. ✅ Auto-comment posted (welcome message)
3. ✅ Labels added: "auto-review"
4. ✅ Validation scripts run
5. ✅ Validation passes (TEST_PR.md is valid)
6. ✅ Auto-merge executed
7. ✅ Thank you comment posted

## Cleanup

After test completes:
```bash
git checkout master
git branch -D test-pr-handler-1762088084385
git push origin --delete test-pr-handler-1762088084385
```

---

**Status**: Ready to create PR  
**Date**: 02/11/2025 13:55:00
