#!/usr/bin/env bash
# apply-motor-cartao.sh
# Cria a inteligência matemática de cartões e o novo formulário de transações.
set -euo pipefail

echo "▶ 1. Criando o Motor Matemático de Cartões de Crédito..."
cat > src/lib/credit-card-engine.ts <<'EOF'
export function calculateInstallments(
  totalAmount: number,
  myAmount: number,
  purchaseDateStr: string,
  installments: number,
  closingDay: number,
  dueDay: number
) {
  const dates = [];
  
  // Divide os valores e formata com precisão de 2 casas
  const amountPerInstallment = Number((totalAmount / installments).toFixed(2));
  const myAmountPerInstallment = Number((myAmount / installments).toFixed(2));

  // A última parcela absorve possíveis dízimas e diferenças de centavos
  const amountLastInstallment = Number((totalAmount - (amountPerInstallment * (installments - 1))).toFixed(2));
  const myAmountLastInstallment = Number((myAmount - (myAmountPerInstallment * (installments - 1))).toFixed(2));

  // Usa meio-dia para forçar a data correta e evitar pulos de fuso horário
  const purchaseDate = new Date(purchaseDateStr + 'T12:00:00'); 
  
  let billMonth = purchaseDate.getMonth();
  let billYear = purchaseDate.getFullYear();

  // A Mágica do Fechamento: Se o dia da compra for igual ou maior que o fechamento, joga pra próxima fatura
  if (purchaseDate.getDate() >= closingDay) {
    billMonth += 1;
    if (billMonth > 11) {
      billMonth = 0;
      billYear += 1;
    }
  }

  for (let i = 1; i <= installments; i++) {
    // Define a data exata de vencimento desta parcela
    const dueDate = new Date(billYear, billMonth, dueDay, 12, 0, 0);
    
    dates.push({
      installment_current: i,
      installment_total: installments,
      amount: i === installments ? amountLastInstallment : amountPerInstallment,
      my_amount: i === installments ? myAmountLastInstallment : myAmountPerInstallment,
      date: dueDate.toISOString().split('T')[0]
    });

    // Avança 1 mês para a próxima parcela
    billMonth += 1;
    if (billMonth > 11) {
      billMonth = 0;
      billYear += 1;
    }
  }

  return dates;
}
EOF

echo "▶ 2. Criando o Formulário Inteligente de Transações..."
mkdir -p src/components
cat > src/components/TransactionForm.tsx <<'EOF'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateInstallments } from '@/lib/credit-card-engine'
import { toast } from 'sonner'
import { CreditCard, Wallet, Users, Receipt, Calendar, Loader2 } from 'lucide-react'

// Tipagens para os dados do banco
interface Category { id: string; name: string; type: string; icon: string; }
interface Account { id: string; name: string; }
interface Card { id: string; name: string; closing_day: number; due_day: number; }
interface Person { id: string; name: string; }

