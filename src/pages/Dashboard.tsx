import { ChevronDown, ArrowRightLeft, MinusCircle, PlusCircle, TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

export function Dashboard() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Responsivo */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center justify-between w-full md:w-auto gap-8">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Competência</span>
            <button className="flex items-center gap-2 mt-1 hover:text-zinc-300 transition-colors">
              <span className="font-bold text-xl">Mês Atual</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          
          <div className="hidden lg:flex items-center bg-zinc-900 border border-white/5 rounded-full p-1 shadow-inner">
            <button className="px-5 py-1.5 rounded-full bg-zinc-800 text-xs font-bold text-white shadow-sm transition">
              Geral
            </button>
            <button className="px-5 py-1.5 rounded-full text-xs font-bold text-zinc-500 hover:text-white transition">
              Apenas Meu
            </button>
          </div>
        </div>
        
        {/* Ações (PC) */}
        <div className="hidden md:flex gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 transition text-sm font-semibold">
            <ArrowRightLeft className="w-4 h-4 text-zinc-400" /> Transferir
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 transition text-sm font-semibold">
            <MinusCircle className="w-4 h-4 text-destructive" /> Despesa
          </button>
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:scale-105 transition-all text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            <PlusCircle className="w-4 h-4" /> Receita
          </button>
        </div>
      </header>

      {/* Hero Card */}
      <section className="glass-card rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-accent opacity-20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-10 opacity-5 pointer-events-none">
           <Wallet className="w-64 h-64" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold tracking-wide text-zinc-400">Sobra real do mês</span>
            <span className="bg-positive/10 border border-positive/20 text-positive px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-sm">
              No Azul
            </span>
          </div>
          
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-2">R$ 0,00</h2>
          <p className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-positive" /> Carregando previsão de fechamento...
          </p>
          
          <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-8 mt-8 md:w-2/3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-positive/10 flex items-center justify-center text-positive shrink-0 border border-positive/20">
                <ArrowDownLeft className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Entradas</span>
                <p className="text-xl md:text-2xl font-bold text-white leading-tight">R$ 0,00</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive shrink-0 border border-destructive/20">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Saídas</span>
                <p className="text-xl md:text-2xl font-bold text-white leading-tight">R$ 0,00</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Espaço reservado para Próximos Faturas e Rateios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="glass-card rounded-3xl p-8 h-48 flex items-center justify-center text-zinc-500 font-medium">
          Módulo de Cartões em breve...
        </section>
        <section className="glass-card rounded-3xl p-8 h-48 flex items-center justify-center text-zinc-500 font-medium">
          Módulo de Rateios em breve...
        </section>
      </div>
    </div>
  )
}
