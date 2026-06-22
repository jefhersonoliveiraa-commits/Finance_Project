import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-[#09090b] text-zinc-50 overflow-hidden">
      {/* Sidebar fica quietinha na esquerda, sem fixed */}
      <Sidebar />
      
      {/* Miolo que permite rolar, ocupando o resto da tela */}
      <main className="flex-1 h-full overflow-y-auto relative pb-24 md:pb-0 scroll-smooth">
        <div className="w-full max-w-6xl mx-auto p-4 md:p-8 lg:p-10 min-h-full">
          {children}
        </div>
      </main>
      
      <BottomNav />
    </div>
  )
}