export function TransactionForm({ onSuccess }: { onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [people, setPeople] = useState<Person[]>([])

  // Estados do Formulário
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [categoryId, setCategoryId] = useState('')
  
  // Rateio / Gastos de Terceiros
  const [isShared, setIsShared] = useState(false)
  const [myAmount, setMyAmount] = useState('')
  const [personId, setPersonId] = useState('')

  // Método de Pagamento
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account')
  const [accountId, setAccountId] = useState('')
  const [cardId, setCardId] = useState('')
  const [installments, setInstallments] = useState('1')

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [catRes, accRes, cardRes, pplRes] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', user.id),
        supabase.from('bank_accounts').select('*').eq('user_id', user.id),
        supabase.from('credit_cards').select('*').eq('user_id', user.id),
        supabase.from('people').select('*').eq('user_id', user.id)
      ])

      if (catRes.data) setCategories(catRes.data)
      if (accRes.data) setAccounts(accRes.data)
      if (cardRes.data) setCards(cardRes.data)
      if (pplRes.data) setPeople(pplRes.data)
    }
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const totalVal = parseFloat(amount.replace(',', '.'))
      const myVal = isShared ? parseFloat(myAmount.replace(',', '.')) : totalVal
      const numInstallments = parseInt(installments) || 1

      // 1. Lógica para Cartão de Crédito (Parcelado ou à vista)
      if (paymentMethod === 'credit_card' && type === 'expense') {
        const selectedCard = cards.find(c => c.id === cardId)
        if (!selectedCard) throw new Error('Selecione um cartão de crédito.')

        const generatedDates = calculateInstallments(
          totalVal, myVal, date, numInstallments, selectedCard.closing_day, selectedCard.due_day
        )

        // Prepara os lotes para inserir no banco
        const inserts = generatedDates.map(inst => ({
          user_id: user.id,
          description: numInstallments > 1 ? `${description} (${inst.installment_current}/${inst.installment_total})` : description,
          amount: inst.amount,
          my_amount: inst.my_amount,
          date: inst.date,
          type: 'expense',
          status: 'pending', // Faturas futuras ficam como pendentes
          category_id: categoryId || null,
          card_id: cardId,
          person_id: isShared ? personId : null,
          installment_current: inst.installment_current,
          installment_total: inst.installment_total,
        }))

        const { error } = await supabase.from('transactions').insert(inserts)
        if (error) throw error
      } 
      // 2. Lógica para Conta Corrente (À vista)
      else {
        const { error } = await supabase.from('transactions').insert([{
          user_id: user.id,
          description,
          amount: totalVal,
          my_amount: myVal,
          date,
          type,
          status: 'completed',
          category_id: categoryId || null,
          account_id: accountId,
          person_id: isShared ? personId : null,
        }])
        if (error) throw error
      }

      toast.success('Lançamento registrado com sucesso!')
      
      // Limpa o formulário
      setDescription('')
      setAmount('')
      setMyAmount('')
      setIsShared(false)
      if (onSuccess) onSuccess()

    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar transação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 glass-card p-6 md:p-8 rounded-3xl w-full max-w-lg mx-auto">
      
      {/* Abas Tipo de Lançamento */}
      <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${type === 'expense' ? 'bg-destructive/20 text-destructive' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Despesa
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${type === 'income' ? 'bg-positive/20 text-positive' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Receita
        </button>
      </div>

      <div className="space-y-4">
        {/* Descrição */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Descrição</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Receipt className="h-4 w-4 text-zinc-500" />
            </div>
            <input 
              type="text" 
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/50" 
              placeholder="Ex: Supermercado, Aluguel..."
            />
          </div>
        </div>

        {/* Valor Total & Data */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Valor Total</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-zinc-500 font-bold text-sm">R$</span>
              </div>
              <input 
                type="number" 
                step="0.01"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className={`w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-accent/50 ${type === 'expense' ? 'text-white' : 'text-positive'}`} 
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Data / Compra</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-zinc-500" />
              </div>
              <input 
                type="date" 
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 [color-scheme:dark]" 
              />
            </div>
          </div>
        </div>

        {/* Categoria */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Categoria</label>
          <select 
            required
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-accent/50 appearance-none"
          >
            <option value="" disabled>Selecione uma categoria...</option>
            {categories.filter(c => c.type === type).map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        {/* Toggle para Rateio (Só aparece se for despesa) */}
        {type === 'expense' && (
          <div className="border border-white/10 rounded-xl p-4 bg-zinc-900/30">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isShared}
                onChange={e => setIsShared(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-zinc-800 text-accent focus:ring-accent/50"
              />
              <span className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-warning" /> Envolve terceiros? (Compra dividida / Para outra pessoa)
              </span>
            </label>

            {isShared && (
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Sua Parte Real</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required={isShared}
                    value={myAmount}
                    onChange={e => setMyAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 px-3 text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-accent/50" 
                    placeholder="R$ 0.00"
                  />
                  <p className="text-[9px] text-zinc-500 mt-1">O resto vai pro rateio.</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1 block">Quem deve o restante?</label>
                  <select 
                    required={isShared}
                    value={personId}
                    onChange={e => setPersonId(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-accent/50 appearance-none"
                  >
                    <option value="" disabled>Selecione a pessoa...</option>
                    {people.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Método de Pagamento */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block mt-6">Método de Pagamento</label>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('account')}
              className={`flex flex-col items-center justify-center py-3 border rounded-xl transition-all ${paymentMethod === 'account' ? 'bg-primary/10 border-primary text-white' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:bg-zinc-800'}`}
            >
              <Wallet className="w-5 h-5 mb-1" />
              <span className="text-xs font-bold">À Vista (Conta)</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('credit_card')}
              disabled={type === 'income'}
              className={`flex flex-col items-center justify-center py-3 border rounded-xl transition-all ${type === 'income' ? 'opacity-30 cursor-not-allowed' : ''} ${paymentMethod === 'credit_card' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:bg-zinc-800'}`}
            >
              <CreditCard className="w-5 h-5 mb-1" />
              <span className="text-xs font-bold">Cartão de Crédito</span>
            </button>
          </div>

          {paymentMethod === 'account' ? (
            <select 
              required
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              <option value="" disabled>Selecione a conta corrente...</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <select 
                required
                value={cardId}
                onChange={e => setCardId(e.target.value)}
                className="col-span-2 w-full bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
              >
                <option value="" disabled>Qual cartão?</option>
                {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select 
                value={installments}
                onChange={e => setInstallments(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none font-bold"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1}x</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold text-sm py-4 rounded-xl hover:bg-zinc-200 transition-colors shadow-xl disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Registrar Lançamento'}
      </button>
    </form>
  )
}
EOF

echo "✅ Motor do Cartão e Formulário finalizados."
