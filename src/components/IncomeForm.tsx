import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFinance } from '@/context/FinanceContext'
import { todayString } from '@/lib/format'
import type { Income, IncomeFormData } from '@/lib/types'

interface IncomeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editIncome?: Income | null
}

export function IncomeForm({ open, onOpenChange, editIncome }: IncomeFormProps) {
  const { addIncome, updateIncome, bankAccounts } = useFinance()

  const [date, setDate] = useState(todayString())
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [bankAccountId, setBankAccountId] = useState<string>('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDay, setRecurringDay] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editIncome) {
      setDate(editIncome.date)
      setDescription(editIncome.description)
      setAmount(editIncome.amount.toString())
      setBankAccountId(editIncome.bank_account_id || '')
      setIsRecurring(editIncome.is_recurring)
      setRecurringDay(editIncome.recurring_day?.toString() || '')
    } else {
      setDate(todayString())
      setDescription('')
      setAmount('')
      setBankAccountId('')
      setIsRecurring(false)
      setRecurringDay('')
      setError('')
    }
  }, [open, editIncome])

  async function handleSubmit() {
    const amountNum = parseFloat(amount)
    if (!description.trim()) return setError('Informe a descrição')
    if (!amount || amountNum <= 0) return setError('Informe o valor')
    if (bankAccounts.length > 0 && !bankAccountId) return setError('Selecione a conta que receberá')
    setError('')
    setSaving(true)
    try {
      const data: IncomeFormData = {
        date,
        description: description.trim(),
        amount: amountNum,
        bank_account_id: bankAccountId || null,
        is_recurring: isRecurring,
        recurring_day: isRecurring ? (parseInt(recurringDay) || null) : null,
        recurring_group_id: editIncome?.recurring_group_id || null,
      }
      if (editIncome) {
        await updateIncome(editIncome.id, data)
      } else {
        await addIncome(data)
      }
      onOpenChange(false)
    } catch {
      setError('Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="shrink-0">
          <DrawerTitle>{editIncome ? 'Editar Receita' : 'Nova Receita'}</DrawerTitle>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="inc-date">Data</Label>
              <Input
                id="inc-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="inc-amount">Valor (R$)</Label>
              <Input
                id="inc-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inc-desc">Descrição</Label>
            <Input
              id="inc-desc"
              placeholder="Ex: Salário, Freela..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inc-account">Conta <span className="text-destructive">*</span></Label>
            {bankAccounts.length > 0 ? (
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger id="inc-account">
                  <SelectValue placeholder="Selecionar conta..." />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: acc.color }}
                        />
                        {acc.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground">
                Cadastre uma conta bancária em Config para vincular receitas.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Recorrente mensal</div>
              <div className="text-xs text-muted-foreground">Lançado todo mês automaticamente</div>
            </div>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>

          {isRecurring && (
            <div className="space-y-1.5">
              <Label htmlFor="inc-day">Dia do mês</Label>
              <Input
                id="inc-day"
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 5"
                value={recurringDay}
                onChange={e => setRecurringDay(e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DrawerFooter className="shrink-0">
          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : editIncome ? 'Atualizar' : 'Salvar Receita'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
