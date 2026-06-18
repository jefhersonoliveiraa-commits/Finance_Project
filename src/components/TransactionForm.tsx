import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import type { Transaction, TransactionFormData, TransactionMethod, TransactionType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTransaction?: Transaction | null
  defaultMethod?: TransactionMethod
}

const CATEGORY_COLORS = [
  '#f97316', '#3b82f6', '#22c55e', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f59e0b', '#6b7280',
  '#ef4444', '#06b6d4',
]

export function TransactionForm({
  open,
  onOpenChange,
  editTransaction,
  defaultMethod,
}: TransactionFormProps) {
  const { categories, people, cardAccounts, bankAccounts, addTransaction, updateTransaction, addInstallments, addPerson, addCategory } =
    useFinance()

  const [date, setDate] = useState(todayString())
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<TransactionMethod>(defaultMethod || 'credit_card')
  const [type, setType] = useState<TransactionType>('mine')
  const [categoryId, setCategoryId] = useState<string>('none')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDay, setRecurringDay] = useState<string>('')
  const [notes, setNotes] = useState('')

  // Account/Card selection
  const [creditCardId, setCreditCardId] = useState<string>('')
  const [bankAccountId, setBankAccountId] = useState<string>('')

  // Installments
  const [purchaseDate, setPurchaseDate] = useState(todayString())
  const [installmentCount, setInstallmentCount] = useState<string>('1')

  // Rateado / repasse
  const [splitMode, setSplitMode] = useState<'amount' | 'percentage'>('amount')
  const [myPortionInput, setMyPortionInput] = useState('')
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])

  // Add person inline
  const [newPersonName, setNewPersonName] = useState('')
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [addingPerson, setAddingPerson] = useState(false)

  // Add category inline
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0])
  const [showAddCat, setShowAddCat] = useState(false)
  const [addingCat, setAddingCat] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editTransaction) {
      setDate(editTransaction.date)
      setDescription(editTransaction.description)
      setAmount(editTransaction.amount.toString())
      setMethod(editTransaction.method)
      setType(editTransaction.type)
      setCategoryId(editTransaction.category_id || 'none')
      setIsRecurring(editTransaction.is_recurring)
      setRecurringDay(editTransaction.recurring_day?.toString() || '')
      setNotes(editTransaction.notes || '')
      setCreditCardId(editTransaction.credit_card_id || '')
      setBankAccountId(editTransaction.bank_account_id || '')
      setPurchaseDate(editTransaction.purchase_date || editTransaction.date)
      setInstallmentCount(editTransaction.installment_count?.toString() || '1')
      const tp = editTransaction.transaction_people || []
      setSelectedPeople(tp.map(x => x.person_id))
      if (editTransaction.type === 'rateado') {
        setMyPortionInput(editTransaction.my_amount.toFixed(2))
        setSplitMode('amount')
      }
    } else {
      resetForm()
      if (defaultMethod) setMethod(defaultMethod)
    }
  }, [open, editTransaction, defaultMethod])

  function resetForm() {
    setDate(todayString())
    setDescription('')
    setAmount('')
    setMethod(defaultMethod || 'credit_card')
    setType('mine')
    setCategoryId('none')
    setIsRecurring(false)
    setRecurringDay('')
    setNotes('')
    setCreditCardId('')
    setBankAccountId('')
    setPurchaseDate(todayString())
    setInstallmentCount('1')
    setSplitMode('amount')
    setMyPortionInput('')
    setSelectedPeople([])
    setError('')
    setShowAddPerson(false)
    setShowAddCat(false)
  }

  const amountNum = parseFloat(amount) || 0
  const installmentNum = parseInt(installmentCount) || 1

  function getMyAmount(): number {
    if (type === 'mine') return amountNum
    if (type === 'repasse') return 0
    // rateado
    if (splitMode === 'amount') {
      const v = parseFloat(myPortionInput) || 0
      return Math.min(v, amountNum)
    }
    const pct = parseFloat(myPortionInput) || 0
    return (amountNum * pct) / 100
  }

  function getTheirAmount(): number {
    return amountNum - getMyAmount()
  }

  function getPerPersonAmount(): number {
    if (selectedPeople.length === 0) return 0
    return getTheirAmount() / selectedPeople.length
  }

  function getPeopleSplits(): { person_id: string; amount: number }[] {
    if (type === 'mine' || selectedPeople.length === 0) return []
    const perPerson = getPerPersonAmount()
    return selectedPeople.map(pid => ({ person_id: pid, amount: Math.round(perPerson * 100) / 100 }))
  }

  function togglePerson(pid: string) {
    setSelectedPeople(prev =>
      prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid],
    )
  }

  async function handleAddPerson() {
    if (!newPersonName.trim()) return
    setAddingPerson(true)
    try {
      const person = await addPerson(newPersonName.trim())
      setSelectedPeople(prev => [...prev, person.id])
      setNewPersonName('')
      setShowAddPerson(false)
    } catch {
      /* ignore */
    } finally {
      setAddingPerson(false)
    }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    setAddingCat(true)
    try {
      const cat = await addCategory(newCatName.trim(), newCatColor)
      setCategoryId(cat.id)
      setNewCatName('')
      setShowAddCat(false)
    } catch {
      /* ignore */
    } finally {
      setAddingCat(false)
    }
  }

  async function handleSubmit() {
    if (!description.trim()) return setError('Informe a descrição')
    if (!amount || amountNum <= 0) return setError('Informe o valor')
    if ((type === 'repasse' || type === 'rateado') && selectedPeople.length === 0) {
      return setError('Selecione ao menos uma pessoa')
    }
    if (type === 'rateado' && !myPortionInput) {
      return setError('Informe a sua parte')
    }
    if (method === 'credit_card' && !creditCardId && cardAccounts.length > 0) {
      return setError('Selecione o cartão')
    }
    if (method !== 'credit_card' && !bankAccountId && bankAccounts.length > 0) {
      return setError('Selecione a conta')
    }

    setError('')
    setSaving(true)
    try {
      const baseData: TransactionFormData = {
        date,
        description: description.trim(),
        amount: amountNum,
        my_amount: getMyAmount(),
        method,
        type,
        category_id: categoryId === 'none' ? null : categoryId,
        bank_account_id: method !== 'credit_card' && bankAccountId ? bankAccountId : null,
        credit_card_id: method === 'credit_card' && creditCardId ? creditCardId : null,
        purchase_date: method === 'credit_card' ? purchaseDate : null,
        billing_year: null,
        billing_month: null,
        installment_count: method === 'credit_card' ? installmentNum : 1,
        installment_number: editTransaction?.installment_number || 1,
        installment_group_id: editTransaction?.installment_group_id || null,
        is_recurring: isRecurring,
        recurring_day: isRecurring ? (parseInt(recurringDay) || null) : null,
        recurring_group_id: editTransaction?.recurring_group_id || null,
        notes: notes.trim() || null,
        people_splits: getPeopleSplits(),
      }

      if (editTransaction) {
        await updateTransaction(editTransaction.id, baseData)
      } else if (method === 'credit_card' && creditCardId) {
        const card = cardAccounts.find(c => c.id === creditCardId)
        if (card) {
          await addInstallments(baseData, card)
        } else {
          await addTransaction(baseData)
        }
      } else {
        await addTransaction(baseData)
      }
      onOpenChange(false)
    } catch (e) {
      setError('Erro ao salvar. Tente novamente.')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const myAmount = getMyAmount()
  const theirAmount = getTheirAmount()

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[95dvh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle>{editTransaction ? 'Editar Gasto' : 'Novo Gasto'}</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <div className="space-y-4">
            {/* Date + Method */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tx-date">Data</Label>
                <Input
                  id="tx-date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tx-method">Método</Label>
                <Select value={method} onValueChange={v => setMethod(v as TransactionMethod)}>
                  <SelectTrigger id="tx-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_card">Cartão Crédito</SelectItem>
                    <SelectItem value="pix">PIX / Transferência</SelectItem>
                    <SelectItem value="debit">Débito</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Credit Card specific fields */}
            {method === 'credit_card' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tx-card">Cartão</Label>
                    <Select value={creditCardId} onValueChange={setCreditCardId}>
                      <SelectTrigger id="tx-card">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cardAccounts.map(card => (
                          <SelectItem key={card.id} value={card.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: card.color }}
                              />
                              {card.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tx-parcelas">Parcelas</Label>
                    <Select value={installmentCount} onValueChange={setInstallmentCount}>
                      <SelectTrigger id="tx-parcelas">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                          <SelectItem key={n} value={n.toString()}>
                            {n}x
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tx-purchase-date">Data da Compra</Label>
                  <Input
                    id="tx-purchase-date"
                    type="date"
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                  />
                </div>

                {installmentNum > 1 && amountNum > 0 && (
                  <div className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                    {installmentNum}x de R$ {(amountNum / installmentNum).toFixed(2).replace('.', ',')}
                  </div>
                )}
              </>
            )}

            {/* Bank Account selection for non-card methods */}
            {method !== 'credit_card' && (
              <div className="space-y-1.5">
                <Label htmlFor="tx-account">Conta</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger id="tx-account">
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
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="tx-desc">Descrição</Label>
              <Input
                id="tx-desc"
                placeholder="Ex: Jantar no restaurante"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Valor Total (R$)</Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            {/* Type selector */}
            <div className="space-y-2">
              <Label>De quem é o valor?</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: 'mine', label: 'Meu', desc: '100% meu' },
                  { v: 'repasse', label: 'Repasse', desc: 'Recebo tudo' },
                  { v: 'rateado', label: 'Rateado', desc: 'Divido com alguém' },
                ] as { v: TransactionType; label: string; desc: string }[]).map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setType(opt.v)}
                    className={cn(
                      'rounded-lg border p-2.5 text-left text-xs transition-colors',
                      type === opt.v
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50',
                    )}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className="mt-0.5 text-[10px] opacity-80">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rateado: my portion */}
            {type === 'rateado' && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="flex-1">Minha parte</Label>
                  <div className="flex rounded-md border border-border overflow-hidden text-xs">
                    {(['amount', 'percentage'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSplitMode(m)}
                        className={cn(
                          'px-2.5 py-1 transition-colors',
                          splitMode === m
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background text-muted-foreground',
                        )}
                      >
                        {m === 'amount' ? 'R$' : '%'}
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={splitMode === 'percentage' ? '100' : amount}
                  placeholder={splitMode === 'amount' ? '0,00' : '50'}
                  value={myPortionInput}
                  onChange={e => setMyPortionInput(e.target.value)}
                />
                {amountNum > 0 && myPortionInput && (
                  <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1">
                    <span>Meu: <strong className="text-foreground">R$ {myAmount.toFixed(2).replace('.', ',')}</strong></span>
                    <span>A receber: <strong className="text-amber-600 dark:text-amber-400">R$ {theirAmount.toFixed(2).replace('.', ',')}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* People for repasse/rateado */}
            {(type === 'repasse' || type === 'rateado') && (
              <div className="space-y-2">
                <Label>
                  {type === 'repasse' ? 'Para quem é o repasse?' : 'Quem participa no rateio?'}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {people.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePerson(p.id)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        selectedPeople.includes(p.id)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground',
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowAddPerson(v => !v)}
                    className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground"
                  >
                    <Plus className="inline h-3 w-3" /> Pessoa
                  </button>
                </div>
                {showAddPerson && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome da pessoa"
                      value={newPersonName}
                      onChange={e => setNewPersonName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddPerson()}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={handleAddPerson} disabled={addingPerson}>
                      Adicionar
                    </Button>
                  </div>
                )}
                {selectedPeople.length > 0 && amountNum > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedPeople.length === 1 ? (
                      <>
                        {people.find(p => p.id === selectedPeople[0])?.name} deve{' '}
                        <strong className="text-amber-600 dark:text-amber-400">
                          R$ {theirAmount.toFixed(2).replace('.', ',')}
                        </strong>
                      </>
                    ) : (
                      <>
                        Cada pessoa deve{' '}
                        <strong className="text-amber-600 dark:text-amber-400">
                          R$ {getPerPersonAmount().toFixed(2).replace('.', ',')}
                        </strong>
                      </>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowAddCat(v => !v)}
                    className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground outline-none hover:bg-accent"
                  >
                    <Plus className="mr-2 h-3.5 w-3.5" /> Nova categoria
                  </button>
                </SelectContent>
              </Select>
              {showAddCat && (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <Input
                    placeholder="Nome da categoria"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCatColor(c)}
                        className={cn(
                          'h-6 w-6 rounded-full transition-transform',
                          newCatColor === c && 'ring-2 ring-offset-1 ring-primary scale-110',
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <Button size="sm" onClick={handleAddCategory} disabled={addingCat}>
                    Criar categoria
                  </Button>
                </div>
              )}
            </div>

            {/* Recurring */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium">Recorrente</div>
                <div className="text-xs text-muted-foreground">Repete todo mês automaticamente</div>
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
            {isRecurring && (
              <div className="space-y-1.5">
                <Label htmlFor="tx-day">Dia do mês</Label>
                <Input
                  id="tx-day"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex: 5"
                  value={recurringDay}
                  onChange={e => setRecurringDay(e.target.value)}
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="tx-notes">Observações (opcional)</Label>
              <Textarea
                id="tx-notes"
                placeholder="Detalhe extra..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="min-h-[60px] resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Summary */}
            {amountNum > 0 && type !== 'mine' && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor total</span>
                  <span className="font-medium">R$ {amountNum.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meu gasto real</span>
                  <span className="font-semibold text-foreground">
                    R$ {myAmount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">A receber</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    R$ {theirAmount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DrawerFooter className="pt-2">
          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : editTransaction ? 'Atualizar' : 'Salvar Gasto'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
