import { spawnSync } from 'node:child_process';
import { dyeing } from './highlight.mjs';

const hugo = spawnSync('hugo', process.argv.slice(2), { stdio: 'inherit' });
if (hugo.status !== 0) process.exit(hugo.status ?? 1);

const { processed, blocksReplaced } = await dyeing();
console.log(`shiki: processed ${processed} files, replaced ${blocksReplaced} code blocks`);
