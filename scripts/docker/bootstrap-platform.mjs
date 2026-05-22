import { spawnSync } from 'node:child_process';
import process from 'node:process';

const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const steps = [
  {
    args: ['run', 'prisma:generate'],
    command: npmExecutable,
    label: 'Generate Prisma clients',
  },
  {
    args: ['run', 'prisma:migrate:all'],
    command: npmExecutable,
    label: 'Apply Prisma migrations',
  },
  {
    args: ['run', 'seed', '--workspace', '@northlane/catalog-service'],
    command: npmExecutable,
    label: 'Seed catalog',
  },
  {
    args: ['scripts/e2e/bootstrap-inventory.mjs'],
    command: process.execPath,
    label: 'Synchronize inventory',
  },
];

for (const step of steps) {
  process.stdout.write(`\n[bootstrap] ${step.label}\n`);

  const result = spawnSync(step.command, step.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

process.stdout.write('\n[bootstrap] Platform bootstrap completed successfully.\n');
