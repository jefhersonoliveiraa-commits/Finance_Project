import { ChevronDown, ArrowRightLeft, MinusCircle, PlusCircle, TrendingUp } from 'lucide-react'

export function Dashboard() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full md:w-auto gap-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Competência</span>
            <div className="flex items-center gap-2 mt-0.5 cursor-pointer hover:text-white transition">
              <span className="font-bold text-lg">Mês Atual</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
        
        <div className="hidden md:flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition text-sm font-medium">
            <ArrowRightLeft className="w-4 h-4 text-muted-foreground" /> Transferir
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition text-sm font-medium">
            <MinusCircle className="w-4 h-4 text-destructive" /> Despesa
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition text-sm font-bold shadow-[0_0_15px_rgba(250,250,250,0.3)]">
            <PlusCircle className="w-4 h-4" /> Receita
          </button>
        </div>
      </header>

      <section className="glass-card rounded-[2rem] p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-muted-foreground">Sobra real do mês</span>
          <span className="bg-positive/10 border border-positive/20 text-positive px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
            No Azul
          </span>
        </div>
        <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">R$ 0,00</h2>
        <p className="text-xs font-medium text-muted-foreground mt-2 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-positive" /> Carregando previsão...
        </p>
      </section>
    </div>
  )
}
