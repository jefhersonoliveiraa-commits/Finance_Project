#!/usr/bin/env bash
# apply-interface-completa.sh
# Implementa a arquitetura visual responsiva definitiva (Sidebar Fixa + Espaçamento) e o Dashboard Base.
set -euo pipefail

echo "▶ 1. Configurando Tipografia e CSS Global..."
cat > src/index.css <<'EOF'
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 217.2 91.2% 59.8%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --positive: 142.1 76.2% 36.3%;
    --warning: 38 92% 50%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
    --radius: 1rem;
  }
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground antialiased;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
}

@layer utilities {
  .glass-card {
    @apply bg-zinc-900/40 backdrop-blur-2xl border border-white/5 shadow-xl;
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

echo "▶ 2. Ajustando Tailwind Config..."
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        positive: "hsl(var(--positive))",
        warning: "hsl(var(--warning))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
EOF

echo "▶ 3. Construindo Sidebar Fixa (PC)..."
mkdir -p src/components/layout
cat > src/components/layout/Sidebar.tsx <<'EOF'
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
EOF

echo "▶ 4. Construindo BottomNav (Mobile)..."
cat > src/components/layout/BottomNav.tsx <<'EOF'
import { LayoutDashboard, ArrowLeftRight, Users, Target, Plus } from 'lucide-react'

export function BottomNav() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* FAB - Botão central flutuante */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex justify-center">
        <button className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(255,255,255,0.15)] active:scale-95 transition-transform">
          <Plus className="w-6 h-6" />
        </button>
      </div>
      
      <nav className="glass-card border-t border-white/10 flex justify-between px-6 py-4 pb-safe bg-zinc-950/90">
        <a href="/" className="flex flex-col items-center gap-1.5 text-white w-12">
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Início</span>
        </a>
        <a href="#" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-white transition w-12 mr-8">
          <ArrowLeftRight className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Trans.</span>
        </a>
        <a href="#" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-white transition w-12 ml-8">
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Rateio</span>
        </a>
        <a href="#" className="flex flex-col items-center gap-1.5 text-zinc-500 hover:text-white transition w-12">
          <Target className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Metas</span>
        </a>
      </nav>
    </div>
  )
}
EOF

echo "▶ 5. Construindo Layout Container (À prova de quebras)..."
cat > src/components/layout/AppLayout.tsx <<'EOF'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Sidebar />
      
      {/* O pulo do gato para responsividade: md:pl-64 empurra o conteúdo respeitando a Sidebar */}
      <div className="flex flex-col min-h-screen md:pl-64">
        <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 pb-32 md:pb-12">
          {children}
        </main>
      </div>
      
      <BottomNav />
    </div>
  )
}
EOF

echo "▶ 6. Atualizando App.tsx..."
cat > src/App.tsx <<'EOF'
import { AppLayout } from '@/components/layout/AppLayout'
import { Dashboard } from '@/pages/Dashboard'

export default function App() {
  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  )
}
EOF

echo "▶ 7. Criando Dashboard Repaginado..."
mkdir -p src/pages
cat > src/pages/Dashboard.tsx <<'EOF'
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
EOF

echo "✅ Interface Completa Aplicada! Responsividade garantida."
