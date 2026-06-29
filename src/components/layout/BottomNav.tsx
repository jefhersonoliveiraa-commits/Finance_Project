import { useState } from 'react'
import {
  LayoutDashboard, ArrowLeftRight, Users, LayoutGrid,
  Target, CreditCard, PieChart, Upload, Settings, X,
} from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { cn } from '@/lib/utils'
import type { View } from '@/lib/types'

interface BottomNavProps {
  currentView: View
  onNavigate: (view: View) => void
}

export function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  const { stats } = useFinance()
  const [menuOpen, setMenuOpen] = useState(false)

  // Badge mostra contagem de itens pendentes, não o valor
  const pendingCount = stats?.aReceberByPerson
    ? stats.aReceberByPerson.reduce((s, p) => s + p.items.filter(i => i.transactionPerson.reimbursement_status === 'pending').length, 0)
    : 0

  const navigate = (view: View) => {
    setMenuOpen(false)
    onNavigate(view)
  }

  const navItem = (id: View, icon: React.ReactNode, label: string, badge?: boolean) => {
    const isActive = currentView === id
    return (
      <button
        onClick={() => navigate(id)}
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

  const menuItems: { id: View; icon: React.ReactNode; label: string; badge?: React.ReactNode }[] = [
    {
      id: 'goals',
      icon: <Target className="w-5 h-5" />,
      label: 'Metas',
    },
    {
      id: 'credit-card',
      icon: <CreditCard className="w-5 h-5" />,
      label: 'Cartões',
    },
    {
      id: 'budget',
      icon: <PieChart className="w-5 h-5" />,
      label: 'Orçamentos',
    },
    {
      id: 'import',
      icon: <Upload className="w-5 h-5" />,
      label: 'Importar',
    },
    {
      id: 'settings',
      icon: <Settings className="w-5 h-5" />,
      label: 'Configurações',
    },
  ]

  return (
    <>
      {/* Drawer overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300 ease-out',
        menuOpen ? 'translate-y-0' : 'translate-y-full',
      )}>
        {/* Drag handle */}
        <div className="glass-card border-t border-border/60 rounded-t-3xl overflow-hidden">
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Mais telas</p>
            <button
              onClick={() => setMenuOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Menu items */}
          <div className="grid grid-cols-3 gap-3 px-4 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
            {menuItems.map(item => {
              const isActive = currentView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all active:scale-95',
                    isActive
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border bg-card/60 text-muted-foreground',
                  )}
                >
                  {item.icon}
                  <span className="text-xs font-semibold">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom nav bar */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-40">
        <nav
          className="glass-card border-t border-border/60 flex items-center justify-around px-2 pt-2"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          {navItem('dashboard',    <LayoutDashboard className="w-5 h-5" />, 'Início')}
          {navItem('transactions', <ArrowLeftRight  className="w-5 h-5" />, 'Trans.')}

          {/* Espaço pro FAB */}
          <div className="w-14" />

          {navItem('receivables', <Users className="w-5 h-5" />, 'Rateio', pendingCount > 0)}

          {/* Menu button */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className={cn(
              'relative flex flex-col items-center gap-1 transition-all w-14',
              menuOpen ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <span className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
              menuOpen && 'bg-primary/15',
            )}>
              <LayoutGrid className="w-5 h-5" />
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wide leading-none">Menu</span>
          </button>
        </nav>
      </div>
    </>
  )
}
