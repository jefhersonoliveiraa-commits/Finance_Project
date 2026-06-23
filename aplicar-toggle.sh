#!/usr/bin/env bash
#
# aplicar-toggle.sh
# Adiciona o toggle "Apenas meu / Visao geral" ao Dashboard.
# Alterna o dashboard inteiro entre my_amount (so o que e seu) e
# amount/bruto (tudo que passou pela conta): hero, gasto, sobra,
# grafico de categorias e quebra por metodo. Sem mexer em calculo
# nem em banco. Valida com build e da push no main.
#
# Uso (na raiz do repo, no Codespace):
#   bash aplicar-toggle.sh
#
set -euo pipefail
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "ERRO: rode na raiz do repositorio git."; exit 1; }
cd "$(git rev-parse --show-toplevel)"

STAMP="$(date +%Y%m%d-%H%M%S)"
TAG="backup/pre-toggle-${STAMP}"
git tag "$TAG"
echo "==> Backup criado na tag: $TAG (reverter: git reset --hard $TAG)"

echo "==> Escrevendo src/pages/Dashboard.tsx (com o toggle)..."
cat > src/pages/Dashboard.tsx << 'DASHBOARD_TSX_EOF'
import { useState } from 'react'
import {
  Plus,
  CreditCard,
  ArrowRight,
  CalendarDays,
  Users,
  Wallet,
  Repeat,
  Target,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MonthSelector } from '@/components/layout/MonthSelector'
import { TransactionForm } from '@/components/TransactionForm'
import { IncomeForm } from '@/components/IncomeForm'
import { TransferForm } from '@/components/TransferForm'
import { useFinance } from '@/context/FinanceContext'
import { formatBRL, formatDate } from '@/lib/format'
import { billingPeriodLabel } from '@/lib/billing'
import { getCategoryIcon } from '@/lib/category-icons'
import { cn } from '@/lib/utils'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { PieChart, Pie, Cell } from 'recharts'
import type { ChartConfig } from '@/components/ui/chart'
import { METHOD_LABELS } from '@/lib/types'
import type { CategoryStat, BankAccount, Transaction, PersonReceivable, BudgetLimit } from '@/lib/types'

