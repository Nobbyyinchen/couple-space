$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$runtimePath = Join-Path $projectRoot '.runtime'
$env:TEMP = Join-Path $runtimePath 'tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
$executablePath = Join-Path $runtimePath 'ollama\ollama.exe'
if (-not (Test-Path -LiteralPath $executablePath)) { throw 'Portable Ollama is missing. Reinstall the official portable package into .runtime\ollama.' }
$ready = $false
try { $null = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/version' -TimeoutSec 2; $ready = $true } catch {}
if (-not $ready) {
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $executablePath
  $startInfo.Arguments = 'serve'
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.WorkingDirectory = $projectRoot
  $startInfo.EnvironmentVariables['OLLAMA_HOST'] = '127.0.0.1:11434'
  $startInfo.EnvironmentVariables['OLLAMA_MODELS'] = Join-Path $runtimePath 'models'
  $startInfo.EnvironmentVariables['OLLAMA_NO_CLOUD'] = '1'
  $startInfo.EnvironmentVariables['OLLAMA_CONTEXT_LENGTH'] = '8192'
  $startInfo.EnvironmentVariables['USERPROFILE'] = Join-Path $runtimePath 'user'
  $startInfo.EnvironmentVariables['LOCALAPPDATA'] = Join-Path $runtimePath 'user\AppData\Local'
  $proxy = Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -ErrorAction SilentlyContinue
  if ($proxy.ProxyEnable -and $proxy.ProxyServer -match '^127\.0\.0\.1:\d+$') {
    $startInfo.EnvironmentVariables['HTTPS_PROXY'] = 'http://' + $proxy.ProxyServer
    $startInfo.EnvironmentVariables['NO_PROXY'] = 'localhost,127.0.0.1'
  }
  $null = [System.Diagnostics.Process]::Start($startInfo)
  for ($attempt = 0; $attempt -lt 30; $attempt++) { Start-Sleep -Milliseconds 500; try { $null = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/version' -TimeoutSec 2; $ready = $true; break } catch {} }
}
if (-not $ready) { throw 'Ollama did not start.' }
$profile = Get-Content -LiteralPath (Join-Path $projectRoot 'vault\profile\settings.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$env:OLLAMA_HOST = '127.0.0.1:11434'
& $executablePath pull $profile.model
if ($LASTEXITCODE -ne 0) { throw 'Model download failed. Keep this folder and retry to resume.' }
Write-Host 'The local AI model is ready.'
