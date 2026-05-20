import { rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const targets = ['dist', '.turbo', 'coverage'];
const workspaceRoots = ['apps/api-gateway', 'services/base-service', 'packages/shared'];

for (const target of targets) {
  await rm(join(root, target), { force: true, recursive: true });
}

for (const workspaceRoot of workspaceRoots) {
  for (const target of targets) {
    await rm(join(root, workspaceRoot, target), { force: true, recursive: true });
  }
}

console.log('Local build artifacts removed.');
