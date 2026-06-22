import { LayoutDashboard, ReceiptText, CreditCard, Target, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { View } from '@/lib/types'

interface BottomNavProps {
  current: View
  onChange: (view: View) => void
}

const items: { view: View; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { view: 'dashboard', label: 'Início', Icon: LayoutDashboard },
  { view: 'transactions', label: 'Lançamentos', Icon: ReceiptText },
  { view: 'credit-card', label: 'Cartão', Icon: CreditCard },
  { view: 'budget', label: 'Orçamento', Icon: Target },
  { view: 'settings', label: 'Config', Icon: Settings },
]

export function BottomNav({ current, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-16 items-center">
        {items.map(({ view, label, Icon }) => {
          const active = current === view
          return (
            <button
              key={view}
              onClick={() => onChange(view)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-transform',
                  active && 'scale-110',
                )}
              />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
