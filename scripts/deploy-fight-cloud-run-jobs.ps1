param(
  [string]$ProjectId = "",
  [string]$Region = "us-central1",
  [string]$Image = "",
  [string]$Memory = "4Gi",
  [string]$Cpu = "2",
  [string]$TaskTimeout = "7200s",
  [switch]$SkipBuild
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

if (-not $Image) {
  $Image = "gcr.io/$ProjectId/dark-coin-fight-jobs:latest"
}

Write-Host "Enabling required Google Cloud APIs..."
& $Gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com --project $ProjectId

function Ensure-CloudRunJob {
  param(
    [string]$Name,
    [string]$FightScript
  )

  $describeOutput = ""
  $describeExitCode = 1
  try {
    $describeOutput = & $Gcloud run jobs describe $Name --project $ProjectId --region $Region --format "value(metadata.name)" 2>$null
    $describeExitCode = $LASTEXITCODE
  } catch {
    $describeOutput = ""
    $describeExitCode = 1
  }
  $exists = $describeExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace(($describeOutput | Out-String).Trim())

  $args = @(
    "--project", $ProjectId,
    "--region", $Region,
    "--image", $Image,
    "--tasks", "1",
    "--max-retries", "0",
    "--task-timeout", $TaskTimeout,
    "--memory", $Memory,
    "--cpu", $Cpu,
    "--set-env-vars", "FIGHT_SCRIPT=$FightScript,NODE_ENV=production"
  )

  if ($exists) {
    Write-Host "Updating Cloud Run job $Name..."
    & $Gcloud run jobs update $Name @args
  } else {
    Write-Host "Creating Cloud Run job $Name..."
    & $Gcloud run jobs create $Name @args
  }
}

if ($SkipBuild) {
  Write-Host "Skipping image build. Using existing image $Image..."
} else {
  Write-Host "Building fight job image $Image..."
  & $Gcloud builds submit `
    --project $ProjectId `
    --config cloudbuild.fight-jobs.yaml `
    --substitutions "_IMAGE=$Image" `
    .
}

Ensure-CloudRunJob -Name "dark-group-fight-sim" -FightScript "darkGroupFight"
Ensure-CloudRunJob -Name "dark-team-fight-sim" -FightScript "darkTeamFight"

if (Test-Path "darkFight.js") {
  Ensure-CloudRunJob -Name "dark-fight-sim" -FightScript "darkFight"
  Write-Host "darkFight.js found, so dark-fight-sim was created/updated."
} else {
  Write-Host "darkFight.js was not found. Skipping dark-fight-sim."
}

Write-Host "Cloud Run fight jobs are ready."
Write-Host "Make sure the Firebase scheduled function has FIGHT_JOB_NAMES set if you add/remove jobs."
