param([Parameter(Mandatory=$true)][ValidatePattern('^[a-p]{32}$')][string]$ExtensionId)

$root = Split-Path -Parent $PSScriptRoot
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
