$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$patterns = @(
  "AKIA[0-9A-Z]{16}",
  "AIza[0-9A-Za-z-_]{35}",
  "ghp_[0-9A-Za-z]{36}",
  "sk-[A-Za-z0-9]{20,}"
)

$ignoredPathRegex = [regex]'\\(node_modules|dist|dist-electron|release|\.git|playwright-report|test-results)\\'
$ignoredExtensions = @('.exe', '.dll', '.node', '.pak', '.woff', '.woff2', '.ttf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico')

$candidateFiles = Get-ChildItem -Recurse -File | Where-Object {
  $_.FullName -notmatch $ignoredPathRegex -and
  $ignoredExtensions -notcontains $_.Extension.ToLowerInvariant()
}

$matches = @()
foreach ($pattern in $patterns) {
  $result = $candidateFiles | Select-String -Pattern $pattern
  if ($result) {
    $matches += $result
  }
}

if ($matches.Count -gt 0) {
  $matches | ForEach-Object {
    Write-Host "Potential secret: $($_.Path):$($_.LineNumber)"
  }
  throw "Potential secrets detected."
}

Write-Host "No potential secrets detected."
