import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , schemaPath, envName, fallbackUrl] = process.argv;

if (!schemaPath || !envName || !fallbackUrl) {
  console.error('Usage: node scripts/prisma-generate.mjs <schema-path> <env-name> <fallback-url>');
  process.exit(1);
}

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const prismaCliPath = join(rootDir, 'node_modules', 'prisma', 'build', 'index.js');

const result = spawnSync(process.execPath, [prismaCliPath, 'generate', '--schema', schemaPath], {
  env: {
    ...process.env,
    [envName]: process.env[envName] ?? fallbackUrl,
  },
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
