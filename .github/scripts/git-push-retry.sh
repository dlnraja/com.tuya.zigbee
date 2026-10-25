#!/usr/bin/env bash
# WHY(P3025, 25/10/2026 Paris): one race-safe push for every bot workflow. Before this, 16 workflows
# pushed with their own loop: bare `git push` (no retry), `git pull --rebase ... || true` BEFORE the
# commit (fails on a dirty tree, silently), `push || true` (lost commits never reported), linear sleeps
# that collided again, and `-X ours/theirs` rebases that differed per workflow. Several bots push to
# master within the same minute (cron :00/:30), so non-fast-forward rejects were the norm.
#
# Why serialize HERE and not with one shared workflow-level `concurrency:` group: GitHub keeps at most
# ONE pending run per group and cancels the others, so a repo-wide group would drop scheduled bot runs
# (lost work). Pushing is the only racy part, so it is retried with fetch + rebase + exponential backoff
# + jitter; every run still completes.
#
# Contract: commit first, then call this. Never forces, never rewrites published history.
#   git-push-retry.sh [--branch B] [--remote R] [--attempts N] [--prefer-local|--prefer-remote] [--tag T]
#   --prefer-remote (P3025b): on a rebase conflict the upstream side wins (old `rebase -X ours`).
#   --tag T (P3025b): after the branch is on the remote, point local tag T at the pushed HEAD and push
#     it WITHOUT force (retried). Remote tag already on the same commit = success; on another commit =
#     ::warning:: and left untouched (versions are strictly incremental, a tag is never moved remotely).
#   env: PUSH_RETRY_ATTEMPTS (5) PUSH_RETRY_BASE_S (4) PUSH_RETRY_CAP_S (60) PUSH_RETRY_JITTER_S (7)
# Exit: 0 pushed or nothing to push; 3 rebase conflict (rebase aborted, nothing pushed); 4 retries exhausted.
# Writes pushed=true|false to $GITHUB_OUTPUT when set.
set -u
REMOTE="${PUSH_RETRY_REMOTE:-origin}"
BRANCH="${PUSH_RETRY_BRANCH:-${GITHUB_REF_NAME:-}}"
ATTEMPTS="${PUSH_RETRY_ATTEMPTS:-5}"
BASE="${PUSH_RETRY_BASE_S:-4}"
CAP="${PUSH_RETRY_CAP_S:-60}"
JITTER="${PUSH_RETRY_JITTER_S:-7}"
XOPT=()
TAG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --branch) BRANCH="$2"; shift 2 ;;
    --remote) REMOTE="$2"; shift 2 ;;
    --attempts) ATTEMPTS="$2"; shift 2 ;;
    --prefer-local) XOPT=(-X theirs); shift ;;   # on a rebase, "theirs" = the bot commit being replayed
    --prefer-remote) XOPT=(-X ours); shift ;;    # on a rebase, "ours" = the upstream commit (P3025b)
    --tag) TAG="$2"; shift 2 ;;
    *) echo "git-push-retry: unknown arg $1" >&2; exit 2 ;;
  esac
done
[ -n "$BRANCH" ] || BRANCH="$(git rev-parse --abbrev-ref HEAD)"
out() { [ -n "${GITHUB_OUTPUT:-}" ] && echo "pushed=$1" >> "$GITHUB_OUTPUT"; return 0; }
log() { echo "git-push-retry[$BRANCH]: $*"; }

# P3025b: tag push after the branch push. Never forced; exit code of the script is unchanged by it.
push_tag() {
  [ -n "$TAG" ] || return 0
  git tag -f "$TAG" HEAD >/dev/null 2>&1   # local ref only: the commit that is really on the remote
  local want have j
  want="$(git rev-parse "$TAG^{commit}")"
  for j in $(seq 1 "$ATTEMPTS"); do
    have="$(git ls-remote "$REMOTE" "refs/tags/$TAG" "refs/tags/$TAG^{}" 2>/dev/null | awk '{print $1}' | tail -n 1)"
    if [ -n "$have" ]; then
      if [ "$have" = "$want" ]; then log "tag $TAG already on $REMOTE at ${want:0:10}"; return 0; fi
      echo "::warning::git-push-retry: tag $TAG already exists on $REMOTE at ${have:0:10} (local ${want:0:10}); left untouched (no force)"
      return 0
    fi
    if git push -q "$REMOTE" "refs/tags/$TAG"; then log "pushed tag $TAG -> ${want:0:10}"; return 0; fi
    log "tag push rejected (attempt $j/$ATTEMPTS)"
    [ "$j" -ge "$ATTEMPTS" ] || sleep "$BASE"
  done
  echo "::warning::git-push-retry: could not push tag $TAG after $ATTEMPTS attempts"
  return 0
}

for i in $(seq 1 "$ATTEMPTS"); do
  if ! git fetch -q "$REMOTE" "$BRANCH"; then
    log "fetch failed (attempt $i/$ATTEMPTS)"
  else
    if git merge-base --is-ancestor HEAD FETCH_HEAD; then log "nothing to push (HEAD already on $REMOTE/$BRANCH)"; push_tag; out false; exit 0; fi
    if ! git merge-base --is-ancestor FETCH_HEAD HEAD; then
      if ! git -c rebase.autoStash=true rebase -q "${XOPT[@]}" FETCH_HEAD; then
        git rebase --abort >/dev/null 2>&1 || true
        echo "::warning::git-push-retry: rebase conflict on $BRANCH; nothing pushed (no force, history untouched)"
        out false; exit 3
      fi
    fi
    if git push -q "$REMOTE" "HEAD:refs/heads/$BRANCH"; then log "pushed $(git rev-parse --short HEAD) (attempt $i/$ATTEMPTS)"; push_tag; out true; exit 0; fi
    log "push rejected (attempt $i/$ATTEMPTS)"
  fi
  [ "$i" -ge "$ATTEMPTS" ] && break
  d=$(( BASE * (1 << (i - 1)) )); [ "$d" -gt "$CAP" ] && d=$CAP
  [ "$JITTER" -gt 0 ] && d=$(( d + RANDOM % JITTER ))
  sleep "$d"
done
echo "::warning::git-push-retry: could not push to $BRANCH after $ATTEMPTS attempts"
out false; exit 4