export function Dashboard() {
  const { transactions, incomes, loading, stats, bankAccounts, futureBills, budgetLimits, navigate } = useFinance()
  const [txOpen, setTxOpen] = useState(false)
  const [incOpen, setIncOpen] = useState(false)
  const [txfOpen, setTxfOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'mine' | 'overview'>('mine')

  const {
    gastoBruto,
    gastoRealMeu,
    totalIncome,
    aReceberPending,
    aReceberByPerson,
    byCategory,
    byMethod,
    cardBills,
    subscriptions,
    annualSubscriptionsTotal,
  } = stats

  const recentTx = transactions.slice(0, 5)
  const totalBalance = bankAccounts.reduce((s, a) => s + a.current_balance, 0)
  const futureCommitted = futureBills.reduce((s, b) => s + b.myAmount, 0)
  const pendingPeople = aReceberByPerson.filter(p => p.totalPending > 0)
  const isMine = viewMode === 'mine'
  const displayedGasto = isMine ? gastoRealMeu : gastoBruto
  const displayedSobra = totalIncome - displayedGasto
  const positive = displayedSobra >= 0

  // Budget summary
  const limitMap = new Map(budgetLimits.map((b: BudgetLimit) => [b.category_id, b.monthly_limit]))
  const budgetCategories = byCategory.filter((c: CategoryStat) => c.category && limitMap.has(c.category.id))
  const totalBudgeted = budgetCategories.reduce((s: number, c: CategoryStat) => s + limitMap.get(c.category!.id)!, 0)
  const totalSpentOnBudgeted = budgetCategories.reduce((s: number, c: CategoryStat) => s + c.myAmount, 0)
  const budgetOverCount = budgetCategories.filter((c: CategoryStat) => c.myAmount > limitMap.get(c.category!.id)!).length

  const chartData = byCategory.slice(0, 6).map((c: CategoryStat) => ({
    name: c.label,
    value: isMine ? c.myAmount : c.amount,
    color: c.color,
  }))

  const chartConfig: ChartConfig = {
    value: { label: 'Gasto' },
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Finanças</h1>
          <MonthSelector className="mt-0.5" />
        </div>
        <div className="flex gap-2">
          {bankAccounts.length >= 2 && (
            <Button size="sm" variant="ghost" onClick={() => setTxfOpen(true)} title="Transferir">
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setIncOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Receita
          </Button>
        </div>
      </div>

      {/* Toggle: Apenas meu / Visão geral */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setViewMode('mine')}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
              isMine ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
            )}
          >
            Apenas meu
          </button>
          <button
            type="button"
            onClick={() => setViewMode('overview')}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
              !isMine ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
            )}
          >
            Visão geral
          </button>
        </div>
        <span className="text-[11px] text-tertiary">
          {isMine ? 'Só o que é seu' : 'Tudo que passou pela conta'}
        </span>
      </div>

      {/* HERO — Sobra Real */}
      {loading ? (
        <Skeleton className="h-40 rounded-3xl" />
      ) : (
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{isMine ? 'Sobra real do mês' : 'Sobra bruta do mês'}</span>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{
                background: positive ? 'var(--positive)' : 'var(--destructive)',
                color: positive ? 'var(--positive-foreground)' : 'var(--destructive-foreground)',
              }}
            >
              {positive ? 'no azul' : 'no vermelho'}
            </span>
          </div>
          <p
            className={cn(
              'mt-3 font-mono text-[2.75rem] font-bold tabular-nums leading-none',
              positive ? 'text-foreground' : 'text-destructive',
            )}
          >
            {formatBRL(displayedSobra)}
          </p>
          <div className="mt-6 flex items-end justify-between border-t border-border pt-4">
            <div>
              <p className="text-[11px] text-tertiary">Entrou</p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-positive tabular-nums">
                +{formatBRL(totalIncome)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-tertiary">{isMine ? 'Gasto seu' : 'Gasto bruto'}</p>
              <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums">
                {formatBRL(displayedGasto)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Secondary metrics */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <SmallMetric label={isMine ? 'Gasto bruto' : 'Gasto seu'} value={isMine ? gastoBruto : gastoRealMeu} />
          <SmallMetric label="A receber" value={aReceberPending} highlight={aReceberPending > 0} />
          <SmallMetric label="Próx. faturas" value={futureCommitted} />
        </div>
      )}

      {/* Budget quick summary */}
      {!loading && budgetLimits.length > 0 && (
        <button
          type="button"
          className="w-full text-left rounded-2xl border border-border bg-card p-4 active:opacity-80 transition-opacity"
          onClick={() => navigate('budget')}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Target className="h-4 w-4" />
              Orçamento do Mês
            </span>
            {budgetOverCount > 0 && (
              <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[11px] font-semibold">
                {budgetOverCount} estouro{budgetOverCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {budgetCategories.slice(0, 3).map((c: CategoryStat) => {
            const limit = limitMap.get(c.category!.id)!
            const pct = Math.min((c.myAmount / limit) * 100, 100)
            const over = c.myAmount > limit
            const warn = !over && c.myAmount / limit >= 0.8
            return (
              <div key={c.category!.id} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-muted-foreground w-24 truncate">{c.category!.name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      over ? 'bg-destructive' : warn ? 'bg-amber-500' : 'bg-emerald-500',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums font-mono text-muted-foreground w-16 text-right">
                  {formatBRL(c.myAmount)}
                </span>
              </div>
            )
          })}
          {budgetCategories.length > 3 && (
            <p className="text-[11px] text-muted-foreground mt-2">
              +{budgetCategories.length - 3} categoria{budgetCategories.length - 3 !== 1 ? 's' : ''} mais — ver tudo
            </p>
          )}
          {budgetCategories.length <= 3 && (
            <div className="flex justify-between border-t border-border pt-2 mt-1">
              <span className="text-xs text-muted-foreground">Total orçado</span>
              <span className="font-mono text-xs font-semibold tabular-nums">
                {formatBRL(totalSpentOnBudgeted)} / {formatBRL(totalBudgeted)}
              </span>
            </div>
          )}
        </button>
      )}

      {/* Account balances */}
      {!loading && bankAccounts.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Contas
            </span>
            <span className="font-mono text-sm font-bold tabular-nums">{formatBRL(totalBalance)}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {bankAccounts.map(acc => (
              <AccountBalanceChip key={acc.id} account={acc} />
            ))}
          </div>
        </div>
      )}

      {/* A RECEBER — prominent */}
      {!loading && pendingPeople.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Users className="h-4 w-4" />
              Quem te deve
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pb-4">
            {pendingPeople.map((pr: PersonReceivable) => (
              <div key={pr.person.id} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: 'var(--icon-bg)', color: 'var(--accent-foreground)' }}>
                  {pr.person.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 truncate text-sm font-medium">{pr.person.name}</span>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold tabular-nums text-amber-400">
                    {formatBRL(pr.totalPending)}
                  </p>
                  <p className="text-[10px] text-tertiary">pendente</p>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-2.5">
              <span className="text-xs text-muted-foreground">Total a receber</span>
              <span className="font-mono text-sm font-bold tabular-nums text-amber-400">
                {formatBRL(aReceberPending)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card bills summary */}
      {!loading && cardBills.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Faturas do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {cardBills.map(bill => (
              <div key={bill.card.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bill.card.color }} />
                  <span className="text-sm">{bill.card.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-semibold tabular-nums">{formatBRL(bill.myAmount)}</span>
                  {bill.total !== bill.myAmount && (
                    <span className="ml-1 text-xs text-muted-foreground">({formatBRL(bill.total)} bruto)</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Future bills panel */}
      {!loading && futureBills.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Próximas Faturas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {futureBills.slice(0, 4).map(bill => (
              <div key={`${bill.year}-${bill.month}`} className="flex items-center justify-between">
                <span className="text-sm capitalize text-muted-foreground">
                  {billingPeriodLabel(bill.year, bill.month)}
                </span>
                <div className="text-right">
                  <span className="font-mono text-sm font-semibold tabular-nums">{formatBRL(bill.myAmount)}</span>
                  {bill.fromInstallments > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">{formatBRL(bill.fromInstallments)} parc.</span>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-xs text-muted-foreground">Total comprometido</span>
              <span className="font-mono text-sm font-bold tabular-nums text-primary">
                {formatBRL(futureCommitted)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions annual summary */}
      {!loading && subscriptions.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Repeat className="h-4 w-4" />
              Assinaturas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {subscriptions.slice(0, 4).map((sub, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  {sub.card && (
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: sub.card.color }} />
                  )}
                  <span className="truncate">{sub.description}</span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-mono font-medium tabular-nums">{formatBRL(sub.monthlyAmount)}/mês</span>
                  <span className="ml-1 text-xs text-muted-foreground">({formatBRL(sub.annualAmount)}/ano)</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-xs text-muted-foreground">Total anual</span>
              <span className="font-mono text-sm font-bold tabular-nums text-primary">{formatBRL(annualSubscriptionsTotal)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category donut chart - Pierre style */}
      {!loading && chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center gap-4">
              <div className="relative h-[140px] w-[140px] shrink-0">
                <ChartContainer config={chartConfig} className="h-[140px] w-[140px]">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatBRL(Number(v))} />} />
                  </PieChart>
                </ChartContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-tertiary">Total</span>
                  <span className="font-mono text-sm font-bold tabular-nums">{formatBRL(displayedGasto)}</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                {byCategory.slice(0, 5).map((c: CategoryStat) => (
                  <div key={c.label} className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="flex-1 truncate text-xs text-muted-foreground">{c.label}</span>
                    <span className="font-mono text-xs font-medium tabular-nums">{formatBRL(isMine ? c.myAmount : c.amount)}</span>
                  </div>
                ))}
                {byCategory.length > 5 && (
                  <p className="text-[10px] text-tertiary pl-4">+{byCategory.length - 5} mais</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Method breakdown - Pierre style */}
      {!loading && byMethod.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Por Método de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            {byMethod.map(m => {
              const mVal = isMine ? m.myAmount : m.amount
              const pct = displayedGasto > 0 ? (mVal / displayedGasto) * 100 : 0
              return (
                <div key={m.method}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatBRL(mVal)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-tertiary mt-0.5 text-right">{pct.toFixed(0)}%</p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent transactions */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2 pt-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Últimos Lançamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : recentTx.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum lançamento neste mês</p>
          ) : (
            <div>
              {recentTx.map(tx => (
                <RecentRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incomes */}
      {!loading && incomes.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Receitas do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {incomes.map(inc => (
              <div key={inc.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{inc.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(inc.date)}{inc.is_recurring && ' · recorrente'}
                  </p>
                </div>
                <span className="ml-3 shrink-0 font-mono text-sm font-semibold tabular-nums text-positive">
                  +{formatBRL(inc.amount)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* FAB */}
      <button
        onClick={() => setTxOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>

      <TransactionForm open={txOpen} onOpenChange={setTxOpen} />
      <IncomeForm open={incOpen} onOpenChange={setIncOpen} />
      <TransferForm open={txfOpen} onOpenChange={setTxfOpen} />
    </div>
  )
}

function AccountBalanceChip({ account }: { account: BankAccount }) {
  return (
    <div className="min-w-[120px] shrink-0 rounded-xl border border-border bg-secondary p-3">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: account.color }} />
        <span className="truncate text-xs font-medium">{account.name}</span>
      </div>
      <p className={cn('mt-1 font-mono text-base font-bold tabular-nums', account.current_balance >= 0 ? 'text-foreground' : 'text-destructive')}>
        {formatBRL(account.current_balance)}
      </p>
    </div>
  )
}

function SmallMetric({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-2.5 text-center">
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 font-mono text-sm font-bold tabular-nums', highlight && 'text-amber-400')}>
        {formatBRL(value)}
      </p>
    </div>
  )
}

function RecentRow({ tx }: { tx: Transaction }) {
  const Icon = getCategoryIcon(tx.category)
  return (
    <div className="flex items-center gap-3 border-b border-border/50 py-2.5 last:border-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]" style={{ background: 'var(--icon-bg)', color: 'var(--accent-foreground)' }}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          {tx.description}
          {tx.method === 'credit_card' && tx.is_recurring && (
            <Repeat className="h-3 w-3 shrink-0 text-tertiary" />
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {(tx.category?.name || 'Sem categoria')} · {METHOD_LABELS[tx.method]}
          {formatDate(tx.date) ? ` · ${formatDate(tx.date)}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {tx.type === 'repasse' ? (
          <>
            <p className="font-mono text-sm font-medium tabular-nums text-tertiary">R$ 0</p>
            <p className="text-[10px] text-tertiary">seu</p>
          </>
        ) : tx.type === 'rateado' ? (
          <>
            <p className="font-mono text-sm font-medium tabular-nums">−{formatBRL(tx.my_amount)}</p>
            <p className="text-[10px] text-tertiary">de {formatBRL(tx.amount)}</p>
          </>
        ) : (
          <p className="font-mono text-sm font-medium tabular-nums">−{formatBRL(tx.my_amount)}</p>
        )}
      </div>
    </div>
  )
}
DASHBOARD_TSX_EOF

echo "==> Garantindo dependencias..."
[ -d node_modules ] || npm install

echo "==> BUILD GATE (tsc + vite build)..."
if ! npm run build; then
  echo ""
  echo "############################################################"
  echo "# BUILD FALHOU. Nada foi commitado nem enviado.            #"
  echo "# Reverter: git reset --hard $TAG"
  echo "############################################################"
  exit 1
fi

echo "==> Build OK. Commitando e enviando para o main..."
git config user.email >/dev/null 2>&1 || git config user.email "jefherson@local"
git config user.name  >/dev/null 2>&1 || git config user.name  "Jefherson"
git add -A
git commit -m "feat: toggle Apenas meu / Visao geral no dashboard (alterna my_amount vs bruto)"
git push origin HEAD:main

echo ""
echo "############################################################"
echo "# SUCESSO. Toggle aplicado e enviado para o main.          #"
echo "# Rode 'npm run dev' para ver. Backup na tag: $TAG"
echo "############################################################"
