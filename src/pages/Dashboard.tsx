import { ChevronDown, ArrowRightLeft, MinusCircle, PlusCircle, TrendingUp, ArrowDownLeft, ArrowUpRight, CalendarClock, BarChart3 } from 'lucide-react'

export function Dashboard() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full md:w-auto gap-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Competência</span>
            <div className="flex items-center gap-2 mt-0.5 cursor-pointer hover:text-white transition">
              <span className="font-bold text-lg">Junho 2026</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center bg-card border border-border rounded-full p-1 shadow-inner hidden md:flex">
            <button className="px-4 py-1.5 rounded-full bg-border text-xs font-semibold text-white shadow-sm transition">Visão Geral</button>
            <button className="px-4 py-1.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white transition">Apenas Meu</button>
          </div>
        </div>
        
        <div className="hidden md:flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition text-sm font-medium">
            <ArrowRightLeft className="w-4 h-4 text-zinc-400" /> Transferir
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition text-sm font-medium">
            <MinusCircle className="w-4 h-4 text-destructive" /> Despesa
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary_fg hover:opacity-90 transition text-sm font-bold shadow-[0_0_15px_rgba(250,250,250,0.3)]">
            <PlusCircle className="w-4 h-4" /> Receita
          </button>
        </div>
      </header>

      <section className="glass-card rounded-[2rem] p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-zinc-400">Sobra real do mês</span>
          <span className="bg-positive/10 border border-positive/20 text-positive px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">No Azul</span>
        </div>
        <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">R$ 2.450,00</h2>
        <p className="text-xs font-medium text-zinc-400 mt-2 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-positive" /> Previsão de fechamento: R$ 3.100,00
        </p>
        <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-6 mt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-positive/10 flex items-center justify-center text-positive shrink-0"><ArrowDownLeft className="w-5 h-5" /></div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Entradas</span>
              <p className="text-lg md:text-xl font-bold text-white leading-tight">R$ 5.200,00</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive shrink-0"><ArrowUpRight className="w-5 h-5" /></div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Saídas (Real)</span>
              <p className="text-lg md:text-xl font-bold text-white leading-tight">R$ 2.750,00</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="glass-card rounded-3xl p-6 relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-sm uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <CalendarClock className="w-4 h-4" /> Próximas Faturas
              </h3>
            </div>
            <span className="text-xs font-medium text-accent cursor-pointer">Detalhes</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div></div>
                <div>
                  <p className="font-bold text-sm">Nubank</p>
                  <p className="text-[10px] text-zinc-500">Vence em 05/Jul</p>
                </div>
              </div>
              <span className="font-mono font-bold">R$ 1.200,00</span>
            </div>
          </div>
        </section>

        <section className="glass-card rounded-3xl p-6">
           <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-sm uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Resumo de Caixa
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Contas Correntes</span>
              <span className="font-mono font-bold">R$ 3.850,00</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">A receber (Rateios)</span>
              <span className="font-mono font-bold text-warning">R$ 680,00</span>
            </div>
            <div className="border-t border-border pt-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Saldo Disponível</span>
              <span className="font-mono font-bold text-lg text-primary">R$ 4.530,00</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
