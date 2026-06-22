import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Sidebar />
      
      {/* O pulo do gato para responsividade: md:pl-64 empurra o conteúdo respeitando a Sidebar */}
      <div className="flex flex-col min-h-screen md:pl-64">
        <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 pb-32 md:pb-12">
          {children}
        </main>
      </div>
      
      <BottomNav />
    </div>
  )
}
