import { LayoutDashboard, ArrowLeftRight, Users, Target, Plus } from 'lucide-react'

export function BottomNav() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full z-50">
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex justify-center">
        <button className="w-14 h-14 bg-primary text-primary_fg rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(250,250,250,0.25)] active:scale-95 transition-transform">
          <Plus className="w-6 h-6" />
        </button>
      </div>
      
      <nav className="glass-card border-t border-border flex justify-between px-6 py-3 pb-safe">
        <button className="flex flex-col items-center gap-1.5 text-white w-12">
          <LayoutDashboard className="w-5 h-5 text-primary" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Início</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400 hover:text-white transition w-12 mr-8">
          <ArrowLeftRight className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Trans.</span>
        </button>
        
        <button className="flex flex-col items-center gap-1.5 text-zinc-400 hover:text-white transition w-12 ml-8">
          <div className="relative">
            <Users className="w-5 h-5" />
            <span className="absolute -top-1 -right-1.5 w-3 h-3 bg-warning rounded-full border-[2px] border-card"></span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider">Rateio</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-zinc-400 hover:text-white transition w-12">
          <Target className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Metas</span>
        </button>
      </nav>
    </div>
  )
}
