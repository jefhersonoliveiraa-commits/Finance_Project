import { useState, useMemo } from 'react'
import { Target, Plus, Pencil, Trash2, AlertTriangle, ClipboardCopy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  ChartContainer,
} from '@/components/ui/chart'
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
  if (status === 'warning') return 'bg-amber-500'
  return 'bg-emerald-500'
}

function getStatusTextColor(status: BudgetStatus) {
  if (status === 'over') return 'text-destructive'
  if (status === 'warning') return 'text-amber-500'
  return 'text-emerald-400'
}

export function BudgetPage() {
  const {
    stats,
    budgetLimits,
    categories,
    loading,
    deleteBudgetLimit,
    setBudgetLimit,
    setBudgetLimitsInBatch,
    copyBudgetFromMonth,
    selectedMonth,
  } = useFinance()

  const [plannerOpen, setPlannerOpen] = useState(false)
  const [editDialogCat, setEditDialogCat] = useState<Category | null>(null)

  const year = selectedMonth.getFullYear()
  const month = selectedMonth.getMonth() + 1

  const { byCategory } = stats
  const limitMap = new Map(budgetLimits.map((b) => [b.category_id, b.monthly_limit]))

  const categoriesWithLimit = byCategory
    .filter((c) => c.category && limitMap.has(c.category.id))
    .map((c) => ({
      ...c,
      limit: limitMap.get(c.category!.id)!,
    }))
    .sort((a, b) => b.myAmount / b.limit - a.myAmount / a.limit)

  // Also include categories that have a limit but no spending yet
  const categoriesWithLimitNoSpend = categories
    .filter(c => limitMap.has(c.id) && !byCategory.some(bc => bc.category?.id === c.id))
    .map(c => ({
      category: c,
      myAmount: 0,
      amount: 0,
      limit: limitMap.get(c.id)!,
      label: c.name,
      color: c.color,
    }))

  const allBudgeted = [...categoriesWithLimit, ...categoriesWithLimitNoSpend]

  const categoriesWithoutLimit = byCategory.filter(
    (c) => !c.category || !limitMap.has(c.category.id),
  )

  const totalBudgeted = allBudgeted.reduce((s, c) => s + c.limit, 0)
  const totalSpentOnBudgeted = allBudgeted.reduce((s, c) => s + c.myAmount, 0)
  const overCount = allBudgeted.filter((c) => c.myAmount > c.limit).length
  const budgetPct = totalBudgeted > 0 ? Math.min((totalSpentOnBudgeted / totalBudgeted) * 100, 100) : 0

  const handleDelete = async (categoryId: string, name: string) => {
    try {
      await deleteBudgetLimit(categoryId, year, month)
      toast.success(`Limite de "${name}" removido`)
    } catch {
      toast.error('Erro ao remover limite')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  // Donut chart data
  const spent = Math.min(totalSpentOnBudgeted, totalBudgeted)
  const remaining = Math.max(totalBudgeted - totalSpentOnBudgeted, 0)
  const donutData = totalBudgeted > 0
    ? [
        { name: 'gasto', value: spent },
        { name: 'restante', value: remaining },
      ]
    : [{ name: 'vazio', value: 1 }]

  const donutConfig: ChartConfig = {
    gasto: { label: 'Gasto', color: totalSpentOnBudgeted > totalBudgeted ? 'var(--destructive)' : 'var(--primary)' },
    restante: { label: 'Restante', color: 'var(--muted)' },
    vazio: { label: '', color: 'var(--muted)' },
  }

  const overallStatus = getBudgetStatus(totalSpentOnBudgeted, totalBudgeted || 1)

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Orcamento</h1>
          <MonthSelector className="mt-0.5" />
        </div>
        <Button size="sm" onClick={() => setPlannerOpen(true)} className="gap-1.5">
          <Target className="h-3.5 w-3.5" />
          Planejar
        </Button>
      </div>

      {/* Donut + Summary */}
      {totalBudgeted > 0 && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              {/* Donut chart */}
              <div className="relative shrink-0">
                <ChartContainer config={donutConfig} className="h-[120px] w-[120px]">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={55}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {donutData.map((entry, idx) => (
                        <Cell key={idx} fill={`var(--color-${entry.name})`} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn('text-lg font-bold tabular-nums', getStatusTextColor(overallStatus))}>
                    {Math.round(budgetPct)}%
                  </span>
                </div>
              </div>

              {/* Summary text */}
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold tracking-tight tabular-nums">
                  {formatBRL(totalSpentOnBudgeted)}
                </p>
                <p className="text-sm text-muted-foreground">
                  de {formatBRL(totalBudgeted)} orcado
                </p>
                <div className="flex items-center gap-3 mt-2">
                  {totalSpentOnBudgeted <= totalBudgeted ? (
                    <span className="text-xs font-medium text-emerald-400">
                      sobra {formatBRL(totalBudgeted - totalSpentOnBudgeted)}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-destructive">
                      excedeu {formatBRL(totalSpentOnBudgeted - totalBudgeted)}
                    </span>
                  )}
                  {overCount > 0 && (
                    <Badge variant="destructive" className="gap-1 text-[10px]">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {overCount} estouro{overCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state - no budgets */}
      {totalBudgeted === 0 && byCategory.length > 0 && (
        <div className="flex flex-col items-center text-center py-12 gap-3">
          <div className="rounded-full bg-muted p-4">
            <Target className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="font-medium">Nenhum limite definido</p>
          <p className="text-sm text-muted-foreground max-w-[240px]">
            Toque em "Planejar" para definir limites de gasto por categoria
          </p>
          <Button size="sm" onClick={() => setPlannerOpen(true)} className="mt-2">
            <Target className="h-3.5 w-3.5 mr-1.5" />
            Planejar mes
          </Button>
        </div>
      )}

      {totalBudgeted === 0 && byCategory.length === 0 && (
        <div className="flex flex-col items-center text-center py-16 gap-3">
          <Target className="h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">Nenhum gasto neste mes</p>
          <p className="text-sm text-muted-foreground/70">
            Os limites aparecem aqui conforme voce gasta
          </p>
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
              <Card key={cat.id} className="border-0 shadow-sm">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: cat.color || '#6b7280' }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-sm truncate">{cat.name}</span>
                        <span className="text-sm font-semibold shrink-0 tabular-nums">
                          {formatBRL(myAmount)}
                          <span className="text-xs font-normal text-muted-foreground">
                            {' '}/ {formatBRL(limit)}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditDialogCat(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(cat.id, cat.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn('h-full rounded-full transition-all', getProgressColor(status))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between mt-1 text-[11px]">
                    <span className={cn('font-medium', getStatusTextColor(status))}>
                      {Math.round(pct)}%
                    </span>
                    {myAmount <= limit ? (
                      <span className="text-muted-foreground">
                        falta {formatBRL(limit - myAmount)}
                      </span>
                    ) : (
                      <span className="text-destructive font-medium">
                        +{formatBRL(myAmount - limit)} acima
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Categories without limit */}
      {categoriesWithoutLimit.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
            Sem limite
          </h2>
          {categoriesWithoutLimit.map(({ category, myAmount }) => {
            const Icon = getCategoryIcon(category)
            return (
              <Card key={category?.id || '__none__'} className="border-0 shadow-sm">
                <CardContent className="py-2.5 flex items-center gap-3">
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: category?.color || '#6b7280' }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">
                    {category?.name || 'Sem categoria'}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                    {formatBRL(myAmount)}
                  </span>
                  {category && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs shrink-0 gap-1"
                      onClick={() => setEditDialogCat(category)}
                    >
                      <Plus className="h-3 w-3" />
                      Limite
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit single limit dialog */}
      {editDialogCat && (
        <EditLimitDialog
          open={!!editDialogCat}
          onClose={() => setEditDialogCat(null)}
          category={editDialogCat}
          currentLimit={limitMap.get(editDialogCat.id)}
          year={year}
          month={month}
          onSave={setBudgetLimit}
        />
      )}

      {/* Batch Planner Sheet */}
      <BudgetPlannerSheet
        open={plannerOpen}
        onClose={() => setPlannerOpen(false)}
        categories={categories}
        budgetLimits={budgetLimits}
        year={year}
        month={month}
        onSaveBatch={setBudgetLimitsInBatch}
        onCopyFromPrevious={copyBudgetFromMonth}
      />
    </div>
  )
}

// --- Edit single limit dialog ---
function EditLimitDialog({
  open,
  onClose,
  category,
  currentLimit,
  year,
  month,
  onSave,
}: {
  open: boolean
  onClose: () => void
  category: Category
  currentLimit?: number
  year: number
  month: number
  onSave: (categoryId: string, limit: number, year: number, month: number) => Promise<void>
}) {
  const [value, setValue] = useState(currentLimit ? String(currentLimit) : '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const num = parseFloat(value.replace(',', '.'))
    if (!num || num <= 0) {
      toast.error('Informe um limite valido')
      return
    }
    setSaving(true)
    try {
      await onSave(category.id, num, year, month)
      toast.success('Limite salvo')
      onClose()
    } catch {
      toast.error('Erro ao salvar limite')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white text-xs"
              style={{ backgroundColor: category.color || '#6b7280' }}
            >
              {(() => {
                const Icon = getCategoryIcon(category)
                return <Icon className="h-3.5 w-3.5" />
              })()}
            </span>
            {currentLimit ? 'Editar limite' : 'Definir limite'} — {category.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label htmlFor="limit-value" className="text-sm font-medium">
            Limite mensal (R$)
          </Label>
          <Input
            id="limit-value"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Ex: 500,00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1.5"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Batch planner sheet ---
function BudgetPlannerSheet({
  open,
  onClose,
  categories,
  budgetLimits,
  year,
  month,
  onSaveBatch,
  onCopyFromPrevious,
}: {
  open: boolean
  onClose: () => void
  categories: Category[]
  budgetLimits: { category_id: string; monthly_limit: number; year: number; month: number }[]
  year: number
  month: number
  onSaveBatch: (limits: { categoryId: string; limit: number }[], year: number, month: number) => Promise<void>
  onCopyFromPrevious: (fromYear: number, fromMonth: number, toYear: number, toMonth: number) => Promise<void>
}) {
  const currentLimits = new Map(
    budgetLimits
      .filter(b => b.year === year && b.month === month)
      .map(b => [b.category_id, b.monthly_limit])
  )

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

  const total = useMemo(() => {
    return Object.values(values).reduce((sum, v) => {
      const n = parseFloat(v.replace(',', '.'))
      return sum + (isNaN(n) ? 0 : n)
    }, 0)
  }, [values])

  const handleCopy = async () => {
    setCopying(true)
    try {
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      await onCopyFromPrevious(prevYear, prevMonth, year, month)
      toast.success('Orcamento copiado do mes anterior')
      onClose()
    } catch {
      toast.error('Erro ao copiar orcamento')
    } finally {
      setCopying(false)
    }
  }

  const handleSave = async () => {
    const limits = Object.entries(values)
      .filter(([_, v]) => {
        const n = parseFloat(v.replace(',', '.'))
        return !isNaN(n) && n > 0
      })
      .map(([categoryId, v]) => ({
        categoryId,
        limit: parseFloat(v.replace(',', '.')),
      }))
    setSaving(true)
    try {
      await onSaveBatch(limits, year, month)
      toast.success('Orcamento salvo')
      onClose()
    } catch {
      toast.error('Erro ao salvar orcamento')
    } finally {
      setSaving(false)
    }
  }

  const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[85dvh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <SheetTitle className="text-left">
            Planejar Orcamento — {monthNames[month - 1]} {year}
          </SheetTitle>
          <Button
            size="sm"
            variant="outline"
            className="w-fit gap-1.5 text-xs"
            onClick={handleCopy}
            disabled={copying}
          >
            <ClipboardCopy className="h-3 w-3" />
            {copying ? 'Copiando...' : 'Copiar do mes anterior'}
          </Button>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="py-4 space-y-3">
            {categories.map(cat => {
              const Icon = getCategoryIcon(cat)
              return (
                <div key={cat.id} className="flex items-center gap-3">
                  <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: cat.color || '#6b7280' }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 text-sm font-medium truncate min-w-0">
                    {cat.name}
                  </span>
                  <div className="w-28 shrink-0">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="R$ 0"
                      value={values[cat.id] || ''}
                      onChange={(e) => setValues(prev => ({ ...prev, [cat.id]: e.target.value }))}
                      className="h-8 text-sm text-right tabular-nums"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        <SheetFooter className="px-4 py-3 border-t border-border shrink-0">
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-xs text-muted-foreground">Total orcado</p>
              <p className="text-lg font-bold tabular-nums">{formatBRL(total)}</p>
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
