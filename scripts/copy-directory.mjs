import { cp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const [, , source, destination] = process.argv;

if (!source || !destination) {
  console.error('Usage: node scripts/copy-directory.mjs <source> <destination>');
  process.exit(1);
}

const sourcePath = resolve(process.cwd(), source);
const destinationPath = resolve(process.cwd(), destination);

await rm(destinationPath, { force: true, recursive: true });
await cp(sourcePath, destinationPath, { recursive: true });
