import { spawn } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const envFile = resolve(repoRoot, 'e2e', 'live.env');
const logDirectory = resolve(repoRoot, 'tmp', 'e2e-live', 'logs');
const dockerProjectName = 'northlane-e2e';
const isWindows = process.platform === 'win32';
const npmExecutable = isWindows ? 'npm.cmd' : 'npm';
const dockerExecutable = isWindows ? 'docker.exe' : 'docker';
const prismaExecutable = resolve(
  repoRoot,
  'node_modules',
  '.bin',
  isWindows ? 'prisma.cmd' : 'prisma',
);
const playwrightExecutable = resolve(
  repoRoot,
  'node_modules',
  '.bin',
  isWindows ? 'playwright.cmd' : 'playwright',
);

const serviceDefinitions = [
  {
    healthUrl: () => `http://127.0.0.1:${runtimeEnv.AUTH_SERVICE_PORT}/health`,
    name: 'auth-service',
    workspace: '@northlane/auth-service',
  },
  {
    healthUrl: () => `http://127.0.0.1:${runtimeEnv.USER_SERVICE_PORT}/health`,
    name: 'user-service',
    workspace: '@northlane/user-service',
  },
  {
    healthUrl: () => `http://127.0.0.1:${runtimeEnv.CATALOG_SERVICE_PORT}/health`,
    name: 'catalog-service',
    workspace: '@northlane/catalog-service',
  },
  {
    healthUrl: () => `http://127.0.0.1:${runtimeEnv.INVENTORY_SERVICE_PORT}/health`,
    name: 'inventory-service',
    workspace: '@northlane/inventory-service',
  },
  {
    healthUrl: () => `http://127.0.0.1:${runtimeEnv.CART_SERVICE_PORT}/health`,
    name: 'cart-service',
    workspace: '@northlane/cart-service',
  },
  {
    healthUrl: () => `http://127.0.0.1:${runtimeEnv.ORDER_SERVICE_PORT}/health`,
    name: 'order-service',
    workspace: '@northlane/order-service',
  },
  {
    healthUrl: () => `http://127.0.0.1:${runtimeEnv.PAYMENT_SERVICE_PORT}/health`,
    name: 'payment-service',
    workspace: '@northlane/payment-service',
  },
  {
    healthUrl: () => `http://127.0.0.1:${runtimeEnv.NOTIFICATION_SERVICE_PORT}/health`,
    name: 'notification-service',
    workspace: '@northlane/notification-service',
  },
  {
    healthUrl: () => `http://127.0.0.1:${runtimeEnv.API_GATEWAY_PORT}/api/v1/health`,
    name: 'api-gateway',
    workspace: '@northlane/api-gateway',
  },
  {
    healthUrl: () => `http://127.0.0.1:${runtimeEnv.WEB_PORT}/login`,
    name: 'web',
    workspace: '@northlane/web',
    workspaceArgs: () => ['--', '--port', runtimeEnv.WEB_PORT],
  },
];

const prismaSchemas = [
  resolve(repoRoot, 'services', 'auth-service', 'prisma', 'schema.prisma'),
  resolve(repoRoot, 'services', 'user-service', 'prisma', 'schema.prisma'),
  resolve(repoRoot, 'services', 'catalog-service', 'prisma', 'schema.prisma'),
  resolve(repoRoot, 'services', 'inventory-service', 'prisma', 'schema.prisma'),
  resolve(repoRoot, 'services', 'cart-service', 'prisma', 'schema.prisma'),
  resolve(repoRoot, 'services', 'order-service', 'prisma', 'schema.prisma'),
  resolve(repoRoot, 'services', 'payment-service', 'prisma', 'schema.prisma'),
  resolve(repoRoot, 'services', 'notification-service', 'prisma', 'schema.prisma'),
];

const runtimeEnv = {
  ...process.env,
};

const spawnedProcesses = [];

async function main() {
  await prepareEnvironment();

  try {
    await ensurePlaywrightInstalled();
    if (runtimeEnv.NORTHLANE_E2E_SKIP_BUILD !== '1') {
      await runCommand(npmExecutable, ['run', 'build'], 'build');
    }
    await recycleInfrastructure();
    await waitForContainerHealth('rabbitmq');
    await waitForContainerHealth('postgres');
    await waitForContainerHealth('redis');
    await resetDatabases();
    await seedCatalog();
    await bootstrapInventory();
    await startApplicationProcesses();
    await runPlaywrightSuite();
  } finally {
    await shutdown();
  }
}

async function prepareEnvironment() {
  await rm(resolve(repoRoot, 'tmp', 'e2e-live'), { force: true, recursive: true });
  await mkdir(logDirectory, { recursive: true });

  const fileContents = await readFile(envFile, 'utf8');
  Object.assign(runtimeEnv, parseEnvFile(fileContents), {
    CI: '1',
    FORCE_COLOR: '0',
    NEXT_TELEMETRY_DISABLED: '1',
  });
}

function parseEnvFile(fileContents) {
  return fileContents
    .split(/\r?\n/u)
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .reduce((accumulator, line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) {
        return accumulator;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      accumulator[key] = value;
      return accumulator;
    }, {});
}

async function ensurePlaywrightInstalled() {
  try {
    await readFile(playwrightExecutable);
  } catch {
    throw new Error(
      'Playwright is not installed in node_modules. Run `npm install` before `npm run test:e2e:live`.',
    );
  }
}

async function recycleInfrastructure() {
  await runCommand(
    dockerExecutable,
    ['compose', '-p', dockerProjectName, '--env-file', envFile, 'down', '-v', '--remove-orphans'],
    'docker-down',
    { allowFailure: true },
  );
  await runCommand(
    dockerExecutable,
    [
      'compose',
      '-p',
      dockerProjectName,
      '--env-file',
      envFile,
      'up',
      '-d',
      'rabbitmq',
      'postgres',
      'redis',
    ],
    'docker-up',
  );
}

