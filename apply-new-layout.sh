#!/usr/bin/env bash
# apply-new-layout.sh
# Cria o layout base (Sidebar, BottomNav e estilos globais) para o novo sistema.
set -euo pipefail

echo "▶ Configurando tipografia no CSS global..."
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
    --accent: 217.2 91.2% 59.8%; /* Blue */
    --accent-foreground: 0 0% 98%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --positive: 142.1 76.2% 36.3%;
    --warning: 38 92% 50%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
    --radius: 0.75rem;
  }
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground antialiased;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
}

@layer utilities {
  .glass-card {
    @apply bg-zinc-900/50 backdrop-blur-xl border border-zinc-800;
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

echo "▶ Ajustando tailwind.config.ts..."
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
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
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

echo "▶ Criando Layout: Sidebar.tsx..."
mkdir -p src/components/layout
cat > src/components/layout/Sidebar.tsx <<'EOF'
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
EOF

echo "▶ Criando Layout: BottomNav.tsx..."
cat > src/components/layout/BottomNav.tsx <<'EOF'
import { LayoutDashboard, ArrowLeftRight, Users, Target, Plus } from 'lucide-react'

export function BottomNav() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full z-50">
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex justify-center">
        <button className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(250,250,250,0.25)] active:scale-95 transition-transform">
          <Plus className="w-6 h-6" />
        </button>
      </div>
      
      <nav className="glass-card border-t border-border flex justify-between px-6 py-3 pb-safe">
        <a href="/" className="flex flex-col items-center gap-1.5 text-white w-12">
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Início</span>
        </a>
        <a href="#" className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-white transition w-12 mr-8">
          <ArrowLeftRight className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Trans.</span>
        </a>
        <a href="#" className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-white transition w-12 ml-8">
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Rateio</span>
        </a>
        <a href="#" className="flex flex-col items-center gap-1.5 text-muted-foreground hover:text-white transition w-12">
          <Target className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Metas</span>
        </a>
      </nav>
    </div>
  )
}
EOF

echo "▶ Criando o AppLayout.tsx..."
cat > src/components/layout/AppLayout.tsx <<'EOF'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex antialiased bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto pb-24 md:pb-0 relative">
        <div className="max-w-6xl w-full mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
EOF

echo "▶ Substituindo App.tsx para carregar o novo layout..."
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

echo "▶ Recriando um Dashboard base (Esqueleto Visual)..."
cat > src/pages/Dashboard.tsx <<'EOF'
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
EOF

echo "✅ Base da interface recriada com sucesso!"