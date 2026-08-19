import {
  AlertTriangle,
  BarChart3,
  Calculator,
  Calendar,
  Camera,
  ChartColumn,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Copy,
  DollarSign,
  Download,
  Folder,
  Globe,
  HelpCircle,
  Lock,
  LockOpen,
  Moon,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  ScanLine,
  Search,
  Settings,
  Smartphone,
  Sun,
  Tag,
  Target,
  Trash2,
  Upload,
  Volume2,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';

/**
 * ============================================================
 *  ICONOS — Capa centralizada (Lucide Icons)
 * ============================================================
 *
 *  Por qué existe:
 *  - Un solo lugar para definir TODOS los iconos del proyecto
 *    (migración completa de emojis → SVG vectorial).
 *  - Tree-shaking: `lucide-react` es ESM y solo se bundlean los
 *    iconos importados aquí (imports nombrados individuales).
 *  - Coherencia estética: mismo strokeWidth, mismo tamaño y
 *    color heredado vía `currentColor` (respeta el tema claro/oscuro).
 *
 *  Cómo ampliar (proceso para nuevos iconos):
 *  1. Buscá el icono en el catálogo oficial de Lucide:
 *     https://lucide.dev/icons
 *  2. Agregá la importación nombrada arriba:
 *     import { MiIcono } from 'lucide-react';
 *  3. Registralo en el mapa `ICONS` de abajo con una clave corta.
 *  4. Usalo: <Icon name="miIcono" className="..."/>
 *
 *  Formato de prompt para la IA (mantiene tree-shaking y diseño):
 *  "Agrega un icono para la acción [Acción] en el componente [Componente]"
 *  → 1) import nombrado, 2) clave en ICONS, 3) uso con <Icon name=...>,
 *     respetando la paleta (activo = acento lime/violeta, inactivo = neutro)
 *     y el touch target mínimo de 44×44px.
 * ============================================================
 */

const ICONS = {
  alert: AlertTriangle,
  barChart: BarChart3,
  calculator: Calculator,
  calendar: Calendar,
  camera: Camera,
  chart: ChartColumn,
  check: Check,
  checkCircle: CheckCircle2,
  chevronDown: ChevronDown,
  clipboard: ClipboardList,
  clock: Clock,
  copy: Copy,
  dollar: DollarSign,
  download: Download,
  folder: Folder,
  globe: Globe,
  help: HelpCircle,
  lock: Lock,
  lockOpen: LockOpen,
  moon: Moon,
  more: MoreHorizontal,
  paperclip: Paperclip,
  pencil: Pencil,
  phone: Smartphone,
  plus: Plus,
  scan: ScanLine,
  search: Search,
  settings: Settings,
  sun: Sun,
  tag: Tag,
  target: Target,
  trash: Trash2,
  upload: Upload,
  volume: Volume2,
  wallet: Wallet,
  x: X,
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  /** Tamaño del SVG (width/height). Default 20 — adecuado para body de 12-14px. */
  size?: number;
  /** Grosor del trazo. Default 2 (Lucide default). Íconos decorativos 1.5. */
  strokeWidth?: number;
  className?: string;
  /** `aria-hidden` por defecto: la mayoría son decorativos. Ajustá si aportan texto. */
  ariaHidden?: boolean;
}

export function Icon({ name, size = 20, strokeWidth = 2, className, ariaHidden = true }: IconProps) {
  const Cmp: LucideIcon = ICONS[name];
  return (
    <Cmp
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={ariaHidden}
    />
  );
}