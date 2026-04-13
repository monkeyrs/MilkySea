param(
  [switch]$NoInstall
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process MilkySea -ErrorAction SilentlyContinue | Stop-Process -Force

& (Join-Path $PSScriptRoot "dev.ps1") @PSBoundParameters
