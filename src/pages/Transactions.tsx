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
