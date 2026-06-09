param(
  [string]$MarkerPath = ".aws-deploy-bootstrap-required",
  [string]$DbResourceMarkerPath = ".aws-deploy-rds-resource-id",
  [string]$TerraformDir = "infra/terraform/environments/dev",
  [string]$Region = "us-east-1",
  [string]$BootstrapStateParameterName = ""
)

$ErrorActionPreference = "Stop"

function Get-TerraformOutputRaw {
  param([string]$Name)

  $chdirArgument = "-chdir=$TerraformDir"
  $value = terraform $chdirArgument output -raw $Name | Out-String
  if ($LASTEXITCODE -ne 0) {
    throw "terraform output $Name failed with exit code $LASTEXITCODE"
  }

  return ($value | Out-String).Trim()
}

function Get-BootstrapStateParameterName {
  if (-not [string]::IsNullOrWhiteSpace($BootstrapStateParameterName)) {
    return $BootstrapStateParameterName
  }

  $dbInstanceIdentifier = Get-TerraformOutputRaw "rds_instance_identifier"
  return "/northlane-apparel/deploy-bootstrap/$dbInstanceIdentifier/rds-resource-id"
}

function Get-CurrentRdsResourceId {
  if (Test-Path $DbResourceMarkerPath) {
    $value = (Get-Content -Raw -Path $DbResourceMarkerPath).Trim()
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      return $value
    }
  }

  $dbInstanceIdentifier = Get-TerraformOutputRaw "rds_instance_identifier"
  $resourceId = aws rds describe-db-instances `
    --region $Region `
    --db-instance-identifier $dbInstanceIdentifier `
    --query "DBInstances[0].DbiResourceId" `
    --output text | Out-String
  if ($LASTEXITCODE -ne 0) {
    throw "RDS DB instance '$dbInstanceIdentifier' was not found."
  }

  $resourceId = $resourceId.Trim()
  if ([string]::IsNullOrWhiteSpace($resourceId) -or $resourceId -eq "None") {
    throw "RDS DB instance '$dbInstanceIdentifier' did not return a DbiResourceId."
  }

  return $resourceId
}

function Set-BootstrapState {
  param([string]$RdsResourceId)

  $parameterName = Get-BootstrapStateParameterName
  aws ssm put-parameter `
    --region $Region `
    --name $parameterName `
    --type String `
    --value $RdsResourceId `
    --overwrite | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to persist bootstrap state parameter '$parameterName'."
  }

  Write-Host "Persisted RDS bootstrap state: $parameterName = $RdsResourceId"
}

if (-not (Test-Path $MarkerPath)) {
  throw "Bootstrap marker '$MarkerPath' was not found. Run detect-deploy-bootstrap-needed.ps1 before this script."
}

$bootstrapRequired = (Get-Content -Raw -Path $MarkerPath).Trim().ToLowerInvariant()
if ($bootstrapRequired -ne "true") {
  Write-Host "Skipping Prisma migrations and catalog seed because ECS services already exist."
  exit 0
}

Write-Host "First ECS service deploy detected. Running Prisma migrations and catalog seed..."

& powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/run-prisma-migrations.ps1 -TerraformDir $TerraformDir -Region $Region
if ($LASTEXITCODE -ne 0) {
  throw "Prisma migrations failed with exit code $LASTEXITCODE."
}

& powershell -NoProfile -ExecutionPolicy Bypass -File scripts/aws/run-catalog-seed.ps1 -TerraformDir $TerraformDir -Region $Region
if ($LASTEXITCODE -ne 0) {
  throw "Catalog seed failed with exit code $LASTEXITCODE."
}

Set-BootstrapState -RdsResourceId (Get-CurrentRdsResourceId)
