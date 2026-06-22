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
