param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('up', 'start', 'bootstrap', 'down', 'logs', 'observability-logs', 'lint', 'test', 'build', 'typecheck')]
  [string]$Action
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Push-Location $repoRoot

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Label,
    [Parameter(Mandatory = $true)]
    [string]$Executable,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  Write-Host ">> $Label"
  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "'$Label' failed with exit code $LASTEXITCODE."
  }
}

try {
  switch ($Action) {
    'up' {
      Invoke-Step -Label 'docker compose build backend-runtime bootstrap web' -Executable 'docker' -Arguments @('compose', 'build', 'backend-runtime', 'bootstrap', 'web')
      Invoke-Step -Label 'docker compose up -d postgres rabbitmq redis' -Executable 'docker' -Arguments @('compose', 'up', '-d', 'postgres', 'rabbitmq', 'redis')
      Invoke-Step -Label 'docker compose --profile bootstrap run --rm bootstrap' -Executable 'docker' -Arguments @('compose', '--profile', 'bootstrap', 'run', '--rm', 'bootstrap')
      Invoke-Step -Label 'docker compose up -d --no-build' -Executable 'docker' -Arguments @('compose', 'up', '-d', '--no-build')
    }
    'start' {
      Invoke-Step -Label 'docker compose up -d --no-build' -Executable 'docker' -Arguments @('compose', 'up', '-d', '--no-build')
    }
    'bootstrap' {
      Invoke-Step -Label 'docker compose --profile bootstrap run --rm bootstrap' -Executable 'docker' -Arguments @('compose', '--profile', 'bootstrap', 'run', '--rm', 'bootstrap')
    }
    'down' {
      Invoke-Step -Label 'docker compose down --remove-orphans' -Executable 'docker' -Arguments @('compose', 'down', '--remove-orphans')
    }
    'logs' {
      Invoke-Step -Label 'docker compose logs --tail=100 -f' -Executable 'docker' -Arguments @('compose', 'logs', '--tail=100', '-f')
    }
    'observability-logs' {
      Invoke-Step -Label 'docker compose logs -f prometheus grafana loki alloy' -Executable 'docker' -Arguments @('compose', 'logs', '-f', 'prometheus', 'grafana', 'loki', 'alloy')
    }
    'lint' {
      Invoke-Step -Label 'npm run lint' -Executable 'npm.cmd' -Arguments @('run', 'lint')
    }
    'test' {
      Invoke-Step -Label 'npm test' -Executable 'npm.cmd' -Arguments @('test')
    }
    'build' {
      Invoke-Step -Label 'npm run build' -Executable 'npm.cmd' -Arguments @('run', 'build')
    }
    'typecheck' {
      Invoke-Step -Label 'npm run typecheck' -Executable 'npm.cmd' -Arguments @('run', 'typecheck')
    }
  }
}
finally {
  Pop-Location
}
