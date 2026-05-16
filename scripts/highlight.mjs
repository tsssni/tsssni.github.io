import { createHighlighter, bundledLanguages } from 'shiki';
import { readFile, writeFile, access, mkdir } from 'node:fs/promises';
import { glob } from 'glob';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const planaTheme = JSON.parse(await readFile(join(__dirname, '..', 'assets', 'shiki', 'plana.json'), 'utf8'));

const cacheDir = join(__dirname, '..', '.cache');
const slangGrammarPath = join(cacheDir, 'slang.tmLanguage.json');
const slangGrammarURL = 'https://raw.githubusercontent.com/shader-slang/slang-vscode-extension/v2.0.10/syntaxes/slang.tmLanguage.json';

async function loadSlangGrammar() {
  try {
    await access(slangGrammarPath);
  } catch {
    console.log('fetching slang grammar...');
    await mkdir(cacheDir, { recursive: true });
    const res = await fetch(slangGrammarURL);
    if (!res.ok) throw new Error(`failed to fetch slang grammar: ${res.status}`);
    await writeFile(slangGrammarPath, await res.text());
  }
  return JSON.parse(await readFile(slangGrammarPath, 'utf8'));
}

const slangGrammar = await loadSlangGrammar();

export const highlighter = await createHighlighter({
  themes: [planaTheme],
  langs: [...Object.keys(bundledLanguages), { ...slangGrammar, name: 'slang' }],
});

const decodeEntities = (s) => s
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#34;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&');

const codeBlockRe = /<pre[^>]*>\s*<code(?:\s+class="language-([\w+#-]+)")?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/g;

export async function highlight(path) {
  const html = await readFile(path, 'utf8');
  let count = 0;
  const replaced = html.replace(codeBlockRe, (match, lang, code) => {
    const decoded = decodeEntities(code);
    const targetLang = lang?.toLowerCase();
    if (!targetLang) return match;
    try {
      const out = highlighter.codeToHtml(decoded, { lang: targetLang, theme: 'plana' });
      count++;
      return out;
    } catch {
      return match;
    }
  });
  if (count > 0 && replaced !== html) {
    await writeFile(path, replaced);
  }
  return count;
}

export async function dyeing() {
  const files = await glob('public/**/*.html');
  let processed = 0;
  let blocksReplaced = 0;
  for (const file of files) {
    const n = await highlight(file);
    if (n > 0) {
      processed++;
      blocksReplaced += n;
    }
  }
  return { processed, blocksReplaced };
}

