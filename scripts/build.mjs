import { spawnSync } from 'node:child_process';
import { fetchFonts } from './fonts.mjs';
import { fetchGrammars } from './grammars.mjs';

await fetchFonts();
console.log('fonts: fetched');

await fetchGrammars();
console.log('grammars: fetched');

const hugo = spawnSync('hugo', { stdio: 'inherit' });
if (hugo.status !== 0) process.exit(hugo.status ?? 1);
