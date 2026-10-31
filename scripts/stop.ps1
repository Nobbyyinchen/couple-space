$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$recordPath = Join-Path $projectRoot '.runtime\website-process.json'
if (Test-Path -LiteralPath $recordPath) {
  $record = Get-Content -LiteralPath $recordPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($record.projectRoot -ne $projectRoot) { throw 'Project path mismatch.' }
  $serverInfo = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + [int]$record.pid) -ErrorAction SilentlyContinue
  if ($serverInfo -and $serverInfo.CommandLine -match 'scripts/server\.mjs') {
    $children = Get-CimInstance Win32_Process -Filter ('ParentProcessId = ' + [int]$record.pid)
    foreach ($child in $children) {
      if ($child.ExecutablePath -eq (Join-Path $projectRoot '.runtime\ollama\ollama.exe')) { Stop-Process -Id $child.ProcessId -Force }
    }
    Stop-Process -Id $record.pid -Force
  }
}
Write-Host 'Our Universe has stopped.'
