import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { GlobalFAB } from './GlobalFAB'
import { MonthSelector } from './MonthSelector'
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
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground antialiased">

      {/* ═══ DESKTOP SIDEBAR (>= md) ═══ */}
      <aside className="hidden md:block h-full shrink-0">
        <Sidebar currentView={currentView} onNavigate={onNavigate} />
      </aside>

      {/* ═══ MOBILE DRAWER (< md) — só montado quando aberto ═══ */}
      {drawerOpen && (
        <div className="md:hidden">
          {/* overlay */}
          <div
            className="fixed inset-0 z-[55] bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          {/* drawer painel */}
          <div className="fixed inset-y-0 left-0 z-[60] animate-in slide-in-from-left duration-300">
            <Sidebar currentView={currentView} onNavigate={navigate} />
          </div>
        </div>
      )}

      {/* ═══ COLUNA DE CONTEÚDO ═══ */}
      <div className="flex flex-1 flex-col h-full overflow-hidden">

        {/* Header mobile (< md) */}
        <header className="md:hidden flex items-center gap-3 border-b border-border/60 bg-background px-4 py-3 shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground active:scale-95 transition"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-base tracking-tight flex-1">Finanças</span>
          <MonthSelector />
        </header>

        {/* Área rolável */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl w-full mx-auto p-4 md:p-6 space-y-5 pb-24">
            {children}
          </div>
        </main>
      </div>

      <GlobalFAB />
    </div>
  )
}
