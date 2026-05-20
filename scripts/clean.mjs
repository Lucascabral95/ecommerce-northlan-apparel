import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const targets = ['dist', '.next', '.turbo', 'coverage'];
const workspaceParents = ['apps', 'services', 'packages'];

for (const target of targets) {
  await rm(join(root, target), { force: true, recursive: true });
}

for (const workspaceParent of workspaceParents) {
  const absoluteParent = join(root, workspaceParent);
  const entries = await readdir(absoluteParent, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    for (const target of targets) {
      await rm(join(absoluteParent, entry.name, target), { force: true, recursive: true });
    }
  }
}

console.log('Local build artifacts removed.');
