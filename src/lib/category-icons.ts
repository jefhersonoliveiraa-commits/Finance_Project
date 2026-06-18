import {
  ShoppingCart,
  Car,
  Tv,
  Zap,
  Laptop,
  HeartPulse,
  Gamepad2,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import type { Category } from './types'

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  alimentacao: ShoppingCart,
  comida: ShoppingCart,
  food: ShoppingCart,
  mercado: ShoppingCart,
  restaurante: ShoppingCart,
  transport: Car,
  transporte: Car,
  uber: Car,
  combustivel: Car,
  gasolina: Car,
  assinatura: Tv,
  stream: Tv,
  streaming: Tv,
  netflix: Tv,
  spotify: Tv,
  casa: Zap,
  contas: Zap,
  luz: Zap,
  agua: Zap,
  internet: Zap,
  energia: Zap,
  eletronicos: Laptop,
  tech: Laptop,
  tecnologia: Laptop,
  saude: HeartPulse,
  remedio: HeartPulse,
  farmacia: HeartPulse,
  lazer: Gamepad2,
  entretenimento: Gamepad2,
}

const ICON_KEYWORDS: { kw: string; icon: LucideIcon }[] = [
  { kw: 'aliment', icon: ShoppingCart },
  { kw: 'comida', icon: ShoppingCart },
  { kw: 'mercado', icon: ShoppingCart },
  { kw: 'restaurante', icon: ShoppingCart },
  { kw: 'food', icon: ShoppingCart },
  { kw: 'transport', icon: Car },
  { kw: 'carro', icon: Car },
  { kw: 'combust', icon: Car },
  { kw: 'gasolina', icon: Car },
  { kw: 'uber', icon: Car },
  { kw: 'assinatura', icon: Tv },
  { kw: 'stream', icon: Tv },
  { kw: 'netflix', icon: Tv },
  { kw: 'spotify', icon: Tv },
  { kw: 'casa', icon: Zap },
  { kw: 'conta', icon: Zap },
  { kw: 'luz', icon: Zap },
  { kw: 'agua', icon: Zap },
  { kw: 'energia', icon: Zap },
  { kw: 'internet', icon: Zap },
  { kw: 'eletr', icon: Laptop },
  { kw: 'tech', icon: Laptop },
  { kw: 'tecnol', icon: Laptop },
  { kw: 'saud', icon: HeartPulse },
  { kw: 'remed', icon: HeartPulse },
  { kw: 'farmac', icon: HeartPulse },
  { kw: 'lazer', icon: Gamepad2 },
  { kw: 'entreten', icon: Gamepad2 },
]

export function getCategoryIcon(category: Category | null | undefined): LucideIcon {
  if (!category) return Receipt
  const key = category.name.toLowerCase().trim()
  if (CATEGORY_ICON_MAP[key]) return CATEGORY_ICON_MAP[key]
  for (const { kw, icon } of ICON_KEYWORDS) {
    if (key.includes(kw)) return icon
  }
  return Receipt
}
