import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { join } from 'node:path';
import livereload from 'livereload';
import { highlight, dyeing } from './highlight.mjs';

const hugo = spawn('hugo', ['server', '--disableLiveReload'], { stdio: 'inherit' });
hugo.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => { hugo.kill(); process.exit(0); });

const lr = livereload.createServer({ port: 35729 });

setTimeout(async () => {
  const { processed, blocksReplaced } = await dyeing();
  console.log(`shiki (initial): ${processed} files, ${blocksReplaced} blocks`);
  lr.refresh('/');
}, 2000);

const queue = new Set();
let processing = false;
let timer;

async function drain() {
  if (processing) return;
  processing = true;
  while (queue.size) {
    const file = queue.values().next().value;
    queue.delete(file);
    try {
      await highlight(file);
    } catch (e) {
      console.error(`highlight ${file} failed:`, e.message);
    }
  }
  processing = false;
  lr.refresh('/');
}

watch('public', { recursive: true }, (event, filename) => {
  if (!filename?.endsWith('.html')) return;
  const path = join('public', filename);
  queue.add(path);
  clearTimeout(timer);
  timer = setTimeout(drain, 100);
});
