import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex antialiased bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto pb-24 md:pb-0 relative">
        <div className="max-w-6xl w-full mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
