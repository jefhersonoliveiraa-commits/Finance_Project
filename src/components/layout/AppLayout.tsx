import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { GlobalFAB } from './GlobalFAB'
import type { View } from '@/lib/types'

interface AppLayoutProps {
  children: React.ReactNode
  currentView: View
  onNavigate: (view: View) => void
}

export function AppLayout({ children, currentView, onNavigate }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-full bg-background antialiased overflow-hidden text-foreground">
      <Sidebar currentView={currentView} onNavigate={onNavigate} />
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-24 md:pb-6 relative">
        <div className="max-w-5xl w-full mx-auto p-4 md:p-6 space-y-5">
          {children}
        </div>
      </main>
      <BottomNav currentView={currentView} onNavigate={onNavigate} />
      <GlobalFAB />
    </div>
  )
}
