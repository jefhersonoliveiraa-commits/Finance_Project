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
          <div className="hidden md:block"><MonthSelector />
          </div><Button size="sm" onClick={() => setPlannerOpen(true)} className="gap-1.5">
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