async function waitForContainerHealth(serviceName) {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    const containerId = (
      await runCommand(
        dockerExecutable,
        ['compose', '-p', dockerProjectName, '--env-file', envFile, 'ps', '-q', serviceName],
        `docker-ps-${serviceName}`,
      )
    ).stdout.trim();

    if (containerId) {
      const health = (
        await runCommand(
          dockerExecutable,
          ['inspect', '--format={{json .State.Health.Status}}', containerId],
          `docker-health-${serviceName}`,
        )
      ).stdout.trim();

      if (health === '"healthy"') {
        return;
      }
    }

    await wait(1_000);
  }

  throw new Error(`Container ${serviceName} did not become healthy in time.`);
}

async function resetDatabases() {
  for (const schemaPath of prismaSchemas) {
    await runCommand(
      prismaExecutable,
      ['db', 'push', '--force-reset', '--skip-generate', '--schema', schemaPath],
      `prisma-db-push-${basename(dirname(dirname(schemaPath)))}`,
      { env: runtimeEnv },
    );
  }
}

async function seedCatalog() {
  await runCommand(
    npmExecutable,
    ['run', 'seed', '--workspace', '@northlane/catalog-service'],
    'catalog-seed',
    { env: runtimeEnv },
  );
}

async function bootstrapInventory() {
  await runCommand(
    process.execPath,
    [resolve(repoRoot, 'scripts', 'e2e', 'bootstrap-inventory.mjs')],
    'inventory-bootstrap',
    { env: runtimeEnv },
  );
}

async function startApplicationProcesses() {
  for (const service of serviceDefinitions) {
    startBackgroundProcess(service);
  }

  for (const service of serviceDefinitions) {
    await waitForHttp(service.healthUrl(), service.name);
  }
}

function startBackgroundProcess(service) {
  const logPath = resolve(logDirectory, `${service.name}.log`);
  const logStream = createWriteStream(logPath, { flags: 'w' });
  const child = spawnForPlatform(
    npmExecutable,
    [
      'run',
      'start',
      '--workspace',
      service.workspace,
      ...(typeof service.workspaceArgs === 'function' ? service.workspaceArgs() : service.workspaceArgs ?? []),
    ],
    {
      cwd: repoRoot,
      env: runtimeEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );

  child.stdout.on('data', (chunk) => {
    logStream.write(chunk);
  });
  child.stderr.on('data', (chunk) => {
    logStream.write(chunk);
  });
  child.on('exit', (code) => {
    logStream.write(`\n[process-exit] ${service.name} exited with code ${code ?? 'null'}.\n`);
  });

  spawnedProcesses.push({
    child,
    logPath,
    logStream,
    name: service.name,
  });
}

async function waitForHttp(url, name) {
  const deadline = Date.now() + 90_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {}

    const crashed = spawnedProcesses.find(
      (processRecord) => processRecord.name === name && processRecord.child.exitCode !== null,
    );
    if (crashed) {
      throw new Error(`${name} exited before becoming healthy. Inspect ${crashed.logPath}.`);
    }

    await wait(1_000);
  }

  throw new Error(`${name} did not become healthy at ${url}.`);
}

async function runPlaywrightSuite() {
  await runCommand(
    playwrightExecutable,
    ['test', '--config', resolve(repoRoot, 'e2e', 'playwright.live.config.ts')],
    'playwright-live',
    { env: runtimeEnv },
  );
}

async function shutdown() {
  for (const processRecord of spawnedProcesses.reverse()) {
    await terminateProcess(processRecord.child.pid);
    processRecord.logStream.end();
  }

  if (runtimeEnv.NORTHLANE_E2E_KEEP_STACK === '1') {
    return;
  }

  await runCommand(
    dockerExecutable,
    ['compose', '-p', dockerProjectName, '--env-file', envFile, 'down', '-v', '--remove-orphans'],
    'docker-down',
    { allowFailure: true },
  );
}

async function terminateProcess(pid) {
  if (!pid) {
    return;
  }

  if (isWindows) {
    await runCommand('taskkill.exe', ['/pid', String(pid), '/t', '/f'], `taskkill-${pid}`, {
      allowFailure: true,
    });
    return;
  }

  process.kill(pid, 'SIGTERM');
}

async function runCommand(command, args, label, options = {}) {
  const logPath = resolve(logDirectory, `${label}.log`);
  const logStream = createWriteStream(logPath, { flags: 'w' });

  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawnForPlatform(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: options.env ?? runtimeEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      logStream.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      logStream.write(text);
    });
    child.on('error', (error) => {
      logStream.end();
      rejectPromise(error);
    });
    child.on('close', (code) => {
      logStream.end();
      if (code === 0 || options.allowFailure) {
        resolvePromise({ code, logPath, stderr, stdout });
        return;
      }

      rejectPromise(
        new Error(
          `${label} failed with code ${code}. Inspect ${logPath}.${stderr ? `\n${stderr}` : ''}`,
        ),
      );
    });
  });
}

function spawnForPlatform(command, args, options) {
  if (isWindows && command.toLowerCase().endsWith('.cmd')) {
    return spawn(buildWindowsShellCommand(command, args), {
      ...options,
      shell: true,
    });
  }

  return spawn(command, args, options);
}

function buildWindowsShellCommand(command, args) {
  return [quoteWindowsShellToken(command), ...args.map(quoteWindowsShellToken)].join(' ');
}

function quoteWindowsShellToken(value) {
  if (/^[A-Za-z0-9_./:=@-]+$/u.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '\\"')}"`;
}

function wait(milliseconds) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
}

await main();
