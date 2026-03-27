#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/resolve-kpi-conflicts.sh ours
#   scripts/resolve-kpi-conflicts.sh theirs
# Default strategy: ours

STRATEGY="${1:-ours}"
if [[ "$STRATEGY" != "ours" && "$STRATEGY" != "theirs" ]]; then
  echo "Invalid strategy: $STRATEGY (use 'ours' or 'theirs')" >&2
  exit 1
fi

FILES=(
  "src/config/kpiQuestions.ts"
  "src/data/mockData.ts"
  "src/pages/kpi/KpiAdmin.tsx"
)

echo "Checking conflicted files..."
CONFLICTED=()
for f in "${FILES[@]}"; do
  if git ls-files -u -- "$f" | grep -q .; then
    CONFLICTED+=("$f")
  fi
done

if [[ ${#CONFLICTED[@]} -eq 0 ]]; then
  echo "No merge conflicts found in target KPI files."
  exit 0
fi

echo "Resolving ${#CONFLICTED[@]} file(s) with strategy: $STRATEGY"
for f in "${CONFLICTED[@]}"; do
  git checkout "--$STRATEGY" -- "$f"
  git add "$f"
  echo "Resolved: $f"
done

echo "Done. Next steps:"
echo "  1) Review changes: git diff --cached"
echo "  2) Continue merge/rebase: git merge --continue OR git rebase --continue"
