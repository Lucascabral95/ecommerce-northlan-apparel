param(
  [Parameter(Mandatory = $true)]
  [string]$TerraformDir,
  [Parameter(Mandatory = $true, ValueFromRemainingArguments = $true)]
  [string[]]$Arguments
)

$ErrorActionPreference = "Stop"

function Get-TerraformStateDirectory {
  if (-not [string]::IsNullOrWhiteSpace($env:NORTHLANE_TERRAFORM_STATE_DIR)) {
    return $env:NORTHLANE_TERRAFORM_STATE_DIR
  }

  return Join-Path $env:LOCALAPPDATA "NorthlaneApparel\\terraform-state"
}

function Invoke-TerraformCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$CommandArguments,
    [int]$MaxAttempts = 6
  )

  $lockPatterns = @(
    "Failed to read state file",
    "locked a portion of the file",
    "state blob is already locked",
    "ConditionalCheckFailedException",
    "Error acquiring the state lock"
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    $output = & terraform @CommandArguments 2>&1 | Out-String
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
      if (-not [string]::IsNullOrWhiteSpace($output)) {
        Write-Host $output.TrimEnd()
      }

      return
    }

    $isTransientLock = $false
    foreach ($pattern in $lockPatterns) {
      if ($output -like "*$pattern*") {
        $isTransientLock = $true
        break
      }
    }

    if (-not $isTransientLock -or $attempt -eq $MaxAttempts) {
      throw "terraform $($CommandArguments -join ' ') failed with exit code $exitCode`n$output"
    }

    $delaySeconds = [Math]::Min($attempt * 2, 12)
    Write-Warning "Terraform state is temporarily locked. Retrying in $delaySeconds seconds (attempt $attempt/$MaxAttempts)..."
    Start-Sleep -Seconds $delaySeconds
  }
}

function Copy-FileWithRetry {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Source,
    [Parameter(Mandatory = $true)]
    [string]$Destination,
    [int]$MaxAttempts = 6
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      Copy-Item -LiteralPath $Source -Destination $Destination -Force
      return
    } catch {
      if ($attempt -eq $MaxAttempts) {
        throw
      }

      $delaySeconds = [Math]::Min($attempt * 2, 12)
      Write-Warning "Unable to copy Terraform state from '$Source' yet. Retrying in $delaySeconds seconds (attempt $attempt/$MaxAttempts)..."
      Start-Sleep -Seconds $delaySeconds
    }
  }
}

function Initialize-TerraformBackend {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ResolvedTerraformDir
  )

  $environmentName = Split-Path $ResolvedTerraformDir -Leaf
  $stateRoot = Get-TerraformStateDirectory
  $stateDir = Join-Path $stateRoot $environmentName
  $statePath = Join-Path $stateDir "terraform.tfstate"
  $repoStatePath = Join-Path $ResolvedTerraformDir "terraform.tfstate"
  $repoBackupPath = Join-Path $ResolvedTerraformDir "terraform.tfstate.backup"
  $externalBackupPath = Join-Path $stateDir "terraform.tfstate.backup"

  New-Item -ItemType Directory -Force -Path $stateDir | Out-Null

  if (-not (Test-Path $statePath) -and (Test-Path $repoStatePath)) {
    Copy-FileWithRetry -Source $repoStatePath -Destination $statePath
  }

  if (-not (Test-Path $externalBackupPath) -and (Test-Path $repoBackupPath)) {
    Copy-FileWithRetry -Source $repoBackupPath -Destination $externalBackupPath
  }

  $initArguments = @(
    "-chdir=$ResolvedTerraformDir",
    "init",
    "-reconfigure",
    "-backend-config=path=$statePath"
  )

  Invoke-TerraformCommand -CommandArguments $initArguments
}

$resolvedTerraformDir = (Resolve-Path $TerraformDir).Path
$effectiveArguments = @()

if ($Arguments.Count -eq 0) {
  throw "At least one terraform argument is required."
}

if ($Arguments[0] -eq "init") {
  Initialize-TerraformBackend -ResolvedTerraformDir $resolvedTerraformDir
  exit 0
}

$effectiveArguments += "-chdir=$resolvedTerraformDir"
$effectiveArguments += $Arguments

Invoke-TerraformCommand -CommandArguments $effectiveArguments
