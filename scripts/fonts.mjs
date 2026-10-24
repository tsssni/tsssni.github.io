import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const dest = 'static/fonts';

const weights = {
  Thin: 100,
  ExtraLight: 200,
  Light: 300,
  Regular: 400,
  Medium: 500,
  SemiBold: 600,
  Bold: 700,
};

function parse(file) {
  const [stem, variant] = file.replace(/\.woff2$/, '').split('-');
  const family = stem
    .split(/(?<=[a-z])(?=[A-Z])|(?=[A-Z][a-z])/)
    .join(' ');
  const style = variant.endsWith('Italic') ? 'italic' : 'normal';
  const weight = weights[variant.replace(/Italic$/, '') || 'Regular'];
  return { file, family, style, weight };
}

function fontFace({ file, family, style, weight }) {
  return `@font-face {
  font-family: '${family}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url('/fonts/${file}') format('woff2');
}
`;
}

export async function fetchFonts() {
  const src = process.env.PLEXTINA;
  if (!src) throw new Error('PLEXTINA env not set; run inside `nix develop`');

  const fonts = (await readdir(`${src}/woff2`))
    .sort()
    .map(parse)
    .filter((font) => font.weight);

  execSync(`chmod -R u+w ${dest} 2>/dev/null; rm -rf ${dest}`);
  await mkdir(dest, { recursive: true });

  for (const { file } of fonts) {
    await copyFile(`${src}/woff2/${file}`, `${dest}/${file}`);
  }
  await writeFile(`${dest}/plex.css`, fonts.map(fontFace).join('\n'));

  execSync(`chmod -R u+w ${dest}`);
}
