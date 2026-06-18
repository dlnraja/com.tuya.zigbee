#!/bin/bash
# Setup TITAN v2 pre-commit hook
# Run this once after cloning the repository

HOOK_PATH=".git/hooks/pre-commit"

cat > "$HOOK_PATH" << 'EOF'
#!/bin/bash
# TITAN v2 Pre-Commit Hook
# Runs code quality checks before every commit

echo "Running TITAN v2 pre-commit checks..."
node scripts/ci/titan-pre-commit.js

if [ $? -ne 0 ]; then
  echo ""
  echo "Commit blocked: TITAN v2 violations found."
  echo "Fix the issues above or use 'git commit --no-verify' to bypass."
  exit 1
fi
EOF

chmod +x "$HOOK_PATH"
echo "TITAN v2 pre-commit hook installed at $HOOK_PATH"
