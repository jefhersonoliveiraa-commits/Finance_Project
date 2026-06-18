import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Check, Clock } from 'lucide-react'
import { MonthSelector } from '@/components/layout/MonthSelector'
import { useFinance } from '@/context/FinanceContext'
import { formatBRL, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PersonReceivable } from '@/lib/types'

export function Receivables() {
  const { loading, stats, markReimbursed, markUnreimbursed } = useFinance()
  const { aReceberByPerson, aReceberPending, aReceberReceived } = stats

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">A Receber</h1>
        <MonthSelector className="mt-0.5" />
      </div>

      {/* Summary */}
      {loading ? (
        <Skeleton className="h-20 rounded-2xl" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              Pendente
            </p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">
              {formatBRL(aReceberPending)}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 p-4">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
              Recebido
            </p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
              {formatBRL(aReceberReceived)}
            </p>
          </div>
        </div>
      )}

      {/* By person */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : aReceberByPerson.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-2xl">✓</p>
          <p className="text-sm font-medium">Tudo recebido!</p>
          <p className="text-xs text-muted-foreground">
            Nenhum valor pendente neste mês.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
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
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {person.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-base font-semibold">{person.name}</span>
          </div>
          <div className="text-right">
            {totalPending > 0 && (
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {formatBRL(totalPending)} pendente
              </p>
            )}
            {totalReceived > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {formatBRL(totalReceived)} recebido
              </p>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 space-y-2">
        {items.map(({ transactionPerson: tp, transaction: tx }) => (
          <div
            key={tp.id}
            className={cn(
              'flex items-start gap-3 rounded-lg p-2.5',
              tp.reimbursement_status === 'pending'
                ? 'bg-amber-50 dark:bg-amber-950/20'
                : 'bg-emerald-50/50 dark:bg-emerald-950/10 opacity-70',
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{tx.description}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(tx.date)} · {tx.type === 'repasse' ? 'Repasse' : 'Rateado'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={cn(
                  'text-sm font-semibold',
                  tp.reimbursement_status === 'pending'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400',
                )}
              >
                {formatBRL(tp.amount)}
              </span>
              {tp.reimbursement_status === 'pending' ? (
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 border-amber-300 hover:bg-amber-50 dark:border-amber-700"
                  onClick={() => onMarkReceived(tp.id)}
                  title="Marcar como recebido"
                >
                  <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
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
      </CardContent>
    </Card>
  )
}
