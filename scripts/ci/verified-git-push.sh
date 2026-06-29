#!/usr/bin/env bash
set -euo pipefail

branch="${1:-${GITHUB_REF_NAME:-master}}"
remote="${2:-origin}"

if [ -z "$branch" ]; then
  echo "::error::No branch supplied and GITHUB_REF_NAME is empty"
  exit 1
fi

git fetch "$remote" "$branch"
git pull --rebase "$remote" "$branch"
git push "$remote" "HEAD:refs/heads/$branch"
git fetch "$remote" "$branch"

if ! git merge-base --is-ancestor HEAD "$remote/$branch"; then
  echo "::error::HEAD is not reachable from $remote/$branch after push"
  exit 1
fi

echo "Verified push: HEAD is reachable from $remote/$branch"
