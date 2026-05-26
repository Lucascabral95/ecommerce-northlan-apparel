param(
  [string]$TerraformDir = "infra/terraform/environments/dev",
  [Parameter(Mandatory = $true)]
  [string]$ImageTag,
  [string]$DockerPlatform = "linux/amd64",
  [switch]$SkipDockerBuild
)

$ErrorActionPreference = "Stop"

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Executable,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  Write-Host ">> $Executable $($Arguments -join ' ')"
  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Executable failed with exit code $LASTEXITCODE"
  }
}

function Get-TerraformOutputJson {
  param([string]$Name)

  $chdirArgument = "-chdir=$TerraformDir"
  $json = & terraform $chdirArgument output -json $Name | Out-String
  if ($LASTEXITCODE -ne 0) {
    throw "terraform output $Name failed with exit code $LASTEXITCODE"
  }

  return $json | ConvertFrom-Json
}

function Get-TerraformOutputRaw {
  param([string]$Name)

  $chdirArgument = "-chdir=$TerraformDir"
  $value = & terraform $chdirArgument output -raw $Name
  if ($LASTEXITCODE -ne 0) {
    throw "terraform output $Name failed with exit code $LASTEXITCODE"
  }

  return ($value | Out-String).Trim()
}

function ConvertTo-Hashtable {
  param([object]$Object)

  $result = @{}
  foreach ($property in $Object.PSObject.Properties) {
    $result[$property.Name] = [string]$property.Value
  }

  return $result
}

function Find-RepositoryUrl {
  param(
    [hashtable]$RepositoryUrls,
    [string]$ServiceName
  )

  $match = $RepositoryUrls.GetEnumerator() | Where-Object { $_.Key -like "*-$ServiceName" } | Select-Object -First 1
  if ($null -eq $match) {
    throw "No ECR repository URL found for service '$ServiceName'."
  }

  return [string]$match.Value
}

function Initialize-IsolatedDockerConfig {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Registry
  )

  $sourceDockerDir = Join-Path $HOME ".docker"
  $sanitizedRegistry = ($Registry -replace '[^a-zA-Z0-9.-]', '-')
  $targetDockerDir = Join-Path ([System.IO.Path]::GetTempPath()) "northlane-docker-$sanitizedRegistry"

  if (Test-Path $targetDockerDir) {
    Remove-Item -LiteralPath $targetDockerDir -Recurse -Force
  }

  New-Item -ItemType Directory -Path $targetDockerDir -Force | Out-Null

  if (Test-Path $sourceDockerDir) {
    Get-ChildItem -LiteralPath $sourceDockerDir -Force | ForEach-Object {
      Copy-Item -LiteralPath $_.FullName -Destination $targetDockerDir -Recurse -Force
    }
  }

  $dockerConfigPath = Join-Path $targetDockerDir "config.json"
  if (Test-Path $dockerConfigPath) {
    $dockerConfig = Get-Content -Raw $dockerConfigPath | ConvertFrom-Json
  } else {
    $dockerConfig = [pscustomobject]@{
      auths = [pscustomobject]@{}
    }
  }

  if ($dockerConfig.PSObject.Properties.Name -contains "credsStore") {
    $dockerConfig.PSObject.Properties.Remove("credsStore")
  }

  if ($dockerConfig.PSObject.Properties.Name -contains "credHelpers") {
    if ($null -ne $dockerConfig.credHelpers -and ($dockerConfig.credHelpers.PSObject.Properties.Name -contains $Registry)) {
      $dockerConfig.credHelpers.PSObject.Properties.Remove($Registry)
    }

    if (($dockerConfig.credHelpers.PSObject.Properties | Measure-Object).Count -eq 0) {
      $dockerConfig.PSObject.Properties.Remove("credHelpers")
    }
  }

  if ($dockerConfig.PSObject.Properties.Name -notcontains "auths" -or $null -eq $dockerConfig.auths) {
    $dockerConfig | Add-Member -MemberType NoteProperty -Name "auths" -Value ([pscustomobject]@{})
  }

  if ($dockerConfig.auths.PSObject.Properties.Name -contains $Registry) {
    $dockerConfig.auths.PSObject.Properties.Remove($Registry)
  }

  $dockerConfig | ConvertTo-Json -Depth 10 | Set-Content -Path $dockerConfigPath -Encoding ascii

  return $targetDockerDir
}

