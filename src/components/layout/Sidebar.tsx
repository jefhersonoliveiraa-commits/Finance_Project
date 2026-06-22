import { LayoutDashboard, ArrowLeftRight, Users, CreditCard, Layers, Settings, PieChart } from 'lucide-react'
import type { View } from '@/lib/types'

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const navItem = (id: View, icon: React.ReactNode, label: string) => {
    const isActive = currentView === id;
    return (
      <button 
        onClick={() => onNavigate(id)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors w-full text-left font-medium ${isActive ? 'bg-border text-white' : 'text-zinc-400 hover:text-white hover:bg-muted/50'}`}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4 h-full shrink-0">
      <div className="flex items-center gap-3 mb-10 px-2 mt-2">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-white/10">
          <Layers className="w-5 h-5 text-primary_fg" />
        </div>
        <span className="font-bold text-xl tracking-tight">Finanças</span>
      </div>
      
      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-3 px-3">Principal</span>
      <nav className="flex flex-col gap-1 mb-8">
        {navItem('dashboard', <LayoutDashboard className={`w-4 h-4 ${currentView === 'dashboard' ? 'text-primary' : ''}`} />, 'Dashboard')}
        {navItem('transactions', <ArrowLeftRight className="w-4 h-4" />, 'Lançamentos')}
        {navItem('receivables', <Users className="w-4 h-4" />, 'Acertos & Rateios')}
      </nav>

      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-3 px-3">Gestão</span>
      <nav className="flex flex-col gap-1 mb-8">
        {navItem('budget', <PieChart className="w-4 h-4" />, 'Orçamentos & Limites')}
        {navItem('credit-card', <CreditCard className="w-4 h-4" />, 'Cartões')}
      </nav>

      {/* Empurra o botão de configurações para o final da tela */}
      <div className="mt-auto">
        <nav className="flex flex-col gap-1">
          {navItem('settings', <Settings className="w-4 h-4" />, 'Configurações')}
        </nav>
      </div>
    </aside>
  )
}
