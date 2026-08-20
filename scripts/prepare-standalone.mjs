import { cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const standaloneDir = join(root, '.next', 'standalone');
const serverEntry = join(standaloneDir, 'server.js');

if (!existsSync(serverEntry)) {
  throw new Error('Missing .next/standalone/server.js; build with DEPLOY_RUNTIME=server first.');
}

function replaceTree(source, target) {
  if (!existsSync(source)) return;
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
}

// Next.js deliberately omits these trees from output: standalone. A portable
// Node deployment needs both beside server.js or its browser assets will 404.
replaceTree(join(root, 'public'), join(standaloneDir, 'public'));
replaceTree(join(root, '.next', 'static'), join(standaloneDir, '.next', 'static'));

console.log('Prepared standalone runtime with public and Next.js static assets.');
