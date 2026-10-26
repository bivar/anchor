// Rasterizes resources/icon-source.svg into the PWA icon set in public/icons/.
// The anchor sits well inside the central 80% "safe zone", so the same art works as a maskable icon.
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, 'icon-source.svg');
const out = join(here, '..', 'public', 'icons');

await mkdir(out, { recursive: true });
const sizes = { 'icon-192.png': 192, 'icon-512.png': 512, 'maskable-512.png': 512, 'apple-touch-icon.png': 180 };
for (const [name, size] of Object.entries(sizes)) {
  await sharp(src).resize(size, size).png({ compressionLevel: 9 }).toFile(join(out, name));
}
await copyFile(src, join(out, 'favicon.svg'));
console.log('icons generated in public/icons');
