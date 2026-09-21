param([switch]$SkipWorker,[switch]$SkipWebBuild)
$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
function Invoke-Checked { param([string]$Command,[string[]]$Arguments) & $Command @Arguments; if($LASTEXITCODE -ne 0){throw "$Command failed"} }
function Invoke-Gcloud { & gcloud @args; if($LASTEXITCODE -ne 0){throw 'gcloud operation failed'} }
$project='dark-coin-dc4a3';$region='us-central1';$service='arena-realtime-dev';$secret='ARENA_DEV_TICKET_SECRET'
$account="arena-realtime-dev@$project.iam.gserviceaccount.com"
$previousDev=$env:NEXT_PUBLIC_ARENA_DEV;$previousRoom=$env:ARENA_ROOM_ID
try {
 $env:ARENA_ROOM_ID='playground-dev-v1'
 if(!$SkipWorker){
  & gcloud iam service-accounts describe $account --project=$project --format='value(email)' 2>$null
  if($LASTEXITCODE -ne 0){Invoke-Gcloud iam service-accounts create arena-realtime-dev --project=$project --display-name='Arena development worker'}
  Invoke-Gcloud projects add-iam-policy-binding $project --member="serviceAccount:$account" --role=roles/datastore.user --condition=None --format='value(version)'
  & gcloud secrets describe $secret --project=$project --format='value(name)' 2>$null
  if($LASTEXITCODE -ne 0){
   $secretFile=[IO.Path]::GetTempFileName()
   try{$bytes=New-Object byte[] 48;[Security.Cryptography.RandomNumberGenerator]::Fill($bytes);[IO.File]::WriteAllText($secretFile,[Convert]::ToBase64String($bytes));Invoke-Gcloud secrets create $secret --project=$project --replication-policy=automatic --data-file=$secretFile}
   finally{Remove-Item -LiteralPath $secretFile -Force}
  }
  foreach($identity in @($account,'167442935007-compute@developer.gserviceaccount.com')){Invoke-Gcloud secrets add-iam-policy-binding $secret --project=$project --member="serviceAccount:$identity" --role=roles/secretmanager.secretAccessor --format='value(version)'}
  Invoke-Checked node @('scripts/build-arena-realtime.cjs')
  Invoke-Checked node @('scripts/smoke-arena-worker.cjs')
  $image="$region-docker.pkg.dev/$project/arena-services/realtime-dev:latest"
  Invoke-Gcloud builds submit arena-server --project=$project --region=$region --tag=$image --quiet
  Invoke-Checked node @('scripts/arena-control.cjs','drain')
  Invoke-Gcloud run deploy $service --project=$project --region=$region --image=$image --service-account=$account --cpu=1 --memory=512Mi --concurrency=32 --max-instances=1 --min-instances=0 --no-cpu-throttling --timeout=3600 --session-affinity --allow-unauthenticated --set-secrets="ARENA_TICKET_SECRET=${secret}:latest" --set-env-vars="^|^GCLOUD_PROJECT=$project|NODE_ENV=production|ARENA_ROOM_ID=playground-dev-v1|ARENA_ORIGINS=https://dark-coin-arena-dev.web.app,https://dark-coin-arena-dev.firebaseapp.com" --quiet
  Invoke-Checked node @('scripts/arena-control.cjs','websocket')
 }
 $worker=(& gcloud run services describe $service --project=$project --region=$region --format='value(status.url)').Trim()
 if($LASTEXITCODE -ne 0 -or !$worker){throw 'Development worker URL unavailable'}
 $env:NEXT_PUBLIC_ARENA_DEV='true'
 if(!$SkipWebBuild){Invoke-Checked npm @('run','build')}
 Invoke-Checked node @('scripts/prepare-arena-dev.cjs',($worker.Replace('https://','wss://')+'/socket'))
 if(Test-Path functions-arena-dev/package-lock.json){Invoke-Checked npm @('ci','--prefix','functions-arena-dev','--omit=dev','--no-audit','--no-fund')}
 else{Invoke-Checked npm @('install','--prefix','functions-arena-dev','--omit=dev','--no-audit','--no-fund')}
 Invoke-Checked firebase @('deploy','--config','firebase.arena-dev.json','--only','functions:arena-dev,hosting','--project',$project,'--non-interactive')
 Write-Output 'Development arena: https://dark-coin-arena-dev.web.app/arena/playground. Production was not deployed or reopened.'
} finally {$env:NEXT_PUBLIC_ARENA_DEV=$previousDev;$env:ARENA_ROOM_ID=$previousRoom}
