# Presupuesto Mensual 💵

App web personal de **planificación mensual de gastos** ("el papel digital"): se carga a principio de mes todo lo previsto y el output principal es cuánto vas a gastar y cuánto te va a quedar.

> 🔒 App 100% local-first: los datos viven en la **IndexedDB del dispositivo**. El deploy (Netlify) solo sirve el código; ningún dato sale de tu navegador.

## ✨ Características

- **Planificación mensual** (no expense tracking diario): ingresos, gastos previstos, totales vivos.
- **Manejo de USD**: cada gasto soporta `monto ARS + monto USD × cotización` (fórmula exacta del resumen de tarjeta).
- **Template de meses**: al crear un mes nuevo se **clonan los gastos del mes anterior** (arrancan sin pagar).
- **Estados por gasto**: "por confirmar" (estimado) vs "confirmado", y "pendiente" vs "pagado ✓".
- **3 números vivos** en el header: Confirmado / Proyectado / Resto (ahorro proyectado).
- **PWA instalable + offline**: se instala como app en el celular y funciona sin internet.
- **Modo oscuro por defecto** con toggle 🌙/☀️.
- **Borrado con confirmación + undo** (toast "Deshacer").
- **Agrupar por categoría** con subtotales y **gráfico de barras** a demanda.
- **Cierre de mes**: histórico inmutable con opción de reabrir.
- **Export / Import JSON** de respaldo.
- Formato de números **es-AR** (punto de miles, coma decimal).

## 🚀 Desarrollo

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # build de producción a dist/
npm test          # tests (Vitest)
```

## ☁️ Deploy en Netlify (auto-deploy desde GitHub)

El proyecto incluye `netlify.toml` con el build y los redirects listos.

1. Subí el código a un repo de GitHub.
2. En Netlify → **Add new site → Import an existing project** → elegí el repo.
3. Netlify detecta `netlify.toml` automáticamente (comando `npm run build`, publish `dist`).
4. A partir de ahí, **cada `git push` a main re-deploya la app automáticamente**.

## 📦 Datos

- Los datos persisten en Internet... no, **en tu dispositivo** (IndexedDB).
- La app arranca **vacía**: el usuario crea su primer mes y carga sus gastos (guía interactiva incluida).
- Para hacer backup: **Exportar JSON** desde la app.
