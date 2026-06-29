import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { GlobalFAB } from './GlobalFAB'
import { MonthSelector } from './MonthSelector'
import { cn } from '@/lib/utils'
import type { View } from '@/lib/types'

interface AppLayoutProps {
  children: React.ReactNode
  currentView: View
  onNavigate: (view: View) => void
}

export function AppLayout({ children, currentView, onNavigate }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navigate = (view: View) => {
    setDrawerOpen(false)
    onNavigate(view)
  }

  return (
    <div className="flex h-screen w-full bg-background antialiased overflow-hidden text-foreground">

      {/* ── DESKTOP: sidebar fixa à esquerda ── */}
      <div className="hidden md:flex">
        <Sidebar currentView={currentView} onNavigate={onNavigate} />
      </div>

      {/* ── MOBILE: overlay escuro atrás do drawer ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── MOBILE: drawer que desliza da esquerda ── */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-[60] md:hidden transition-transform duration-300 ease-out',
        drawerOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <Sidebar currentView={currentView} onNavigate={navigate} />
      </div>

      {/* ── MOBILE: botão hamburger/X — sempre acima de tudo ── */}
      <button
        className="fixed top-3 left-3 z-[70] md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-[var(--sidebar)] text-foreground shadow-lg transition active:scale-95"
        onClick={() => setDrawerOpen(v => !v)}
        aria-label={drawerOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* ── Conteúdo principal ── */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-8 relative">

        {/* Header mobile (sem o botão — ele é fixo acima) */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-border/60 bg-background/80 backdrop-blur-xl px-4 py-3 pl-16">
          <span className="font-bold text-base tracking-tight flex-1 text-center">Finanças</span>
          <MonthSelector />
        </div>

        <div className="max-w-5xl w-full mx-auto p-4 md:p-6 space-y-5">
          {children}
        </div>
      </main>

      <GlobalFAB />
    </div>
  )
}
