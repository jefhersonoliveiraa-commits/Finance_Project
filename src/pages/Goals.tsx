import { useState, useEffect, useCallback } from 'react'
import {
  Target, Plus, Pencil, Trash2, X, Check,
  Car, Home, Plane, Smartphone, GraduationCap,
  Heart, ShoppingBag, Banknote, Star,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
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
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatBRL } from '@/lib/format'
import type { Goal } from '@/lib/types'

const ICON_OPTIONS = [
  { id: 'car',         icon: Car,          label: 'Carro' },
  { id: 'home',        icon: Home,         label: 'Casa' },
  { id: 'plane',       icon: Plane,        label: 'Viagem' },
  { id: 'smartphone',  icon: Smartphone,   label: 'Eletrônico' },
  { id: 'graduation',  icon: GraduationCap,label: 'Educação' },
  { id: 'heart',       icon: Heart,        label: 'Saúde' },
  { id: 'bag',         icon: ShoppingBag,  label: 'Compra' },
  { id: 'money',       icon: Banknote,     label: 'Reserva' },
  { id: 'star',        icon: Star,         label: 'Sonho' },
  { id: 'target',      icon: Target,       label: 'Meta' },
]

function getIconComponent(id: string) {
  return ICON_OPTIONS.find(o => o.id === id)?.icon ?? Target
}

