param([string]$ProjectId='dark-coin-dc4a3',[string]$Region='us-central1',[switch]$SkipBuild,[switch]$EnableLoot,[long]$TreasuryAppId=3658640544)
$ErrorActionPreference='Stop'
function Invoke-Gcloud { & gcloud @args; if ($LASTEXITCODE -ne 0) { throw 'gcloud operation failed' } }
$account="arena-realtime@$ProjectId.iam.gserviceaccount.com"
$secret='ARENA_TICKET_SECRET'
Invoke-Gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com --project=$ProjectId
& gcloud iam service-accounts describe $account --project=$ProjectId --format='value(email)' 2>$null
if ($LASTEXITCODE -ne 0) { Invoke-Gcloud iam service-accounts create arena-realtime --project=$ProjectId --display-name='Arena realtime worker' }
Invoke-Gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$account" --role=roles/datastore.user --condition=None --format='value(version)'
& gcloud secrets describe $secret --project=$ProjectId --format='value(name)' 2>$null
if ($LASTEXITCODE -ne 0) {
 $secretFile=[System.IO.Path]::GetTempFileName()
 try {
  $bytes=New-Object byte[] 48;[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  [System.IO.File]::WriteAllText($secretFile,[Convert]::ToBase64String($bytes))
  Invoke-Gcloud secrets create $secret --project=$ProjectId --replication-policy=automatic --data-file=$secretFile
 } finally { Remove-Item -LiteralPath $secretFile -Force }
}
Invoke-Gcloud secrets add-iam-policy-binding $secret --project=$ProjectId --member="serviceAccount:$account" --role=roles/secretmanager.secretAccessor --format='value(version)'
$admissionAccount=(& gcloud functions describe arenaCombat --gen2 --region=$Region --project=$ProjectId --format='value(serviceConfig.serviceAccountEmail)').Trim()
if ($LASTEXITCODE -ne 0 -or !$admissionAccount) { throw 'Cannot resolve admission service identity' }
Invoke-Gcloud secrets add-iam-policy-binding $secret --project=$ProjectId --member="serviceAccount:$admissionAccount" --role=roles/secretmanager.secretAccessor --format='value(version)'
& gcloud artifacts repositories describe arena-services --location=$Region --project=$ProjectId --format='value(name)' 2>$null
if ($LASTEXITCODE -ne 0) { Invoke-Gcloud artifacts repositories create arena-services --location=$Region --project=$ProjectId --repository-format=docker }
node scripts/build-arena-realtime.cjs
if ($LASTEXITCODE -ne 0) { throw 'Worker build failed' }
node scripts/smoke-arena-worker.cjs
if ($LASTEXITCODE -ne 0) { throw 'Production worker startup check failed' }
$image="$Region-docker.pkg.dev/$ProjectId/arena-services/realtime:latest"
if (!$SkipBuild) { Invoke-Gcloud builds submit arena-server --project=$ProjectId --region=$Region --tag=$image --quiet }
node scripts/arena-control.cjs drain
if ($LASTEXITCODE -ne 0) { throw 'Could not drain old room authority' }
$environment="GCLOUD_PROJECT=$ProjectId,NODE_ENV=production"
if ($EnableLoot) { $environment+=",ARENA_LOOT_ENABLED=true,ARENA_TREASURY_APP_ID=$TreasuryAppId" }
$arenaRevisionSuffix='rollout-'+[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')
Invoke-Gcloud run deploy arena-realtime --revision-suffix=$arenaRevisionSuffix --project=$ProjectId --region=$Region --image=$image --service-account=$account --cpu=1 --memory=512Mi --concurrency=32 --max-instances=1 --min-instances=0 --no-cpu-throttling --timeout=3600 --session-affinity --allow-unauthenticated --update-secrets="ARENA_TICKET_SECRET=${secret}:latest" --update-env-vars=$environment --quiet
# A previously pinned traffic target survives deploy; route to this exact new revision.
Invoke-Gcloud run services update-traffic arena-realtime --project=$ProjectId --region=$Region --to-revisions="arena-realtime-${arenaRevisionSuffix}=100" --quiet
node scripts/arena-control.cjs websocket
if ($LASTEXITCODE -ne 0) { throw 'Could not activate new room ownership' }
$url=(& gcloud run services describe arena-realtime --project=$ProjectId --region=$Region --format='value(status.url)').Trim()
if (!$url) { throw 'Worker URL unavailable' }
Write-Output "Worker deployed: $url. Set ARENA_TRANSPORT=websocket and ARENA_WS_URL=$($url.Replace('https://','wss://'))/socket on admission. Public entry flag is unchanged."
