#!/usr/bin/env bash
# fix-layout.sh
# Arquitetura Definitiva e Inquebrável para Dashboards Modernos
set -euo pipefail

echo "▶ Limpando lixos do Vite..."
rm -f src/App.css
sed -i 's/import "\.\/App\.css"//g' src/main.tsx || true

echo "▶ 1. CSS Global à prova de falhas..."
cat > src/index.css <<'EOF'
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body, #root {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    background-color: #09090b;
    color: #fafafa;
    font-family: 'Plus Jakarta Sans', sans-serif;
    overflow: hidden; /* Trava o scroll global, apenas o miolo vai rolar */
  }
}

@layer utilities {
  .glass-card {
    @apply bg-zinc-900/40 backdrop-blur-xl border border-white/5;
  }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
}
EOF

echo "▶ 2. Sidebar Perfeita..."
cat > src/components/layout/Sidebar.tsx <<'EOF'
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
EOF

echo "▶ 3. Layout Estrutural Blindado..."
cat > src/components/layout/AppLayout.tsx <<'EOF'
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
EOF

echo "▶ 4. Dashboard Harmônico e Responsivo..."
cat > src/pages/Dashboard.tsx <<'EOF'
import { ChevronDown, ArrowRightLeft, MinusCircle, PlusCircle, TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

export function Dashboard() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      
      {/* Header Responsivo */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center justify-between w-full lg:w-auto gap-8">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Competência</span>
            <button className="flex items-center gap-2 mt-1 hover:text-zinc-300 transition-colors">
              <span className="font-bold text-xl md:text-2xl">Mês Atual</span>
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
          
          {/* Alternador Meu/Terceiros */}
          <div className="hidden sm:flex items-center bg-zinc-900 border border-white/10 rounded-full p-1">
            <button className="px-5 py-1.5 rounded-full bg-zinc-800 text-xs font-bold text-white shadow-sm">
              Geral
            </button>
            <button className="px-5 py-1.5 rounded-full text-xs font-bold text-zinc-500 hover:text-white transition">
              Apenas Meu
            </button>
          </div>
        </div>
        
        {/* Botões de Ação adaptáveis */}
        <div className="flex gap-2 sm:gap-3 w-full lg:w-auto overflow-x-auto hide-scrollbar pb-2 lg:pb-0">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-zinc-900/50 hover:bg-zinc-800 transition text-sm font-semibold whitespace-nowrap">
            <ArrowRightLeft className="w-4 h-4 text-zinc-400" /> <span className="hidden sm:inline">Transferir</span>
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-zinc-900/50 hover:bg-zinc-800 transition text-sm font-semibold whitespace-nowrap">
            <MinusCircle className="w-4 h-4 text-red-500" /> Despesa
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all text-sm font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] whitespace-nowrap">
            <PlusCircle className="w-4 h-4" /> Receita
          </button>
        </div>
      </header>

      {/* Hero Card dimensionado corretamente */}
      <section className="glass-card rounded-3xl p-6 md:p-8 lg:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none translate-x-1/4 -translate-y-1/4">
           <Wallet className="w-64 h-64 md:w-96 md:h-96" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-semibold text-zinc-400">Sobra real do mês</span>
            <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-sm">
              No Azul
            </span>
          </div>
          
          {/* Fontes reduzidas em telas pequenas para não quebrar o card */}
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-3">R$ 0,00</h2>
          <p className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Previsão: <span className="text-white font-bold">R$ 0,00</span>
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-6 mt-8 lg:w-2/3">
            <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Entradas</span>
                <p className="text-lg font-bold text-white leading-tight">R$ 0,00</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Saídas</span>
                <p className="text-lg font-bold text-white leading-tight">R$ 0,00</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="glass-card rounded-3xl p-6 min-h-[200px] flex flex-col items-center justify-center text-zinc-500 font-medium">
          <span className="mb-2 text-2xl">💳</span>
          Módulo de Cartões em breve...
        </section>
        <section className="glass-card rounded-3xl p-6 min-h-[200px] flex flex-col items-center justify-center text-zinc-500 font-medium">
          <span className="mb-2 text-2xl">👥</span>
          Módulo de Rateios em breve...
        </section>
      </div>
    </div>
  )
}
EOF

echo "✅ Correção Estrutural Aplicada!"
