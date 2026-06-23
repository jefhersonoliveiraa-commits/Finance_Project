#!/usr/bin/env bash
# aplicar-redesign-telas.sh
# Redesenho visual das 5 telas restantes (Receivables, CreditCard,
# Budget, Settings, Import) para o novo design system (roxo/lilas,
# glass cards, tokens corretos). Logica 100% preservada.
# Valida com build e da push no main.
set -euo pipefail
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "ERRO: rode na raiz do repo."; exit 1; }
cd "$(git rev-parse --show-toplevel)"
STAMP="$(date +%Y%m%d-%H%M%S)"
TAG="backup/pre-redesign-${STAMP}"
git tag "$TAG"
echo "==> Backup: $TAG"
echo "==> src/pages/Receivables.tsx..."
cat > src/pages/Receivables.tsx << 'FILEOF'
import { Check, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MonthSelector } from '@/components/layout/MonthSelector'
import { useFinance } from '@/context/FinanceContext'
import { formatBRL, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PersonReceivable } from '@/lib/types'

export function Receivables() {
  const { loading, stats, markReimbursed, markUnreimbursed } = useFinance()
  const { aReceberByPerson, aReceberPending, aReceberReceived } = stats

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Acertos & Rateios</h1>
          <p className="text-sm text-muted-foreground">Valores a receber de terceiros</p>
        </div>
        <MonthSelector />
      </div>

      {/* Summary */}
      {loading ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-warning">Pendente</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-warning">
              {formatBRL(aReceberPending)}
            </p>
          </div>
          <div className="rounded-2xl border border-positive/30 bg-positive/5 p-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-positive">Recebido</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-positive">
              {formatBRL(aReceberReceived)}
            </p>
          </div>
        </div>
      )}

      {/* By person */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : aReceberByPerson.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-positive/10">
            <Users className="h-8 w-8 text-positive" />
          </div>
          <div>
            <p className="font-semibold">Tudo em dia!</p>
            <p className="mt-1 text-sm text-muted-foreground">Nenhum valor pendente neste mês.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {aReceberByPerson.map(pr => (
            <PersonCard
              key={pr.person.id}
              personReceivable={pr}
              onMarkReceived={markReimbursed}
              onMarkPending={markUnreimbursed}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PersonCard({
  personReceivable,
  onMarkReceived,
  onMarkPending,
}: {
  personReceivable: PersonReceivable
  onMarkReceived: (id: string) => Promise<void>
  onMarkPending: (id: string) => Promise<void>
}) {
  const { person, totalPending, totalReceived, items } = personReceivable

  return (
    <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
      {/* Person header */}
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
            {person.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold">{person.name}</span>
        </div>
        <div className="text-right">
          {totalPending > 0 && (
            <p className="font-mono text-sm font-bold text-warning tabular-nums">
              {formatBRL(totalPending)}
            </p>
          )}
          {totalReceived > 0 && (
            <p className="font-mono text-xs text-positive tabular-nums">
              {formatBRL(totalReceived)} recebido
            </p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-1 px-3 pb-3">
        {items.map(({ transactionPerson: tp, transaction: tx }) => (
          <div
            key={tp.id}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5',
              tp.reimbursement_status === 'pending'
                ? 'bg-warning/8 border border-warning/20'
                : 'bg-positive/5 border border-positive/10 opacity-70',
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{tx.description}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatDate(tx.date)} · {tx.type === 'repasse' ? 'Repasse' : 'Rateado'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={cn(
                'font-mono text-sm font-semibold tabular-nums',
                tp.reimbursement_status === 'pending' ? 'text-warning' : 'text-positive',
              )}>
                {formatBRL(tp.amount)}
              </span>
              {tp.reimbursement_status === 'pending' ? (
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 border-warning/40 hover:bg-warning/10 hover:border-warning/60"
                  onClick={() => onMarkReceived(tp.id)}
                  title="Marcar como recebido"
                >
                  <Check className="h-3.5 w-3.5 text-warning" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 opacity-50 hover:opacity-100"
                  onClick={() => onMarkPending(tp.id)}
                  title="Marcar como pendente"
                >
                  <Clock className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
FILEOF

echo "==> src/pages/CreditCard.tsx..."
cat > src/pages/CreditCard.tsx << 'FILEOF'
import { useState } from 'react'
import { CreditCard, CheckCircle2, Banknote, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MonthSelector } from '@/components/layout/MonthSelector'
import { useFinance } from '@/context/FinanceContext'
import { formatBRL, formatDate } from '@/lib/format'
import { billingPeriodLabel } from '@/lib/billing'
import { cn } from '@/lib/utils'
import type { Transaction, CardAccount, CardBillPayment } from '@/lib/types'

export function CreditCardPage() {
  const { transactions, loading, cardAccounts, selectedMonth, billPayments, payCardBill, unpayCardBill } = useFinance()
  const [activeCard, setActiveCard] = useState<string>('all')

  const year = selectedMonth.getFullYear()
  const month = selectedMonth.getMonth() + 1

  const cardTx = transactions.filter(t =>
    t.method === 'credit_card' &&
    t.billing_year === year &&
    t.billing_month === month,
  )


  const cardGroups = new Map<string, { card: CardAccount | null; txs: Transaction[] }>()
  for (const t of cardTx) {
    const key = t.credit_card_id || '__none__'
    if (!cardGroups.has(key)) cardGroups.set(key, { card: t.credit_card || null, txs: [] })
    cardGroups.get(key)!.txs.push(t)
  }

  const billingLabel = billingPeriodLabel(year, month)

  const filteredGroups = activeCard === 'all'
    ? Array.from(cardGroups.entries())
    : Array.from(cardGroups.entries()).filter(([key]) => key === activeCard)

  const filteredTotal = filteredGroups.reduce((s, [, { txs }]) => s + txs.reduce((a, t) => a + t.amount, 0), 0)
  const filteredMine  = filteredGroups.reduce((s, [, { txs }]) => s + txs.reduce((a, t) => a + t.my_amount, 0), 0)
  const filteredRec   = filteredTotal - filteredMine

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Cartões</h1>
          <p className="text-sm text-muted-foreground capitalize">{billingLabel}</p>
        </div>
        <MonthSelector />
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Card filter pills */}
          {cardAccounts.length > 1 && (
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
              <button
                onClick={() => setActiveCard('all')}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                  activeCard === 'all'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                Todos
              </button>
              {cardAccounts.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveCard(c.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                    activeCard === c.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Summary hero */}
          {filteredTotal > 0 && (
            <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Fatura Total</p>
                <p className="mt-1 font-mono text-4xl font-bold tabular-nums">{formatBRL(filteredTotal)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Realmente Meu</p>
                  <p className="mt-0.5 font-mono text-xl font-bold tabular-nums">{formatBRL(filteredMine)}</p>
                  {filteredTotal > 0 && (
                    <p className="text-[11px] text-muted-foreground">{Math.round((filteredMine / filteredTotal) * 100)}% da fatura</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">A Receber</p>
                  <p className={cn('mt-0.5 font-mono text-xl font-bold tabular-nums', filteredRec > 0 ? 'text-warning' : 'text-muted-foreground')}>
                    {formatBRL(filteredRec)}
                  </p>
                  {filteredTotal > 0 && filteredRec > 0 && (
                    <p className="text-[11px] text-muted-foreground">{Math.round((filteredRec / filteredTotal) * 100)}% da fatura</p>
                  )}
                </div>
              </div>
              {filteredTotal > 0 && (
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div className="flex h-full">
                    <div className="h-full bg-primary transition-all" style={{ width: `${(filteredMine / filteredTotal) * 100}%` }} />
                    <div className="h-full bg-warning/70 transition-all" style={{ width: `${(filteredRec / filteredTotal) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card bills */}
          <div className="flex flex-col gap-3">
            {filteredGroups.map(([key, { card, txs }]) => (
              <CardBillDetail
                key={key}
                card={card}
                transactions={txs}
                defaultExpanded={cardGroups.size === 1}
                year={year}
                month={month}
                billPayments={billPayments}
                onPay={payCardBill}
                onUnpay={unpayCardBill}
              />
            ))}
          </div>

          {/* Empty */}
          {cardTx.length === 0 && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">Nenhum lançamento</p>
                <p className="mt-1 text-sm text-muted-foreground">Nenhuma despesa no cartão para {billingLabel}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CardBillDetail({
  card, transactions, defaultExpanded, year, month, billPayments, onPay, onUnpay,
}: {
  card: CardAccount | null
  transactions: Transaction[]
  defaultExpanded?: boolean
  year: number
  month: number
  billPayments: CardBillPayment[]
  onPay: (cardId: string, year: number, month: number, amount: number, bankAccountId: string | null) => Promise<void>
  onUnpay: (cardId: string, year: number, month: number) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false)
  const [paying, setPaying] = useState(false)

  const recurring    = transactions.filter(t => t.is_recurring)
  const nonRecurring = transactions.filter(t => !t.is_recurring)
  const totalMine    = transactions.reduce((s, t) => s + t.my_amount, 0)
  const annualTotal  = recurring.reduce((s, t) => s + t.my_amount, 0) * 12

  const payment = card
    ? billPayments.find(p => p.credit_card_id === card.id && p.billing_year === year && p.billing_month === month)
    : undefined
  const isPaid = !!payment

  async function handlePay() {
    if (!card) return
    setPaying(true)
    try { await onPay(card.id, year, month, totalMine, card.bank_account_id) }
    finally { setPaying(false) }
  }
  async function handleUnpay() {
    if (!card) return
    setPaying(true)
    try { await onUnpay(card.id, year, month) }
    finally { setPaying(false) }
  }

  return (
    <div className={cn(
      'rounded-2xl border bg-card/60 overflow-hidden transition-colors',
      isPaid ? 'border-positive/30' : 'border-border',
    )}>
      {/* Card header (clickable) */}
      <button className="flex w-full items-center justify-between gap-3 p-4 text-left" onClick={() => setExpanded(v => !v)}>
        <div className="flex min-w-0 items-center gap-3">
          {card ? (
            <>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: card.color + '22' }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: card.color }} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{card.name}</p>
                {card && (
                  <p className="text-[11px] text-muted-foreground">
                    Fecha dia {card.closing_day} · Vence dia {card.due_day}
                  </p>
                )}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">Sem cartão</span>
          )}
          {isPaid && <CheckCircle2 className="h-4 w-4 shrink-0 text-positive" />}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={cn('font-mono font-bold tabular-nums', isPaid && 'text-positive')}>
            {formatBRL(totalMine)}
          </span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 border-t border-border px-4 pb-4 pt-3">
          {/* Pay button */}
          {card && totalMine > 0 && (
            <div className="flex justify-end">
              {isPaid ? (
                <Button size="sm" variant="outline" className="h-8 gap-1.5 border-positive/40 text-positive text-xs hover:bg-positive/10"
                  onClick={handleUnpay} disabled={paying}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Pago
                </Button>
              ) : (
                <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handlePay} disabled={paying}>
                  <Banknote className="h-3.5 w-3.5" /> Pagar fatura
                </Button>
              )}
            </div>
          )}

          {/* Recurring */}
          {recurring.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Assinaturas · {formatBRL(annualTotal)}/ano
              </p>
              {recurring.map(tx => <TxRow key={tx.id} tx={tx} />)}
            </div>
          )}

          {/* Non-recurring */}
          {nonRecurring.length > 0 && (
            <div className="flex flex-col gap-2">
              {recurring.length > 0 && (
                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Outros</p>
              )}
              {nonRecurring.map(tx => <TxRow key={tx.id} tx={tx} showDate />)}
            </div>
          )}

          {transactions.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum lançamento</p>
          )}
        </div>
      )}
    </div>
  )
}

function TxRow({ tx, showDate }: { tx: Transaction; showDate?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
        style={{
          backgroundColor: (tx.category?.color ?? '#6b7280') + '22',
          color: tx.category?.color ?? '#6b7280',
        }}
      >
        {tx.description.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{tx.description}</p>
        <p className="text-[11px] text-muted-foreground">
          {showDate && <span>{formatDate(tx.purchase_date || tx.date)} · </span>}
          {tx.category?.name ?? 'Sem categoria'}
          {tx.installment_count > 1 && ` · ${tx.installment_number}/${tx.installment_count}x`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-sm font-semibold tabular-nums">{formatBRL(tx.my_amount)}</p>
        {tx.type !== 'mine' && (
          <p className="text-[10px] text-muted-foreground">{formatBRL(tx.amount)} bruto</p>
        )}
      </div>
    </div>
  )
}
FILEOF

echo "==> src/pages/Budget.tsx..."
cat > src/pages/Budget.tsx << 'FILEOF'
import { useState, useMemo } from 'react'
import { Target, Plus, Pencil, Trash2, AlertTriangle, ClipboardCopy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MonthSelector } from '@/components/layout/MonthSelector'
import { useFinance } from '@/context/FinanceContext'
import { formatBRL } from '@/lib/format'
import { getCategoryIcon } from '@/lib/category-icons'
import { cn } from '@/lib/utils'
import type { Category } from '@/lib/types'
import { toast } from 'sonner'
import { ChartContainer } from '@/components/ui/chart'
import { PieChart, Pie, Cell } from 'recharts'
import type { ChartConfig } from '@/components/ui/chart'

type BudgetStatus = 'ok' | 'warning' | 'over'

function getBudgetStatus(spent: number, limit: number): BudgetStatus {
  const pct = spent / limit
  if (pct >= 1) return 'over'
  if (pct >= 0.8) return 'warning'
  return 'ok'
}

function getProgressColor(status: BudgetStatus) {
  if (status === 'over') return 'bg-destructive'
  if (status === 'warning') return 'bg-warning'
  return 'bg-positive'
}

function getStatusTextColor(status: BudgetStatus) {
  if (status === 'over') return 'text-destructive'
  if (status === 'warning') return 'text-warning'
  return 'text-positive'
}

export function BudgetPage() {
  const {
    stats, budgetLimits, categories, loading,
    deleteBudgetLimit, setBudgetLimit, setBudgetLimitsInBatch,
    copyBudgetFromMonth, selectedMonth,
  } = useFinance()

  const [plannerOpen, setPlannerOpen] = useState(false)
  const [editDialogCat, setEditDialogCat] = useState<Category | null>(null)

  const year  = selectedMonth.getFullYear()
  const month = selectedMonth.getMonth() + 1

  const { byCategory } = stats
  const limitMap = new Map(budgetLimits.map(b => [b.category_id, b.monthly_limit]))

  const categoriesWithLimit = byCategory
    .filter(c => c.category && limitMap.has(c.category.id))
    .map(c => ({ ...c, limit: limitMap.get(c.category!.id)! }))
    .sort((a, b) => b.myAmount / b.limit - a.myAmount / a.limit)

  const categoriesWithLimitNoSpend = categories
    .filter(c => limitMap.has(c.id) && !byCategory.some(bc => bc.category?.id === c.id))
    .map(c => ({ category: c, myAmount: 0, amount: 0, limit: limitMap.get(c.id)!, label: c.name, color: c.color }))

  const allBudgeted = [...categoriesWithLimit, ...categoriesWithLimitNoSpend]
  const categoriesWithoutLimit = byCategory.filter(c => !c.category || !limitMap.has(c.category.id))

  const totalBudgeted = allBudgeted.reduce((s, c) => s + c.limit, 0)
  const totalSpentOnBudgeted = allBudgeted.reduce((s, c) => s + c.myAmount, 0)
  const overCount = allBudgeted.filter(c => c.myAmount > c.limit).length
  const budgetPct = totalBudgeted > 0 ? Math.min((totalSpentOnBudgeted / totalBudgeted) * 100, 100) : 0
  const overallStatus = getBudgetStatus(totalSpentOnBudgeted, totalBudgeted || 1)

  const spent = Math.min(totalSpentOnBudgeted, totalBudgeted)
  const remaining = Math.max(totalBudgeted - totalSpentOnBudgeted, 0)
  const donutData = totalBudgeted > 0
    ? [{ name: 'gasto', value: spent }, { name: 'restante', value: remaining }]
    : [{ name: 'vazio', value: 1 }]
  const donutConfig: ChartConfig = {
    gasto:    { label: 'Gasto',    color: totalSpentOnBudgeted > totalBudgeted ? 'var(--destructive)' : 'var(--primary)' },
    restante: { label: 'Restante', color: 'var(--muted)' },
    vazio:    { label: '',         color: 'var(--muted)' },
  }

  const handleDelete = async (categoryId: string, name: string) => {
    try {
      await deleteBudgetLimit(categoryId, year, month)
      toast.success(`Limite de "${name}" removido`)
    } catch { toast.error('Erro ao remover limite') }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Orçamento</h1>
          <p className="text-sm text-muted-foreground">Limites por categoria</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthSelector />
          <Button size="sm" onClick={() => setPlannerOpen(true)} className="gap-1.5">
            <Target className="h-3.5 w-3.5" /> Planejar
          </Button>
        </div>
      </div>

      {/* Donut + Summary */}
      {totalBudgeted > 0 && (
        <div className="flex items-center gap-5 rounded-2xl border border-border bg-card/60 p-5">
          <div className="relative shrink-0">
            <ChartContainer config={donutConfig} className="h-[110px] w-[110px]">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={34} outerRadius={50}
                  startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
                  {donutData.map((entry, idx) => <Cell key={idx} fill={`var(--color-${entry.name})`} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn('text-lg font-bold tabular-nums', getStatusTextColor(overallStatus))}>
                {Math.round(budgetPct)}%
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-3xl font-bold tabular-nums tracking-tight">{formatBRL(totalSpentOnBudgeted)}</p>
            <p className="text-sm text-muted-foreground">de {formatBRL(totalBudgeted)} orçado</p>
            <div className="mt-2 flex items-center gap-3">
              {totalSpentOnBudgeted <= totalBudgeted ? (
                <span className="text-xs font-medium text-positive">sobra {formatBRL(totalBudgeted - totalSpentOnBudgeted)}</span>
              ) : (
                <span className="text-xs font-medium text-destructive">excedeu {formatBRL(totalSpentOnBudgeted - totalBudgeted)}</span>
              )}
              {overCount > 0 && (
                <span className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {overCount} estouro{overCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty states */}
      {totalBudgeted === 0 && byCategory.length > 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Nenhum limite definido</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-[220px]">
              Toque em "Planejar" para definir limites por categoria
            </p>
          </div>
          <Button size="sm" onClick={() => setPlannerOpen(true)}>
            <Target className="mr-1.5 h-3.5 w-3.5" /> Planejar mês
          </Button>
        </div>
      )}

      {totalBudgeted === 0 && byCategory.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Target className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhum gasto neste mês</p>
        </div>
      )}

      {/* Categories with limit */}
      {allBudgeted.length > 0 && (
        <div className="flex flex-col gap-2">
          {allBudgeted.map(({ category, myAmount, limit }) => {
            const cat = category!
            const Icon = getCategoryIcon(cat)
            const pct = Math.min((myAmount / limit) * 100, 100)
            const status = getBudgetStatus(myAmount, limit)
            return (
              <div key={cat.id} className="rounded-2xl border border-border bg-card/60 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: cat.color || '#6b7280' }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">{cat.name}</span>
                      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                        {formatBRL(myAmount)}
                        <span className="font-normal text-muted-foreground"> / {formatBRL(limit)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditDialogCat(cat)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(cat.id, cat.name)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div className={cn('h-full rounded-full transition-all', getProgressColor(status))} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px]">
                  <span className={cn('font-medium', getStatusTextColor(status))}>{Math.round(pct)}%</span>
                  {myAmount <= limit
                    ? <span className="text-muted-foreground">falta {formatBRL(limit - myAmount)}</span>
                    : <span className="font-medium text-destructive">+{formatBRL(myAmount - limit)} acima</span>
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Categories without limit */}
      {categoriesWithoutLimit.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="px-0.5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Sem limite</p>
          {categoriesWithoutLimit.map(({ category, myAmount }) => {
            const Icon = getCategoryIcon(category)
            return (
              <div key={category?.id || '__none__'} className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: category?.color || '#6b7280' }}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{category?.name || 'Sem categoria'}</span>
                <span className="font-mono text-sm font-semibold tabular-nums text-muted-foreground">{formatBRL(myAmount)}</span>
                {category && (
                  <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 text-xs"
                    onClick={() => setEditDialogCat(category)}>
                    <Plus className="h-3 w-3" /> Limite
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Dialogs */}
      {editDialogCat && (
        <EditLimitDialog
          open={!!editDialogCat}
          onClose={() => setEditDialogCat(null)}
          category={editDialogCat}
          currentLimit={limitMap.get(editDialogCat.id)}
          year={year} month={month}
          onSave={setBudgetLimit}
        />
      )}

      <BudgetPlannerSheet
        open={plannerOpen}
        onClose={() => setPlannerOpen(false)}
        categories={categories}
        budgetLimits={budgetLimits}
        year={year} month={month}
        onSaveBatch={setBudgetLimitsInBatch}
        onCopyFromPrevious={copyBudgetFromMonth}
      />
    </div>
  )
}

function EditLimitDialog({ open, onClose, category, currentLimit, year, month, onSave }: {
  open: boolean; onClose: () => void; category: Category
  currentLimit?: number; year: number; month: number
  onSave: (categoryId: string, limit: number, year: number, month: number) => Promise<void>
}) {
  const [value, setValue] = useState(currentLimit ? String(currentLimit) : '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const num = parseFloat(value.replace(',', '.'))
    if (!num || num <= 0) { toast.error('Informe um limite válido'); return }
    setSaving(true)
    try { await onSave(category.id, num, year, month); toast.success('Limite salvo'); onClose() }
    catch { toast.error('Erro ao salvar') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{currentLimit ? 'Editar limite' : 'Definir limite'} — {category.name}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label>Limite mensal (R$)</Label>
          <Input type="number" min="0.01" step="0.01" placeholder="Ex: 500,00"
            value={value} onChange={e => setValue(e.target.value)}
            className="mt-1.5" autoFocus onKeyDown={e => e.key === 'Enter' && handleSave()} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BudgetPlannerSheet({ open, onClose, categories, budgetLimits, year, month, onSaveBatch, onCopyFromPrevious }: {
  open: boolean; onClose: () => void; categories: Category[]
  budgetLimits: { category_id: string; monthly_limit: number; year: number; month: number }[]
  year: number; month: number
  onSaveBatch: (limits: { categoryId: string; limit: number }[], year: number, month: number) => Promise<void>
  onCopyFromPrevious: (fromYear: number, fromMonth: number, toYear: number, toMonth: number) => Promise<void>
}) {
  const currentLimits = new Map(budgetLimits.filter(b => b.year === year && b.month === month).map(b => [b.category_id, b.monthly_limit]))
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const cat of categories) {
      const existing = currentLimits.get(cat.id)
      init[cat.id] = existing ? String(existing) : ''
    }
    return init
  })
  const [saving, setSaving] = useState(false)
  const [copying, setCopying] = useState(false)

  const total = useMemo(() =>
    Object.values(values).reduce((sum, v) => { const n = parseFloat(v.replace(',', '.')); return sum + (isNaN(n) ? 0 : n) }, 0),
  [values])

  const handleCopy = async () => {
    setCopying(true)
    try {
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      await onCopyFromPrevious(prevYear, prevMonth, year, month)
      toast.success('Orçamento copiado'); onClose()
    } catch { toast.error('Erro ao copiar') }
    finally { setCopying(false) }
  }

  const handleSave = async () => {
    const limits = Object.entries(values)
      .filter(([, v]) => { const n = parseFloat(v.replace(',', '.')); return !isNaN(n) && n > 0 })
      .map(([categoryId, v]) => ({ categoryId, limit: parseFloat(v.replace(',', '.')) }))
    setSaving(true)
    try { await onSaveBatch(limits, year, month); toast.success('Orçamento salvo'); onClose() }
    catch { toast.error('Erro ao salvar') }
    finally { setSaving(false) }
  }

  const monthNames = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="bottom" className="flex h-[85dvh] flex-col p-0">
        <SheetHeader className="shrink-0 border-b border-border px-4 pb-3 pt-4">
          <SheetTitle className="text-left">Planejar — {monthNames[month - 1]} {year}</SheetTitle>
          <Button size="sm" variant="outline" className="w-fit gap-1.5 text-xs" onClick={handleCopy} disabled={copying}>
            <ClipboardCopy className="h-3 w-3" />
            {copying ? 'Copiando...' : 'Copiar do mês anterior'}
          </Button>
        </SheetHeader>
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-3 py-4">
            {categories.map(cat => {
              const Icon = getCategoryIcon(cat)
              return (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: cat.color || '#6b7280' }}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{cat.name}</span>
                  <div className="w-28 shrink-0">
                    <Input type="number" min="0" step="0.01" placeholder="R$ 0"
                      value={values[cat.id] || ''}
                      onChange={e => setValues(prev => ({ ...prev, [cat.id]: e.target.value }))}
                      className="h-8 text-right font-mono text-sm tabular-nums" />
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
        <SheetFooter className="shrink-0 border-t border-border px-4 py-3">
          <div className="flex w-full items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total orçado</p>
              <p className="font-mono text-lg font-bold tabular-nums">{formatBRL(total)}</p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="px-6">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
FILEOF

echo "==> src/pages/Settings.tsx..."
cat > src/pages/Settings.tsx << 'FILEOF'
import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, RefreshCw, Download, Loader2, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { IncomeForm } from '@/components/IncomeForm'
import { BankAccountForm } from '@/components/BankAccountForm'
import { CreditCardForm } from '@/components/CreditCardForm'
import { TransferForm } from '@/components/TransferForm'
import { useFinance } from '@/context/FinanceContext'
import { supabase } from '@/lib/supabase'
import { formatBRL, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Income, Category, CardAccount, Subcategory } from '@/lib/types'

const PRESET_COLORS = [
  '#f97316', '#3b82f6', '#22c55e', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f59e0b', '#6b7280',
  '#ef4444', '#06b6d4',
]

function Section({ title, action, children }: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60">
        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{title}</p>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const {
    incomes, people, categories, bankAccounts, cardAccounts, loading,
    deleteIncome, deletePerson, addCategory, deleteCategory, updateCategory,
    deleteBankAccount, setAccountBalance, deleteCardAccount,
    subcategories, addSubcategory, updateSubcategory, deleteSubcategory,
  } = useFinance()

  const [incOpen, setIncOpen] = useState(false)
  const [editIncome, setEditIncome] = useState<Income | null>(null)
  const [deleteIncomeId, setDeleteIncomeId] = useState<string | null>(null)
  const [deletePersonId, setDeletePersonId] = useState<string | null>(null)
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null)

  const [accOpen, setAccOpen] = useState(false)
  const [deleteAccId, setDeleteAccId] = useState<string | null>(null)
  const [editAccId, setEditAccId] = useState<string | null>(null)
  const [newBalance, setNewBalance] = useState('')
  const [txfOpen, setTxfOpen] = useState(false)

  const [cardOpen, setCardOpen] = useState(false)
  const [editCard, setEditCard] = useState<CardAccount | null>(null)
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null)

  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0])
  const [addingCat, setAddingCat] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)

  const [editCat, setEditCat] = useState<Category | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatColor, setEditCatColor] = useState('')

  const [expandedCatId, setExpandedCatId] = useState<string | null>(null)
  const [newSubName, setNewSubName] = useState('')
  const [addingSub, setAddingSub] = useState(false)
  const [editSub, setEditSub] = useState<Subcategory | null>(null)
  const [editSubName, setEditSubName] = useState('')
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null)

  const [exporting, setExporting] = useState(false)

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    setAddingCat(true)
    try { await addCategory(newCatName.trim(), newCatColor); setNewCatName(''); setShowCatForm(false) }
    catch { /* ignore */ }
    setAddingCat(false)
  }

  async function handleUpdateCategory() {
    if (!editCat || !editCatName.trim()) return
    await updateCategory(editCat.id, editCatName.trim(), editCatColor)
    setEditCat(null)
  }

  async function handleAddSubcategory(categoryId: string) {
    if (!newSubName.trim()) return
    setAddingSub(true)
    try { await addSubcategory(categoryId, newSubName.trim(), null); setNewSubName('') }
    catch { /* ignore */ }
    setAddingSub(false)
  }

  async function handleUpdateSubcategory() {
    if (!editSub || !editSubName.trim()) return
    await updateSubcategory(editSub.id, editSubName.trim(), null)
    setEditSub(null)
  }

  async function handleSetBalance() {
    if (!editAccId) return
    const val = parseFloat(newBalance.replace(',', '.'))
    if (isNaN(val)) return
    await setAccountBalance(editAccId, val)
    setEditAccId(null)
    setNewBalance('')
  }

  async function handleExport() {
    setExporting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [txRes, incRes, baRes, ccRes, catRes, peRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id),
        supabase.from('incomes').select('*').eq('user_id', user.id),
        supabase.from('bank_accounts').select('*').eq('user_id', user.id),
        supabase.from('credit_cards').select('*').eq('user_id', user.id),
        supabase.from('categories').select('*').eq('user_id', user.id),
        supabase.from('people').select('*').eq('user_id', user.id),
      ])
      const data = {
        exported_at: new Date().toISOString(),
        transactions: txRes.data ?? [],
        incomes: incRes.data ?? [],
        bank_accounts: baRes.data ?? [],
        credit_cards: ccRes.data ?? [],
        categories: catRes.data ?? [],
        people: peRes.data ?? [],
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financas-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Contas, cartões, categorias e dados</p>
      </div>

      {/* Bank Accounts */}
      <Section title="Contas" action={
        <div className="flex gap-2">
          {bankAccounts.length >= 2 && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setTxfOpen(true)} title="Transferir">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAccOpen(true)}>
            <Plus className="h-3 w-3" /> Nova
          </Button>
        </div>
      }>
        {loading ? <Skeleton className="h-16" /> : bankAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma conta. Adicione para controlar saldos.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bankAccounts.map(acc => (
              <div key={acc.id} className="flex items-center gap-3">
                <span className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: acc.color + '22' }}>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: acc.color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{acc.name}</p>
                  {editAccId === acc.id ? (
                    <div className="mt-1 flex gap-1.5">
                      <Input type="number" step="0.01" value={newBalance}
                        onChange={e => setNewBalance(e.target.value)}
                        placeholder="Novo saldo" className="h-7 flex-1 text-xs" />
                      <Button size="sm" className="h-7 px-2" onClick={handleSetBalance}><Check className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditAccId(null)}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <p className={cn('text-xs', acc.current_balance >= 0 ? 'text-muted-foreground' : 'text-destructive')}>
                      {formatBRL(acc.current_balance)}
                    </p>
                  )}
                </div>
                {editAccId !== acc.id && (
                  <div className="flex shrink-0 gap-0.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => { setEditAccId(acc.id); setNewBalance(acc.current_balance.toString()) }}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteAccId(acc.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Credit Cards */}
      <Section title="Cartões de Crédito" action={
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
          onClick={() => { setEditCard(null); setCardOpen(true) }}>
          <Plus className="h-3 w-3" /> Novo
        </Button>
      }>
        {loading ? <Skeleton className="h-16" /> : cardAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {cardAccounts.map(card => (
              <div key={card.id} className="flex items-center gap-3">
                <span className="h-8 w-8 shrink-0 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: card.color + '22' }}>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: card.color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{card.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Fecha {card.closing_day} · Vence {card.due_day}
                    {card.bank_account && ` · ${card.bank_account.name}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => { setEditCard(card); setCardOpen(true) }}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    onClick={() => setDeleteCardId(card.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Incomes */}
      <Section title="Receitas" action={
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
          onClick={() => { setEditIncome(null); setIncOpen(true) }}>
          <Plus className="h-3 w-3" /> Nova
        </Button>
      }>
        {loading ? <Skeleton className="h-16" /> : incomes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma receita cadastrada.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {incomes.map(inc => (
              <div key={inc.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inc.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(inc.date)}{inc.is_recurring && ' · recorrente'}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold text-positive tabular-nums">
                  {formatBRL(inc.amount)}
                </span>
                <div className="flex shrink-0 gap-0.5">
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => { setEditIncome(inc); setIncOpen(true) }}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    onClick={() => setDeleteIncomeId(inc.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* People */}
      <Section title="Pessoas">
        {loading ? <Skeleton className="h-16" /> : people.length === 0 ? (
          <p className="text-sm text-muted-foreground">Adicione pessoas ao criar lançamentos de repasse ou rateio.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {people.map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{p.name}</span>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                  onClick={() => setDeletePersonId(p.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Categories */}
      <Section title="Categorias" action={
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
          onClick={() => setShowCatForm(v => !v)}>
          <Plus className="h-3 w-3" /> Nova
        </Button>
      }>
        {showCatForm && (
          <div className="mb-3 rounded-xl border border-border p-3 space-y-2">
            <Input placeholder="Nome da categoria" value={newCatName}
              onChange={e => setNewCatName(e.target.value)} className="text-sm" />
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setNewCatColor(c)}
                  className={cn('h-6 w-6 rounded-full transition-transform', newCatColor === c && 'ring-2 ring-offset-2 ring-primary scale-110')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddCategory} disabled={addingCat} className="flex-1">Criar</Button>
              <Button size="sm" variant="outline" onClick={() => setShowCatForm(false)}><X className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}

        {loading ? <Skeleton className="h-24" /> : (
          <div className="flex flex-col gap-2">
            {categories.map(cat => {
              const catSubs = subcategories.filter(s => s.category_id === cat.id)
              const isExpanded = expandedCatId === cat.id
              return (
                <div key={cat.id}>
                  {editCat?.id === cat.id ? (
                    <div className="rounded-xl border border-primary/30 p-3 space-y-2">
                      <Input value={editCatName} onChange={e => setEditCatName(e.target.value)} className="text-sm h-8" />
                      <div className="flex flex-wrap gap-1">
                        {PRESET_COLORS.map(c => (
                          <button key={c} type="button" onClick={() => setEditCatColor(c)}
                            className={cn('h-5 w-5 rounded-full', editCatColor === c && 'ring-2 ring-offset-1 ring-primary scale-110')}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 flex-1" onClick={handleUpdateCategory}>
                          <Check className="h-3 w-3 mr-1" /> Salvar
                        </Button>
                        <Button size="sm" variant="outline" className="h-7" onClick={() => setEditCat(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                          className="relative h-5 w-5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }}>
                          {catSubs.length > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted-foreground text-[8px] font-bold text-background">
                              {catSubs.length}
                            </span>
                          )}
                        </button>
                        <button type="button" className="flex-1 text-left text-sm font-medium"
                          onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}>
                          {cat.name}
                        </button>
                        <div className="flex gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => { setEditCat(cat); setEditCatName(cat.name); setEditCatColor(cat.color) }}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                            onClick={() => setDeleteCatId(cat.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="ml-8 mt-2 space-y-1.5 border-l border-border pl-3">
                          {catSubs.map(sub => (
                            <div key={sub.id} className="flex items-center gap-2">
                              {editSub?.id === sub.id ? (
                                <div className="flex flex-1 gap-1.5">
                                  <Input value={editSubName} onChange={e => setEditSubName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleUpdateSubcategory()}
                                    className="h-7 flex-1 text-xs" />
                                  <Button size="sm" className="h-7 px-2" onClick={handleUpdateSubcategory}><Check className="h-3 w-3" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditSub(null)}><X className="h-3 w-3" /></Button>
                                </div>
                              ) : (
                                <>
                                  <span className="flex-1 text-xs text-muted-foreground">{sub.name}</span>
                                  <Button size="icon" variant="ghost" className="h-6 w-6"
                                    onClick={() => { setEditSub(sub); setEditSubName(sub.name) }}>
                                    <Edit2 className="h-2.5 w-2.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                                    onClick={() => setDeleteSubId(sub.id)}>
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          ))}
                          <div className="flex gap-1.5">
                            <Input placeholder="Nova subcategoria..." value={expandedCatId === cat.id ? newSubName : ''}
                              onChange={e => setNewSubName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleAddSubcategory(cat.id)}
                              className="h-7 flex-1 text-xs" />
                            <Button size="sm" className="h-7 px-2 text-xs"
                              onClick={() => handleAddSubcategory(cat.id)}
                              disabled={addingSub || !newSubName.trim()}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Export */}
      <Section title="Dados">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Exportar backup</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Arquivo JSON com todas as transações, contas e categorias.</p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Exportar
          </Button>
        </div>
      </Section>

      {/* Sign out */}
      <Section title="Conta">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Encerrar sessão</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Sair deste dispositivo.</p>
          </div>
          <Button variant="outline" className="shrink-0 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => supabase.auth.signOut()}>
            <LogOut className="h-3.5 w-3.5" /> Sair
          </Button>
        </div>
      </Section>

      {/* Delete dialogs */}
      <AlertDialog open={!!deleteIncomeId} onOpenChange={o => !o && setDeleteIncomeId(null)}>
        <AlertDialogContent><AlertDialogHeader>
          <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader><AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => { if (deleteIncomeId) { await deleteIncome(deleteIncomeId); setDeleteIncomeId(null) } }}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePersonId} onOpenChange={o => !o && setDeletePersonId(null)}>
        <AlertDialogContent><AlertDialogHeader>
          <AlertDialogTitle>Excluir pessoa?</AlertDialogTitle>
          <AlertDialogDescription>Os lançamentos vinculados serão desconectados desta pessoa.</AlertDialogDescription>
        </AlertDialogHeader><AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => { if (deletePersonId) { await deletePerson(deletePersonId); setDeletePersonId(null) } }}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCatId} onOpenChange={o => !o && setDeleteCatId(null)}>
        <AlertDialogContent><AlertDialogHeader>
          <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
          <AlertDialogDescription>Os lançamentos desta categoria ficarão sem categoria.</AlertDialogDescription>
        </AlertDialogHeader><AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => { if (deleteCatId) { await deleteCategory(deleteCatId); setDeleteCatId(null) } }}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAccId} onOpenChange={o => !o && setDeleteAccId(null)}>
        <AlertDialogContent><AlertDialogHeader>
          <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
          <AlertDialogDescription>Os lançamentos vinculados serão desconectados desta conta.</AlertDialogDescription>
        </AlertDialogHeader><AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => { if (deleteAccId) { await deleteBankAccount(deleteAccId); setDeleteAccId(null) } }}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCardId} onOpenChange={o => !o && setDeleteCardId(null)}>
        <AlertDialogContent><AlertDialogHeader>
          <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
          <AlertDialogDescription>Os lançamentos vinculados serão desconectados deste cartão.</AlertDialogDescription>
        </AlertDialogHeader><AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => { if (deleteCardId) { await deleteCardAccount(deleteCardId); setDeleteCardId(null) } }}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSubId} onOpenChange={o => !o && setDeleteSubId(null)}>
        <AlertDialogContent><AlertDialogHeader>
          <AlertDialogTitle>Excluir subcategoria?</AlertDialogTitle>
          <AlertDialogDescription>Os lançamentos vinculados ficarão sem subcategoria.</AlertDialogDescription>
        </AlertDialogHeader><AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => { if (deleteSubId) { await deleteSubcategory(deleteSubId); setDeleteSubId(null) } }}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <IncomeForm open={incOpen} onOpenChange={open => { setIncOpen(open); if (!open) setEditIncome(null) }} editIncome={editIncome} />
      <BankAccountForm open={accOpen} onOpenChange={setAccOpen} />
      <CreditCardForm open={cardOpen} onOpenChange={open => { setCardOpen(open); if (!open) setEditCard(null) }} editCard={editCard} />
      <TransferForm open={txfOpen} onOpenChange={setTxfOpen} />
    </div>
  )
}
FILEOF

echo "==> src/pages/Import.tsx..."
cat > src/pages/Import.tsx << 'FILEOF'
import { useState, useRef, useMemo, useCallback } from 'react'
import { Upload, FileText, AlertCircle, Check, X, Loader2, ArrowLeft, CreditCard, Building2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useFinance } from '@/context/FinanceContext'
import { formatBRL, formatDate } from '@/lib/format'
import {
  parseOFX,
  parseCSV,
  detectCSVColumns,
  detectDelimiter,
  type ParsedTransaction,
  type ImportPreviewRow,
  type ImportMemory,
} from '@/lib/import-utils'
import type { TransactionMethod, TransactionType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

type ImportStep = 'upload' | 'mapping' | 'preview' | 'done'

export function Import() {
  const {
    transactions,
    categories,
    bankAccounts,
    cardAccounts,
    selectedMonth,
    addTransaction,
  } = useFinance()

  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<'ofx' | 'csv' | null>(null)
  const [rawContent, setRawContent] = useState<string>('')
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([])
  const [importMode, setImportMode] = useState<'transactions' | 'card_statement'>('transactions')
  const [selectedCardId, setSelectedCardId] = useState<string>('')
  const [delimiter, setDelimiter] = useState<string>(',')
  const [columnMapping, setColumnMapping] = useState({ date: '', description: '', amount: '', type: '' })
  const [loading, setLoading] = useState(false)
  const [importMemory, setImportMemory] = useState<ImportMemory[]>([])
  const [importCount, setImportCount] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const detectedMapping = useMemo(() => {
    if (!rawContent || fileType !== 'csv') return null
    const lines = rawContent.split('\n')
    if (lines.length === 0) return null
    const headers = lines[0].split(delimiter).map(h => h.replace(/"/g, '').trim())
    return detectCSVColumns(headers)
  }, [rawContent, delimiter, fileType])

  const currentMonthTransactions = useMemo(() => {
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth() + 1
    return transactions.filter(t => {
      const txDate = new Date(t.date)
      return txDate.getFullYear() === year && txDate.getMonth() + 1 === month
    })
  }, [transactions, selectedMonth])

  async function loadImportMemory() {
    const { data, error } = await supabase
      .from('import_memory')
      .select('*')
      .order('use_count', { ascending: false })
      .limit(100)
    if (!error && data) {
      setImportMemory(data as ImportMemory[])
    }
  }

  function findMemoryMatch(description: string): ImportMemory | null {
    const descLower = description.toLowerCase().trim()
    for (const mem of importMemory) {
      const patternLower = mem.description_pattern.toLowerCase().trim()
      if (descLower.includes(patternLower) || patternLower.includes(descLower)) {
        return mem
      }
      const words = descLower.split(/\s+/)
      const patternWords = patternLower.split(/\s+/)
      const matchCount = words.filter(w => patternWords.includes(w)).length
      if (matchCount >= Math.min(2, patternWords.length)) {
        return mem
      }
    }
    return null
  }

  function checkDuplicate(date: string, amount: number, description: string): { isDuplicate: boolean; duplicateId?: string } {
    const match = currentMonthTransactions.find(t => {
      const sameDate = t.date === date
      const sameAmount = Math.abs(t.amount - amount) < 0.01
      const similarDesc = t.description.toLowerCase().includes(description.toLowerCase().slice(0, 20)) ||
        description.toLowerCase().includes(t.description.toLowerCase().slice(0, 20))
      return sameDate && sameAmount && similarDesc
    })
    return match ? { isDuplicate: true, duplicateId: match.id } : { isDuplicate: false }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const extension = selectedFile.name.split('.').pop()?.toLowerCase()
    if (extension !== 'ofx' && extension !== 'csv') {
      alert('Por favor, selecione um arquivo .OFX ou .CSV')
      return
    }

    setFile(selectedFile)
    setFileType(extension as 'ofx' | 'csv')

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setRawContent(content || '')

      if (extension === 'csv' && content) {
        const detectedDelimiter = detectDelimiter(content)
        setDelimiter(detectedDelimiter)
        const lines = content.split('\n')
        if (lines.length > 0) {
          const headers = lines[0].split(detectedDelimiter).map(h => h.replace(/"/g, '').trim())
          const mapping = detectCSVColumns(headers)
          setColumnMapping({
            date: mapping.date || '',
            description: mapping.description || '',
            amount: mapping.amount || '',
            type: '',
          })
        }
      }
    }
    reader.readAsText(selectedFile, 'utf-8')
  }

  function processFile() {
    if (!rawContent) return

    setLoading(true)
    loadImportMemory()

    let parsed: ParsedTransaction[] = []
    if (fileType === 'ofx') {
      parsed = parseOFX(rawContent)
    } else if (fileType === 'csv' && columnMapping.date && columnMapping.description && columnMapping.amount) {
      parsed = parseCSV(rawContent, columnMapping, delimiter)
    }

    const rows: ImportPreviewRow[] = parsed.map((tx, idx) => {
      const memoryMatch = findMemoryMatch(tx.description)
      const dupCheck = checkDuplicate(tx.date, tx.amount, tx.description)

      return {
        id: `import-${idx}`,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        method: memoryMatch?.method || (tx.type === 'credit' ? 'pix' : 'pix'),
        transactionType: memoryMatch?.type || 'mine',
        category_id: memoryMatch?.category_id || null,
        bank_account_id: memoryMatch?.bank_account_id || null,
        credit_card_id: memoryMatch?.credit_card_id || (importMode === 'card_statement' ? selectedCardId : null),
        isDuplicate: dupCheck.isDuplicate,
        duplicateId: dupCheck.duplicateId,
        memoryMatch,
      }
    })

    setPreviewRows(rows)
    setLoading(false)
    setStep(fileType === 'csv' && !columnMapping.date ? 'mapping' : 'preview')
  }

  const updateRow = useCallback((id: string, updates: Partial<ImportPreviewRow>) => {
    setPreviewRows(prev => prev.map(row =>
      row.id === id ? { ...row, ...updates } : row
    ))
  }, [])

  const updateAllRows = useCallback((updates: Partial<ImportPreviewRow>) => {
    setPreviewRows(prev => prev.map(row => ({ ...row, ...updates })))
  }, [])

  async function handleImport() {
    setLoading(true)

    const rowsToImport = previewRows.filter(row => !row.isDuplicate)
    let successCount = 0

    for (const row of rowsToImport) {
      try {
        const myAmount = row.transactionType === 'mine' ? row.amount : row.amount

        if (importMode === 'card_statement' && row.credit_card_id) {
          const card = cardAccounts.find(c => c.id === row.credit_card_id)
          if (card) {
            const purchaseDate = new Date(row.date)
            let billingYear = purchaseDate.getFullYear()
            let billingMonth = purchaseDate.getMonth() + 1

            const closingDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), card.closing_day)
            if (purchaseDate > closingDate) {
              billingMonth += 1
              if (billingMonth > 12) {
                billingMonth = 1
                billingYear += 1
              }
            }

            await addTransaction({
              date: row.date,
              description: row.description,
              amount: row.amount,
              my_amount: myAmount,
              method: 'credit_card' as TransactionMethod,
              type: row.transactionType,
              category_id: row.category_id,
              subcategory_id: null,
              bank_account_id: null,
              credit_card_id: row.credit_card_id,
              purchase_date: row.date,
              billing_year: billingYear,
              billing_month: billingMonth,
              installment_count: 1,
              installment_number: 1,
              installment_group_id: null,
              is_recurring: false,
              recurring_day: null,
              recurring_group_id: null,
              notes: null,
              people_splits: [],
            })
          }
        } else {
          await addTransaction({
            date: row.date,
            description: row.description,
            amount: row.amount,
            my_amount: myAmount,
            method: row.method,
            type: row.transactionType,
            category_id: row.category_id,
            subcategory_id: null,
            bank_account_id: row.method === 'credit_card' ? null : row.bank_account_id,
            credit_card_id: row.method === 'credit_card' ? row.credit_card_id : null,
            purchase_date: row.method === 'credit_card' ? row.date : null,
            billing_year: null,
            billing_month: null,
            installment_count: 1,
            installment_number: 1,
            installment_group_id: null,
            is_recurring: false,
            recurring_day: null,
            recurring_group_id: null,
            notes: null,
            people_splits: [],
          })
        }

        const bestPattern = row.description.toLowerCase().trim().slice(0, 50)
        const { error } = await supabase
          .from('import_memory')
          .upsert({
            description_pattern: bestPattern,
            method: row.method,
            type: row.transactionType,
            category_id: row.category_id,
            bank_account_id: row.bank_account_id,
            credit_card_id: row.credit_card_id,
            use_count: 1,
            last_used_at: new Date().toISOString(),
          }, {
            onConflict: 'description_pattern',
            ignoreDuplicates: false,
          })

        if (error && error.code === '23505') {
          await supabase
            .from('import_memory')
            .update({
              method: row.method,
              type: row.transactionType,
              category_id: row.category_id,
              bank_account_id: row.bank_account_id,
              credit_card_id: row.credit_card_id,
              use_count: supabase.rpc('increment_use_count'),
              last_used_at: new Date().toISOString(),
            })
            .eq('description_pattern', bestPattern)
        }

        successCount++
      } catch (err) {
        console.error('Error importing row:', err)
      }
    }

    setImportCount(successCount)
    setLoading(false)
    setStep('done')
  }

  function reset() {
    setFile(null)
    setFileType(null)
    setRawContent('')
    setPreviewRows([])
    setStep('upload')
    setImportCount(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleBack() {
    if (step === 'preview' && fileType === 'csv') {
      setStep('mapping')
    } else if (step === 'mapping') {
      setStep('upload')
    } else if (step === 'preview' && fileType === 'ofx') {
      setStep('upload')
    }
  }

  const validRows = previewRows.filter(r => !r.isDuplicate)
  const duplicateRows = previewRows.filter(r => r.isDuplicate)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        {step !== 'upload' && step !== 'done' && (
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h1 className="text-xl font-bold tracking-tight">Importar Extrato</h1>
      </div>

      {step === 'upload' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Tipo de importação</p>
            </div>
            <div className="space-y-3 px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={importMode === 'transactions' ? 'default' : 'outline'}
                  className="h-auto flex-col gap-1 py-3"
                  onClick={() => setImportMode('transactions')}
                >
                  <Building2 className="h-4 w-4" />
                  <span className="text-xs">Extrato bancário</span>
                </Button>
                <Button
                  variant={importMode === 'card_statement' ? 'default' : 'outline'}
                  className="h-auto flex-col gap-1 py-3"
                  onClick={() => setImportMode('card_statement')}
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="text-xs">Fatura de cartão</span>
                </Button>
              </div>

              {importMode === 'card_statement' && (
                <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    {cardAccounts.map(card => (
                      <SelectItem key={card.id} value={card.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: card.color }}
                          />
                          {card.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
            <div className="p-4">
              <div
                className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-muted-foreground/25 p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Selecionar arquivo</p>
                  <p className="text-sm text-muted-foreground">.OFX ou .CSV</p>
                </div>
                {file && (
                  <Badge variant="secondary" className="gap-1">
                    <FileText className="h-3 w-3" />
                    {file.name}
                  </Badge>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ofx,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {file && (
            <Button
              className="w-full"
              onClick={processFile}
              disabled={loading || (importMode === 'card_statement' && !selectedCardId)}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Continuar
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {step === 'mapping' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Mapear colunas</p>
            </div>
            <div className="space-y-3 px-4 pb-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">Coluna de Data</label>
                <Select
                  value={columnMapping.date || detectedMapping?.date || ''}
                  onValueChange={v => setColumnMapping(prev => ({ ...prev, date: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawContent.split('\n')[0]?.split(delimiter).map((h, i) => (
                      <SelectItem key={i} value={h.replace(/"/g, '').trim()}>
                        {h.replace(/"/g, '').trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Coluna de Descrição</label>
                <Select
                  value={columnMapping.description || detectedMapping?.description || ''}
                  onValueChange={v => setColumnMapping(prev => ({ ...prev, description: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawContent.split('\n')[0]?.split(delimiter).map((h, i) => (
                      <SelectItem key={i} value={h.replace(/"/g, '').trim()}>
                        {h.replace(/"/g, '').trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Coluna de Valor</label>
                <Select
                  value={columnMapping.amount || detectedMapping?.amount || ''}
                  onValueChange={v => setColumnMapping(prev => ({ ...prev, amount: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawContent.split('\n')[0]?.split(delimiter).map((h, i) => (
                      <SelectItem key={i} value={h.replace(/"/g, '').trim()}>
                        {h.replace(/"/g, '').trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Separador</label>
                <Select value={delimiter} onValueChange={setDelimiter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=",">Vírgula (,)</SelectItem>
                    <SelectItem value=";">Ponto e vírgula (;)</SelectItem>
                    <SelectItem value="\t">Tab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={processFile}
            disabled={loading || !columnMapping.date || !columnMapping.description || !columnMapping.amount}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Pré-visualizar
              </>
            )}
          </Button>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {validRows.length} lançamentos para importar
            </div>
            {duplicateRows.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {duplicateRows.length} duplicados
              </Badge>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Classificar todos</p>
            </div>
            <div className="space-y-3 px-4 pb-4">
              {importMode === 'transactions' && (
                <div className="grid grid-cols-2 gap-2">
                  <Select defaultValue="mine" onValueChange={v => updateAllRows({ transactionType: v as TransactionType })}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mine">Meu</SelectItem>
                      <SelectItem value="repasse">Repasse</SelectItem>
                      <SelectItem value="rateado">Rateado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select onValueChange={v => updateAllRows({ method: v as TransactionMethod })}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_card">Cartão</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="debit">Débito</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Select onValueChange={v => updateAllRows({ category_id: v === 'none' ? null : v })}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Categoria (todas)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {importMode === 'transactions' && (
                <Select onValueChange={v => updateAllRows({ bank_account_id: v === 'none' ? null : v })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Conta bancária (todas)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {bankAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs w-[80px]">Data</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs w-[90px] text-right">Valor</TableHead>
                    <TableHead className="text-xs w-[100px]">Tipo</TableHead>
                    {importMode === 'transactions' && (
                      <TableHead className="text-xs w-[100px]">Método</TableHead>
                    )}
                    <TableHead className="text-xs w-[120px]">Categoria</TableHead>
                    <TableHead className="text-xs w-[40px]">OK</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map(row => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        row.isDuplicate && 'bg-destructive/5 opacity-60',
                        row.memoryMatch && !row.isDuplicate && 'bg-emerald-500/5',
                      )}
                    >
                      <TableCell className="text-xs">{formatDate(row.date)}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="truncate max-w-[150px]">{row.description}</span>
                          {row.memoryMatch && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              sugestão aplicada
                            </span>
                          )}
                          {row.isDuplicate && (
                            <span className="text-[10px] text-destructive">
                              possível duplicado
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {formatBRL(row.amount)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Select
                          value={row.transactionType}
                          onValueChange={v => updateRow(row.id, { transactionType: v as TransactionType })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mine">Meu</SelectItem>
                            <SelectItem value="repasse">Repasse</SelectItem>
                            <SelectItem value="rateado">Rateado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {importMode === 'transactions' && (
                        <TableCell className="text-xs">
                          <Select
                            value={row.method}
                            onValueChange={v => updateRow(row.id, { method: v as TransactionMethod })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="credit_card">Cartão</SelectItem>
                              <SelectItem value="pix">PIX</SelectItem>
                              <SelectItem value="debit">Débito</SelectItem>
                              <SelectItem value="cash">Dinheiro</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                      <TableCell className="text-xs">
                        <Select
                          value={row.category_id || 'none'}
                          onValueChange={v => updateRow(row.id, { category_id: v === 'none' ? null : v })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            {categories.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {row.isDuplicate ? (
                          <X className="h-4 w-4 text-destructive" />
                        ) : (
                          <Check className="h-4 w-4 text-emerald-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleImport}
            disabled={loading || validRows.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Importar {validRows.length} lançamentos
              </>
            )}
          </Button>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold">Importação concluída!</h2>
            <p className="text-muted-foreground mt-1">
              {importCount} lançamentos importados com sucesso
            </p>
          </div>
          <Button onClick={reset} variant="outline">
            Importar outro arquivo
          </Button>
        </div>
      )}
    </div>
  )
}
FILEOF

echo "==> Garantindo dependencias..."
[ -d node_modules ] || npm install

echo "==> BUILD GATE..."
if ! npm run build; then
  echo "############################################################"
  echo "# BUILD FALHOU. Reverter: git reset --hard $TAG"
  echo "############################################################"
  exit 1
fi

git config user.email >/dev/null 2>&1 || git config user.email "jefherson@local"
git config user.name  >/dev/null 2>&1 || git config user.name  "Jefherson"
git add -A
git commit -m "style: redesign Receivables, CreditCard, Budget, Settings e Import (design system roxo/lilas)"
git push origin HEAD:main

echo "############################################################"
echo "# SUCESSO. Backup na tag: $TAG"
echo "############################################################"
