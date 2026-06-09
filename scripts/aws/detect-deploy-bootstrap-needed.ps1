param(
  [string]$Region = "us-east-1",
  [string]$Cluster = "northlane-apparel-dev-cluster",
  [string]$Services = "web api-gateway auth-service user-service catalog-service inventory-service cart-service order-service payment-service notification-service",
  [string]$MarkerPath = ".aws-deploy-bootstrap-required",
  [string]$DbResourceMarkerPath = ".aws-deploy-rds-resource-id",
  [string]$TerraformDir = "infra/terraform/environments/dev",
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

function Write-BootstrapMarker {
  param([bool]$Required)

  $value = "false"
  if ($Required) {
    $value = "true"
  }

  Set-Content -NoNewline -Path $MarkerPath -Value $value
}

function Get-RdsResourceId {
  param([string]$DbInstanceIdentifier)

  $resourceId = aws rds describe-db-instances `
    --region $Region `
    --db-instance-identifier $DbInstanceIdentifier `
    --query "DBInstances[0].DbiResourceId" `
    --output text | Out-String
  if ($LASTEXITCODE -ne 0) {
    throw "RDS DB instance '$DbInstanceIdentifier' was not found. Run deploy-infra successfully before bootstrap detection."
  }

  $resourceId = $resourceId.Trim()
  if ([string]::IsNullOrWhiteSpace($resourceId) -or $resourceId -eq "None") {
    throw "RDS DB instance '$DbInstanceIdentifier' did not return a DbiResourceId."
  }

  return $resourceId
}

function Get-BootstrapStateParameterName {
  if (-not [string]::IsNullOrWhiteSpace($BootstrapStateParameterName)) {
    return $BootstrapStateParameterName
  }

  $dbInstanceIdentifier = Get-TerraformOutputRaw "rds_instance_identifier"
  return "/northlane-apparel/deploy-bootstrap/$dbInstanceIdentifier/rds-resource-id"
}

function Get-PreviousBootstrappedResourceId {
  param([string]$ParameterName)

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $value = aws ssm get-parameter `
      --region $Region `
      --name $ParameterName `
      --query "Parameter.Value" `
      --output text 2>$null | Out-String
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  if ($exitCode -ne 0) {
    return $null
  }

  $value = $value.Trim()
  if ([string]::IsNullOrWhiteSpace($value) -or $value -eq "None") {
    return $null
  }

  return $value
}

$dbInstanceIdentifier = Get-TerraformOutputRaw "rds_instance_identifier"
$currentResourceId = Get-RdsResourceId -DbInstanceIdentifier $dbInstanceIdentifier
$parameterName = Get-BootstrapStateParameterName
$previousResourceId = Get-PreviousBootstrappedResourceId -ParameterName $parameterName

Set-Content -NoNewline -Path $DbResourceMarkerPath -Value $currentResourceId

if ($previousResourceId -ne $currentResourceId) {
  Write-Host "RDS bootstrap required for '$dbInstanceIdentifier'. Current resource id: $currentResourceId. Previous bootstrapped resource id: $previousResourceId"
  Write-BootstrapMarker -Required $true
  exit 0
}

Write-Host "RDS '$dbInstanceIdentifier' was already bootstrapped. Migrations and seed will be skipped for this deploy."
Write-BootstrapMarker -Required $false
