#!/usr/bin/env bash
# apply-navigation.sh
# Conecta a Sidebar e a BottomNav com o sistema de navegação (view state) do App.tsx
set -euo pipefail

echo "▶ 1. Atualizando Sidebar para suportar navegação real..."
cat > src/components/layout/Sidebar.tsx <<'EOF'
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
EOF

echo "▶ 2. Atualizando BottomNav para suportar navegação real..."
cat > src/components/layout/BottomNav.tsx <<'EOF'
import { LayoutDashboard, ArrowLeftRight, Users, Plus, Menu } from 'lucide-react'
import type { View } from '@/lib/types'

interface BottomNavProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  const navItem = (id: View, icon: React.ReactNode, label: string) => {
    const isActive = currentView === id;
    return (
      <button 
        onClick={() => onNavigate(id)} 
        className={`flex flex-col items-center gap-1.5 transition w-12 ${isActive ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
      >
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </button>
    );
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full z-50">
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex justify-center">
        <button className="w-14 h-14 bg-primary text-primary_fg rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(250,250,250,0.25)] active:scale-95 transition-transform">
          <Plus className="w-6 h-6" />
        </button>
      </div>
      
      <nav className="glass-card border-t border-border flex justify-between px-6 py-3 pb-safe">
        {navItem('dashboard', <LayoutDashboard className={`w-5 h-5 ${currentView === 'dashboard' ? 'text-primary' : ''}`} />, 'Início')}
        
        <div className="mr-8">
          {navItem('transactions', <ArrowLeftRight className="w-5 h-5" />, 'Trans.')}
        </div>
        
        <div className="ml-8">
          {navItem('receivables', <Users className="w-5 h-5" />, 'Rateio')}
        </div>
        
        {/* Usamos 'settings' ou um modal de menu geral para o botão da direita no mobile */}
        {navItem('settings', <Menu className="w-5 h-5" />, 'Menu')}
      </nav>
    </div>
  )
}
EOF

echo "▶ 3. Ajustando o AppLayout para receber as propriedades..."
cat > src/components/layout/AppLayout.tsx <<'EOF'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import type { View } from '@/lib/types'

interface AppLayoutProps {
  children: React.ReactNode;
  currentView: View;
  onNavigate: (view: View) => void;
}

export function AppLayout({ children, currentView, onNavigate }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-full bg-background antialiased overflow-hidden text-foreground">
      <Sidebar currentView={currentView} onNavigate={onNavigate} />
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-24 md:pb-0 relative">
        <div className="max-w-6xl w-full mx-auto p-4 md:p-8 space-y-6">
          {children}
        </div>
      </main>
      <BottomNav currentView={currentView} onNavigate={onNavigate} />
    </div>
  )
}
EOF

echo "▶ 4. Restaurando o motor do App.tsx..."
cat > src/App.tsx <<'EOF'
import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Toaster } from '@/components/ui/sonner'
import { supabase } from '@/lib/supabase'
import { FinanceProvider } from '@/context/FinanceContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Transactions } from '@/pages/Transactions'
import { CreditCardPage } from '@/pages/CreditCard'
import { Receivables } from '@/pages/Receivables'
import { SettingsPage } from '@/pages/Settings'
import { Import } from '@/pages/Import'
import { BudgetPage } from '@/pages/Budget'
import { AuthPage } from '@/pages/Auth'
import type { View } from '@/lib/types'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [view, setView] = useState<View>('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  if (!session) return (
    <>
      <AuthPage />
      <Toaster />
    </>
  )

  return (
    <FinanceProvider onNavigate={setView}>
      <AppLayout currentView={view} onNavigate={setView}>
        {view === 'dashboard' && <Dashboard />}
        {view === 'transactions' && <Transactions />}
        {view === 'credit-card' && <CreditCardPage />}
        {view === 'receivables' && <Receivables />}
        {view === 'settings' && <SettingsPage />}
        {view === 'import' && <Import />}
        {view === 'budget' && <BudgetPage />}
      </AppLayout>
      <Toaster />
    </FinanceProvider>
  )
}
EOF

echo "✅ Navegação Plugada e Pronta!"
