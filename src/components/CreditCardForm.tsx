import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFinance } from '@/context/FinanceContext'
import { cn } from '@/lib/utils'
import type { CardAccount } from '@/lib/types'

interface CreditCardFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editCard?: CardAccount | null
}

const CARD_COLORS = [
  '#6b7280', '#1f2937', '#3b82f6', '#7c3aed',
  '#ec4899', '#f97316', '#22c55e', '#0ea5e9',
]

export function CreditCardForm({ open, onOpenChange, editCard }: CreditCardFormProps) {
  const { addCardAccount, updateCardAccount, bankAccounts } = useFinance()

  const [name, setName] = useState('')
  const [color, setColor] = useState(CARD_COLORS[0])
  const [closingDay, setClosingDay] = useState('15')
  const [dueDay, setDueDay] = useState('10')
  const [bankAccountId, setBankAccountId] = useState<string>('none')
  const [creditLimit, setCreditLimit] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editCard) {
      setName(editCard.name)
      setColor(editCard.color)
      setClosingDay(editCard.closing_day.toString())
      setDueDay(editCard.due_day.toString())
      setBankAccountId(editCard.bank_account_id || 'none')
      setCreditLimit(editCard.credit_limit?.toString() || '')
    } else {
      setName('')
      setColor(CARD_COLORS[0])
      setClosingDay('15')
      setDueDay('10')
      setBankAccountId('none')
      setCreditLimit('')
    }
    setError('')
  }, [open, editCard])

  async function handleSubmit() {
    if (!name.trim()) return setError('Informe o nome do cartão')
    setError('')
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        color,
        closing_day: parseInt(closingDay) || 15,
        due_day: parseInt(dueDay) || 10,
        bank_account_id: bankAccountId === 'none' ? null : bankAccountId,
        credit_limit: creditLimit ? parseFloat(creditLimit) : null,
      }

      if (editCard) {
        await updateCardAccount(editCard.id, data)
      } else {
        await addCardAccount(data)
      }
      onOpenChange(false)
    } catch (e) {
      setError('Erro ao salvar cartão. Tente novamente.')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editCard ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="card-name">Nome</Label>
            <Input
              id="card-name"
              placeholder="Ex: Nubank, Itau Platinum..."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {CARD_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-8 w-8 rounded-full transition-transform',
                    color === c && 'ring-2 ring-offset-2 ring-primary scale-110',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="card-closing">Dia Fechamento</Label>
              <Input
                id="card-closing"
                type="number"
                min="1"
                max="31"
                value={closingDay}
                onChange={e => setClosingDay(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="card-due">Dia Vencimento</Label>
              <Input
                id="card-due"
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={e => setDueDay(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="card-account">Conta para Débito</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger id="card-account">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {bankAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="card-limit">Limite (opcional)</Label>
            <Input
              id="card-limit"
              type="number"
              step="0.01"
              placeholder="Ex: 5000"
              value={creditLimit}
              onChange={e => setCreditLimit(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : editCard ? 'Atualizar' : 'Criar Cartão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
