/**
 * Prueba del worker con imagen local. Replica el preprocesado del front:
 * resize 1920px + JPEG 92% + contraste 1.35 / brillo -12.
 * Uso: node scripts/test-worker.mjs "foto.jpg"
 */
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const WORKER_URL = 'https://polished-bar-b342.robinnet28.workers.dev';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: node scripts/test-worker.mjs <ruta-de-imagen>');
    process.exit(1);
  }

  // Preprocesado igual al front
  const buf = await sharp(filePath)
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toBuffer();
  const contrastBuf = await sharp(buf).linear(1.35, -56.8).toBuffer();

  const originalKB = readFileSync(filePath).length / 1024;
  const processedKB = contrastBuf.length / 1024;
  const base64 = contrastBuf.toString('base64');
  console.log(`Enviando ${filePath} (${originalKB.toFixed(0)} KB → ${processedKB.toFixed(0)} KB)...\n`);

  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error(`Error ${res.status}:`, data.error ?? data);
    process.exit(1);
  }

  console.log('Resultado:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\nGastos:');
  try {
    console.log(JSON.stringify(JSON.parse(data.description), null, 2));
  } catch {
    console.log(data.description);
  }
}

main().catch((err) => {
  console.error('Fallo:', err.message);
  process.exit(1);
});