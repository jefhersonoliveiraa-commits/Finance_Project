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
