$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$hookPath = Join-Path $repoRoot ".git/hooks/pre-commit"

$hook = @'
#!/bin/sh
set -eu
repo_root="$(git rev-parse --show-toplevel)"
sh "$repo_root/check-agent-update.sh"
'@

Set-Content -Path $hookPath -Value $hook -NoNewline
Write-Host "Installed pre-commit hook at $hookPath"
