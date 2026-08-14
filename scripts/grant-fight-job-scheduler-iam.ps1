param(
  [string]$ProjectId = ""
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  $defaultGcloudBin = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin"
  if (Test-Path (Join-Path $defaultGcloudBin "gcloud.cmd")) {
    $env:Path = "$env:Path;$defaultGcloudBin"
  }
}

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  throw @"
gcloud was not found on this machine.

Install the Google Cloud CLI, then restart PowerShell and run:
  gcloud init
  gcloud auth login
  gcloud config set project <your-project-id>

You can also run this script from Google Cloud Shell, where gcloud is already installed.
"@
}

$Gcloud = (Get-Command gcloud.cmd -ErrorAction SilentlyContinue)
if (-not $Gcloud) {
  $Gcloud = Get-Command gcloud -ErrorAction Stop
}
$Gcloud = $Gcloud.Source

if (-not $ProjectId) {
  $firebaseRc = Get-Content -Path ".firebaserc" -Raw | ConvertFrom-Json
  $ProjectId = $firebaseRc.projects.default
}

Write-Host "Enabling Cloud Run Admin API for $ProjectId..."
& $Gcloud services enable run.googleapis.com --project $ProjectId

$projectNumber = (& $Gcloud projects describe $ProjectId --format="value(projectNumber)").Trim()
if (-not $projectNumber) {
  throw "Could not determine project number for $ProjectId."
}

$candidateServiceAccounts = @(
  "$ProjectId@appspot.gserviceaccount.com",
  "$projectNumber-compute@developer.gserviceaccount.com"
)

foreach ($serviceAccount in $candidateServiceAccounts) {
  Write-Host "Granting Cloud Run Developer to $serviceAccount..."
  & $Gcloud projects add-iam-policy-binding $ProjectId `
    --member "serviceAccount:$serviceAccount" `
    --role "roles/run.developer"
}

Write-Host "IAM bindings applied. Redeploy functions after this if the scheduler was already failing."
