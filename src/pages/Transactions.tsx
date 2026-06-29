import { useState, useMemo } from 'react'
import { Plus, Search, Trash2, Edit2, Filter, Upload, RefreshCw, TrendingUp, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MonthSelector } from '@/components/layout/MonthSelector'
import { TransactionForm } from '@/components/TransactionForm'
import { IncomeForm } from '@/components/IncomeForm'
import { useFinance } from '@/context/FinanceContext'
import { formatBRL, formatDate } from '@/lib/format'
import { getCategoryIcon } from '@/lib/category-icons'
import { TYPE_LABELS } from '@/lib/types'
import type { Transaction, Income, TransactionMethod, TransactionType } from '@/lib/types'
import { cn } from '@/lib/utils'

type EntryKind = 'expense' | 'income'

interface Entry {
  id: string
  date: string
  kind: EntryKind
  expense?: Transaction
  income?: Income
}

interface DayGroup {
  date: string
  label: string
  subtotal: number
  entries: Entry[]
}

const METHOD_LABEL_SHORT: Record<TransactionMethod, string> = {
  credit_card: 'Crédito',
  pix: 'PIX',
  debit: 'Débito',
  cash: 'Dinheiro',
}

function dayLabel(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T12:00:00')
  d.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.getTime() === today.getTime()) return 'Hoje'
  if (d.getTime() === yesterday.getTime()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toLowerCase()
}

