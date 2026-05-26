param(
  [string]$TerraformDir = "infra/terraform/environments/dev",
  [string]$Region = "us-east-1",
  [string]$RabbitMqUrl = "",
  [string]$RabbitMqUsername = "",
  [string]$RabbitMqPassword = ""
)

$ErrorActionPreference = "Stop"

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

function New-RandomSecret {
  $bytes = New-Object byte[] 48
  $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
  try {
    $rng.GetBytes($bytes)
  } finally {
    $rng.Dispose()
  }

  return [Convert]::ToBase64String($bytes)
}

function Set-SecretValue {
  param(
    [hashtable]$SecretArns,
    [string]$Name,
    [string]$Value
  )

  if (-not $SecretArns.ContainsKey($Name)) {
    throw "Secret '$Name' was not found in Terraform output secret_arns."
  }

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Refusing to write empty value for secret '$Name'."
  }

  aws secretsmanager put-secret-value --region $Region --secret-id $SecretArns[$Name] --secret-string $Value | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to update secret '$Name'."
  }

  Write-Host "Configured secret: $Name"
}

function Test-SecretHasCurrent {
  param(
    [hashtable]$SecretArns,
    [string]$Name
  )

  if (-not $SecretArns.ContainsKey($Name)) {
    return $false
  }

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    aws secretsmanager get-secret-value --region $Region --secret-id $SecretArns[$Name] --query VersionId --output text *> $null
    return $LASTEXITCODE -eq 0
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

$secretArns = ConvertTo-Hashtable (Get-TerraformOutputJson "secret_arns")
$rdsEndpoint = Get-TerraformOutputRaw "rds_endpoint"
$rdsMasterSecretArn = Get-TerraformOutputRaw "rds_master_user_secret_arn"
$rabbitMqEndpoints = @(Get-TerraformOutputJson "rabbitmq_endpoints")

$rdsSecretString = aws secretsmanager get-secret-value --region $Region --secret-id $rdsMasterSecretArn --query SecretString --output text | Out-String
if ($LASTEXITCODE -ne 0) {
  throw "Failed to read RDS master user secret."
}

$rdsSecret = $rdsSecretString | ConvertFrom-Json
$dbUser = [Uri]::EscapeDataString([string]$rdsSecret.username)
$dbPassword = [Uri]::EscapeDataString([string]$rdsSecret.password)
$dbHost = $rdsEndpoint
$dbName = "northlane_platform"

$databaseSchemas = @{
  "auth-database-url"         = "auth_service"
  "user-database-url"         = "user_service"
  "catalog-database-url"      = "catalog_service"
  "inventory-database-url"    = "inventory_service"
  "cart-database-url"         = "cart_service"
  "order-database-url"        = "order_service"
  "payment-database-url"      = "payment_service"
  "notification-database-url" = "notification_service"
}

foreach ($entry in $databaseSchemas.GetEnumerator()) {
  $databaseUrl = "postgresql://${dbUser}:${dbPassword}@${dbHost}:5432/${dbName}?schema=$($entry.Value)"
  Set-SecretValue -SecretArns $secretArns -Name $entry.Key -Value $databaseUrl
}

Set-SecretValue -SecretArns $secretArns -Name "jwt-access-secret" -Value (New-RandomSecret)

if ([string]::IsNullOrWhiteSpace($RabbitMqUrl) -and $rabbitMqEndpoints.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($RabbitMqUsername) -and -not [string]::IsNullOrWhiteSpace($RabbitMqPassword)) {
  $endpointUri = [Uri]([string]$rabbitMqEndpoints[0])
  $encodedRabbitMqUsername = [Uri]::EscapeDataString($RabbitMqUsername)
  $encodedRabbitMqPassword = [Uri]::EscapeDataString($RabbitMqPassword)
  $RabbitMqUrl = "$($endpointUri.Scheme)://${encodedRabbitMqUsername}:${encodedRabbitMqPassword}@$($endpointUri.Host):$($endpointUri.Port)"
}

if (-not [string]::IsNullOrWhiteSpace($RabbitMqUrl)) {
  Set-SecretValue -SecretArns $secretArns -Name "rabbitmq-url" -Value $RabbitMqUrl
} elseif (-not (Test-SecretHasCurrent -SecretArns $secretArns -Name "rabbitmq-url")) {
  throw "rabbitmq-url has no AWSCURRENT value. Set AWS_RABBITMQ_URL and rerun make deploy-secrets, or keep AWS_ENABLE_RABBITMQ=true so Terraform provisions Amazon MQ before starting ECS services."
}

foreach ($name in @("mercado-pago-access-token", "mercado-pago-public-key", "mercado-pago-webhook-secret")) {
  if (-not (Test-SecretHasCurrent -SecretArns $secretArns -Name $name)) {
    Set-SecretValue -SecretArns $secretArns -Name $name -Value "not-configured"
  }
}

Write-Host "ECS application secrets are configured."
