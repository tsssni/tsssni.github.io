import { spawn } from 'node:child_process';
import { fetchFonts } from './fonts.mjs';
import { fetchGrammars } from './grammars.mjs';

await fetchFonts();
console.log('fonts: fetched');

await fetchGrammars();
console.log('grammars: fetched');

const hugo = spawn('hugo', ['server', '--bind', '0.0.0.0'], { stdio: 'inherit' });
hugo.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => { hugo.kill(); process.exit(0); });
