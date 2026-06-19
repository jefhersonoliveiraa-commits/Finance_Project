import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { cn } from '@/lib/utils'

interface TransferFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransferForm({ open, onOpenChange }: TransferFormProps) {
  const { addTransfer, bankAccounts } = useFinance()

  const [date, setDate] = useState(todayString())
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [fromAccountId, setFromAccountId] = useState<string>('')
  const [toAccountId, setToAccountId] = useState<string>('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!amount || parseFloat(amount) <= 0) return setError('Informe o valor')
    if (!fromAccountId) return setError('Selecione a conta de origem')
    if (!toAccountId) return setError('Selecione a conta de destino')
    if (fromAccountId === toAccountId) return setError('Contas devem ser diferentes')

    setError('')
    setSaving(true)
    try {
      await addTransfer({
        date,
        description: description.trim() || 'Transferência',
        amount: parseFloat(amount),
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
      })
      resetForm()
      onOpenChange(false)
    } catch (e) {
      setError('Erro ao transferir. Tente novamente.')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setDate(todayString())
    setDescription('')
    setAmount('')
    setFromAccountId('')
    setToAccountId('')
    setError('')
  }

  const fromAccount = bankAccounts.find(a => a.id === fromAccountId)
  const toAccount = bankAccounts.find(a => a.id === toAccountId)

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o) }}>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="shrink-0 pb-2">
          <DrawerTitle>Nova Transferência</DrawerTitle>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="txf-date">Data</Label>
              <Input
                id="txf-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="txf-amount">Valor (R$)</Label>
              <Input
                id="txf-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="txf-desc">Descrição (opcional)</Label>
              <Input
                id="txf-desc"
                placeholder="Ex: Transferência entre contas"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* Account selectors with arrow between */}
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>De</Label>
                <Select value={fromAccountId} onValueChange={setFromAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Origem" />
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
              </div>

              <div className="pb-2.5">
                <ArrowRight className={cn(
                  'h-5 w-5 text-muted-foreground',
                  fromAccountId && toAccountId && 'text-primary'
                )} />
              </div>

              <div className="flex-1 space-y-1.5">
                <Label>Para</Label>
                <Select value={toAccountId} onValueChange={setToAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Destino" />
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
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Preview */}
            {fromAccount && toAccount && parseFloat(amount) > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">De</span>
                  <span className="font-medium">{fromAccount.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Para</span>
                  <span className="font-medium">{toAccount.name}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-bold text-primary">
                    R$ {parseFloat(amount).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DrawerFooter className="shrink-0 pt-2">
          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? 'Transferindo...' : 'Transferir'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
