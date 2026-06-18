import { useState } from 'react'
import { Target, Plus, Pencil, Trash2, TrendingUp, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MonthSelector } from '@/components/layout/MonthSelector'
import { useFinance } from '@/context/FinanceContext'
import { formatBRL } from '@/lib/format'
import { getCategoryIcon } from '@/lib/category-icons'
import { cn } from '@/lib/utils'
import type { Category } from '@/lib/types'
import { toast } from 'sonner'

interface BudgetDialogProps {
  open: boolean
  onClose: () => void
  category: Category
  currentLimit?: number
}

function BudgetDialog({ open, onClose, category, currentLimit }: BudgetDialogProps) {
  const { setBudgetLimit } = useFinance()
  const [value, setValue] = useState(currentLimit ? String(currentLimit) : '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const num = parseFloat(value.replace(',', '.'))
    if (!num || num <= 0) {
      toast.error('Informe um limite válido')
      return
    }
    setSaving(true)
    try {
      await setBudgetLimit(category.id, num)
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
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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

function getRhythmTip(spent: number, limit: number, selectedMonth: Date): string | null {
  const now = new Date()
  const isCurrentMonth =
    now.getFullYear() === selectedMonth.getFullYear() &&
    now.getMonth() === selectedMonth.getMonth()
  if (!isCurrentMonth) return null

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysElapsed = now.getDate()
  const daysLeft = daysInMonth - daysElapsed

  const pctSpent = spent / limit

  if (daysLeft <= 0) return null

  const pctSpentRounded = Math.round(pctSpent * 100)
  if (pctSpent < 1) {
    return `${pctSpentRounded}% do limite — faltam ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`
  }
  return null
}

export function BudgetPage() {
  const { stats, budgetLimits, loading, deleteBudgetLimit, selectedMonth } = useFinance()
  const [dialogCat, setDialogCat] = useState<Category | null>(null)

  const { byCategory } = stats

  const limitMap = new Map(budgetLimits.map((b) => [b.category_id, b.monthly_limit]))

  const categoriesWithLimit = byCategory
    .filter((c) => c.category && limitMap.has(c.category.id))
    .map((c) => ({
      ...c,
      limit: limitMap.get(c.category!.id)!,
    }))
    .sort((a, b) => b.myAmount / b.limit - a.myAmount / a.limit)

  const categoriesWithoutLimit = byCategory.filter(
    (c) => !c.category || !limitMap.has(c.category.id),
  )

  const totalBudgeted = categoriesWithLimit.reduce((s, c) => s + c.limit, 0)
  const totalSpentOnBudgeted = categoriesWithLimit.reduce((s, c) => s + c.myAmount, 0)
  const overCount = categoriesWithLimit.filter((c) => c.myAmount > c.limit).length

  const handleDelete = async (categoryId: string, name: string) => {
    try {
      await deleteBudgetLimit(categoryId)
      toast.success(`Limite de "${name}" removido`)
    } catch {
      toast.error('Erro ao remover limite')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full rounded-xl" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const summaryPct =
    totalBudgeted > 0 ? Math.min((totalSpentOnBudgeted / totalBudgeted) * 100, 100) : 0
  const summaryStatus = getBudgetStatus(totalSpentOnBudgeted, totalBudgeted || 1)

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Orçamento</h1>
          <MonthSelector className="mt-0.5" />
        </div>
      </div>

      {/* Summary card */}
      {categoriesWithLimit.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Total orçado
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {formatBRL(totalSpentOnBudgeted)}
                  <span className="text-base font-normal text-muted-foreground ml-1">
                    / {formatBRL(totalBudgeted)}
                  </span>
                </p>
              </div>
              {overCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {overCount} estouro{overCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn('h-full rounded-full transition-all', getProgressColor(summaryStatus))}
                style={{ width: `${summaryPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
              <span>
                {Math.round(summaryPct)}% utilizado
              </span>
              {totalSpentOnBudgeted <= totalBudgeted ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  sobra {formatBRL(totalBudgeted - totalSpentOnBudgeted)}
                </span>
              ) : (
                <span className="text-destructive font-medium">
                  excedeu {formatBRL(totalSpentOnBudgeted - totalBudgeted)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories with limit */}
      {categoriesWithLimit.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
            Com limite definido
          </h2>
          {categoriesWithLimit.map(({ category, myAmount, limit }) => {
            const cat = category!
            const Icon = getCategoryIcon(cat)
            const pct = Math.min((myAmount / limit) * 100, 100)
            const status = getBudgetStatus(myAmount, limit)
            const tip = getRhythmTip(myAmount, limit, selectedMonth)

            return (
              <Card key={cat.id} className="border-0 shadow-sm">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-3 mb-2.5">
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: cat.color || '#6b7280' }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-sm truncate">{cat.name}</span>
                        <span className="text-sm font-semibold shrink-0">
                          {formatBRL(myAmount)}
                          <span className="text-xs font-normal text-muted-foreground">
                            {' '}/ {formatBRL(limit)}
                          </span>
                        </span>
                      </div>
                      {tip && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{tip}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setDialogCat(cat)}
                        title="Editar limite"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(cat.id, cat.name)}
                        title="Remover limite"
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
                    <span
                      className={cn(
                        'font-medium',
                        status === 'over' && 'text-destructive',
                        status === 'warning' && 'text-amber-600 dark:text-amber-400',
                        status === 'ok' && 'text-emerald-600 dark:text-emerald-400',
                      )}
                    >
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
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
            Sem limite — só gasto
          </h2>
          {categoriesWithoutLimit.map(({ category, myAmount }) => {
            const Icon = getCategoryIcon(category)
            const canBudget = !!category

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
                  <span className="text-sm font-semibold text-muted-foreground">
                    {formatBRL(myAmount)}
                  </span>
                  {canBudget && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs shrink-0 gap-1"
                      onClick={() => setDialogCat(category!)}
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

      {/* Empty state */}
      {byCategory.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Target className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">Nenhum gasto neste mês</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Os limites aparecem aqui conforme você gasta
          </p>
        </div>
      )}

      {byCategory.length > 0 && categoriesWithLimit.length === 0 && (
        <div className="flex flex-col items-center text-center py-10 gap-2">
          <TrendingUp className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">Nenhum limite definido</p>
          <p className="text-sm text-muted-foreground/70">
            Toque em "Limite" numa categoria abaixo para começar
          </p>
        </div>
      )}

      {/* Dialog */}
      {dialogCat && (
        <BudgetDialog
          open={!!dialogCat}
          onClose={() => setDialogCat(null)}
          category={dialogCat}
          currentLimit={limitMap.get(dialogCat.id)}
        />
      )}
    </div>
  )
}
