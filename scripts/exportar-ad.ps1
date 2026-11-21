# Exporta os usuarios ativos do AD para o modo local do sistema (DIRECTORY_SOURCE=snapshot).
# Usa o login do Windows de quem roda: nao pede senha e so le.
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\exportar-ad.ps1
param(
  [string]$Server = '10.0.11.251',
  [string]$Out = (Join-Path $PSScriptRoot '..\data\ad-snapshot.json')
)
$ErrorActionPreference = 'Stop'

$attrs = @(
  'objectGUID', 'sAMAccountName', 'displayName', 'givenName', 'sn', 'mail', 'title', 'department',
  'company', 'description', 'telephoneNumber', 'mobile', 'ipPhone', 'physicalDeliveryOfficeName', 'st',
  'distinguishedName', 'whenCreated', 'whenChanged',
  'extensionAttribute1', 'extensionAttribute2', 'extensionAttribute3', 'extensionAttribute4', 'extensionAttribute5'
)

$searcher = New-Object System.DirectoryServices.DirectorySearcher([adsi]"LDAP://$Server")
$searcher.PageSize = 1000
# Pessoas com conta ativa (bit 2 de userAccountControl = desativada)
$searcher.Filter = '(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))'
foreach ($a in $attrs) { [void]$searcher.PropertiesToLoad.Add($a) }

$rows = New-Object System.Collections.ArrayList
foreach ($r in $searcher.FindAll()) {
  $o = [ordered]@{}
  foreach ($a in $attrs) {
    $v = $r.Properties[$a.ToLower()]
    if (-not $v -or $v.Count -eq 0) { $o[$a] = $null; continue }
    $x = $v[0]
    if ($a -eq 'objectGUID') { $o[$a] = ([guid]$x).ToString() }
    elseif ($x -is [datetime]) { $o[$a] = $x.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') }
    else { $o[$a] = [string]$x }
  }
  [void]$rows.Add([pscustomobject]$o)
}

$dir = Split-Path $Out -Parent
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$json = ConvertTo-Json -InputObject @($rows) -Depth 3
[IO.File]::WriteAllText($Out, $json, (New-Object System.Text.UTF8Encoding $false))
"Exportados $($rows.Count) usuarios ativos para $Out"