function monthsBetween(from: Date, to: Date) {
  return Math.max(1, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()))
}

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onAddAmount,
}: {
  goal: Goal
  onEdit: (g: Goal) => void
  onDelete: (g: Goal) => void
  onAddAmount: (g: Goal) => void
}) {
  const pct = Math.min(100, goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0)
  const remaining = Math.max(0, goal.target_amount - goal.current_amount)
  const Icon = getIconComponent(goal.icon ?? 'target')
  const deadline = goal.deadline ? new Date(goal.deadline + 'T12:00:00') : null
  const monthly = deadline ? remaining / monthsBetween(new Date(), deadline) : null
  const done = pct >= 100

  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-border bg-card/60 p-5 overflow-hidden">
      {/* Barra de progresso no fundo */}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-border">
        <div
          className={cn('h-full rounded-full transition-all duration-500', done ? 'bg-positive' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border',
            done ? 'border-positive/30 bg-positive/10 text-positive' : 'border-primary/30 bg-primary/10 text-primary',
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold leading-tight">{goal.title}</p>
            {deadline && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Meta para {deadline.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
        <div className={cn(
          'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
          done
            ? 'border-positive/30 bg-positive/10 text-positive'
            : 'border-border bg-secondary/50 text-muted-foreground',
        )}>
          {done ? '✓ Atingida' : `${Math.round(pct)}%`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Acumulado</p>
          <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-foreground">{formatBRL(goal.current_amount)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Objetivo</p>
          <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-muted-foreground">{formatBRL(goal.target_amount)}</p>
        </div>
      </div>

      {monthly !== null && !done && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-2">
          <span className="text-xs text-muted-foreground">Aporte sugerido/mês</span>
          <span className="font-mono text-sm font-bold tabular-nums text-primary">{formatBRL(monthly)}</span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => onAddAmount(goal)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Aportar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onEdit(goal)} className="px-2.5">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(goal)} className="px-2.5 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

const EMPTY_FORM = { title: '', target_amount: '', current_amount: '', deadline: '', icon: 'target' }

export function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null)
  const [addAmountTarget, setAddAmountTarget] = useState<Goal | null>(null)
  const [addAmountValue, setAddAmountValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).order('created_at')
    if (data) setGoals(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSheetOpen(true)
  }

  const openEdit = (g: Goal) => {
    setEditing(g)
    setForm({
      title: g.title,
      target_amount: String(g.target_amount),
      current_amount: String(g.current_amount),
      deadline: g.deadline ?? '',
      icon: g.icon ?? 'target',
    })
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.target_amount) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const payload = {
        title: form.title.trim(),
        target_amount: parseFloat(form.target_amount.replace(',', '.')),
        current_amount: parseFloat(form.current_amount.replace(',', '.') || '0'),
        deadline: form.deadline || null,
        icon: form.icon,
        user_id: user.id,
      }
      if (editing) {
        await supabase.from('goals').update(payload).eq('id', editing.id)
        toast.success('Meta atualizada')
      } else {
        await supabase.from('goals').insert(payload)
        toast.success('Meta criada!')
      }
      setSheetOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await supabase.from('goals').delete().eq('id', deleteTarget.id)
    toast.success('Meta removida')
    setDeleteTarget(null)
    load()
  }

  const handleAddAmount = async () => {
    if (!addAmountTarget || !addAmountValue) return
    const extra = parseFloat(addAmountValue.replace(',', '.'))
    if (isNaN(extra) || extra <= 0) return
    setSaving(true)
    try {
      const newAmount = addAmountTarget.current_amount + extra
      await supabase.from('goals').update({ current_amount: newAmount }).eq('id', addAmountTarget.id)
      toast.success(`${formatBRL(extra)} aportado!`)
      setAddAmountTarget(null)
      setAddAmountValue('')
      load()
    } finally {
      setSaving(false)
    }
  }

  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)
  const totalSaved  = goals.reduce((s, g) => s + g.current_amount, 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Metas</h1>
          <p className="text-sm text-muted-foreground">Seus objetivos financeiros</p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-1.5 h-4 w-4" /> Nova Meta
        </Button>
      </div>

      {/* Resumo */}
      {goals.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Total acumulado</p>
            <p className="mt-1 font-mono text-xl font-bold tabular-nums text-positive">{formatBRL(totalSaved)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Total objetivos</p>
            <p className="mt-1 font-mono text-xl font-bold tabular-nums text-muted-foreground">{formatBRL(totalTarget)}</p>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1,2].map(i => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Nenhuma meta ainda</p>
            <p className="text-sm text-muted-foreground mt-1">Crie sua primeira meta e acompanhe o progresso</p>
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" /> Criar meta
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onAddAmount={g => { setAddAmountTarget(g); setAddAmountValue('') }}
            />
          ))}
        </div>
      )}

      {/* Sheet: Nova / Editar meta */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[92dvh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{editing ? 'Editar meta' : 'Nova meta'}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label>Título</Label>
              <Input
                className="mt-1"
                placeholder="Ex: Honda Civic 2015"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor objetivo (R$)</Label>
                <Input
                  className="mt-1 font-mono"
                  placeholder="30.000,00"
                  value={form.target_amount}
                  onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Já acumulado (R$)</Label>
                <Input
                  className="mt-1 font-mono"
                  placeholder="0,00"
                  value={form.current_amount}
                  onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Prazo (opcional)</Label>
              <Input
                className="mt-1"
                type="date"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              />
            </div>

            <div>
              <Label className="mb-2 block">Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(opt => {
                  const Ic = opt.icon
                  const active = form.icon === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, icon: opt.id }))}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl border p-2.5 text-[10px] transition-all',
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-secondary/40 text-muted-foreground hover:border-primary/40',
                      )}
                    >
                      <Ic className="h-5 w-5" />
                      <span>{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <SheetFooter className="mt-6 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>
              <X className="mr-1.5 h-4 w-4" /> Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !form.title || !form.target_amount}>
              <Check className="mr-1.5 h-4 w-4" /> {editing ? 'Salvar' : 'Criar meta'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: Aportar */}
      <Sheet open={!!addAmountTarget} onOpenChange={o => !o && setAddAmountTarget(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Aportar em "{addAmountTarget?.title}"</SheetTitle>
          </SheetHeader>
          <div>
            <Label>Valor a aportar (R$)</Label>
            <Input
              className="mt-1 font-mono text-lg"
              placeholder="0,00"
              value={addAmountValue}
              onChange={e => setAddAmountValue(e.target.value)}
              autoFocus
            />
            {addAmountTarget && (
              <p className="mt-2 text-sm text-muted-foreground">
                Saldo atual: {formatBRL(addAmountTarget.current_amount)} → novo: {formatBRL(addAmountTarget.current_amount + (parseFloat(addAmountValue.replace(',','.')) || 0))}
              </p>
            )}
          </div>
          <SheetFooter className="mt-6 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setAddAmountTarget(null)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleAddAmount} disabled={saving || !addAmountValue}>
              <Check className="mr-1.5 h-4 w-4" /> Confirmar aporte
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Alert: Deletar */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover meta?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
