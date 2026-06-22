import { LayoutDashboard, ArrowLeftRight, Users, Target, CreditCard, Layers } from 'lucide-react'

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 border-r border-white/10 bg-[#09090b] shrink-0 h-full">
      <div className="p-6 flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
          <Layers className="w-6 h-6 text-white" />
        </div>
        <span className="font-bold text-2xl tracking-tight text-white">Nexo</span>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 space-y-8 hide-scrollbar">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 px-3 mb-2 block">Principal</span>
          <nav className="flex flex-col gap-1">
            <a href="/" className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/10 text-white font-medium border border-white/5">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
              <ArrowLeftRight className="w-4 h-4" /> Lançamentos
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
              <Users className="w-4 h-4" /> Acertos & Rateios
            </a>
          </nav>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 px-3 mb-2 block">Gestão</span>
          <nav className="flex flex-col gap-1">
            <a href="#" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
              <Target className="w-4 h-4" /> Metas
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
              <CreditCard className="w-4 h-4" /> Cartões de Crédito
            </a>
          </nav>
        </div>
      </div>
    </aside>
  )
}
