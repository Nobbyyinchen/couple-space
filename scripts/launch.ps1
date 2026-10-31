param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$env:NPM_CONFIG_CACHE = Join-Path $projectRoot '.runtime\npm-cache'
$env:TEMP = Join-Path $projectRoot '.runtime\tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
$nodeCommand = Get-Command node.exe -ErrorAction Stop
try {
  $health = Invoke-RestMethod -Uri 'http://127.0.0.1:4321/api/public' -TimeoutSec 2
  if ($health.profile.siteName) {
    if (-not $NoBrowser) { Start-Process 'http://127.0.0.1:4321' }
    Write-Host 'Our Universe is already running.'
    exit 0
  }
} catch {}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'site\node_modules\astro'))) {
  & npm.cmd ci --prefix site
  if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'site\dist\index.html'))) {
  & $nodeCommand.Source 'scripts\build.mjs'
  if ($LASTEXITCODE -ne 0) { throw 'Website build failed.' }
}
$serverProcess = Start-Process -FilePath $nodeCommand.Source -ArgumentList @('scripts/server.mjs') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot '.runtime\website.log') -RedirectStandardError (Join-Path $projectRoot '.runtime\website-errors.log')
@{ pid = $serverProcess.Id; projectRoot = $projectRoot } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $projectRoot '.runtime\website-process.json') -Encoding UTF8
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  Start-Sleep -Milliseconds 400
  try {
    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:4321' -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) { if (-not $NoBrowser) { Start-Process 'http://127.0.0.1:4321' }; Write-Host 'Our Universe is ready: http://127.0.0.1:4321'; exit 0 }
  } catch {}
}
throw 'The website did not start. See .runtime\website-errors.log.'
