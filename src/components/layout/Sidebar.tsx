import { LayoutDashboard, ArrowLeftRight, Users, Target, CreditCard, Layers } from 'lucide-react'

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4 h-full shrink-0">
      <div className="flex items-center gap-3 mb-10 px-2 mt-2">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-white/10">
          <Layers className="w-5 h-5 text-primary_fg" />
        </div>
        <span className="font-bold text-xl tracking-tight">Finanças</span>
      </div>
      
      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-3 px-3">Principal</span>
      <nav className="flex flex-col gap-1 mb-8">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-border text-white font-medium w-full text-left">
          <LayoutDashboard className="w-4 h-4 text-primary" /> Dashboard
        </button>
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-muted/50 transition-colors w-full text-left font-medium">
          <ArrowLeftRight className="w-4 h-4" /> Lançamentos
        </button>
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-muted/50 transition-colors w-full text-left font-medium">
          <Users className="w-4 h-4" /> Acertos & Rateios
          <span className="ml-auto bg-warning/20 text-warning text-[10px] font-bold px-1.5 py-0.5 rounded-md">3</span>
        </button>
      </nav>

      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-3 px-3">Gestão</span>
      <nav className="flex flex-col gap-1">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-muted/50 transition-colors w-full text-left font-medium">
          <Target className="w-4 h-4" /> Metas
        </button>
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-muted/50 transition-colors w-full text-left font-medium">
          <CreditCard className="w-4 h-4" /> Cartões
        </button>
      </nav>
    </aside>
  )
}
