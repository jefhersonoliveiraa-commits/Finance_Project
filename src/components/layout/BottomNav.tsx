import { LayoutDashboard, ArrowLeftRight, Users, LayoutGrid } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { cn } from '@/lib/utils'
import type { View } from '@/lib/types'

interface BottomNavProps {
  currentView: View
  onNavigate: (view: View) => void
}

export function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  const { stats } = useFinance()
  const pendingRateios = stats?.aReceberPending ?? 0

  const navItem = (id: View, icon: React.ReactNode, label: string, badge?: boolean) => {
    const isActive = currentView === id
    return (
      <button
        onClick={() => onNavigate(id)}
        className={cn(
          'relative flex flex-col items-center gap-1 transition-all w-14',
          isActive ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <span className={cn(
          'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
          isActive && 'bg-primary/15',
        )}>
          {icon}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wide leading-none">{label}</span>
        {badge && (
          <span className="absolute top-0 right-1.5 h-2 w-2 rounded-full bg-warning border-2 border-background" />
        )}
      </button>
    )
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full z-40">
      <nav className="glass-card border-t border-border/60 flex items-center justify-around px-2 pt-2 pb-safe" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {navItem('dashboard',    <LayoutDashboard className="w-5 h-5" />, 'Início')}
        {navItem('transactions', <ArrowLeftRight  className="w-5 h-5" />, 'Trans.')}

        {/* Espaço pro FAB */}
        <div className="w-14" />

        {navItem('receivables', <Users      className="w-5 h-5" />, 'Rateio', pendingRateios > 0)}
        {navItem('settings',    <LayoutGrid className="w-5 h-5" />, 'Menu')}
      </nav>
    </div>
  )
}
