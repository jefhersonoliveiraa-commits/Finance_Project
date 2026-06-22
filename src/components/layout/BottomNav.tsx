import { LayoutDashboard, ArrowLeftRight, Users, Target, Plus } from 'lucide-react'

export function BottomNav() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* FAB - Botão central flutuante */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex justify-center">
        <button className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(255,255,255,0.15)] active:scale-95 transition-transform">
          <Plus className="w-6 h-6" />
        </button>
      </div>
      
      <nav className="glass-card border-t border-white/10 flex justify-between px-6 py-4 pb-safe bg-zinc-950/90">
        <a href="/" className="flex flex-col items-center gap-1.5 text-white w-12">
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Início</span>
        </a>
        <a href="#" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-white transition w-12 mr-8">
          <ArrowLeftRight className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Trans.</span>
        </a>
        <a href="#" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-white transition w-12 ml-8">
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Rateio</span>
        </a>
        <a href="#" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-white transition w-12">
          <Target className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Metas</span>
        </a>
      </nav>
    </div>
  )
}
