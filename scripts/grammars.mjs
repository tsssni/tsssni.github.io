import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const destDir = join(__dirname, '..', 'assets', 'shiki', 'langs');

const grammars = [
  {
    name: 'slang',
    url: 'https://raw.githubusercontent.com/shader-slang/slang-vscode-extension/v2.0.10/syntaxes/slang.tmLanguage.json',
  },
];

export async function fetchGrammars() {
  await mkdir(destDir, { recursive: true });
  for (const g of grammars) {
    const res = await fetch(g.url);
    if (!res.ok) throw new Error(`fetch ${g.name}: ${res.status}`);
    const grammar = await res.json();
    grammar.name = g.name;
    await writeFile(join(destDir, `${g.name}.json`), JSON.stringify(grammar));
  }
}
