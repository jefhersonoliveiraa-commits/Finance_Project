import { LayoutDashboard, ArrowLeftRight, Users, Target, CreditCard, Layers } from 'lucide-react'

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 z-50 w-64 border-r border-white/5 bg-zinc-950/80 backdrop-blur-xl p-4">
      <div className="flex items-center gap-3 mb-10 px-2 mt-2">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-white/10">
          <Layers className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="font-bold text-2xl tracking-tight text-white">Nexo</span>
      </div>
      
      <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3 px-3">Principal</span>
      <nav className="flex flex-col gap-1 mb-8">
        <a href="/" className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/10 text-white font-medium border border-white/5">
          <LayoutDashboard className="w-4 h-4" /> Dashboard
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
          <ArrowLeftRight className="w-4 h-4" /> Lançamentos
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all flex-1">
          <Users className="w-4 h-4" /> Acertos & Rateios
        </a>
      </nav>

      <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3 px-3">Gestão Avançada</span>
      <nav className="flex flex-col gap-1">
        <a href="#" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
          <Target className="w-4 h-4" /> Metas
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
          <CreditCard className="w-4 h-4" /> Cartões de Crédito
        </a>
      </nav>
    </aside>
  )
}
