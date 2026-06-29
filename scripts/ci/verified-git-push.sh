#!/usr/bin/env bash
set -euo pipefail

branch="${1:-${GITHUB_REF_NAME:-master}}"
remote="${2:-origin}"
git_bin="${GIT:-git}"

if [ -z "${GIT:-}" ] \
  && [ -f .git ] \
  && grep -qi microsoft /proc/version 2>/dev/null \
  && grep -Eq '^gitdir: [A-Za-z]:/' .git \
  && command -v git.exe >/dev/null 2>&1; then
  git_bin="git.exe"
fi

if [ -z "$branch" ]; then
  echo "::error::No branch supplied and GITHUB_REF_NAME is empty"
  exit 1
fi

"$git_bin" fetch "$remote" "$branch"
"$git_bin" rebase "$remote/$branch"
"$git_bin" push "$remote" "HEAD:refs/heads/$branch"
"$git_bin" fetch "$remote" "$branch"

if ! "$git_bin" merge-base --is-ancestor HEAD "$remote/$branch"; then
  echo "::error::HEAD is not reachable from $remote/$branch after push"
  exit 1
fi

echo "Verified push: HEAD is reachable from $remote/$branch"
