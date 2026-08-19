# AGENTS.md — Guía de arranque para la IA

Este archivo le da contexto instantáneo a una sesión nueva de IA que trabaje sobre este proyecto. La IA DEBE leer este archivo antes de cualquier tarea.

## 1. Cómo arrancar la app

```bash
npm install        # solo la primera vez
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run build      # build de producción (Cloudflare Pages usa esto)
npm test           # tests Vitest (70 tests)
```

## 2. Reglas de trabajo (resumen del CONTEXTO V2 + evolución)

- **Respuestas en español.**
- **Fórmula de gasto con USD** (regla crítica):
  `getExpenseTotal = (amountArs ?? estimatedArs ?? 0) + (amountUsd * usdRate)`
- Los totales y formatos VIVEN en `src/utils/money.ts` como funciones puras. **Nunca matemáticas dentro de componentes React.**
- Preferir la opción más simple (KISS). Sin librerías de UI pesadas.
- Registrar decisiones en `DECISIONS.md`.
- Avanzar en pasos chicos y correr `npm run build` tras cada cambio.
- **De ahora en más**: NO pushear sin que el usuario pruebe los cambios en local primero. Dejar el working tree listo y esperar confirmación para commitear/pushear.

## 3. Sistema de estilos (IMPORTANTE — cómo usamos CSS)

### Variables de tema (único lugar donde viven)
Todo en `src/index.css` en `:root` (claro) y `.dark` (oscuro):

| Variable | Modo claro | Modo oscuro | Uso |
|---|---|---|---|
| `--bg` | `rgba(255,255,255,.82)` | `rgba(26,28,31,.78)` | fondos de inputs/overlays genéricos |
| `--card` | `rgba(255,255,255,.78)` | `rgba(26,28,31,.78)` | fondo de la card principal |
| `--border` | `rgba(0,0,0,.08)` | `rgba(255,255,255,.1)` | bordes |
| `--txt` | `#20241f` | `rgba(230,235,230,.92)` | texto principal |
| `--muted` | `#6b7280` | `#6e7681` | texto secundario |
| `--surface` | `rgba(0,0,0,.03)` | `rgba(255,255,255,.06)` | fondos de tarjetas/chips/botones internos |
| `--surface-strong` | `rgba(0,0,0,.06)` | `rgba(255,255,255,.1)` | hover/pressed |
| `--panel` | `rgba(255,255,255,.97)` | `rgba(24,27,31,.97)` | paneles superpuestos: speed dial, mini menú, bottom sheet, y la bottom bar (casi opaco) |

Compat: `--glass-bg/--glass-border/--glass-text/--glass-strong-bg` son alias históricos de `--bg/--border/--txt/--card`.

### Regla de oro de colores
**Nunca más hex literal o gradiente hardcodeado en JSX.** Si se repite un color, crear clase token en `src/index.css` (ver D23).

### Tokens de acento Aura (clases utilitarias en `index.css`)
- `.grad-lime` — `linear-gradient(135deg,#65a30d,#84cc16)` (chips activos, iconos).
- `.grad-lime-strong` — `linear-gradient(135deg,#65a30d,#84cc16 55%,#10b981)` (headers destacados: guía, lock).
- `.grad-violet` — `linear-gradient(135deg,#8b5cf6,#d946ef)` (acciones foto/escáner).
- `.grad-emerald` — `linear-gradient(135deg,#10b981,#34d399)` (check pagado).
- `.soft-lime` — fondo lime suave + borde (panel "Resto"/"Ahorro proyectado").
- `.text-olive` — `color:#4d7c0f` (textos de ahorro/resto).

## 4. Componentes de UI reutilizables (IMPORTANTE — cómo usamos componentes)

Existe una capa de **primitivas** en `src/components/ui/` que debe usarse **siempre** que un botón/input/modal se necesite más de una vez (ver D24):

| Componente | Export | Cómo se usa |
|---|---|---|
| `ui/Button.tsx` | `Button` | `<Button variant="primary\|ghost\|danger\|violet\|dangerGhost" size="sm\|md\|lg" fullWidth>`. Default `variant="primary" size="md"`. |
| `ui/InputBase.tsx` | `InputBase`, `SelectBase`, `Field` | `<InputBase/>` (input), `<SelectBase/>` (select), `<Field label={} hint={}>` (wraper con label + hint). Reemplaza el `inputCls` local duplicado. |
| `ui/Modal.tsx` | `Modal` | `<Modal open onClose title footer maxWidth>` → overlay blur + panel glass + header con ✕. |

**Regla**: si un botón/input/modal se usa más de 1 vez, usar la primitiva de `ui/`; nunca copiar el string de clases a mano.

### Componentes del app shell v4
- `BottomNav` — bottom bar (selector de vista + "⋯ Más").
- `ViewMenu` — mini menú de vista (Presupuesto/Ahorro), fila activa en verde con ✓.
- `MoreSheet` — bottom sheet "Más" (con **drag-to-dismiss** por el handle superior).
- `ExpenseContextMenu` — menú contextual del gasto (Editar/Clonar/Eliminar) con card fantasma nítida.
- **Layout**: `.app-shell` ocupa `100dvh`; `.v4-hdr` (header fijo, plano arriba, **curva inferior** `0 0 28px 28px`) y `.bbar` (bottom bar con **curvas superiores** `28px 28px 0 0`, piso plano con safe-area) **se superponen al scroll** vía `z-index` + `margin -28px`, con padding compensatorio en `.app-scroll`.

### Stacking y posicionamiento
- El `glass-card` crea stacking context: **overlays/menús que deben pasar por encima viven FUERA del `<main>`** (FAB+speed dial, overlay `ov-v4`, view-menu, sheets) con `position: fixed`.
- El overlay unificado (`ov-v4`, z45) cierra cualquier panel; solo un panel abierto a la vez.

