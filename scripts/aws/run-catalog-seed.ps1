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

function Get-SecretValue {
  param([string]$SecretId)

  $value = & aws secretsmanager get-secret-value --region $Region --secret-id $SecretId --query SecretString --output text | Out-String
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to read secret value for '$SecretId'."
  }

  return ($value | Out-String).Trim()
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

function Get-TaskLogExcerpt {
  param(
    [string]$TaskDefinitionArn,
    [string]$ServiceName,
    [string]$TaskArn
  )

  $taskDefinitionJson = Invoke-CheckedAws @(
    "ecs", "describe-task-definition",
    "--region", $Region,
    "--task-definition", $TaskDefinitionArn,
    "--query", "taskDefinition.containerDefinitions[?name=='$ServiceName'] | [0]",
    "--output", "json"
  )
  $taskDefinition = $taskDefinitionJson | ConvertFrom-Json
  if ($null -eq $taskDefinition -or $null -eq $taskDefinition.logConfiguration) {
    return ""
  }

  $logOptions = $taskDefinition.logConfiguration.options
  $logGroup = [string]$logOptions.'awslogs-group'
  $logPrefix = [string]$logOptions.'awslogs-stream-prefix'
  if ([string]::IsNullOrWhiteSpace($logGroup) -or [string]::IsNullOrWhiteSpace($logPrefix)) {
    return ""
  }

  $taskId = [string]($TaskArn -split "/")[-1]
  if ([string]::IsNullOrWhiteSpace($taskId)) {
    return ""
  }

  $logStreamName = "$logPrefix/$ServiceName/$taskId"
  $logsResult = & aws logs get-log-events --region $Region --log-group-name $logGroup --log-stream-name $logStreamName --limit 50 --query "events[].message" --output text 2>$null | Out-String
  if ($LASTEXITCODE -ne 0) {
    return ""
  }

  return ($logsResult | Out-String).Trim()
}

function Invoke-EcsOneOffTask {
  param(
    [string]$ClusterName,
    [string]$ServiceName,
    [string[]]$ContainerCommand,
    [string]$Label,
    [hashtable]$EnvironmentOverrides = @{}
  )

  Write-Host "$Label..."

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

  $containerOverride = @{
    command = @($ContainerCommand)
    name    = $ServiceName
  }
  if ($EnvironmentOverrides.Count -gt 0) {
    $containerOverride.environment = @(
      foreach ($entry in $EnvironmentOverrides.GetEnumerator()) {
        @{
          name  = [string]$entry.Key
          value = [string]$entry.Value
        }
      }
    )
  }

  $overridesPath = Write-JsonTempFile @{
    containerOverrides = @($containerOverride)
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
      "--count", "1",
      "--query", "{tasks:tasks,failures:failures}",
      "--output", "json"
    )

    $runTask = $runTaskJson | ConvertFrom-Json
    if (($runTask.failures | Measure-Object).Count -gt 0) {
      throw "Failed to start '$Label' task for '$ServiceName': $($runTask.failures | ConvertTo-Json -Compress)"
    }

    $startedTask = @($runTask.tasks) | Select-Object -First 1
    $taskArn = [string]$startedTask.taskArn
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
    $logExcerpt = Get-TaskLogExcerpt -TaskDefinitionArn ([string]$service.taskDefinition) -ServiceName $ServiceName -TaskArn $taskArn

    if ($null -eq $container -or $null -eq $container.exitCode) {
      throw "'$Label' task for '$ServiceName' did not complete cleanly. Task stopped reason: $($task.stoppedReason)`n$logExcerpt"
    }

    if ([int]$container.exitCode -ne 0) {
      throw "'$Label' failed for '$ServiceName' with exit code $($container.exitCode): $($container.reason). Task stopped reason: $($task.stoppedReason)`n$logExcerpt"
    }

    Write-Host "$Label completed."
  } finally {
    Remove-Item -LiteralPath $networkConfigurationPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $overridesPath -Force -ErrorAction SilentlyContinue
  }
}

$clusterName = Get-TerraformOutputRaw "ecs_cluster_name"
$serviceNames = ConvertTo-Hashtable (Get-TerraformOutputJson "ecs_service_names")
$secretArns = ConvertTo-Hashtable (Get-TerraformOutputJson "secret_arns")
$inventorySyncScript = @'
import process from "node:process";
import { PrismaClient as CatalogPrismaClient } from "./services/catalog-service/dist/generated/prisma/index.js";
import { PrismaClient as InventoryPrismaClient } from "./services/inventory-service/dist/generated/prisma/index.js";

const catalogPrisma = new CatalogPrismaClient();
const inventoryPrisma = new InventoryPrismaClient();

try {
  const variants = await catalogPrisma.productVariant.findMany({
    select: {
      id: true,
      isActive: true,
      productId: true,
      reservedStock: true,
      sku: true,
      stock: true,
    },
    where: {
      isActive: true,
      product: {
        isActive: true,
      },
    },
  });

  if (variants.length === 0) {
    throw new Error("Catalog seed did not produce active variants for inventory bootstrap.");
  }

  const activeSkus = variants.map((variant) => variant.sku);
  const obsoleteItemsResult = await inventoryPrisma.inventoryItem.updateMany({
    data: {
      isActive: false,
      reservedStock: 0,
      stockOnHand: 0,
    },
    where: {
      isActive: true,
      sku: {
        notIn: activeSkus,
      },
    },
  });

  let createdCount = 0;
  let updatedCount = 0;

  for (const variant of variants) {
    const existingItem = await inventoryPrisma.inventoryItem.findFirst({
      select: { id: true },
      where: {
        OR: [{ sku: variant.sku }, { variantId: variant.id }],
      },
    });

    const data = {
      isActive: variant.isActive,
      productId: variant.productId,
      reservedStock: variant.reservedStock,
      sku: variant.sku,
      stockOnHand: variant.stock,
      variantId: variant.id,
    };

    if (existingItem) {
      await inventoryPrisma.inventoryItem.update({
        data,
        where: { id: existingItem.id },
      });
      updatedCount += 1;
    } else {
      await inventoryPrisma.inventoryItem.create({ data });
      createdCount += 1;
    }
  }

  process.stdout.write(
    `Synchronized ${variants.length} inventory items from seeded catalog variants (${createdCount} created, ${updatedCount} updated, ${obsoleteItemsResult.count} archived).\n`,
  );
} finally {
  await Promise.all([catalogPrisma.$disconnect(), inventoryPrisma.$disconnect()]);
}
'@

foreach ($requiredService in @("catalog-service", "inventory-service")) {
  if (-not $serviceNames.ContainsKey($requiredService)) {
    throw "Terraform output ecs_service_names does not contain '$requiredService'."
  }
}

Invoke-EcsOneOffTask `
  -ClusterName $clusterName `
  -ServiceName $serviceNames["catalog-service"] `
  -ContainerCommand @("node", "services/catalog-service/dist/seed/seed.js") `
  -Label "Seeding catalog"

Invoke-EcsOneOffTask `
  -ClusterName $clusterName `
  -ServiceName $serviceNames["inventory-service"] `
  -ContainerCommand @("node", "--input-type=module", "-e", $inventorySyncScript) `
  -EnvironmentOverrides @{
    CATALOG_DATABASE_URL   = Get-SecretValue -SecretId $secretArns["catalog-database-url"]
    INVENTORY_DATABASE_URL = Get-SecretValue -SecretId $secretArns["inventory-database-url"]
  } `
  -Label "Synchronizing inventory from catalog"

Write-Host "Catalog seed and inventory synchronization completed."