function Write-EcrDockerAuthConfig {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Region,
    [Parameter(Mandatory = $true)]
    [string]$Registry,
    [Parameter(Mandatory = $true)]
    [string]$DockerConfigDir
  )

  $password = aws ecr get-login-password --region $Region | Out-String
  if ($LASTEXITCODE -ne 0) {
    throw "aws ecr get-login-password failed with exit code $LASTEXITCODE"
  }

  $password = $password.Trim()
  if ([string]::IsNullOrWhiteSpace($password)) {
    throw "AWS ECR login password is empty. Check AWS credentials, region '$Region' and ECR permissions."
  }

  $dockerConfigPath = Join-Path $DockerConfigDir "config.json"
  if (Test-Path $dockerConfigPath) {
    $dockerConfig = Get-Content -Raw $dockerConfigPath | ConvertFrom-Json
  } else {
    $dockerConfig = [pscustomobject]@{}
  }

  if ($dockerConfig.PSObject.Properties.Name -notcontains "auths" -or $null -eq $dockerConfig.auths) {
    $dockerConfig | Add-Member -MemberType NoteProperty -Name "auths" -Value ([pscustomobject]@{})
  }

  if ($dockerConfig.auths.PSObject.Properties.Name -contains $Registry) {
    $dockerConfig.auths.PSObject.Properties.Remove($Registry)
  }

  $authValue = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("AWS:$password"))
  $dockerConfig.auths | Add-Member -MemberType NoteProperty -Name $Registry -Value ([pscustomobject]@{ auth = $authValue })
  $dockerConfig | ConvertTo-Json -Depth 10 | Set-Content -Path $dockerConfigPath -Encoding ascii

  Write-Host "Configured ECR auth in isolated Docker config."
}

$expectedServices = @(
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

$repositoryUrls = ConvertTo-Hashtable (Get-TerraformOutputJson "ecr_repository_urls")
if ($repositoryUrls.Count -eq 0) {
  throw "No ECR repositories were found in Terraform outputs."
}

$firstRepositoryUrl = [string]($repositoryUrls.Values | Sort-Object | Select-Object -First 1)
if ($firstRepositoryUrl -notmatch "^(?<accountId>\d+)\.dkr\.ecr\.(?<region>[^.]+)\.amazonaws\.com\/") {
  throw "Could not infer AWS region and registry from ECR URL '$firstRepositoryUrl'."
}

$accountId = $Matches["accountId"]
$registry = $Matches["accountId"] + ".dkr.ecr." + $Matches["region"] + ".amazonaws.com"
$region = $Matches["region"]
$apiGatewayBaseUrl = Get-TerraformOutputRaw "api_gateway_base_url"

Write-Host "Using image tag: $ImageTag"
Write-Host "Using API Gateway URL for web build: $apiGatewayBaseUrl"
Write-Host "Using ECR registry: $registry"
Write-Host "Using AWS region: $region"

$identityJson = aws sts get-caller-identity | Out-String
if ($LASTEXITCODE -ne 0) {
  throw "aws sts get-caller-identity failed with exit code $LASTEXITCODE"
}

$identity = $identityJson | ConvertFrom-Json
if ([string]$identity.Account -ne $accountId) {
  throw "AWS CLI is authenticated as account '$($identity.Account)', but ECR repositories belong to '$accountId'. Fix your AWS profile/credentials before deploy."
}

foreach ($serviceName in $expectedServices) {
  $repositoryUrl = Find-RepositoryUrl -RepositoryUrls $repositoryUrls -ServiceName $serviceName
  $repositoryName = ($repositoryUrl -split "/", 2)[1]
  & aws ecr describe-repositories --region $region --repository-names $repositoryName | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "ECR repository '$repositoryName' was not found or is not accessible."
  }
}

