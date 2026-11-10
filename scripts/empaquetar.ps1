param(
    [string]$Version,
    [string]$Destino = 'C:\Cosas\Proyectos\release'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$actual = (Get-Content -Raw -LiteralPath (Join-Path $root 'extension/manifest.json') | ConvertFrom-Json).version
if (-not $Version) { $Version = $actual }
if ($Version -ne $actual) { throw 'La versión solicitada no coincide con el manifiesto.' }
$stage = Join-Path 'C:\Cosas\Proyectos\Codex' ('discord-empaquetado-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $stage, $Destino | Out-Null

dotnet publish (Join-Path $root 'native/launcher/Launcher.csproj') -c Release -o (Join-Path $root 'native/launcher/publish') --nologo
if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación del conector.' }

$storeZip = Join-Path $Destino "Discord-Rich-Presence-Chrome-v$Version.zip"
$bundleZip = Join-Path $Destino "Discord-Rich-Presence-Windows-v$Version.zip"
Compress-Archive -Path (Join-Path $root 'extension/*') -DestinationPath $storeZip -Force
Copy-Item (Join-Path $root 'extension') (Join-Path $stage 'extension') -Recurse
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'native/launcher'), (Join-Path $stage 'scripts') | Out-Null
Copy-Item (Join-Path $root 'native/launcher/publish') (Join-Path $stage 'native/launcher/publish') -Recurse
Copy-Item (Join-Path $root 'scripts/instalar-conector.ps1') (Join-Path $stage 'scripts/instalar-conector.ps1')
foreach ($archivo in @('README.md', 'LICENSE', 'Instalar.cmd')) {
    Copy-Item (Join-Path $root $archivo) (Join-Path $stage $archivo)
}
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $bundleZip -Force
$carpetaFija = Join-Path $Destino 'Discord-Rich-Presence'
New-Item -ItemType Directory -Force -Path $carpetaFija | Out-Null
Expand-Archive -LiteralPath $bundleZip -DestinationPath $carpetaFija -Force
# Eliminar solamente la carpeta temporal creada por esta ejecución.
$auxiliares = [IO.Path]::GetFullPath('C:\Cosas\Proyectos\Codex') + [IO.Path]::DirectorySeparatorChar
if (-not ([IO.Path]::GetFullPath($stage)).StartsWith($auxiliares, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'La carpeta temporal está fuera del destino auxiliar permitido.'
}
Remove-Item -LiteralPath $stage -Recurse -Force
Write-Host $storeZip
Write-Host $bundleZip
Write-Host "Carpeta permanente: $carpetaFija"
