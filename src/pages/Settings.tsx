import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, CreditCard, Wallet, RefreshCw, Download, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
import { IncomeForm } from '@/components/IncomeForm'
import { BankAccountForm } from '@/components/BankAccountForm'
import { CreditCardForm } from '@/components/CreditCardForm'
import { TransferForm } from '@/components/TransferForm'
import { useFinance } from '@/context/FinanceContext'
import { supabase } from '@/lib/supabase'
import { formatBRL, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Income, Category, CardAccount, Subcategory } from '@/lib/types'

const PRESET_COLORS = [
  '#f97316', '#3b82f6', '#22c55e', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f59e0b', '#6b7280',
  '#ef4444', '#06b6d4',
]

export function SettingsPage() {
  const {
    incomes,
    people,
    categories,
    bankAccounts,
    cardAccounts,
    loading,
    deleteIncome,
    deletePerson,
    addCategory,
    deleteCategory,
    updateCategory,
    deleteBankAccount,
    setAccountBalance,
    deleteCardAccount,
    subcategories,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
  } = useFinance()

  const [incOpen, setIncOpen] = useState(false)
  const [editIncome, setEditIncome] = useState<Income | null>(null)
  const [deleteIncomeId, setDeleteIncomeId] = useState<string | null>(null)
  const [deletePersonId, setDeletePersonId] = useState<string | null>(null)
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null)

  // Bank accounts
  const [accOpen, setAccOpen] = useState(false)
  const [deleteAccId, setDeleteAccId] = useState<string | null>(null)
  const [editAccId, setEditAccId] = useState<string | null>(null)
  const [newBalance, setNewBalance] = useState('')
  const [txfOpen, setTxfOpen] = useState(false)

  // Credit cards
  const [cardOpen, setCardOpen] = useState(false)
  const [editCard, setEditCard] = useState<CardAccount | null>(null)
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null)

  // New category
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0])
  const [addingCat, setAddingCat] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)

  // Edit category
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatColor, setEditCatColor] = useState('')

  // Subcategories
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null)
  const [newSubName, setNewSubName] = useState('')
  const [addingSub, setAddingSub] = useState(false)
  const [editSub, setEditSub] = useState<Subcategory | null>(null)
  const [editSubName, setEditSubName] = useState('')
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null)

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    setAddingCat(true)
    try {
      await addCategory(newCatName.trim(), newCatColor)
      setNewCatName('')
      setShowCatForm(false)
    } catch { /* ignore */ }
    setAddingCat(false)
  }

  async function handleUpdateCategory() {
    if (!editCat || !editCatName.trim()) return
    await updateCategory(editCat.id, editCatName.trim(), editCatColor)
    setEditCat(null)
  }

  async function handleAddSubcategory(categoryId: string) {
    if (!newSubName.trim()) return
    setAddingSub(true)
    try {
      await addSubcategory(categoryId, newSubName.trim(), null)
      setNewSubName('')
    } catch { /* ignore */ }
    setAddingSub(false)
  }

  async function handleUpdateSubcategory() {
    if (!editSub || !editSubName.trim()) return
    await updateSubcategory(editSub.id, editSubName.trim(), editSub.color)
    setEditSub(null)
  }

  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const [txRes, incRes, accRes, cardsRes, peopleRes, catRes, txfRes] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('incomes').select('*').order('date', { ascending: false }),
        supabase.from('bank_accounts').select('*'),
        supabase.from('credit_cards').select('*'),
        supabase.from('people').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('transfers').select('*').order('date', { ascending: false }),
      ])

      const payload = {
        exported_at: new Date().toISOString(),
        transactions: txRes.data ?? [],
        incomes: incRes.data ?? [],
        bank_accounts: accRes.data ?? [],
        credit_cards: cardsRes.data ?? [],
        people: peopleRes.data ?? [],
        categories: catRes.data ?? [],
        transfers: txfRes.data ?? [],
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financas-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
    setExporting(false)
  }

  async function handleSetBalance() {
    if (!editAccId || !newBalance) return
    await setAccountBalance(editAccId, parseFloat(newBalance) || 0)
    setEditAccId(null)
    setNewBalance('')
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      <h1 className="text-xl font-bold tracking-tight">Configurações</h1>

      {/* Bank Accounts */}
      <Card>
        <CardHeader className="pb-2 pt-4 flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Wallet className="h-4 w-4" />
            Contas
          </CardTitle>
          <div className="flex gap-2">
            {bankAccounts.length >= 2 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setTxfOpen(true)}
                title="Transferir entre contas"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setAccOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" /> Nova
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {loading ? (
            <Skeleton className="h-16" />
          ) : bankAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Nenhuma conta cadastrada. Adicione para controlar saldos.
            </p>
          ) : (
            <div className="space-y-2">
              {bankAccounts.map(acc => (
                <div key={acc.id} className="flex items-center gap-3">
                  <span
                    className="h-5 w-5 rounded-full shrink-0"
                    style={{ backgroundColor: acc.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{acc.name}</p>
                    {editAccId === acc.id ? (
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={newBalance}
                          onChange={e => setNewBalance(e.target.value)}
                          placeholder="Novo saldo"
                          className="h-7 text-xs flex-1"
                        />
                        <Button size="sm" className="h-7" onClick={handleSetBalance}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditAccId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <p className={cn(
                        'text-xs',
                        acc.current_balance >= 0 ? 'text-muted-foreground' : 'text-red-600 dark:text-red-400'
                      )}>
                        {formatBRL(acc.current_balance)}
                      </p>
                    )}
                  </div>
                  {editAccId !== acc.id && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => { setEditAccId(acc.id); setNewBalance(acc.current_balance.toString()) }}
                        title="Ajustar saldo"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteAccId(acc.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Cards */}
      <Card>
        <CardHeader className="pb-2 pt-4 flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <CreditCard className="h-4 w-4" />
            Cartões de Crédito
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => { setEditCard(null); setCardOpen(true) }}
          >
            <Plus className="h-3 w-3 mr-1" /> Novo
          </Button>
        </CardHeader>
        <CardContent className="pb-4">
          {loading ? (
            <Skeleton className="h-16" />
          ) : cardAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Nenhum cartão cadastrado.
            </p>
          ) : (
            <div className="space-y-2">
              {cardAccounts.map(card => (
                <div key={card.id} className="flex items-center gap-3">
                  <span
                    className="h-5 w-5 rounded-full shrink-0"
                    style={{ backgroundColor: card.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{card.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Fecha {card.closing_day} · Vence {card.due_day}
                      {card.bank_account && ` · ${card.bank_account.name}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => { setEditCard(card); setCardOpen(true) }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteCardId(card.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incomes */}
      <Card>
        <CardHeader className="pb-2 pt-4 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Receitas
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => { setEditIncome(null); setIncOpen(true) }}
          >
            <Plus className="h-3 w-3 mr-1" /> Nova
          </Button>
        </CardHeader>
        <CardContent className="pb-4">
          {loading ? (
            <Skeleton className="h-16" />
          ) : incomes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Nenhuma receita neste mês.
            </p>
          ) : (
            <div className="space-y-2">
              {incomes.map(inc => (
                <div key={inc.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inc.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(inc.date)}
                      {inc.is_recurring && ' · recorrente'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                    {formatBRL(inc.amount)}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => { setEditIncome(inc); setIncOpen(true) }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteIncomeId(inc.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* People */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Pessoas
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {loading ? (
            <Skeleton className="h-16" />
          ) : people.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Nenhuma pessoa cadastrada. Adicione ao criar um lançamento de repasse ou rateio.
            </p>
          ) : (
            <div className="space-y-2">
              {people.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setDeletePersonId(p.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader className="pb-2 pt-4 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Categorias
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setShowCatForm(v => !v)}
          >
            <Plus className="h-3 w-3 mr-1" /> Nova
          </Button>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          {showCatForm && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <Input
                placeholder="Nome da categoria"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="text-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map(c => (
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
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddCategory} disabled={addingCat} className="flex-1">
                  Criar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowCatForm(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="space-y-2">
              {categories.map(cat => {
                const catSubs = subcategories.filter(s => s.category_id === cat.id)
                const isExpanded = expandedCatId === cat.id
                return (
                <div key={cat.id}>
                  {editCat?.id === cat.id ? (
                    <div className="rounded-lg border border-primary/30 p-2 space-y-2">
                      <Input
                        value={editCatName}
                        onChange={e => setEditCatName(e.target.value)}
                        className="text-sm h-8"
                      />
                      <div className="flex flex-wrap gap-1">
                        {PRESET_COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditCatColor(c)}
                            className={cn(
                              'h-5 w-5 rounded-full',
                              editCatColor === c && 'ring-2 ring-offset-1 ring-primary scale-110',
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 flex-1" onClick={handleUpdateCategory}>
                          <Check className="h-3 w-3 mr-1" /> Salvar
                        </Button>
                        <Button size="sm" variant="outline" className="h-7" onClick={() => setEditCat(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                          className="h-5 w-5 rounded-full shrink-0 relative"
                          style={{ backgroundColor: cat.color }}
                        >
                          {catSubs.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-muted-foreground text-background text-[9px] rounded-full h-3.5 w-3.5 flex items-center justify-center font-bold">
                              {catSubs.length}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          className="flex-1 text-sm font-medium text-left"
                          onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                        >
                          {cat.name}
                        </button>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditCat(cat)
                              setEditCatName(cat.name)
                              setEditCatColor(cat.color)
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setDeleteCatId(cat.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="ml-8 mt-2 space-y-1.5 border-l border-border pl-3">
                          {catSubs.map(sub => (
                            <div key={sub.id} className="flex items-center gap-2">
                              {editSub?.id === sub.id ? (
                                <div className="flex-1 flex gap-1.5">
                                  <Input
                                    value={editSubName}
                                    onChange={e => setEditSubName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleUpdateSubcategory()}
                                    className="text-xs h-7 flex-1"
                                  />
                                  <Button size="sm" className="h-7 px-2" onClick={handleUpdateSubcategory}>
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditSub(null)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-xs text-muted-foreground flex-1">{sub.name}</span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => { setEditSub(sub); setEditSubName(sub.name) }}
                                  >
                                    <Edit2 className="h-2.5 w-2.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => setDeleteSubId(sub.id)}
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          ))}
                          <div className="flex gap-1.5">
                            <Input
                              placeholder="Nova subcategoria..."
                              value={expandedCatId === cat.id ? newSubName : ''}
                              onChange={e => setNewSubName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleAddSubcategory(cat.id)}
                              className="text-xs h-7 flex-1"
                            />
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleAddSubcategory(cat.id)}
                              disabled={addingSub || !newSubName.trim()}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Exportar dados</p>
              <p className="text-xs text-muted-foreground">
                Baixa um arquivo JSON com todas as transações, contas, cartões e categorias.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="ml-4 shrink-0"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">Exportar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete dialogs */}
      <AlertDialog open={!!deleteIncomeId} onOpenChange={o => !o && setDeleteIncomeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { if (deleteIncomeId) { await deleteIncome(deleteIncomeId); setDeleteIncomeId(null) } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePersonId} onOpenChange={o => !o && setDeletePersonId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pessoa?</AlertDialogTitle>
            <AlertDialogDescription>
              Os lançamentos vinculados serão desconectados desta pessoa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { if (deletePersonId) { await deletePerson(deletePersonId); setDeletePersonId(null) } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCatId} onOpenChange={o => !o && setDeleteCatId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Os lançamentos desta categoria ficarão sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { if (deleteCatId) { await deleteCategory(deleteCatId); setDeleteCatId(null) } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAccId} onOpenChange={o => !o && setDeleteAccId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Os lançamentos vinculados serão desconectados desta conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { if (deleteAccId) { await deleteBankAccount(deleteAccId); setDeleteAccId(null) } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCardId} onOpenChange={o => !o && setDeleteCardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              Os lançamentos vinculados serão desconectados deste cartão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { if (deleteCardId) { await deleteCardAccount(deleteCardId); setDeleteCardId(null) } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSubId} onOpenChange={o => !o && setDeleteSubId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir subcategoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Os lançamentos vinculados ficarão sem subcategoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { if (deleteSubId) { await deleteSubcategory(deleteSubId); setDeleteSubId(null) } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <IncomeForm
        open={incOpen}
        onOpenChange={open => { setIncOpen(open); if (!open) setEditIncome(null) }}
        editIncome={editIncome}
      />
      <BankAccountForm open={accOpen} onOpenChange={setAccOpen} />
      <CreditCardForm open={cardOpen} onOpenChange={open => { setCardOpen(open); if (!open) setEditCard(null) }} editCard={editCard} />
      <TransferForm open={txfOpen} onOpenChange={setTxfOpen} />
    </div>
  )
}
