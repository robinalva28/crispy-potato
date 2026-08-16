/** Prueba del worker de facturas. Replica preprocesado del front (resize 1920 + JPEG 92 + contraste). */
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const URL = 'https://factura-b342.robinnet28.workers.dev';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: node scripts/test-factura-worker.mjs <factura.jpg>');
    process.exit(1);
  }
  const buf = await sharp(filePath)
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toBuffer();
  const contrast = await sharp(buf).linear(1.35, -56.8).toBuffer();
  const base64 = contrast.toString('base64');
  console.log(`Enviando ${filePath} (${readFileSync(filePath).length / 1024 | 0} KB → ${contrast.length / 1024 | 0} KB)...\n`);
  const res = await fetch(URL, {
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
  try {
    console.log('\nFactura:');
    console.log(JSON.stringify(JSON.parse(data.description), null, 2));
  } catch {
    console.log(data.description);
  }
}
main().catch((e) => { console.error('Fallo:', e.message); process.exit(1); });