param([string]$Project='dark-coin-dc4a3',[string]$Focus='')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $root
# Only explicitly named public source/test files enter the Linux runner.
$stage=Join-Path $root ('output/council-avm-runs/'+[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
$files=@('contracts/CouncilDAO.py','functions/council/protocol.json','tests/council_avm.py','tests/requirements-council-avm.txt','tests/fixtures/council-tinyman-v2.json')
foreach($file in $files){
  $target=Join-Path $stage $file
  New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $root $file) -Destination $target
}
$buildArgs=@('builds','submit',$stage,'--config',(Join-Path $root 'cloudbuild.council-avm.yaml'),'--project',$Project,'--async','--format=value(id)','--quiet')
if($Focus){
  if($Focus -notmatch '^[A-Za-z_][A-Za-z0-9_.]*$'){throw 'Invalid AVM test name.'}
  $buildArgs+=('--substitutions=_COUNCIL_AVM_FOCUS='+$Focus)
}
& gcloud @buildArgs
if($LASTEXITCODE -ne 0){throw 'Council AVM Linux build submission failed.'}
