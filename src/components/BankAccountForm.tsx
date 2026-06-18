import { useState } from 'react'
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
import { useFinance } from '@/context/FinanceContext'
import { cn } from '@/lib/utils'

interface BankAccountFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ACCOUNT_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f59e0b', '#6b7280',
]

export function BankAccountForm({ open, onOpenChange }: BankAccountFormProps) {
  const { addBankAccount } = useFinance()

  const [name, setName] = useState('')
  const [color, setColor] = useState(ACCOUNT_COLORS[0])
  const [initialBalance, setInitialBalance] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!name.trim()) return setError('Informe o nome da conta')
    setError('')
    setSaving(true)
    try {
      await addBankAccount(name.trim(), color, parseFloat(initialBalance) || 0)
      resetForm()
      onOpenChange(false)
    } catch (e) {
      setError('Erro ao criar conta. Tente novamente.')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setName('')
    setColor(ACCOUNT_COLORS[0])
    setInitialBalance('0')
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova Conta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Nome</Label>
            <Input
              id="acc-name"
              placeholder="Ex: Nubank, Itau..."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLORS.map(c => (
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

          <div className="space-y-1.5">
            <Label htmlFor="acc-balance">Saldo Inicial (R$)</Label>
            <Input
              id="acc-balance"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={initialBalance}
              onChange={e => setInitialBalance(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Criando...' : 'Criar Conta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
