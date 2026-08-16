# AGENTS.md — Guía de arranque para la IA

Este archivo le da contexto instantáneo a una sesión nueva de IA que trabaje sobre este proyecto. La IA DEBE leer este archivo antes de cualquier tarea.

## 1. Cómo arrancar la app

```bash
npm install        # solo la primera vez
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run build      # build de producción (Netlify usa esto)
npm test           # tests Vitest (12 tests)
```

## 2. Reglas de trabajo (resumen del CONTEXTO V2)

- **Respuestas en español.**
- **Fórmula de gasto con USD** (regla crítica):
  `getExpenseTotal = (amountArs ?? estimatedArs ?? 0) + (amountUsd * usdRate)`
- Los totales y formatos VIVEN en `src/utils/money.ts` como funciones puras. **Nunca matemáticas dentro de componentes React.**
- Preferir la opción más simple (KISS). Sin librerías de UI pesadas.
- Registrar decisiones en `DECISIONS.md`.
- Avanzar en pasos chicos y correr `npm run build` tras cada cambio.

## 3. Stack y estructura

- **Stack**: Vite 8 + React 19 + TypeScript + Tailwind v4 + Dexie (IndexedDB) + vite-plugin-pwa.
- **Deploy**: Netlify con auto-deploy desde GitHub (`netlify.toml`). Cada `git push` a main re-deploya.
- Repo público: `https://github.com/robinalva28/crispy-potato` (la rama es `main`).

```
src/
  types.ts              # Month, Expense, Category
  db.ts                 # Dexie (tablas months + expenses)
  seed.ts               # seed DEMO genérico público (NO datos personales)
  utils/
    money.ts            # selectores puros + formatters es-AR
    format.ts           # parseLocalNumber (acepta "1.234,56")
    monthUtils.ts       # buildClonedExpenses (clonación pura)
  hooks/
    useBudget.ts        # negocio: CRUD, clonar mes, cerrar mes, undo borrado
    useDarkMode.ts      # modo oscuro (default) + toggle
  components/
    MonthSelector.tsx
    MonthHeader.tsx
    ExpenseRow.tsx
    ExpenseGroup.tsx
    CategoryBars.tsx
    ExpenseForm.tsx
    GuideModal.tsx      # guía interactiva (primera vez + botón ❓)
    LockScreen.tsx      # PIN (postergado, no integrado)
  App.tsx
```

## 4. Comportamiento de datos (IMPORTANTE)

- Los datos viven en la **IndexedDB del dispositivo**, nunca en el servidor.
- `pe-seeded` en localStorage evita re-sembrar el seed en dispositivos con datos.
- El seed `seedDemo` (demo genérico) se siembra solo en un dispositivo nuevo.
- `CONTEXTO.md` y `DECISIONS.md` son LOCALES (ignorados por git) — contienen contexto personal. NO subirlos a GitHub.

## 5. Estado actual (última sesión 2026-08-16)

Completado:
- Fase 1 V2 completa (CRUD, USD, clonación de meses, totales vivos).
- PWA instalable + offline.
- Modo oscuro por defecto + toggle.
- Borrado con confirmación + undo (toast 3s).
- Scroll automático al formulario al agregar gasto.
- Cierre/reapertura de mes.
- Agrupar por categoría + gráfico de barras bajo demanda.
- Guía interactiva (GuideModal) primera vez + botón "❓ Guía".
- Tests Vitest (12) verdes.
- GitHub + Netlify auto-deploy configurados.

Pendiente/iterable:
- PIN (lógica en `useLock.ts`/`LockScreen.tsx`, sin integrar en App — reactivar cuando el usuario quiera).
- Cifrado real de datos con WebCrypto (opcional futuro).
- Los tests de `src/utils/money.test.ts` usan el seedDemo.

## 6. Comandos útiles

```bash
npm run dev     # desarrollo
npm test        # tests
npm run build   # build (tsc + vite + PWA)
git push        # dispara el deploy automático en Netlify
```
