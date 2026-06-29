import {
  LayoutDashboard, ArrowLeftRight, Users, CreditCard,
  Layers, Settings, PieChart, Target, Upload,
} from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { cn } from '@/lib/utils'
import type { View } from '@/lib/types'

interface SidebarProps {
  currentView: View
  onNavigate: (view: View) => void
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const { stats } = useFinance()
  const pendingRateios = stats?.aReceberByPerson
    ? stats.aReceberByPerson.reduce(
        (s, p) => s + p.items.filter(i => i.transactionPerson.reimbursement_status === 'pending').length,
        0,
      )
    : 0

  const navItem = (
    id: View,
    icon: React.ReactNode,
    label: string,
    badge?: React.ReactNode,
  ) => {
    const isActive = currentView === id
    return (
      <button
        key={id}
        onClick={() => onNavigate(id)}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-left text-sm font-medium',
          isActive
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
        )}
      >
        <span className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
          isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground',
        )}>
          {icon}
        </span>
        <span className="flex-1 truncate">{label}</span>
        {badge}
      </button>
    )
  }

  return (
    <aside className="flex flex-col w-64 border-r border-border/60 bg-sidebar p-4 h-full shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 px-2 mt-1 pr-10 md:pr-2">
        <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-lg shrink-0">
          <Layers className="w-4 h-4 text-primary" />
        </div>
        <span className="font-bold text-base tracking-tight">Finanças</span>
      </div>

      {/* Principal */}
      <p className="text-[10px] uppercase font-bold tracking-widest text-tertiary mb-2 px-2">Principal</p>
      <nav className="flex flex-col gap-0.5 mb-6">
        {navItem('dashboard', <LayoutDashboard className="w-4 h-4" />, 'Dashboard')}
        {navItem('transactions', <ArrowLeftRight className="w-4 h-4" />, 'Lançamentos')}
        {navItem(
          'receivables',
          <Users className="w-4 h-4" />,
          'Acertos & Rateios',
          pendingRateios > 0 && (
            <span className="ml-auto rounded-md bg-warning/20 px-1.5 py-0.5 text-[10px] font-bold text-warning">
              {pendingRateios > 99 ? '99+' : pendingRateios}
            </span>
          ),
        )}
      </nav>

      {/* Gestão */}
      <p className="text-[10px] uppercase font-bold tracking-widest text-tertiary mb-2 px-2">Gestão</p>
      <nav className="flex flex-col gap-0.5 mb-6">
        {navItem('budget',      <PieChart   className="w-4 h-4" />, 'Orçamentos')}
        {navItem('credit-card', <CreditCard className="w-4 h-4" />, 'Cartões')}
        {navItem('goals',       <Target     className="w-4 h-4" />, 'Metas')}
        {navItem('import',      <Upload     className="w-4 h-4" />, 'Importar')}
      </nav>

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-0.5">
        <div className="mb-2 h-px bg-border/60" />
        {navItem('settings', <Settings className="w-4 h-4" />, 'Configurações')}
      </div>
    </aside>
  )
}
