param([string]$Version = '1.0.1')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$stage = Join-Path $env:TEMP "discord-rich-presence-$Version"
if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

dotnet publish (Join-Path $root 'native/launcher/Launcher.csproj') -c Release -o (Join-Path $root 'native/launcher/publish') --nologo
if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación del conector.' }

$storeZip = Join-Path $desktop "Discord-Rich-Presence-Chrome-v$Version.zip"
$bundleZip = Join-Path $desktop "Discord-Rich-Presence-Windows-v$Version.zip"
foreach ($path in @($storeZip, $bundleZip)) { if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force } }
Compress-Archive -Path (Join-Path $root 'extension/*') -DestinationPath $storeZip

Copy-Item (Join-Path $root 'extension') (Join-Path $stage 'extension') -Recurse
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'native/launcher') | Out-Null
Copy-Item (Join-Path $root 'native/launcher/publish') (Join-Path $stage 'native/launcher/publish') -Recurse
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'scripts') | Out-Null
Copy-Item (Join-Path $root 'scripts/instalar-conector.ps1') (Join-Path $stage 'scripts/instalar-conector.ps1')
Copy-Item (Join-Path $root 'README.md') (Join-Path $stage 'README.md')
Copy-Item (Join-Path $root 'LICENSE') (Join-Path $stage 'LICENSE')
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $bundleZip
Remove-Item -LiteralPath $stage -Recurse -Force
Write-Host $storeZip
Write-Host $bundleZip
