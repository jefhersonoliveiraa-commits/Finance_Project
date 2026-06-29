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
        <div className="hidden md:block"><MonthSelector />
      </div></div>

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
