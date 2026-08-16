import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const svgPath = path.resolve('public/icon.svg');

async function generate() {
  const svg = await readFile(svgPath);

  const sizes = [
    { file: 'public/icon-192.png', size: 192 },
    { file: 'public/icon-512.png', size: 512 },
    { file: 'public/apple-touch-icon.png', size: 180 },
  ];

  for (const { file, size } of sizes) {
    const png = await sharp(svg).resize(size, size).png().toBuffer();
    await writeFile(path.resolve(file), png);
    console.log(`✔ ${file} (${size}x${size})`);
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});