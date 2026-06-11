param(
  [switch]$RequireAwsAuth
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Push-Location $repoRoot

$failures = 0
$warnings = 0

function Write-Ok {
  param([string]$Message)
  Write-Host "[ok] $Message" -ForegroundColor Green
}

function Write-Warn {
  param([string]$Message)
  $script:warnings += 1
  Write-Host "[warn] $Message" -ForegroundColor Yellow
}

function Write-Fail {
  param([string]$Message)
  $script:failures += 1
  Write-Host "[fail] $Message" -ForegroundColor Red
}

function Get-Tool {
  param([string]$Name)
  return Get-Command $Name -ErrorAction SilentlyContinue
}

function Invoke-Tool {
  param(
    [string]$Executable,
    [string[]]$Arguments
  )

  $output = & $Executable @Arguments 2>&1 | Out-String
  return @{
    ExitCode = $LASTEXITCODE
    Output = $output.Trim()
  }
}

function Normalize-EnvValue {
  param([string]$Value)

  $normalized = $Value.Trim()
  if (
    ($normalized.StartsWith('"') -and $normalized.EndsWith('"')) -or
    ($normalized.StartsWith("'") -and $normalized.EndsWith("'"))
  ) {
    $normalized = $normalized.Substring(1, $normalized.Length - 2)
  }

  return ($normalized -replace '\s+#.*$', '').Trim()
}

function Read-DotEnv {
  param([string]$Path)

  $values = @{}
  if (-not (Test-Path $Path)) {
    return $values
  }

  foreach ($line in Get-Content $Path) {
    $trimmed = $line.Trim()
    if ($trimmed.Length -eq 0 -or $trimmed.StartsWith('#')) {
      continue
    }

    $separatorIndex = $trimmed.IndexOf('=')
    if ($separatorIndex -le 0) {
      continue
    }

    $key = $trimmed.Substring(0, $separatorIndex).Trim()
    $value = $trimmed.Substring($separatorIndex + 1)
    $values[$key] = Normalize-EnvValue $value
  }

  return $values
}

function Test-RequiredTool {
  param(
    [string]$Name,
    [string]$VersionArgument = '--version'
  )

  if (-not (Get-Tool $Name)) {
    Write-Fail "$Name is not available in PATH."
    return
  }

  $result = Invoke-Tool $Name @($VersionArgument)
  if ($result.ExitCode -ne 0) {
    Write-Fail "$Name is installed but failed to run."
    return
  }

  Write-Ok "$Name available: $($result.Output.Split([Environment]::NewLine)[0])"
}

try {
  Write-Host "Northlane local doctor"
  Write-Host "Repository: $repoRoot"
  Write-Host ''

  if (Test-Path '.env') {
    Write-Ok '.env file found.'
  } else {
    Write-Fail '.env file is missing. Copy .env.example to .env before running the app.'
  }

  if (Test-Path '.env.example') {
    Write-Ok '.env.example file found.'
  } else {
    Write-Fail '.env.example file is missing.'
  }

  Test-RequiredTool 'node'
  Test-RequiredTool 'npm'
  Test-RequiredTool 'docker'
  Test-RequiredTool 'terraform'
  Test-RequiredTool 'aws'

  if (Get-Tool 'node') {
    $nodeVersion = (Invoke-Tool 'node' @('--version')).Output.TrimStart('v')
    $majorVersion = [int]($nodeVersion.Split('.')[0])
    if ($majorVersion -lt 22) {
      Write-Fail "Node.js 22 or newer is required. Current version: $nodeVersion."
    } else {
      Write-Ok "Node.js version is compatible: $nodeVersion."
    }
  }

  if (Get-Tool 'docker') {
    $dockerInfo = Invoke-Tool 'docker' @('info')
    if ($dockerInfo.ExitCode -ne 0) {
      Write-Fail 'Docker daemon is not reachable. Start Docker Desktop with Linux containers.'
    } else {
      Write-Ok 'Docker daemon is reachable.'
    }

    $composeVersion = Invoke-Tool 'docker' @('compose', 'version')
    if ($composeVersion.ExitCode -ne 0) {
      Write-Fail 'Docker Compose v2 is not available through docker compose.'
    } else {
      Write-Ok "Docker Compose available: $($composeVersion.Output)"
    }

    $composeConfig = Invoke-Tool 'docker' @('compose', 'config', '--quiet')
    if ($composeConfig.ExitCode -ne 0) {
      Write-Fail "docker compose config failed. $($composeConfig.Output)"
    } else {
      Write-Ok 'docker compose config is valid.'
    }
  }

  if (Get-Tool 'aws') {
    $identity = Invoke-Tool 'aws' @('sts', 'get-caller-identity')
    if ($identity.ExitCode -ne 0) {
      if ($RequireAwsAuth) {
        Write-Fail 'AWS CLI is installed but not authenticated.'
      } else {
        Write-Warn 'AWS CLI is installed but not authenticated. Local Docker development can still work.'
      }
    } else {
      Write-Ok 'AWS CLI credentials are valid.'
    }
  }

  $envValues = Read-DotEnv '.env'
  if ($envValues.Count -gt 0) {
    $provider = $envValues['PAYMENT_PROVIDER']
    if (-not $provider) {
      $provider = $envValues['PAYMENT_PROVIDER_MODE']
    }
    if (-not $provider) {
      $provider = 'MOCK'
      Write-Warn 'PAYMENT_PROVIDER is not set. The app will default to MOCK in most local flows.'
    }

    if ($provider -notin @('MOCK', 'MERCADO_PAGO')) {
      Write-Fail "PAYMENT_PROVIDER must be MOCK or MERCADO_PAGO. Current value: $provider."
    } else {
      Write-Ok "Payment provider is valid: $provider."
    }

    if ($provider -eq 'MERCADO_PAGO') {
      if (-not $envValues['MERCADO_PAGO_ACCESS_TOKEN']) {
        Write-Fail 'MERCADO_PAGO_ACCESS_TOKEN is required when PAYMENT_PROVIDER=MERCADO_PAGO.'
      }
      if (-not $envValues['MERCADO_PAGO_PUBLIC_KEY']) {
        Write-Fail 'MERCADO_PAGO_PUBLIC_KEY is required when PAYMENT_PROVIDER=MERCADO_PAGO.'
      }

      $frontendBaseUrl = $envValues['FRONTEND_BASE_URL']
      $httpDemoMode = $envValues['MERCADO_PAGO_HTTP_DEMO_MODE']
      if ($frontendBaseUrl -like 'http://*' -and $httpDemoMode -ne 'true') {
        Write-Warn 'Mercado Pago over plain HTTP should use MERCADO_PAGO_HTTP_DEMO_MODE=true unless HTTPS is configured.'
      }
    }

    foreach ($requiredKey in @(
      'NEXT_PUBLIC_API_GATEWAY_URL',
      'API_GATEWAY_BASE_URL',
      'RABBITMQ_URL',
      'AUTH_DATABASE_URL',
      'ORDER_DATABASE_URL',
      'PAYMENT_DATABASE_URL'
    )) {
      if (-not $envValues[$requiredKey]) {
        Write-Warn "$requiredKey is not set in .env."
      }
    }

    if ($envValues['JWT_ACCESS_SECRET'] -eq 'replace-with-a-strong-local-secret') {
      Write-Warn 'JWT_ACCESS_SECRET is still the local placeholder. Change it outside disposable local development.'
    }
  }

  Write-Host ''
  Write-Host "Doctor finished with $failures failure(s) and $warnings warning(s)."
  if ($failures -gt 0) {
    exit 1
  }
}
finally {
  Pop-Location
}
