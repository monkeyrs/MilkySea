param(
  [switch]$NoInstall
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $NoInstall -and -not (Test-Path "node_modules")) {
  npm install
}

npm run dev
