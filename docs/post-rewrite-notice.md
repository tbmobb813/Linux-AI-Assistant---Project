# Post-rewrite notice

This repository's history was rewritten on 2025-10-23 to remove historical build artifacts and vendor files (for example: `node_modules/`, `linux-ai-assistant/dist/`, and Rust `target/` directories). The cleaned copy is available at `linux-ai-assistant-cleaned` and the origin has been replaced with the cleaned history.

What changed
------------
- Large historical blobs (accidentally committed `node_modules` and build outputs) were removed from Git history to reduce repository size and improve clone performance.
- Current tip contains the same source as before, minus historical vendor/build blobs. Lockfiles and source files were preserved.

Why this was done
-----------------
- Accidental commits of dependency directories inflated the repo size and made cloning and storage slower.
- Cleaning history makes the project easier to work with and faster to clone.

What you must do (you)
-----------------------
If you have a local clone of this repository, please re-clone to avoid problems caused by rewritten history:

```zsh
rm -rf <old-local-repo>
git clone git@github.com:tbmobb813/Linux-AI-Assistant---Project.git
```

If you have branches you want to preserve locally, export patches or push them to a remote before re-cloning.

Backups
-------
- A backup mirror was created prior to the rewrite and stored in `repo-origin-backup.git` on the maintainer's machine and (optionally) pushed to `linux-ai-assistant-archive` on GitHub.

Questions or Issues
------------------
If you see anything unexpected after re-cloning (missing files, CI failures), please open an issue and reference this notice.
