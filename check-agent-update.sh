#!/bin/sh
set -eu

changed_files="$(git diff --cached --name-only --diff-filter=ACMR)"

if [ -z "$changed_files" ]; then
    exit 0
fi

if printf '%s\n' "$changed_files" | grep -Eq '^\.agent$'; then
    exit 0
fi

# Critical paths for this Laravel 12 + React/Vite monorepo (must match CI workflow).
if printf '%s\n' "$changed_files" | grep -Eq \
    '^(app/|bootstrap/|config/|database/|resources/|routes/|tests/|composer\.json$|package\.json$|vite\.config\.js$|phpunit\.xml$|\.env\.example$|README\.md$|docs/)'; then
    echo "ERROR: .agent must be updated and staged with this commit."
    echo "Hint: update Last updated + Change Log in .agent, then git add .agent"
    exit 1
fi

exit 0
