import { cp } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const dest = 'static/fonts';

export async function fetchFonts() {
  const src = process.env.IBM_PLEX_LITE;
  if (!src) throw new Error('IBM_PLEX_LITE env not set; run inside `nix develop`');
  execSync(`chmod -R u+w ${dest} 2>/dev/null; rm -rf ${dest}`);
  await cp(src, dest, { recursive: true, dereference: true });
  execSync(`chmod -R u+w ${dest}`);
}
