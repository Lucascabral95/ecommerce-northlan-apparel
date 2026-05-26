param(
  [string]$TerraformDir = "infra/terraform/environments/dev",
  [string]$Region = "us-east-1"
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

function Write-JsonTempFile {
  param([object]$Value)

  $path = [System.IO.Path]::GetTempFileName()
  $Value | ConvertTo-Json -Depth 20 -Compress | Set-Content -Path $path -Encoding ascii
  return $path
}

function Invoke-CheckedAws {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $output = & aws @Arguments | Out-String
  if ($LASTEXITCODE -ne 0) {
    throw "aws $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }

  return $output
}

function Invoke-ServiceMigration {
  param(
    [string]$ClusterName,
    [string]$ServiceName,
    [string]$SchemaPath
  )

  Write-Host "Migrating $ServiceName..."

  $serviceJson = Invoke-CheckedAws @(
    "ecs", "describe-services",
    "--region", $Region,
    "--cluster", $ClusterName,
    "--services", $ServiceName,
    "--query", "services[0]",
    "--output", "json"
  )
  $service = $serviceJson | ConvertFrom-Json

  if ($null -eq $service -or [string]::IsNullOrWhiteSpace([string]$service.taskDefinition)) {
    throw "ECS service '$ServiceName' was not found."
  }

  $network = $service.networkConfiguration.awsvpcConfiguration
  if ($null -eq $network) {
    throw "ECS service '$ServiceName' has no awsvpc network configuration."
  }

  $networkConfigurationPath = Write-JsonTempFile @{
    awsvpcConfiguration = @{
      assignPublicIp = [string]$network.assignPublicIp
      securityGroups = @($network.securityGroups)
      subnets         = @($network.subnets)
    }
  }

  $overridesPath = Write-JsonTempFile @{
    containerOverrides = @(
      @{
        command = @("sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema $SchemaPath")
        name    = $ServiceName
      }
    )
  }

  try {
    $runTaskJson = Invoke-CheckedAws @(
      "ecs", "run-task",
      "--region", $Region,
      "--cluster", $ClusterName,
      "--launch-type", "FARGATE",
      "--task-definition", [string]$service.taskDefinition,
      "--network-configuration", "file://$networkConfigurationPath",
      "--overrides", "file://$overridesPath",
      "--query", "{tasks:tasks,failures:failures}",
      "--output", "json"
    )

    $runTask = $runTaskJson | ConvertFrom-Json
    if (($runTask.failures | Measure-Object).Count -gt 0) {
      throw "Failed to start migration task for '$ServiceName': $($runTask.failures | ConvertTo-Json -Compress)"
    }

    $taskArn = [string]$runTask.tasks[0].taskArn
    if ([string]::IsNullOrWhiteSpace($taskArn)) {
      throw "AWS did not return a task ARN for '$ServiceName'."
    }

    Invoke-CheckedAws @(
      "ecs", "wait", "tasks-stopped",
      "--region", $Region,
      "--cluster", $ClusterName,
      "--tasks", $taskArn
    ) | Out-Null

    $taskJson = Invoke-CheckedAws @(
      "ecs", "describe-tasks",
      "--region", $Region,
      "--cluster", $ClusterName,
      "--tasks", $taskArn,
      "--query", "tasks[0]",
      "--output", "json"
    )
    $task = $taskJson | ConvertFrom-Json
    $container = @($task.containers) | Where-Object { $_.name -eq $ServiceName } | Select-Object -First 1

    if ($null -eq $container) {
      throw "Migration task for '$ServiceName' did not report its container result."
    }

    if ([int]$container.exitCode -ne 0) {
      throw "Migration failed for '$ServiceName' with exit code $($container.exitCode): $($container.reason)"
    }

    Write-Host "Migration completed: $ServiceName"
  } finally {
    Remove-Item -LiteralPath $networkConfigurationPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $overridesPath -Force -ErrorAction SilentlyContinue
  }
}

$clusterName = Get-TerraformOutputRaw "ecs_cluster_name"
$serviceNames = ConvertTo-Hashtable (Get-TerraformOutputJson "ecs_service_names")

$migrations = @(
  @{ Service = "auth-service"; Schema = "services/auth-service/prisma/schema.prisma" },
  @{ Service = "user-service"; Schema = "services/user-service/prisma/schema.prisma" },
  @{ Service = "catalog-service"; Schema = "services/catalog-service/prisma/schema.prisma" },
  @{ Service = "inventory-service"; Schema = "services/inventory-service/prisma/schema.prisma" },
  @{ Service = "cart-service"; Schema = "services/cart-service/prisma/schema.prisma" },
  @{ Service = "order-service"; Schema = "services/order-service/prisma/schema.prisma" },
  @{ Service = "payment-service"; Schema = "services/payment-service/prisma/schema.prisma" },
  @{ Service = "notification-service"; Schema = "services/notification-service/prisma/schema.prisma" }
)

foreach ($migration in $migrations) {
  $key = [string]$migration.Service
  if (-not $serviceNames.ContainsKey($key)) {
    throw "Terraform output ecs_service_names does not contain '$key'."
  }

  Invoke-ServiceMigration -ClusterName $clusterName -ServiceName $serviceNames[$key] -SchemaPath $migration.Schema
}

Write-Host "All Prisma migrations completed."