export function Transactions() {
  const { transactions, incomes, categories, people, loading, deleteTransaction, deleteIncome, stats, navigate } = useFinance()

  const [txOpen, setTxOpen] = useState(false)
  const [incOpen, setIncOpen] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [editInc, setEditInc] = useState<Income | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteKind, setDeleteKind] = useState<EntryKind>('expense')
  const [search, setSearch] = useState('')
  const [filterKind, setFilterKind] = useState<EntryKind | 'all'>('all')
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all')
  const [filterMethod, setFilterMethod] = useState<TransactionMethod | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterPerson, setFilterPerson] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const allEntries = useMemo<Entry[]>(() => {
    const expenses: Entry[] = transactions.map(tx => ({
      id: tx.id,
      date: tx.date,
      kind: 'expense' as const,
      expense: tx,
    }))
    const incs: Entry[] = incomes.map(inc => ({
      id: inc.id,
      date: inc.date,
      kind: 'income' as const,
      income: inc,
    }))
    return [...expenses, ...incs]
  }, [transactions, incomes])

  const filtered = useMemo(() => allEntries.filter(entry => {
    if (filterKind !== 'all' && entry.kind !== filterKind) return false
    if (entry.kind === 'expense') {
      const tx = entry.expense!
      if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false
      if (filterType !== 'all' && tx.type !== filterType) return false
      if (filterMethod !== 'all' && tx.method !== filterMethod) return false
      if (filterCategory !== 'all' && tx.category_id !== filterCategory) return false
      if (filterPerson !== 'all') {
        const hasP = tx.transaction_people?.some(tp => tp.person_id === filterPerson)
        if (!hasP) return false
      }
    } else {
      const inc = entry.income!
      if (search && !inc.description.toLowerCase().includes(search.toLowerCase())) return false
      if (filterType !== 'all') return false
      if (filterMethod !== 'all') return false
      if (filterCategory !== 'all') return false
      if (filterPerson !== 'all') return false
    }
    return true
  }), [allEntries, search, filterKind, filterType, filterMethod, filterCategory, filterPerson])

  const dayGroups = useMemo<DayGroup[]>(() => {
    const groupsMap = new Map<string, DayGroup>()
    for (const entry of filtered) {
      if (!groupsMap.has(entry.date)) {
        groupsMap.set(entry.date, {
          date: entry.date,
          label: dayLabel(entry.date),
          subtotal: 0,
          entries: [],
        })
      }
      const group = groupsMap.get(entry.date)!
      group.entries.push(entry)
      if (entry.kind === 'expense') {
        group.subtotal -= entry.expense!.my_amount
      } else {
        group.subtotal += entry.income!.amount
      }
    }
    return Array.from(groupsMap.values()).sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [filtered])

  function handleEditTx(tx: Transaction) {
    setEditTx(tx)
    setTxOpen(true)
  }

  function handleEditInc(inc: Income) {
    setEditInc(inc)
    setIncOpen(true)
  }

  async function handleDelete() {
    if (!deleteId) return
    if (deleteKind === 'expense') {
      await deleteTransaction(deleteId)
    } else {
      await deleteIncome(deleteId)
    }
    setDeleteId(null)
  }

  function confirmDelete(id: string, kind: EntryKind) {
    setDeleteId(id)
    setDeleteKind(kind)
  }

  const hasActiveFilters = filterKind !== 'all' || filterType !== 'all' || filterMethod !== 'all' || filterCategory !== 'all' || filterPerson !== 'all'

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Lançamentos</h1>
          <div className="hidden md:block"><MonthSelector className="mt-0.5" />
        </div></div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate('import')}>
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(v => !v)}
            className={cn(hasActiveFilters && 'text-primary')}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      {!loading && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm py-2.5 px-1.5 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Entrou</p>
            <p className="text-sm font-bold tabular-nums font-mono text-positive truncate">+{formatBRL(stats.totalIncome)}</p>
          </div>
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 py-2.5 px-1.5 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saiu</p>
            <p className="text-sm font-bold tabular-nums font-mono text-destructive truncate">&minus;{formatBRL(stats.gastoRealMeu)}</p>
          </div>
          <div className={cn(
            'rounded-2xl border py-2.5 px-1.5 min-w-0',
            stats.sobraReal >= 0
              ? 'border-positive/20 bg-positive/5'
              : 'border-destructive/20 bg-destructive/5',
          )}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saldo</p>
            <p className={cn(
              'text-sm font-bold tabular-nums font-mono truncate',
              stats.sobraReal >= 0 ? 'text-positive' : 'text-destructive',
            )}>
              {formatBRL(stats.sobraReal)}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar lançamento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 rounded-2xl bg-card/40 border-border"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-2">
          <div className="flex rounded-xl border border-border overflow-hidden text-xs">
            {([
              { v: 'all', label: 'Todos' },
              { v: 'expense', label: 'Gastos' },
              { v: 'income', label: 'Receitas' },
            ] as { v: EntryKind | 'all'; label: string }[]).map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setFilterKind(opt.v)}
                className={cn(
                  'flex-1 py-2 font-medium transition-colors',
                  filterKind === opt.v
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {filterKind !== 'income' && (
            <div className="grid grid-cols-2 gap-2">
              <Select value={filterType} onValueChange={v => setFilterType(v as TransactionType | 'all')}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="mine">Meu</SelectItem>
                  <SelectItem value="repasse">Repasse</SelectItem>
                  <SelectItem value="rateado">Rateado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterMethod} onValueChange={v => setFilterMethod(v as TransactionMethod | 'all')}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os métodos</SelectItem>
                  <SelectItem value="credit_card">Cartão</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="debit">Débito</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPerson} onValueChange={setFilterPerson}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Pessoa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as pessoas</SelectItem>
                  {people.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <ArrowUpDown className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            {search || hasActiveFilters
              ? 'Nenhum resultado encontrado'
              : 'Nenhum lançamento neste mês'}
          </p>
          <Button size="sm" onClick={() => { setEditTx(null); setTxOpen(true) }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo lançamento
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {dayGroups.map(group => (
            <div key={group.date} className="space-y-1">
              <div className="flex items-center justify-between px-1 pb-2 pt-1">
                <span className="text-xs font-semibold capitalize text-muted-foreground tracking-wide">
                  {group.label}
                </span>
                <span className={cn(
                  'text-xs font-bold tabular-nums font-mono',
                  group.subtotal >= 0 ? 'text-positive' : 'text-destructive',
                )}>
                  {group.subtotal >= 0 ? '+' : ''}{formatBRL(group.subtotal)}
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-md overflow-hidden">
                {group.entries.map((entry, idx) => (
                  entry.kind === 'expense' ? (
                    <ExpenseRow
                      key={entry.id}
                      tx={entry.expense!}
                      isLast={idx === group.entries.length - 1}
                      onEdit={() => handleEditTx(entry.expense!)}
                      onDelete={() => confirmDelete(entry.id, 'expense')}
                    />
                  ) : (
                    <IncomeRow
                      key={entry.id}
                      income={entry.income!}
                      isLast={idx === group.entries.length - 1}
                      onEdit={() => handleEditInc(entry.income!)}
                      onDelete={() => confirmDelete(entry.id, 'income')}
                    />
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      

      <TransactionForm
        open={txOpen}
        onOpenChange={open => { setTxOpen(open); if (!open) setEditTx(null) }}
        editTransaction={editTx}
      />
      <IncomeForm
        open={incOpen}
        onOpenChange={open => { setIncOpen(open); if (!open) setEditInc(null) }}
        editIncome={editInc}
      />

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleteKind === 'income' ? 'receita' : 'lançamento'}?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ExpenseRow({
  tx,
  isLast,
  onEdit,
  onDelete,
}: {
  tx: Transaction
  isLast: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const Icon = getCategoryIcon(tx.category)
  const isCardRecurring = tx.method === 'credit_card' && tx.is_recurring
  const peopleText = (tx.transaction_people ?? [])
    .map(tp => tp.person?.name)
    .filter(Boolean)
    .join(', ')

  return (
    <div className={cn('transition-colors', !isLast && 'border-b border-border/60')}>
      <button
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-icon-bg">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm truncate">{tx.description}</p>
            {isCardRecurring && (
              <RefreshCw className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {tx.category?.name || 'Sem categoria'} · {METHOD_LABEL_SHORT[tx.method]}
            {peopleText && ` · com ${peopleText}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <ExpenseAmountDisplay tx={tx} />
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 pt-1">
          {tx.transaction_people && tx.transaction_people.length > 0 && (
            <div className="space-y-2">
              {tx.transaction_people.map(tp => (
                <div key={tp.id} className="flex items-center gap-2.5">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-accent flex items-center justify-center text-[11px] font-bold text-primary">
                    {(tp.person?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{tp.person?.name || 'Pessoa'}</p>
                    <p className="text-[11px] text-muted-foreground">deve {formatBRL(tp.amount)}</p>
                  </div>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-medium',
                    tp.reimbursement_status === 'received'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                  )}>
                    {tp.reimbursement_status === 'received' ? 'Recebido' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          )}
          {tx.notes && (
            <p className="text-xs text-muted-foreground italic px-1">{tx.notes}</p>
          )}
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs rounded-xl" onClick={onEdit}>
              <Edit2 className="h-3 w-3 mr-1" /> Editar
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10" onClick={onDelete}>
              <Trash2 className="h-3 w-3 mr-1" /> Excluir
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function IncomeRow({
  income,
  isLast,
  onEdit,
  onDelete,
}: {
  income: Income
  isLast: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn('transition-colors', !isLast && 'border-b border-border/60')}>
      <button
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-positive/15">
          <TrendingUp className="h-5 w-5 text-positive" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm truncate">{income.description}</p>
            {income.is_recurring && (
              <RefreshCw className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            Receita{income.is_recurring ? ' · recorrente' : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-bold text-sm tabular-nums font-mono text-positive">
            +{formatBRL(income.amount)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 pt-1">
          <p className="text-xs text-muted-foreground">{formatDate(income.date)}</p>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs rounded-xl" onClick={onEdit}>
              <Edit2 className="h-3 w-3 mr-1" /> Editar
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10" onClick={onDelete}>
              <Trash2 className="h-3 w-3 mr-1" /> Excluir
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ExpenseAmountDisplay({ tx }: { tx: Transaction }) {
  if (tx.type === 'rateado') {
    return (
      <div className="flex flex-col items-end">
        <span className="font-bold text-sm tabular-nums font-mono text-destructive">−{formatBRL(tx.my_amount)}</span>
        <span className="text-[11px] text-muted-foreground">de {formatBRL(tx.amount)}</span>
        <span className="mt-0.5 inline-flex items-center rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
          {TYPE_LABELS[tx.type]}
        </span>
      </div>
    )
  }

  if (tx.type === 'repasse') {
    return (
      <div className="flex flex-col items-end">
        <span className="font-bold text-sm tabular-nums font-mono text-muted-foreground">R$ 0</span>
        <span className="text-[11px] text-muted-foreground">seu</span>
        <span className="mt-0.5 inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
          {TYPE_LABELS[tx.type]}
        </span>
      </div>
    )
  }

  return (
    <span className="font-bold text-sm tabular-nums font-mono text-destructive">
      −{formatBRL(tx.my_amount)}
    </span>
  )
}
