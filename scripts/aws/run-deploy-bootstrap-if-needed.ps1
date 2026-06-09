param(
  [string]$MarkerPath = ".aws-deploy-bootstrap-required",
  [string]$TerraformDir = "infra/terraform/environments/dev",
  [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

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
