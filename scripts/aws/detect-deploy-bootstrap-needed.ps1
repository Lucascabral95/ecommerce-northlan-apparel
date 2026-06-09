param(
  [string]$Region = "us-east-1",
  [string]$Cluster = "northlane-apparel-dev-cluster",
  [string]$Services = "web api-gateway auth-service user-service catalog-service inventory-service cart-service order-service payment-service notification-service",
  [string]$MarkerPath = ".aws-deploy-bootstrap-required"
)

$ErrorActionPreference = "Stop"

function Write-BootstrapMarker {
  param([bool]$Required)

  $value = "false"
  if ($Required) {
    $value = "true"
  }

  Set-Content -NoNewline -Path $MarkerPath -Value $value
}

$expectedServices = $Services -split "\s+" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
if ($expectedServices.Count -eq 0) {
  throw "No ECS services were provided for bootstrap detection."
}

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
  $json = aws ecs describe-services `
    --region $Region `
    --cluster $Cluster `
    --services $expectedServices `
    --output json 2>&1 | Out-String
  $exitCode = $LASTEXITCODE
} finally {
  $ErrorActionPreference = $previousErrorActionPreference
}

if ($exitCode -ne 0) {
  Write-Host "ECS services are not fully deployed yet. Migrations and seed will run after images are pushed."
  Write-BootstrapMarker -Required $true
  exit 0
}

$response = $json | ConvertFrom-Json
$activeServices = @($response.services) |
  Where-Object { $_.status -eq "ACTIVE" } |
  ForEach-Object { [string]$_.serviceName }

$missingServices = @($expectedServices | Where-Object { $activeServices -notcontains $_ })
if ($missingServices.Count -gt 0) {
  Write-Host "Missing ECS services: $($missingServices -join ', '). Migrations and seed will run."
  Write-BootstrapMarker -Required $true
  exit 0
}

Write-Host "ECS services already exist. Migrations and seed will be skipped for this deploy."
Write-BootstrapMarker -Required $false