## 5. Stack y estructura

- **Stack**: Vite 8 + React 19 + TypeScript + Tailwind v4 + Dexie (IndexedDB) + vite-plugin-pwa.
- **Deploy**: Cloudflare Pages con auto-deploy desde GitHub. URL: `https://presupuesto.commitlog.net`.
- Build: `npm run build` (output `dist/`). SPA fallback activado en el dashboard (Settings → Advanced settings → Single-page application).
- ⚠️ **No poner `_redirects` ni `wrangler.jsonc` en el repo** (loop infinito / falla con modo Worker). El SPA se configura solo desde el dashboard.
- Repo público: `https://github.com/robinalva28/crispy-potato` (rama `main`).

```
src/
  types.ts              # Month, Expense, Category, SavingsGoal, View, ExpenseRect
  db.ts                 # Dexie (tablas months + expenses + savings)
  seed.ts               # seed DEMO genérico público (NO datos personales)
  utils/
    money.ts            # selectores puros + formatters es-AR (FÓRMULA CRÍTICA USD)
    format.ts           # parseLocalNumber (acepta "1.234,56")
    monthUtils.ts       # buildClonedExpenses, canUsePhoto (clonación/clon fecha)
    savings.ts          # proyección de ahorro (selectores puros)
    feedback.ts         # sonidos WebAudio + vibración
    photoExtract.ts     # Worker foto: cascada VLM (vision) + normalización JSON
    invoiceExtract.ts   # escaneo de factura en ExpenseForm
  hooks/
    useBudget.ts        # negocio: CRUD, clonar mes, cerrar mes, undo borrado
    useSavings.ts       # CRUD de segmentos de ahorro
    useDarkMode.ts      # modo oscuro (default) + toggle
    useFeedback.ts      # hook de feedback háptico/sonoro
  components/
    ui/                 # PRIMITIVAS: Button, InputBase, SelectBase, Field, Modal
    BottomNav.tsx       # bottom bar: vista + Más
    ViewMenu.tsx        # mini menú de vista (Presupuesto/Ahorro)
    MoreSheet.tsx       # bottom sheet "Más" (drag-to-dismiss)
    ExpenseContextMenu.tsx  # menú contextual gasto (editar/clonar/eliminar)
    ExpenseRow.tsx      # fila de gasto (click → menú contextual en mes abierto)
    ExpenseGroup.tsx    # grupo por categoría (subtotal + filas)
    CategoryBars.tsx    # barras por categoría con semáforo
    ExpenseForm.tsx     # formulario gasto (nombre/categoría/montos/fecha/pagado/notas + escáner)
    PhotoExpenseModal.tsx  # revisión de gastos detectados por foto
    GuideModal.tsx      # guía interactiva (primera vez + botón ❓)
    SavingsCalculator.tsx  # tarjetas de segmentos de ahorro
    SavingsGoalForm.tsx   # formulario segmento de ahorro
    LockScreen.tsx      # PIN (postergado, no integrado)
  App.tsx               # app shell: header fijo + scroll interno + bottom bar + estados
```

## 6. Comportamiento de datos (IMPORTANTE)

- Los datos viven en la **IndexedDB del dispositivo**, nunca en el servidor.
- `pe-seeded` en localStorage evita re-sembrar el seed en dispositivos con datos.
- El seed `seedDemo` (demo genérico) se siembra solo en un dispositivo nuevo.
- `CONTEXTO.md` y `DECISIONS.md` son LOCALES (ignorados por git) — contienen decisiones personales/de proyecto. NO subirlos a GitHub (por eso `DECISIONS.md` no se commitea).

## 7. Estado actual (última sesión 2026-08-18)

Completado:
- App shell v4: header fijo con 3 filas (título+vista+Resto+✎, chips de meses, stats fijas), scroll interno solo en lista, bottom bar fija con selector de vista + FAB + "⋯ Más".
- Mini menú de vista (Presupuesto/Ahorro) en la bottom bar izquierda; título del header refleja la vista.
- Bottom sheet "Más" con 9 opciones (incl. toggle de tema y drag-to-dismiss).
- Menú contextual por gasto: card fantasma nítida sobre overlay blur (editar/clonar/eliminar).
- Tema claro/oscuro con variables CSS (`--bg/--card/--border/--txt/--muted/--surface/--panel`).
- **Limpieza de estilos (D23)**: tokens de acento `.grad-lime/.grad-violet` etc., sin hex en JSX.
- **Primitivas de UI (D24)**: `ui/Button`, `ui/InputBase`, `ui/Modal` refactorizados en todos los componentes.
- Safe-area responsive (barra tradicional y gestos) + curvas internas iPhone (header/bbar).
- CRUD gastos, cierre/reapertura mes, borrado con undo, clonación de meses, USD, backup, búsqueda, duplicado, presupuestos por categoría, ahorro, foto de apuntes (Workers AI cascada VLM), feedback háptico/sonoro.
- Tests Vitest: **70 verdes**.

Pendiente/iterable:
- Implementar la **preview D del formulario de gastos** (acordeón + toggles + divisas multi) en `ExpenseForm.tsx` — la preview está en `rebranding-preview/formulario-opcion-d-combinada.html`.
- PIN (lógica en `useLock.ts`/`LockScreen.tsx`, sin integrar).
- Cifrado real con WebCrypto (opcional futuro).

## 8. Comandos útiles

```bash
npm run dev     # desarrollo
npm test        # tests
npm run build   # build (tsc + vite + PWA)
git push        # dispara el deploy automático en Cloudflare Pages (solo tras prueba local)