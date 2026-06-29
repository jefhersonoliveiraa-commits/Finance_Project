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

      {/* Desktop sidebar — sempre visível */}
      <div className="hidden md:flex">
        <Sidebar currentView={currentView} onNavigate={onNavigate} />
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer — desliza da esquerda */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ease-out',
        drawerOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <Sidebar currentView={currentView} onNavigate={navigate} />
      </div>

      {/* Conteúdo principal */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-8 relative">

        {/* Header mobile com hamburger */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/60 bg-background/80 backdrop-blur-xl px-4 py-3">
          <button
            onClick={() => setDrawerOpen(v => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition"
          >
            {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo / nome do app */}
          <span className="font-bold text-base tracking-tight">Finanças</span>

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
