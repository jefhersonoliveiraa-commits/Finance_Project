import { useState } from 'react'
import { Plus, CreditCard, CalendarDays, CheckCircle2, Banknote } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MonthSelector } from '@/components/layout/MonthSelector'
import { TransactionForm } from '@/components/TransactionForm'
import { useFinance } from '@/context/FinanceContext'
import { formatBRL, formatDate } from '@/lib/format'
import { billingPeriodLabel } from '@/lib/billing'
import { cn } from '@/lib/utils'
import type { Transaction, CardAccount, CardBillPayment } from '@/lib/types'

export function CreditCardPage() {
  const { transactions, loading, cardAccounts, selectedMonth, billPayments, payCardBill, unpayCardBill } = useFinance()
  const [txOpen, setTxOpen] = useState(false)

  const year = selectedMonth.getFullYear()
  const month = selectedMonth.getMonth() + 1

  // Filter by billing month
  const cardTx = transactions.filter(t =>
    t.method === 'credit_card' &&
    t.billing_year === year &&
    t.billing_month === month
  )

  const totalFatura = cardTx.reduce((s, t) => s + t.amount, 0)
  const minhaFatura = cardTx.reduce((s, t) => s + t.my_amount, 0)
  const aReceberFatura = totalFatura - minhaFatura

  // Group by card
  const cardGroups = new Map<string, { card: CardAccount | null; txs: Transaction[] }>()
  for (const t of cardTx) {
    const key = t.credit_card_id || '__none__'
    if (!cardGroups.has(key)) {
      cardGroups.set(key, {
        card: t.credit_card || null,
        txs: [],
      })
    }
    cardGroups.get(key)!.txs.push(t)
  }

  const billingLabel = billingPeriodLabel(year, month)

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Fatura do Cartão</h1>
          <p className="text-sm text-muted-foreground capitalize">{billingLabel}</p>
        </div>
        <MonthSelector className="mt-0.5" />
      </div>

      {/* Cards tabs if multiple cards */}
      {!loading && cardAccounts.length > 1 && (
        <Tabs defaultValue="all">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">Todos</TabsTrigger>
            {cardAccounts.map(c => (
              <TabsTrigger key={c.id} value={c.id}>
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.name}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="all" className="mt-4 space-y-4">
            <CardBillSummary
              total={totalFatura}
              mine={minhaFatura}
              toReceive={aReceberFatura}
            />
            {Array.from(cardGroups.entries()).map(([key, { card, txs }]) => (
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
          </TabsContent>
          {cardAccounts.map(c => (
            <TabsContent key={c.id} value={c.id} className="mt-4 space-y-4">
              <CardBillSummary
                total={cardTx.filter(t => t.credit_card_id === c.id).reduce((s, t) => s + t.amount, 0)}
                mine={cardTx.filter(t => t.credit_card_id === c.id).reduce((s, t) => s + t.my_amount, 0)}
                toReceive={cardTx.filter(t => t.credit_card_id === c.id).reduce((s, t) => s + t.amount - t.my_amount, 0)}
              />
              <CardBillDetail
                card={c}
                transactions={cardTx.filter(t => t.credit_card_id === c.id)}
                defaultExpanded={true}
                year={year}
                month={month}
                billPayments={billPayments}
                onPay={payCardBill}
                onUnpay={unpayCardBill}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Single card or no cards */}
      {!loading && cardAccounts.length <= 1 && (
        <>
          <CardBillSummary
            total={totalFatura}
            mine={minhaFatura}
            toReceive={aReceberFatura}
          />
          {Array.from(cardGroups.entries()).map(([key, { card, txs }]) => (
            <CardBillDetail
              key={key}
              card={card}
              transactions={txs}
              defaultExpanded={true}
              year={year}
              month={month}
              billPayments={billPayments}
              onPay={payCardBill}
              onUnpay={unpayCardBill}
            />
          ))}
        </>
      )}

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      )}

      {!loading && cardTx.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="rounded-full bg-muted p-4">
            <CreditCard className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            Nenhum lançamento no cartão para {billingLabel}
          </p>
          <Button size="sm" onClick={() => setTxOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar do cartão
          </Button>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setTxOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>

      <TransactionForm
        open={txOpen}
        onOpenChange={setTxOpen}
        defaultMethod="credit_card"
      />
    </div>
  )
}

function CardBillSummary({
  total,
  mine,
  toReceive,
}: {
  total: number
  mine: number
  toReceive: number
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Fatura Total
        </p>
        <p className="text-3xl font-bold tabular-nums">{formatBRL(total)}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Realmente Meu
          </p>
          <p className="text-xl font-bold">{formatBRL(mine)}</p>
          {total > 0 && (
            <p className="text-xs text-muted-foreground">
              {Math.round((mine / total) * 100)}% da fatura
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            A Receber
          </p>
          <p className={cn(
            'text-xl font-bold',
            toReceive > 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-muted-foreground',
          )}>
            {formatBRL(toReceive)}
          </p>
          {total > 0 && toReceive > 0 && (
            <p className="text-xs text-muted-foreground">
              {Math.round((toReceive / total) * 100)}% da fatura
            </p>
          )}
        </div>
      </div>
      {total > 0 && (
        <div className="h-2 rounded-full bg-muted overflow-hidden flex">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(mine / total) * 100}%` }}
          />
          <div
            className="h-full bg-amber-400 dark:bg-amber-600 transition-all"
            style={{ width: `${(toReceive / total) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

function CardBillDetail({
  card,
  transactions,
  defaultExpanded,
  year,
  month,
  billPayments,
  onPay,
  onUnpay,
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

  const recurring = transactions.filter(t => t.is_recurring)
  const nonRecurring = transactions.filter(t => !t.is_recurring)
  const totalTxs = transactions.reduce((s, t) => s + t.amount, 0)
  const totalMine = transactions.reduce((s, t) => s + t.my_amount, 0)

  const annualTotal = recurring.reduce((s, t) => s + t.my_amount, 0) * 12

  const payment = card
    ? billPayments.find(p => p.credit_card_id === card.id && p.billing_year === year && p.billing_month === month)
    : undefined
  const isPaid = !!payment

  async function handlePay() {
    if (!card) return
    setPaying(true)
    try {
      await onPay(card.id, year, month, totalMine, card.bank_account_id)
    } finally {
      setPaying(false)
    }
  }

  async function handleUnpay() {
    if (!card) return
    setPaying(true)
    try {
      await onUnpay(card.id, year, month)
    } finally {
      setPaying(false)
    }
  }

  return (
    <Card className={cn(isPaid && 'border-emerald-200 dark:border-emerald-900')}>
      <button
        className="w-full text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="flex items-center justify-between text-sm font-semibold">
            <div className="flex items-center gap-2">
              {card ? (
                <>
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: card.color }}
                  />
                  <span>{card.name}</span>
                  {isPaid && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">Sem cartão</span>
              )}
            </div>
            <div className="text-right">
              <span className={cn('font-bold', isPaid && 'text-emerald-700 dark:text-emerald-300')}>
                {formatBRL(totalMine)}
              </span>
              {totalTxs !== totalMine && (
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  ({formatBRL(totalTxs)} bruto)
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="pt-0 pb-4 space-y-4">
          {/* Due date info + pay button */}
          {card && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>
                  Fecha dia {card.closing_day} · Vence dia {card.due_day}
                </span>
              </div>
              {totalMine > 0 && (
                isPaid ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-emerald-700 border-emerald-300 dark:text-emerald-400"
                    onClick={handleUnpay}
                    disabled={paying}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Pago
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handlePay}
                    disabled={paying}
                  >
                    <Banknote className="h-3 w-3 mr-1" />
                    Pagar fatura
                  </Button>
                )
              )}
            </div>
          )}

          {/* Recurring subscriptions */}
          {recurring.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Assinaturas ({formatBRL(annualTotal)}/ano)
              </p>
              {recurring.map(tx => (
                <div key={tx.id} className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: tx.category?.color ? tx.category.color + '22' : '#6b728022',
                      color: tx.category?.color || '#6b7280',
                    }}
                  >
                    {tx.description.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.category?.name || 'Sem categoria'}
                      {tx.installment_count > 1 && ` · ${tx.installment_number}/${tx.installment_count}x`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatBRL(tx.my_amount)}</p>
                    {tx.type !== 'mine' && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 dark:text-amber-400">
                        {tx.type}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Non-recurring transactions */}
          {nonRecurring.length > 0 && (
            <div className="space-y-2">
              {recurring.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Outros Lançamentos
                </p>
              )}
              {nonRecurring.map(tx => (
                <div key={tx.id} className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: tx.category?.color ? tx.category.color + '22' : '#6b728022',
                      color: tx.category?.color || '#6b7280',
                    }}
                  >
                    {tx.description.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="capitalize">{formatDate(tx.purchase_date || tx.date)}</span>
                      {tx.category?.name && ` · ${tx.category.name}`}
                      {tx.installment_count > 1 && ` · ${tx.installment_number}/${tx.installment_count}x`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatBRL(tx.my_amount)}</p>
                    {tx.type !== 'mine' && (
                      <p className="text-xs text-muted-foreground">{formatBRL(tx.amount)} bruto</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {transactions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum lançamento
            </p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
