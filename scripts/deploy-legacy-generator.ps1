param([string]$ProjectId='dark-coin-dc4a3',[string]$Region='us-central1',[switch]$SkipBuild)
$ErrorActionPreference='Stop'
$gcloudPath=Join-Path $env:LOCALAPPDATA 'Google/Cloud SDK/google-cloud-sdk/bin/gcloud.cmd'
$account="legacy-generator@$ProjectId.iam.gserviceaccount.com"
$image="gcr.io/$ProjectId/dark-coin-legacy-generator:latest"
function Cloud { & $gcloudPath @args; if($LASTEXITCODE -ne 0){throw "Cloud command failed: $($args[0..2] -join ' ')"} }
if(-not $SkipBuild){Cloud builds submit legacy-generator --project $ProjectId --tag $image --quiet}
Cloud run jobs deploy dark-coin-legacy-generator --project $ProjectId --region $Region --image $image --service-account $account --memory 4Gi --cpu 2 --tasks 1 --parallelism 1 --task-timeout 7200s --max-retries 0 --set-secrets 'OPENAI_API_KEY=LEGACY_GENERATOR_OPENAI_KEY:latest' --quiet
Cloud run jobs add-iam-policy-binding dark-coin-legacy-generator --project $ProjectId --region $Region --member 'serviceAccount:167442935007-compute@developer.gserviceaccount.com' --role roles/run.jobsExecutorWithOverrides --quiet
