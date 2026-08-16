/**
 * Script de prueba — llama al worker de Cloudflare con una imagen local
 * y muestra el JSON de gastos detectados por Gemini 2.0 Flash.
 *
 * Uso:
 *   node scripts/test-gemini-worker.mjs "WhatsApp Image 2026-08-16 at 05.45.36.jpeg"
 *
 * Requiere que el worker ya tenga configurada GEMINI_API_KEY.
 * El worker NO se llama directamente a Google: el worker es el proxy.
 */
import { readFileSync } from 'node:fs';

const WORKER_URL = 'https://polished-bar-b342.robinnet28.workers.dev';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: node scripts/test-gemini-worker.mjs <ruta-de-imagen>');
    process.exit(1);
  }

  const buffer = readFileSync(filePath);
  const base64 = buffer.toString('base64');
  console.log(`Enviando ${filePath} (${(buffer.length / 1024).toFixed(0)} KB)...\n`);

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

  console.log('Resultado del worker:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\nDescripción (JSON de gastos):');
  try {
    const parsed = JSON.parse(data.description);
    console.log(JSON.stringify(parsed, null, 2));
  } catch {
    console.log(data.description);
  }
}

main().catch((err) => {
  console.error('Fallo:', err.message);
  process.exit(1);
});