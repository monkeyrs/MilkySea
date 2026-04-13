param(
  [switch]$NoInstall
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Synced with native workspace/file picker IPC flow on 2026-04-13.

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $NoInstall -and -not (Test-Path "node_modules")) {
  npm install
}

npm run dev
