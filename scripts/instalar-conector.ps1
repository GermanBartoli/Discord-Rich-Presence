param([ValidatePattern('^[a-p]{32}$')][string]$ExtensionId)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $ExtensionId) {
    $extension = Get-Content -Raw -LiteralPath (Join-Path $root 'extension\manifest.json') | ConvertFrom-Json
    if (-not $extension.key) { throw 'La extensión no contiene la clave pública para obtener su ID.' }
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { $hash = $sha.ComputeHash([Convert]::FromBase64String($extension.key)) } finally { $sha.Dispose() }
    $ExtensionId = -join ($hash[0..15] | ForEach-Object {
        [char](97 + ($_ -shr 4))
        [char](97 + ($_ -band 15))
    })
}
$hostPath = (Resolve-Path -LiteralPath (Join-Path $root 'native\launcher\publish\Launcher.exe')).Path
$manifest = Join-Path $root 'native\host-manifest.json'
$config = @{
    name = 'com.germanbartoli.discord_rich_presence'
    description = 'Conector local de YouTube Music para Discord'
    path = $hostPath
    type = 'stdio'
    allowed_origins = @("chrome-extension://$ExtensionId/")
}
$config | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $manifest -Encoding utf8
$key = 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.germanbartoli.discord_rich_presence'
New-Item -Path $key -Force | Out-Null
Set-Item -Path $key -Value $manifest
Write-Host "Conector registrado para $ExtensionId. Reiniciá Chrome y abrí Discord de escritorio."
