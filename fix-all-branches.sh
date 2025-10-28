#!/bin/bash
set -e

echo "🔧 Applying lockfile fix to all branches"
echo "========================================"

BRANCHES=("chore/dependabot" "chore/react19-upgrade" "chore/tailwind4-migration")

for branch in "${BRANCHES[@]}"; do
    echo ""
    echo "📋 Updating branch: $branch"
    echo "----------------------------"

    git checkout "$branch"

    # Add katex to package.json if not already there
    if ! grep -q '"katex"' linux-ai-assistant/package.json; then
        echo "Adding katex dependency..."
        sed -i '/^ *"lucide-react":/i\    "katex": "^0.16.11",' linux-ai-assistant/package.json
    else
        echo "katex already in package.json"
    fi

    # Update lockfile
    echo "Updating lockfile..."
    pnpm install --silent

    # Format lockfile
    echo "Formatting lockfile..."
    pnpm exec prettier --write pnpm-lock.yaml --log-level silent

    # Commit changes
    echo "Committing changes..."
    git add linux-ai-assistant/package.json pnpm-lock.yaml
    git commit -m "fix: add katex dependency and update formatted lockfile

- katex package required by rehype-katex and direct CSS import
- regenerated lockfile and formatted with prettier
- resolves frozen-lockfile CI failures" || echo "No changes to commit"

    # Push
    echo "Pushing to origin..."
    git push

    echo "✅ Completed: $branch"
done

echo ""
echo "🎉 All branches updated successfully!"
echo "Expected CI result: 🟢 GREEN"
