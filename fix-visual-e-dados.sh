#!/usr/bin/env bash
# fix-visual-e-dados.sh
# Restaura sua paleta de cores original e limpa a renderização do Dashboard.
set -euo pipefail

echo "▶ 1. Restaurando Paleta de Cores Oficial..."
cat > src/index.css <<'EOF'
@import "tailwindcss";

@theme {
  --color-background: #09090b;
  --color-foreground: #fafafa;
  --color-card: #18181b;
  --color-border: #27272a;
  /* Paleta original Shadcn/Finance */
  --color-primary: #ffffff;
  --color-primary-foreground: #09090b;
  --color-accent: #3b82f6;
  --color-positive: #10b981;
  --color-destructive: #ef4444;
  --color-warning: #f59e0b;
  --color-muted: #27272a;
}
EOF

echo "▶ 2. Corrigindo renderização do Dashboard (sem valores fantasmas)..."
cat > src/pages/Dashboard.tsx <<'EOF'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ArrowRightLeft, MinusCircle, PlusCircle, TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

export function Dashboard() {
  const [totals, setTotals] = useState({ income: 0, expense: 0 })

  useEffect(() => {
    async function loadTotals() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user.id)
      
      if (data) {
        const income = data.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)
        const expense = data.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
        setTotals({ income, expense })
      }
    }
    loadTotals()
  }, [])

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Dashboard</h2>
        <div className="flex gap-2">
            {/* Botões de Ação */}
        </div>
      </header>

      <section className="glass-card rounded-[2rem] p-8 relative overflow-hidden shadow-2xl">
        <h3 className="text-sm text-zinc-400">Sobra real</h3>
        <h2 className="text-5xl font-bold text-white my-2">R$ {(totals.income - totals.expense).toFixed(2)}</h2>
        
        <div className="grid grid-cols-2 gap-4 border-t border-border mt-6 pt-6">
          <div>
            <p className="text-[10px] uppercase text-zinc-500 font-bold">Entradas</p>
            <p className="text-positive font-bold">R$ {totals.income.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-zinc-500 font-bold">Saídas</p>
            <p className="text-destructive font-bold">R$ {totals.expense.toFixed(2)}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
EOF
