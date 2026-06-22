import { LayoutDashboard, ArrowLeftRight, Users, Target, CreditCard, Layers } from 'lucide-react'

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4 h-screen sticky top-0">
      <div className="flex items-center gap-3 mb-10 px-2 mt-2">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-white/10">
          <Layers className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-xl tracking-tight">Finanças</span>
      </div>
      
      <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3 px-3">Principal</span>
      <nav className="flex flex-col gap-1 mb-8">
        <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-border text-white font-medium shadow-inner shadow-white/5">
          <LayoutDashboard className="w-4 h-4" /> Dashboard
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-white transition-colors">
          <ArrowLeftRight className="w-4 h-4" /> Lançamentos
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-white transition-colors flex-1">
          <Users className="w-4 h-4" /> Rateios
        </a>
      </nav>

      <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3 px-3">Gestão</span>
      <nav className="flex flex-col gap-1">
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-white transition-colors">
          <Target className="w-4 h-4" /> Metas
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-white transition-colors">
          <CreditCard className="w-4 h-4" /> Cartões
        </a>
      </nav>
    </aside>
  )
}
