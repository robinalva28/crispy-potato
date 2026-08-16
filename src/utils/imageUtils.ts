/** Preprocesa una imagen (resize 1920 + JPEG 92% + contraste) y devuelve base64. */
export async function fileToBase64(file: File): Promise<string> {
  // Usar createImageBitmap con orientación EXIF (Chrome/Edge/Android/iOS)
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const MAX = 1920;
      let { width, height } = bitmap;
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo procesar la imagen');
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      enhanceContrast(ctx, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    } catch {
      // fallback abajo
    }
  }
  // Fallback clásico (Safari viejo)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const MAX = 1920;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) {
              height = Math.round((height * MAX) / width);
              width = MAX;
            } else {
              width = Math.round((width * MAX) / height);
              height = MAX;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo procesar la imagen'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          enhanceContrast(ctx, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          resolve(dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl);
        } catch {
          reject(new Error('No se pudo procesar la imagen'));
        }
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/** Aumenta contraste y reduce brillo para resaltar la tinta (mejor OCR). */
function enhanceContrast(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (p: number) => Math.min(255, Math.max(0, (p - 128) * 1.35 + 128 - 12));
    d[i] = v(d[i]);
    d[i + 1] = v(d[i + 1]);
    d[i + 2] = v(d[i + 2]);
  }
  ctx.putImageData(imgData, 0, 0);
}