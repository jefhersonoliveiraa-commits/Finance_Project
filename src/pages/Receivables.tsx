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
        <div className="hidden md:block"><MonthSelector />
      </div></div>

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
