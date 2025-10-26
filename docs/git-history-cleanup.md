# Git history cleanup (non-destructive plan)

## Goal

Provide a safe, preview-first approach to removing large historical files (for example: `node_modules/`, `dist/`, `src-tauri/target/`) from Git history without accidentally losing data.

## Overview

We will prepare commands that _simulate_ the removal and present the results so maintainers can review. Only after explicit approval will any destructive history rewrite (which requires force-push) be executed.

## Plan (preview-only)

1. Inspect the largest files in history:

```bash
# list top 50 largest files ever committed
git rev-list --objects --all \
  | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' \
  | sed -n '1,200p' \
  | sort -k3nr | head -n 50
```

2. Create a dry-run of the filter (example using `git filter-repo`):

```bash
# Install filter-repo if needed
pip install git-filter-repo

# Create a clone to operate on (safe practice)
git clone --mirror /path/to/repo repo-mirror.git
cd repo-mirror.git

# Preview what would be removed (no rewrite):
git filter-repo --analyze
```

3. Remove directories from history (preview first):

```bash
git filter-repo --path node_modules --path linux-ai-assistant/dist --path linux-ai-assistant/src-tauri/target --invert-paths --dry-run
```

4. Review the results (size, updated refs). If everything looks good, run without `--dry-run` and force-push:

```bash
# After careful review and team agreement
git filter-repo --path node_modules --path linux-ai-assistant/dist --path linux-ai-assistant/src-tauri/target --invert-paths
git push --force --all
git push --force --tags
```

## Notes & warnings

- This is destructive to history: all collaborators must re-clone or rebase carefully.
- Coordinate with the team and set a maintenance window.
- Backup your repository before rewrites.

I can prepare the analysis output (step 1 & 2) and present it for review. I will not perform the destructive rewrite without your explicit confirmation.
