#!/usr/bin/env bash
# apply-telas.sh
# Cria as telas reais de Lançamentos, Rateios e Metas conectadas ao Supabase.
set -euo pipefail

echo "▶ 1. Adicionando 'goals' nas rotas permitidas..."
cat > src/lib/types.ts <<'EOF'
export type View = 'dashboard' | 'transactions' | 'receivables' | 'budget' | 'credit-card' | 'settings' | 'import' | 'auth' | 'goals';

export interface Category { id: string; name: string; type: 'income' | 'expense'; icon: string; color: string; }
export interface Transaction { id: string; description: string; amount: number; my_amount: number; date: string; type: 'income' | 'expense' | 'transfer'; status: string; person_id?: string; category?: Category; }
export interface Person { id: string; name: string; avatar_color: string; }
export interface Goal { id: string; title: string; target_amount: number; current_amount: number; deadline: string; icon: string; }
EOF

echo "▶ 2. Criando a tela de Lançamentos (Transactions)..."
cat > src/pages/Transactions.tsx <<'EOF'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/lib/types'
import { Plus, Wrench, Fuel, Briefcase, ShoppingCart, Coffee, Receipt } from 'lucide-react'

// Função simples para mapear ícones (no futuro pode vir do banco)
const getIcon = (iconName?: string) => {
  switch (iconName) {
    case 'Wrench': return <Wrench className="w-5 h-5" />
    case 'Fuel': return <Fuel className="w-5 h-5" />
    case 'Briefcase': return <Briefcase className="w-5 h-5" />
    case 'ShoppingCart': return <ShoppingCart className="w-5 h-5" />
    case 'Coffee': return <Coffee className="w-5 h-5" />
    default: return <Receipt className="w-5 h-5" />
  }
}

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all')

  useEffect(() => {
    async function fetchTx() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data } = await supabase
        .from('transactions')
        .select(`*, category:categories(*)`)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
      
      if (data) setTransactions(data)
    }
    fetchTx()
  }, [])

  const filtered = transactions.filter(t => filter === 'all' || t.type === filter)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-white">Lançamentos</h2>
          <button className="md:hidden flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary_fg text-xs font-bold">
            <Plus className="w-4 h-4" /> Novo
          </button>
        </div>
        
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${filter === 'all' ? 'bg-white text-black' : 'border border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'}`}>Todos</button>
          <button onClick={() => setFilter('expense')} className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${filter === 'expense' ? 'bg-white text-black' : 'border border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'}`}>Despesas</button>
          <button onClick={() => setFilter('income')} className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${filter === 'income' ? 'bg-white text-black' : 'border border-white/10 bg-zinc-900 text-zinc-400 hover:text-white'}`}>Receitas</button>
        </div>
      </div>

      <section className="glass-card rounded-3xl p-2 md:p-4">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 font-medium">Nenhum lançamento encontrado.</div>
        ) : (
          <div className="flex flex-col gap-1">
            {filtered.map(tx => (
              <div key={tx.id} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition cursor-pointer">
                <div className={`w-12 h-12 rounded-xl border border-white/5 flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-positive/10 text-positive' : 'bg-zinc-800 text-zinc-400'}`}>
                  {getIcon(tx.category?.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white truncate">{tx.description}</p>
                  <p className="text-xs text-zinc-500 truncate">{tx.category?.name || 'Sem Categoria'}</p>
                </div>
                <div className="text-right">
                  <p className={`font-mono font-bold text-sm ${tx.type === 'income' ? 'text-positive' : 'text-white'}`}>
                    {tx.type === 'income' ? '+' : ''} R$ {tx.amount.toFixed(2)}
                  </p>
                  {tx.amount !== tx.my_amount && tx.type === 'expense' && (
                     <p className="text-[10px] text-warning font-bold">R$ {tx.my_amount.toFixed(2)} seu</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
EOF

echo "▶ 3. Criando a tela de Acertos & Rateios (Receivables)..."
cat > src/pages/Receivables.tsx <<'EOF'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserPlus, Utensils, Plane, CheckCircle2 } from 'lucide-react'
import type { Person, Transaction } from '@/lib/types'

export function Receivables() {
  const [people, setPeople] = useState<(Person & { pending_txs: Transaction[], total_due: number })[]>([])

  useEffect(() => {
    async function loadReceivables() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Puxa as pessoas e as transações pendentes atreladas a elas (onde my_amount < amount)
      const { data: ppl } = await supabase.from('people').select('*').eq('user_id', user.id)
      const { data: txs } = await supabase.from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .not('person_id', 'is', null)

      if (ppl && txs) {
        const enriched = ppl.map(person => {
          const personTxs = txs.filter(t => t.person_id === person.id)
          // A dívida da pessoa é o Valor Total - A sua parte (my_amount)
          const totalDue = personTxs.reduce((acc, t) => acc + (t.amount - t.my_amount), 0)
          return { ...person, pending_txs: personTxs, total_due: totalDue }
        }).filter(p => p.total_due > 0) // Só mostra quem está devendo

        setPeople(enriched)
      }
    }
    loadReceivables()
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-white">Acertos & Rateios</h2>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs font-bold text-white hover:bg-zinc-800 transition">
          <UserPlus className="w-4 h-4" /> Adicionar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {people.length === 0 ? (
          <div className="col-span-full glass-card p-10 text-center rounded-3xl text-zinc-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
            <p className="font-bold text-lg text-zinc-400">Tudo zerado!</p>
            <p className="text-sm">Ninguém está te devendo no momento.</p>
          </div>
        ) : (
          people.map(person => (
            <section key={person.id} className="glass-card rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-white/10 flex items-center justify-center text-xl font-bold text-zinc-400 uppercase">
                    {person.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">{person.name}</h3>
                    <p className="text-xs text-zinc-400">Rateio Ativo</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-warning font-mono">R$ {person.total_due.toFixed(2)}</p>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">A receber</p>
                </div>
              </div>

              <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-4 space-y-3 relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Despesas Pendentes</p>
                {person.pending_txs.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-warning/50"></div>
                      <span className="text-sm text-zinc-300 truncate max-w-[150px]">{tx.description}</span>
                    </div>
                    <span className="font-mono text-sm text-white">R$ {(tx.amount - tx.my_amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <button className="w-full mt-5 py-3 rounded-xl bg-white text-black font-bold text-sm transition hover:bg-zinc-200 relative z-10">
                Registrar Pagamento
              </button>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
EOF

echo "▶ 4. Criando a tela de Metas (Goals)..."
cat > src/pages/Goals.tsx <<'EOF'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Target, Car, Home, Plane } from 'lucide-react'
import type { Goal } from '@/lib/types'

export function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])

  useEffect(() => {
    async function fetchGoals() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('goals').select('*').eq('user_id', user.id)
      if (data) setGoals(data)
    }
    fetchGoals()
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-white">Meus Objetivos</h2>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition">
          <Target className="w-4 h-4" /> Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.length === 0 ? (
          <div className="col-span-full glass-card p-10 text-center rounded-3xl text-zinc-500">
            <Target className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
            <p className="font-bold text-lg text-zinc-400">Nenhuma meta definida</p>
            <p className="text-sm">Que tal começar a planejar o seu futuro agora?</p>
          </div>
        ) : (
          goals.map(goal => {
            const percent = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
            
            return (
              <section key={goal.id} className="glass-card rounded-3xl p-6 relative overflow-hidden group border border-white/5 hover:border-accent/30 transition-colors">
                <div className="absolute bottom-0 left-0 h-1.5 bg-zinc-900 w-full">
                  <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                </div>
                
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center border border-accent/20">
                      <Target className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white">{goal.title}</h3>
                      <p className="text-xs text-zinc-400">Progresso do objetivo</p>
                    </div>
                  </div>
                  <div className="bg-zinc-900 px-3 py-1 rounded-full border border-white/10">
                    <span className="text-xs font-bold text-white">{percent}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Acumulado</p>
                    <p className="text-xl font-bold text-white font-mono mt-1">R$ {goal.current_amount.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Objetivo Total</p>
                    <p className="text-xl font-bold text-zinc-400 font-mono mt-1">R$ {goal.target_amount.toFixed(2)}</p>
                  </div>
                </div>
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}
EOF

echo "▶ 5. Linkando Metas no App.tsx e Sidebar..."
sed -i "s/import { Receivables } from '@\/pages\/Receivables'/import { Receivables } from '@\/pages\/Receivables'\nimport { Goals } from '@\/pages\/Goals'/g" src/App.tsx
sed -i "s/{view === 'receivables' && <Receivables \/>}/{view === 'receivables' && <Receivables \/>}\n        {view === 'goals' && <Goals \/>}/g" src/App.tsx

# Atualiza a BottomNav para usar 'goals' ao invés de 'metas' no clique
sed -i "s/navItem('budget', <Target className=\"w-5 h-5\" \/>, 'Metas')/navItem('goals', <Target className=\"w-5 h-5\" \/>, 'Metas')/g" src/components/layout/BottomNav.tsx || true
# Atualiza a Sidebar para usar 'goals' em Metas
sed -i "s/navItem('budget', <Target className=\"w-4 h-4\" \/>, 'Metas')/navItem('goals', <Target className=\"w-4 h-4\" \/>, 'Metas')/g" src/components/layout/Sidebar.tsx || true

echo "✅ Telas Completas geradas com sucesso!"

