import { useState } from 'react'
import {
  CreditCard,
  CalendarDays,
  Users,
  Wallet,
  Repeat,
  Target,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MonthSelector } from '@/components/layout/MonthSelector'
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
  const checkingAccounts = bankAccounts.filter(a => a.account_type !== 'investment')
  const investmentAccounts = bankAccounts.filter(a => a.account_type === 'investment')
  const totalBalance = checkingAccounts.reduce((s, a) => s + a.current_balance, 0)
  const totalInvested = investmentAccounts.reduce((s, a) => s + a.current_balance, 0)
  const futureCommitted = futureBills.reduce((s, b) => s + b.myAmount, 0)
  const pendingPeople = aReceberByPerson.filter(p => p.totalPending > 0)
  const isMine = viewMode === 'mine'
  const displayedGasto = isMine ? gastoRealMeu : gastoBruto
  const displayedSobra = totalIncome - displayedGasto
  const positive = displayedSobra >= 0

  // Margem projetada — próximos 3 meses (renda recorrente vs compromissos)
  const recurringIncome = incomes.filter(i => i.is_recurring).reduce((s, i) => s + i.amount, 0)
  const recurringSpend = transactions
    .filter(t => t.is_recurring)
    .reduce((s, t) => s + (isMine ? t.my_amount : t.amount), 0)
  const today = new Date()
  const forwardMonths = [1, 2, 3].map(offset => {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const fb = futureBills.find(f => f.year === year && f.month === month)
    const installments = fb ? (isMine ? fb.myAmount : fb.total) : 0
    const committedTotal = installments + recurringSpend
    const label = d.toLocaleDateString('pt-BR', { month: 'long' })
    return {
      year,
      month,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      committedTotal,
      margin: recurringIncome - committedTotal,
    }
  })
  const showForward = recurringIncome > 0 || forwardMonths.some(m => m.committedTotal > 0)

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
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral das suas finanças</p>
        </div>
        <div className="hidden md:block"><MonthSelector />
      </div></div>

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
        <span className="hidden sm:block text-[11px] text-tertiary">
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

      {/* Margem projetada — próximos 3 meses */}
      {!loading && showForward && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Margem projetada · próximos 3 meses
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {forwardMonths.map(m => {
              const pos = m.margin >= 0
              return (
                <div key={`${m.year}-${m.month}`} className="rounded-xl border border-border bg-secondary/40 p-3">
                  <p className="text-[11px] text-tertiary">{m.label}</p>
                  <p
                    className={cn(
                      'mt-1 font-mono text-base font-bold tabular-nums leading-none',
                      pos ? 'text-positive' : 'text-destructive',
                    )}
                  >
                    {formatBRL(m.margin)}
                  </p>
                  <p className="mt-1.5 text-[10px] text-tertiary">
                    comprometido {formatBRL(m.committedTotal)}
                  </p>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[10px] leading-snug text-tertiary">
            Renda recorrente de {formatBRL(recurringIncome)}/mês menos parcelas e assinaturas já comprometidas. Antes do gasto variável.
          </p>
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

      {/* Account balances (contas correntes) */}
      {!loading && checkingAccounts.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Contas
            </span>
            <span className="font-mono text-sm font-bold tabular-nums">{formatBRL(totalBalance)}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {checkingAccounts.map(acc => (
              <AccountBalanceChip key={acc.id} account={acc} />
            ))}
          </div>
        </div>
      )}

      {/* Investimentos (separados das contas) */}
      {!loading && investmentAccounts.length > 0 && (
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
              <TrendingUp className="h-4 w-4" />
              Investimentos
            </span>
            <span className="font-mono text-sm font-bold tabular-nums text-accent-foreground">{formatBRL(totalInvested)}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {investmentAccounts.map(acc => (
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