& docker info | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Docker is not available. Start Docker Desktop and retry."
}

$isolatedDockerConfig = Initialize-IsolatedDockerConfig -Registry $registry
$env:DOCKER_CONFIG = $isolatedDockerConfig
Write-Host "Using isolated Docker config: $isolatedDockerConfig"

Write-EcrDockerAuthConfig -Region $region -Registry $registry -DockerConfigDir $isolatedDockerConfig

if ($SkipDockerBuild) {
  Write-Host "Preflight completed. Skipping Docker build and push."
  exit 0
}

function New-DockerBuildArguments {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Dockerfile,
    [Parameter(Mandatory = $true)]
    [string]$ImageUri,
    [hashtable]$BuildArgs = @{}
  )

  $arguments = @("build")

  if ($DockerPlatform.Trim() -ne "") {
    $arguments += @("--platform", $DockerPlatform)
  }

  $arguments += @("-f", $Dockerfile, "-t", $ImageUri)

  foreach ($entry in $BuildArgs.GetEnumerator()) {
    $arguments += @("--build-arg", "$($entry.Key)=$($entry.Value)")
  }

  $arguments += "."

  return $arguments
}

$backendDockerfile = "infra/docker/backend.Dockerfile"
$webDockerfile = "apps/web/Dockerfile"

$backendServiceNames = @(
  "api-gateway",
  "auth-service",
  "user-service",
  "catalog-service",
  "inventory-service",
  "cart-service",
  "order-service",
  "payment-service",
  "notification-service"
)

$sourceBackendServiceName = "api-gateway"
$sourceBackendRepositoryUrl = Find-RepositoryUrl -RepositoryUrls $repositoryUrls -ServiceName $sourceBackendServiceName
$sourceBackendImageUri = "${sourceBackendRepositoryUrl}:${ImageTag}"

Write-Host "Building shared backend image once for all NestJS services."
$backendBuildArguments = New-DockerBuildArguments -Dockerfile $backendDockerfile -ImageUri $sourceBackendImageUri
Invoke-Checked -Executable "docker" -Arguments $backendBuildArguments
Invoke-Checked -Executable "docker" -Arguments @("push", $sourceBackendImageUri)

foreach ($serviceName in $backendServiceNames) {
  $repositoryUrl = Find-RepositoryUrl -RepositoryUrls $repositoryUrls -ServiceName $serviceName
  $imageUri = "${repositoryUrl}:${ImageTag}"

  if ($imageUri -eq $sourceBackendImageUri) {
    continue
  }

  Write-Host "Tagging shared backend image for $serviceName."
  Invoke-Checked -Executable "docker" -Arguments @("tag", $sourceBackendImageUri, $imageUri)
  Invoke-Checked -Executable "docker" -Arguments @("push", $imageUri)
}

$webRepositoryUrl = Find-RepositoryUrl -RepositoryUrls $repositoryUrls -ServiceName "web"
$webImageUri = "${webRepositoryUrl}:${ImageTag}"
$webBuildArguments = New-DockerBuildArguments `
  -Dockerfile $webDockerfile `
  -ImageUri $webImageUri `
  -BuildArgs @{ NEXT_PUBLIC_API_GATEWAY_URL = $apiGatewayBaseUrl }

Write-Host "Building web image once."
Invoke-Checked -Executable "docker" -Arguments $webBuildArguments
Invoke-Checked -Executable "docker" -Arguments @("push", $webImageUri)

Write-Host "Pushed all ECS images with tag $ImageTag."
