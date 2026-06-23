import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, RefreshCw, Download, Loader2, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
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

function Section({ title, action, children }: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60">
        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{title}</p>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const {
    incomes, people, categories, bankAccounts, cardAccounts, loading,
    deleteIncome, deletePerson, addCategory, deleteCategory, updateCategory,
    deleteBankAccount, setAccountBalance, deleteCardAccount,
    subcategories, addSubcategory, updateSubcategory, deleteSubcategory,
  } = useFinance()

  const [incOpen, setIncOpen] = useState(false)
  const [editIncome, setEditIncome] = useState<Income | null>(null)
  const [deleteIncomeId, setDeleteIncomeId] = useState<string | null>(null)
  const [deletePersonId, setDeletePersonId] = useState<string | null>(null)
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null)

  const [accOpen, setAccOpen] = useState(false)
  const [deleteAccId, setDeleteAccId] = useState<string | null>(null)
  const [editAccId, setEditAccId] = useState<string | null>(null)
  const [newBalance, setNewBalance] = useState('')
  const [txfOpen, setTxfOpen] = useState(false)

  const [cardOpen, setCardOpen] = useState(false)
  const [editCard, setEditCard] = useState<CardAccount | null>(null)
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null)

  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0])
  const [addingCat, setAddingCat] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)

  const [editCat, setEditCat] = useState<Category | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatColor, setEditCatColor] = useState('')

  const [expandedCatId, setExpandedCatId] = useState<string | null>(null)
  const [newSubName, setNewSubName] = useState('')
  const [addingSub, setAddingSub] = useState(false)
  const [editSub, setEditSub] = useState<Subcategory | null>(null)
  const [editSubName, setEditSubName] = useState('')
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null)

  const [exporting, setExporting] = useState(false)

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    setAddingCat(true)
    try { await addCategory(newCatName.trim(), newCatColor); setNewCatName(''); setShowCatForm(false) }
    catch { /* ignore */ }
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
    try { await addSubcategory(categoryId, newSubName.trim(), null); setNewSubName('') }
    catch { /* ignore */ }
    setAddingSub(false)
  }

  async function handleUpdateSubcategory() {
    if (!editSub || !editSubName.trim()) return
    await updateSubcategory(editSub.id, editSubName.trim(), null)
    setEditSub(null)
  }

  async function handleSetBalance() {
    if (!editAccId) return
    const val = parseFloat(newBalance.replace(',', '.'))
    if (isNaN(val)) return
    await setAccountBalance(editAccId, val)
    setEditAccId(null)
    setNewBalance('')
  }

  async function handleExport() {
    setExporting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [txRes, incRes, baRes, ccRes, catRes, peRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id),
        supabase.from('incomes').select('*').eq('user_id', user.id),
        supabase.from('bank_accounts').select('*').eq('user_id', user.id),
        supabase.from('credit_cards').select('*').eq('user_id', user.id),
        supabase.from('categories').select('*').eq('user_id', user.id),
        supabase.from('people').select('*').eq('user_id', user.id),
      ])
      const data = {
        exported_at: new Date().toISOString(),
        transactions: txRes.data ?? [],
        incomes: incRes.data ?? [],
        bank_accounts: baRes.data ?? [],
        credit_cards: ccRes.data ?? [],
        categories: catRes.data ?? [],
        people: peRes.data ?? [],
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financas-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Contas, cartões, categorias e dados</p>
      </div>

      {/* Bank Accounts */}
      <Section title="Contas" action={
        <div className="flex gap-2">
          {bankAccounts.length >= 2 && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setTxfOpen(true)} title="Transferir">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAccOpen(true)}>
            <Plus className="h-3 w-3" /> Nova
          </Button>
        </div>
      }>
        {loading ? <Skeleton className="h-16" /> : bankAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma conta. Adicione para controlar saldos.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bankAccounts.map(acc => (
              <div key={acc.id} className="flex items-center gap-3">
                <span className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: acc.color + '22' }}>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: acc.color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{acc.name}</p>
                  {editAccId === acc.id ? (
                    <div className="mt-1 flex gap-1.5">
                      <Input type="number" step="0.01" value={newBalance}
                        onChange={e => setNewBalance(e.target.value)}
                        placeholder="Novo saldo" className="h-7 flex-1 text-xs" />
                      <Button size="sm" className="h-7 px-2" onClick={handleSetBalance}><Check className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditAccId(null)}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <p className={cn('text-xs', acc.current_balance >= 0 ? 'text-muted-foreground' : 'text-destructive')}>
                      {formatBRL(acc.current_balance)}
                    </p>
                  )}
                </div>
                {editAccId !== acc.id && (
                  <div className="flex shrink-0 gap-0.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => { setEditAccId(acc.id); setNewBalance(acc.current_balance.toString()) }}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteAccId(acc.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Credit Cards */}
      <Section title="Cartões de Crédito" action={
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
          onClick={() => { setEditCard(null); setCardOpen(true) }}>
          <Plus className="h-3 w-3" /> Novo
        </Button>
      }>
        {loading ? <Skeleton className="h-16" /> : cardAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {cardAccounts.map(card => (
              <div key={card.id} className="flex items-center gap-3">
                <span className="h-8 w-8 shrink-0 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: card.color + '22' }}>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: card.color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{card.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Fecha {card.closing_day} · Vence {card.due_day}
                    {card.bank_account && ` · ${card.bank_account.name}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => { setEditCard(card); setCardOpen(true) }}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    onClick={() => setDeleteCardId(card.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Incomes */}
      <Section title="Receitas" action={
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
          onClick={() => { setEditIncome(null); setIncOpen(true) }}>
          <Plus className="h-3 w-3" /> Nova
        </Button>
      }>
        {loading ? <Skeleton className="h-16" /> : incomes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma receita cadastrada.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {incomes.map(inc => (
              <div key={inc.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inc.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(inc.date)}{inc.is_recurring && ' · recorrente'}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold text-positive tabular-nums">
                  {formatBRL(inc.amount)}
                </span>
                <div className="flex shrink-0 gap-0.5">
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => { setEditIncome(inc); setIncOpen(true) }}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    onClick={() => setDeleteIncomeId(inc.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* People */}
      <Section title="Pessoas">
        {loading ? <Skeleton className="h-16" /> : people.length === 0 ? (
          <p className="text-sm text-muted-foreground">Adicione pessoas ao criar lançamentos de repasse ou rateio.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {people.map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{p.name}</span>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                  onClick={() => setDeletePersonId(p.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Categories */}
      <Section title="Categorias" action={
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
          onClick={() => setShowCatForm(v => !v)}>
          <Plus className="h-3 w-3" /> Nova
        </Button>
      }>
        {showCatForm && (
          <div className="mb-3 rounded-xl border border-border p-3 space-y-2">
            <Input placeholder="Nome da categoria" value={newCatName}
              onChange={e => setNewCatName(e.target.value)} className="text-sm" />
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setNewCatColor(c)}
                  className={cn('h-6 w-6 rounded-full transition-transform', newCatColor === c && 'ring-2 ring-offset-2 ring-primary scale-110')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddCategory} disabled={addingCat} className="flex-1">Criar</Button>
              <Button size="sm" variant="outline" onClick={() => setShowCatForm(false)}><X className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}

        {loading ? <Skeleton className="h-24" /> : (
          <div className="flex flex-col gap-2">
            {categories.map(cat => {
              const catSubs = subcategories.filter(s => s.category_id === cat.id)
              const isExpanded = expandedCatId === cat.id
              return (
                <div key={cat.id}>
                  {editCat?.id === cat.id ? (
                    <div className="rounded-xl border border-primary/30 p-3 space-y-2">
                      <Input value={editCatName} onChange={e => setEditCatName(e.target.value)} className="text-sm h-8" />
                      <div className="flex flex-wrap gap-1">
                        {PRESET_COLORS.map(c => (
                          <button key={c} type="button" onClick={() => setEditCatColor(c)}
                            className={cn('h-5 w-5 rounded-full', editCatColor === c && 'ring-2 ring-offset-1 ring-primary scale-110')}
                            style={{ backgroundColor: c }} />
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
                        <button type="button" onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                          className="relative h-5 w-5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }}>
                          {catSubs.length > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted-foreground text-[8px] font-bold text-background">
                              {catSubs.length}
                            </span>
                          )}
                        </button>
                        <button type="button" className="flex-1 text-left text-sm font-medium"
                          onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}>
                          {cat.name}
                        </button>
                        <div className="flex gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => { setEditCat(cat); setEditCatName(cat.name); setEditCatColor(cat.color) }}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                            onClick={() => setDeleteCatId(cat.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="ml-8 mt-2 space-y-1.5 border-l border-border pl-3">
                          {catSubs.map(sub => (
                            <div key={sub.id} className="flex items-center gap-2">
                              {editSub?.id === sub.id ? (
                                <div className="flex flex-1 gap-1.5">
                                  <Input value={editSubName} onChange={e => setEditSubName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleUpdateSubcategory()}
                                    className="h-7 flex-1 text-xs" />
                                  <Button size="sm" className="h-7 px-2" onClick={handleUpdateSubcategory}><Check className="h-3 w-3" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditSub(null)}><X className="h-3 w-3" /></Button>
                                </div>
                              ) : (
                                <>
                                  <span className="flex-1 text-xs text-muted-foreground">{sub.name}</span>
                                  <Button size="icon" variant="ghost" className="h-6 w-6"
                                    onClick={() => { setEditSub(sub); setEditSubName(sub.name) }}>
                                    <Edit2 className="h-2.5 w-2.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                                    onClick={() => setDeleteSubId(sub.id)}>
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          ))}
                          <div className="flex gap-1.5">
                            <Input placeholder="Nova subcategoria..." value={expandedCatId === cat.id ? newSubName : ''}
                              onChange={e => setNewSubName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleAddSubcategory(cat.id)}
                              className="h-7 flex-1 text-xs" />
                            <Button size="sm" className="h-7 px-2 text-xs"
                              onClick={() => handleAddSubcategory(cat.id)}
                              disabled={addingSub || !newSubName.trim()}>
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
      </Section>

      {/* Export */}
      <Section title="Dados">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Exportar backup</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Arquivo JSON com todas as transações, contas e categorias.</p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Exportar
          </Button>
        </div>
      </Section>

      {/* Sign out */}
      <Section title="Conta">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Encerrar sessão</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Sair deste dispositivo.</p>
          </div>
          <Button variant="outline" className="shrink-0 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => supabase.auth.signOut()}>
            <LogOut className="h-3.5 w-3.5" /> Sair
          </Button>
        </div>
      </Section>

      {/* Delete dialogs */}
      <AlertDialog open={!!deleteIncomeId} onOpenChange={o => !o && setDeleteIncomeId(null)}>
        <AlertDialogContent><AlertDialogHeader>
          <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader><AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => { if (deleteIncomeId) { await deleteIncome(deleteIncomeId); setDeleteIncomeId(null) } }}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePersonId} onOpenChange={o => !o && setDeletePersonId(null)}>
        <AlertDialogContent><AlertDialogHeader>
          <AlertDialogTitle>Excluir pessoa?</AlertDialogTitle>
          <AlertDialogDescription>Os lançamentos vinculados serão desconectados desta pessoa.</AlertDialogDescription>
        </AlertDialogHeader><AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => { if (deletePersonId) { await deletePerson(deletePersonId); setDeletePersonId(null) } }}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCatId} onOpenChange={o => !o && setDeleteCatId(null)}>
        <AlertDialogContent><AlertDialogHeader>
          <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
          <AlertDialogDescription>Os lançamentos desta categoria ficarão sem categoria.</AlertDialogDescription>
        </AlertDialogHeader><AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => { if (deleteCatId) { await deleteCategory(deleteCatId); setDeleteCatId(null) } }}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAccId} onOpenChange={o => !o && setDeleteAccId(null)}>
        <AlertDialogContent><AlertDialogHeader>
          <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
          <AlertDialogDescription>Os lançamentos vinculados serão desconectados desta conta.</AlertDialogDescription>
        </AlertDialogHeader><AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => { if (deleteAccId) { await deleteBankAccount(deleteAccId); setDeleteAccId(null) } }}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCardId} onOpenChange={o => !o && setDeleteCardId(null)}>
        <AlertDialogContent><AlertDialogHeader>
          <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
          <AlertDialogDescription>Os lançamentos vinculados serão desconectados deste cartão.</AlertDialogDescription>
        </AlertDialogHeader><AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => { if (deleteCardId) { await deleteCardAccount(deleteCardId); setDeleteCardId(null) } }}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSubId} onOpenChange={o => !o && setDeleteSubId(null)}>
        <AlertDialogContent><AlertDialogHeader>
          <AlertDialogTitle>Excluir subcategoria?</AlertDialogTitle>
          <AlertDialogDescription>Os lançamentos vinculados ficarão sem subcategoria.</AlertDialogDescription>
        </AlertDialogHeader><AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => { if (deleteSubId) { await deleteSubcategory(deleteSubId); setDeleteSubId(null) } }}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <IncomeForm open={incOpen} onOpenChange={open => { setIncOpen(open); if (!open) setEditIncome(null) }} editIncome={editIncome} />
      <BankAccountForm open={accOpen} onOpenChange={setAccOpen} />
      <CreditCardForm open={cardOpen} onOpenChange={open => { setCardOpen(open); if (!open) setEditCard(null) }} editCard={editCard} />
      <TransferForm open={txfOpen} onOpenChange={setTxfOpen} />
    </div>
  )
}
