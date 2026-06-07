param(
  [string]$TerraformDir = "infra/terraform/environments/dev",
  [string]$Region = "us-east-1",
  [string]$ProjectName = "northlane-apparel",
  [string]$Environment = "dev",
  [switch]$IncludeLegacyBackendRepository = $true
)

$ErrorActionPreference = "Stop"

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Executable,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [switch]$AllowFailure
  )

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & $Executable @Arguments 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  if ($exitCode -ne 0 -and -not $AllowFailure) {
    throw "$Executable $($Arguments -join ' ') failed with exit code $exitCode`n$output"
  }

  return [pscustomobject]@{
    ExitCode = $exitCode
    Output   = $output
  }
}

function Get-TerraformStateSet {
  $chdirArgument = "-chdir=$TerraformDir"
  $result = Invoke-Checked -Executable "terraform" -Arguments @($chdirArgument, "state", "list") -AllowFailure
  $state = New-StateSet

  if ($result.ExitCode -eq 0) {
    ($result.Output -split "`r?`n") |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
      ForEach-Object { [void]$state.Add($_.Trim()) }
  }

  return $state
}

function New-StateSet {
  return New-Object 'System.Collections.Generic.HashSet[string]'
}

function Normalize-CommandOutput {
  param([string]$Output)

  if ([string]::IsNullOrWhiteSpace($Output)) {
    return ""
  }

  $withoutAnsi = $Output -replace "`e\[[0-9;?]*[ -/]*[@-~]", ""
  return ($withoutAnsi -replace "\s+", " ").Trim()
}

function Test-TerraformAlreadyManagedMessage {
  param([string]$Output)

  $normalizedOutput = Normalize-CommandOutput -Output $Output
  return (
    $normalizedOutput -match "Resource already managed by Terraform" -or
    $normalizedOutput -match "already managing a remote object" -or
    $normalizedOutput -match "must first remove the existing object from the state"
  )
}

function Import-TerraformResourceIfMissing {
  param(
    [System.Collections.Generic.HashSet[string]]$State,
    [string]$Address,
    [string]$Id,
    [switch]$AllowFailure
  )

  if ($null -eq $State) {
    $State = New-StateSet
  }

  if ($State.Contains($Address)) {
    Write-Host "Already in Terraform state: $Address"
    return
  }

  Write-Host "Importing existing AWS resource into Terraform state: $Address"
  $chdirArgument = "-chdir=$TerraformDir"
  $result = Invoke-Checked -Executable "terraform" -Arguments @($chdirArgument, "import", $Address, $Id) -AllowFailure
  if ($result.ExitCode -eq 0) {
    [void]$State.Add($Address)
  } elseif (Test-TerraformAlreadyManagedMessage -Output $result.Output) {
    Write-Host "Already in Terraform state: $Address"
    [void]$State.Add($Address)
  } elseif ($AllowFailure) {
    Write-Host "Skipped optional import for $Address"
  } else {
    throw "terraform import failed for $Address with exit code $($result.ExitCode)`n$($result.Output)"
  }
}

function Get-EcrRepositoryNames {
  $serviceNames = @(
    "api-gateway",
    "auth-service",
    "user-service",
    "catalog-service",
    "inventory-service",
    "cart-service",
    "order-service",
    "payment-service",
    "notification-service",
    "web"
  )

  $repositories = $serviceNames | ForEach-Object { "$ProjectName-$Environment-$_" }
  if ($IncludeLegacyBackendRepository) {
    $repositories += "$ProjectName-$Environment-backend"
  }

  return $repositories
}

function Get-SecretNames {
  return @(
    "jwt-access-secret",
    "rabbitmq-url",
    "mercado-pago-access-token",
    "mercado-pago-public-key",
    "mercado-pago-webhook-secret",
    "auth-database-url",
    "user-database-url",
    "catalog-database-url",
    "inventory-database-url",
    "cart-database-url",
    "order-database-url",
    "payment-database-url",
    "notification-database-url"
  )
}

function Reconcile-EcrRepositories {
  param([System.Collections.Generic.HashSet[string]]$State)

  if ($null -eq $State) {
    $State = New-StateSet
  }

  foreach ($repositoryName in Get-EcrRepositoryNames) {
    $describeResult = Invoke-Checked -Executable "aws" -Arguments @(
      "ecr", "describe-repositories",
      "--region", $Region,
      "--repository-names", $repositoryName,
      "--output", "json"
    ) -AllowFailure

    if ($describeResult.ExitCode -ne 0) {
      continue
    }

    $repositoryAddress = "module.ecr.aws_ecr_repository.this[\`"$repositoryName\`"]"
    Import-TerraformResourceIfMissing -State $State -Address $repositoryAddress -Id $repositoryName

    $lifecycleAddress = "module.ecr.aws_ecr_lifecycle_policy.this[\`"$repositoryName\`"]"
    Import-TerraformResourceIfMissing -State $State -Address $lifecycleAddress -Id $repositoryName -AllowFailure
  }
}

function Reconcile-Secrets {
  param([System.Collections.Generic.HashSet[string]]$State)

  if ($null -eq $State) {
    $State = New-StateSet
  }

  foreach ($secretShortName in Get-SecretNames) {
    $secretName = "$ProjectName-$Environment/$secretShortName"
    $describeResult = Invoke-Checked -Executable "aws" -Arguments @(
      "secretsmanager", "describe-secret",
      "--region", $Region,
      "--secret-id", $secretName,
      "--output", "json"
    ) -AllowFailure

    if ($describeResult.ExitCode -ne 0) {
      continue
    }

    $secret = $describeResult.Output | ConvertFrom-Json
    if ($null -ne $secret.DeletedDate) {
      Write-Host "Restoring Secrets Manager secret scheduled for deletion: $secretName"
      Invoke-Checked -Executable "aws" -Arguments @(
        "secretsmanager", "restore-secret",
        "--region", $Region,
        "--secret-id", $secretName
      ) | Out-Null

      $describeResult = Invoke-Checked -Executable "aws" -Arguments @(
        "secretsmanager", "describe-secret",
        "--region", $Region,
        "--secret-id", $secretName,
        "--output", "json"
      )
      $secret = $describeResult.Output | ConvertFrom-Json
    }

    $secretAddress = "module.secrets.aws_secretsmanager_secret.this[\`"$secretShortName\`"]"
    Import-TerraformResourceIfMissing -State $State -Address $secretAddress -Id ([string]$secret.ARN)
  }
}

$state = Get-TerraformStateSet

if ($null -eq $state) {
  $state = New-StateSet
}

Reconcile-EcrRepositories -State $state
Reconcile-Secrets -State $state

Write-Host "Terraform existing resource reconciliation completed."
