#!/usr/bin/env bash
# apply-exact-preview.sh
# Replica EXACTAMENTE o HTML/CSS do preview interativo aprovado.
set -euo pipefail

echo "▶ 1. Travando o Tailwind com as cores exatas do Preview..."
cat > tailwind.config.ts <<'EOF'
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"Plus Jakarta Sans"', 'monospace'],
      },
      colors: {
        background: '#09090b',
        card: '#18181b',
        border: '#27272a',
        muted: '#27272a',
        primary: '#fafafa',
        primary_fg: '#18181b',
        accent: '#3b82f6',
        positive: '#10b981',
        destructive: '#ef4444',
        warning: '#f59e0b',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
EOF

echo "▶ 2. CSS Global com o Glassmorphism exato..."
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
    background-color: theme('colors.background');
    color: #fafafa;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
}

@layer utilities {
  .glass-card {
    background: rgba(24, 24, 27, 0.55);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid theme('colors.border');
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}
EOF

echo "▶ 3. Sidebar (Réplica 1:1 do Preview)..."
cat > src/components/layout/Sidebar.tsx <<'EOF'
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
EOF

echo "▶ 4. BottomNav (Réplica 1:1 do Preview)..."
cat > src/components/layout/BottomNav.tsx <<'EOF'
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
EOF

echo "▶ 5. AppLayout (Estrutura idêntica ao HTML original)..."
cat > src/components/layout/AppLayout.tsx <<'EOF'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background antialiased overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-24 md:pb-0 relative">
        <div className="max-w-6xl w-full mx-auto p-4 md:p-8 space-y-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
EOF

echo "▶ 6. Dashboard (O Hero exato e cards)..."
cat > src/pages/Dashboard.tsx <<'EOF'
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
EOF

echo "✅ Réplica cirúrgica concluída!"
