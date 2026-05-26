[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$TerraformDir,

  [string]$ResourcePattern = "aws_ecr_"
)

$ErrorActionPreference = "Stop"

Write-Host "Removing ECR resources from Terraform state. AWS ECR repositories and images will be preserved..."

$resources = terraform -chdir="$TerraformDir" state list | Where-Object {
  $_ -match $ResourcePattern
}

if (-not $resources) {
  Write-Host "No ECR resources found in Terraform state."
  exit 0
}

foreach ($resource in $resources) {
  Write-Host "Removing from state: $resource"

  # Terraform resource addresses created with for_each include quotes:
  # module.ecr.aws_ecr_repository.this["repo-name"]
  # PowerShell can strip those quotes unless they are escaped.
  $escapedResource = $resource -replace '"', '\"'

  terraform -chdir="$TerraformDir" state rm $escapedResource

  if ($LASTEXITCODE -ne 0) {
    throw "Failed to remove from Terraform state: $resource"
  }
}

Write-Host "ECR resources removed from Terraform state successfully."