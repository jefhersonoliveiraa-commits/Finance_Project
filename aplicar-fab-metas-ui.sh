#!/usr/bin/env bash
# aplicar-fab-metas-ui.sh
# - FAB global com speed-dial (Despesa / Receita / Transferência) em qualquer tela
# - Sidebar redesenhada (estado ativo, badge de rateios, seções limpas)
# - BottomNav com espaço correto pro FAB e dot de rateios pendentes
# - Dashboard: header limpo, sem botões soltos
# - Goals: tela completa (Nova Meta, Aportar, Editar, Excluir, aporte sugerido)
# - Fix: setAccountBalance não sobrescreve mais initial_balance
# Valida com build e dá push no main.
set -euo pipefail
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "ERRO: rode na raiz do repo."; exit 1; }
cd "$(git rev-parse --show-toplevel)"
STAMP="$(date +%Y%m%d-%H%M%S)"
TAG="backup/pre-fab-metas-${STAMP}"
git tag "$TAG"
echo "==> Backup: $TAG"
echo "==> src/context/FinanceContext.tsx..."
cat > src/context/FinanceContext.tsx << 'FILEOF'
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import { computeStats } from '@/lib/stats'
import { getMonthRange, capMonthDay, monthKey } from '@/lib/format'
import {
  getFirstBillingPeriod,
  addBillingPeriods,
  billingDueDate,
} from '@/lib/billing'
import { format } from 'date-fns'
import type {
  Transaction,
  Income,
  Person,
  Category,
  BankAccount,
  CardAccount,
  Transfer,
  FinanceStats,
  TransactionFormData,
  IncomeFormData,
  TransferFormData,
  CardBillPayment,
  FutureBillMonth,
  FutureBillCard,
  View,
  BudgetLimit,
  Subcategory,
} from '@/lib/types'

interface FinanceContextType {
  transactions: Transaction[]
  incomes: Income[]
  people: Person[]
  categories: Category[]
  bankAccounts: BankAccount[]
  cardAccounts: CardAccount[]
  transfers: Transfer[]
  futureBills: FutureBillMonth[]
  billPayments: CardBillPayment[]
  budgetLimits: BudgetLimit[]
  subcategories: Subcategory[]
  loading: boolean
  selectedMonth: Date
  setSelectedMonth: (date: Date) => void
  stats: FinanceStats
  reload: () => void

  addTransaction: (data: TransactionFormData) => Promise<void>
  addInstallments: (data: TransactionFormData, card: CardAccount) => Promise<void>
  updateTransaction: (id: string, data: TransactionFormData) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  deleteInstallmentGroup: (groupId: string) => Promise<void>
  markReimbursed: (transactionPersonId: string) => Promise<void>
  markUnreimbursed: (transactionPersonId: string) => Promise<void>

  addIncome: (data: IncomeFormData) => Promise<void>
  updateIncome: (id: string, data: IncomeFormData) => Promise<void>
  deleteIncome: (id: string) => Promise<void>

  addPerson: (name: string) => Promise<Person>
  deletePerson: (id: string) => Promise<void>

  addCategory: (name: string, color: string) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
  updateCategory: (id: string, name: string, color: string) => Promise<void>

  addBankAccount: (name: string, color: string, initialBalance: number) => Promise<BankAccount>
  updateBankAccount: (id: string, name: string, color: string) => Promise<void>
  deleteBankAccount: (id: string) => Promise<void>
  setAccountBalance: (id: string, balance: number) => Promise<void>

  addCardAccount: (data: Partial<CardAccount>) => Promise<CardAccount>
  updateCardAccount: (id: string, data: Partial<CardAccount>) => Promise<void>
  deleteCardAccount: (id: string) => Promise<void>

  addTransfer: (data: TransferFormData) => Promise<void>
  deleteTransfer: (id: string) => Promise<void>

  payCardBill: (cardId: string, year: number, month: number, amount: number, bankAccountId: string | null) => Promise<void>
  unpayCardBill: (cardId: string, year: number, month: number) => Promise<void>

  setBudgetLimit: (categoryId: string, limit: number, year: number, month: number) => Promise<void>
  deleteBudgetLimit: (categoryId: string, year: number, month: number) => Promise<void>
  setBudgetLimitsInBatch: (limits: {categoryId: string, limit: number}[], year: number, month: number) => Promise<void>
  copyBudgetFromMonth: (fromYear: number, fromMonth: number, toYear: number, toMonth: number) => Promise<void>

  addSubcategory: (categoryId: string, name: string, color: string | null) => Promise<Subcategory>
  updateSubcategory: (id: string, name: string, color: string | null) => Promise<void>
  deleteSubcategory: (id: string) => Promise<void>

  navigate: (view: View) => void
}

const FinanceContext = createContext<FinanceContextType | null>(null)

interface FinanceProviderProps {
  children: ReactNode
  onNavigate?: (view: View) => void
}

export function FinanceProvider({ children, onNavigate }: FinanceProviderProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [cardAccounts, setCardAccounts] = useState<CardAccount[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [futureBills, setFutureBills] = useState<FutureBillMonth[]>([])
  const [billPayments, setBillPayments] = useState<CardBillPayment[]>([])
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick(t => t + 1), [])

  // Update a bank account's balance by a delta amount
  async function deltaAccountBalance(accountId: string, delta: number) {
    if (!accountId || delta === 0) return
    const { data } = await supabase
      .from('bank_accounts')
      .select('current_balance')
      .eq('id', accountId)
      .maybeSingle()
    if (!data) return
    await supabase
      .from('bank_accounts')
      .update({ current_balance: data.current_balance + delta })
      .eq('id', accountId)
  }

  const loadData = useCallback(async (month: Date) => {
    setLoading(true)
    try {
      const { start, end } = getMonthRange(month)
      const year = month.getFullYear()
      const monthNum = month.getMonth() + 1

      // Compute next 6 billing periods from NOW (not selectedMonth) for future bills panel
      const now = new Date()
      const nowYear = now.getFullYear()
      const nowMonth = now.getMonth() + 1

      const [txRes, incRes, peopleRes, catRes, accountsRes, cardsRes, txfRes, futureTxRes, paymentsRes, budgetRes, subcatRes] = await Promise.all([
        // Load transactions: both date-based and billing-month-based for cards
        supabase
          .from('transactions')
          .select(
            '*, category:categories(*), subcategory:subcategories(*), transaction_people(*, person:people(*)), credit_card:credit_cards(*), bank_account:bank_accounts(*)',
          )
          .or(
            `and(date.gte.${start},date.lte.${end},credit_card_id.is.null),` +
            `and(billing_year.eq.${year},billing_month.eq.${monthNum},credit_card_id.not.is.null)`,
          )
          .order('date', { ascending: false }),
        supabase
          .from('incomes')
          .select('*')
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: false }),
        supabase.from('people').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('bank_accounts').select('*').order('name'),
        supabase.from('credit_cards').select('*, bank_account:bank_accounts(*)').order('name'),
        supabase
          .from('transfers')
          .select('*, from_account:bank_accounts!transfers_from_account_id_fkey(*), to_account:bank_accounts!transfers_to_account_id_fkey(*)')
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: false }),
        // Future card transactions (next 6 months from today)
        supabase
          .from('transactions')
          .select('*, subcategory:subcategories(*), credit_card:credit_cards(*)')
          .not('credit_card_id', 'is', null)
          .not('billing_year', 'is', null)
          .or(`billing_year.gt.${nowYear},and(billing_year.eq.${nowYear},billing_month.gt.${nowMonth})`)
          .order('billing_year', { ascending: true })
          .order('billing_month', { ascending: true }),
        // Bill payments
        supabase
          .from('card_bill_payments')
          .select('*')
          .order('billing_year', { ascending: true })
          .order('billing_month', { ascending: true }),
        // Budget limits
        supabase
          .from('budget_limits')
          .select('*, category:categories(*)')
          .eq('year', year)
          .eq('month', monthNum),
        // Subcategories
        supabase.from('subcategories').select('*').order('name'),
      ])

      const txData = (txRes.data || []) as Transaction[]
      const incData = (incRes.data || []) as Income[]
      const peopleData = (peopleRes.data || []) as Person[]
      const catData = (catRes.data || []) as Category[]
      const accountsData = (accountsRes.data || []) as BankAccount[]
      const cardsData = (cardsRes.data || []) as CardAccount[]
      const txfData = (txfRes.data || []) as Transfer[]
      const futureTxData = (futureTxRes.data || []) as Transaction[]
      const paymentsData = (paymentsRes.data || []) as CardBillPayment[]
      const budgetData = (budgetRes.data || []) as BudgetLimit[]
      const subcatData = (subcatRes.data || []) as Subcategory[]

      setTransactions(txData)
      setIncomes(incData)
      setPeople(peopleData)
      setCategories(catData)
      setBankAccounts(accountsData)
      setCardAccounts(cardsData)
      setTransfers(txfData)
      setBillPayments(paymentsData)
      setBudgetLimits(budgetData)
      setSubcategories(subcatData)

      // Compute future bills grouped by billing period (next 6 months)
      const paymentsSet = new Set(
        paymentsData.map(p => `${p.credit_card_id}-${p.billing_year}-${p.billing_month}`)
      )
      const futureBillsMap = new Map<string, FutureBillMonth>()
      for (const t of futureTxData) {
        if (!t.billing_year || !t.billing_month) continue
        const periodKey = `${t.billing_year}-${t.billing_month}`
        if (!futureBillsMap.has(periodKey)) {
          futureBillsMap.set(periodKey, {
            year: t.billing_year,
            month: t.billing_month,
            total: 0,
            myAmount: 0,
            aReceber: 0,
            fromInstallments: 0,
            cards: [],
          })
        }
        const period = futureBillsMap.get(periodKey)!
        period.total += t.amount
        period.myAmount += t.my_amount
        period.aReceber += (t.amount - t.my_amount)
        if (t.installment_number > 1) period.fromInstallments += t.my_amount

        // Group by card within period
        const cardId = t.credit_card_id || '__none__'
        let cardEntry = period.cards.find(c => c.cardId === cardId)
        if (!cardEntry) {
          const cardInfo = t.credit_card
          cardEntry = {
            cardId,
            cardName: cardInfo?.name || 'Sem cartão',
            cardColor: cardInfo?.color || '#6b7280',
            total: 0,
            myAmount: 0,
            aReceber: 0,
            fromInstallments: 0,
            isPaid: paymentsSet.has(`${cardId}-${t.billing_year}-${t.billing_month}`),
          } as FutureBillCard
          period.cards.push(cardEntry)
        }
        cardEntry.total += t.amount
        cardEntry.myAmount += t.my_amount
        cardEntry.aReceber += (t.amount - t.my_amount)
        if (t.installment_number > 1) cardEntry.fromInstallments += t.my_amount
      }

      // Sort by period, keep max 6
      const sortedFutureBills = Array.from(futureBillsMap.values())
        .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
        .slice(0, 6)
      setFutureBills(sortedFutureBills)

      await generateRecurring(month, txData, incData)
    } catch (err) {
      console.error('Error loading finance data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(selectedMonth)
  }, [selectedMonth, tick, loadData])

  async function generateRecurring(month: Date, existingTx: Transaction[], existingInc: Income[]) {
    const now = new Date()
    if (month > new Date(now.getFullYear(), now.getMonth(), 1)) return

    const { start } = getMonthRange(month)
    const existingGroupsTx = new Set(
      existingTx.filter(t => t.recurring_group_id).map(t => t.recurring_group_id!),
    )
    const existingGroupsInc = new Set(
      existingInc.filter(i => i.recurring_group_id).map(i => i.recurring_group_id!),
    )

    const { data: allRecurring } = await supabase
      .from('transactions')
      .select('*, transaction_people(*, person:people(*))')
      .eq('is_recurring', true)
      .not('recurring_group_id', 'is', null)
      .lt('date', start)

    if (allRecurring && allRecurring.length > 0) {
      const latestByGroup = new Map<string, Transaction>()
      for (const t of allRecurring as Transaction[]) {
        const gid = t.recurring_group_id!
        const ex = latestByGroup.get(gid)
        if (!ex || new Date(t.date) > new Date(ex.date)) latestByGroup.set(gid, t)
      }
      for (const [gid, template] of latestByGroup) {
        if (existingGroupsTx.has(gid)) continue
        const day = template.recurring_day || new Date(template.date + 'T12:00:00').getDate()
        const newDate = capMonthDay(month, day)
        const dateStr = format(newDate, 'yyyy-MM-dd')
        const { data: newTx } = await supabase
          .from('transactions')
          .insert({
            date: dateStr,
            description: template.description,
            amount: template.amount,
            my_amount: template.my_amount,
            method: template.method,
            type: template.type,
            category_id: template.category_id,
            bank_account_id: template.bank_account_id,
            credit_card_id: template.credit_card_id,
            billing_year: template.credit_card_id ? newDate.getFullYear() : null,
            billing_month: template.credit_card_id ? newDate.getMonth() + 1 : null,
            is_recurring: true,
            recurring_day: day,
            recurring_group_id: gid,
            notes: template.notes,
          })
          .select()
          .maybeSingle()
        if (newTx && template.transaction_people?.length) {
          await supabase.from('transaction_people').insert(
            template.transaction_people.map((tp: { person_id: string; amount: number }) => ({
              transaction_id: newTx.id,
              person_id: tp.person_id,
              amount: tp.amount,
              reimbursement_status: 'pending',
            })),
          )
        }
      }
    }

    const { data: allRecurringInc } = await supabase
      .from('incomes')
      .select('*')
      .eq('is_recurring', true)
      .not('recurring_group_id', 'is', null)
      .lt('date', start)
    if (allRecurringInc && allRecurringInc.length > 0) {
      const latestByGroup = new Map<string, Income>()
      for (const i of allRecurringInc as Income[]) {
        const gid = i.recurring_group_id!
        const ex = latestByGroup.get(gid)
        if (!ex || new Date(i.date) > new Date(ex.date)) latestByGroup.set(gid, i)
      }
      for (const [gid, template] of latestByGroup) {
        if (existingGroupsInc.has(gid)) continue
        const day = template.recurring_day || new Date(template.date + 'T12:00:00').getDate()
        const newDate = capMonthDay(month, day)
        await supabase.from('incomes').insert({
          date: format(newDate, 'yyyy-MM-dd'),
          description: template.description,
          amount: template.amount,
          is_recurring: true,
          recurring_day: day,
          recurring_group_id: gid,
          bank_account_id: template.bank_account_id,
        })
      }
    }

    // Refetch after generating
    const { start: s2, end: e2 } = getMonthRange(month)
    const yr = month.getFullYear()
    const mo = month.getMonth() + 1
    const [freshTx, freshInc] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, category:categories(*), subcategory:subcategories(*), transaction_people(*, person:people(*)), credit_card:credit_cards(*), bank_account:bank_accounts(*)')
        .or(`and(date.gte.${s2},date.lte.${e2},credit_card_id.is.null),and(billing_year.eq.${yr},billing_month.eq.${mo},credit_card_id.not.is.null)`)
        .order('date', { ascending: false }),
      supabase.from('incomes').select('*').gte('date', s2).lte('date', e2).order('date', { ascending: false }),
    ])
    if (freshTx.data) setTransactions(freshTx.data as Transaction[])
    if (freshInc.data) setIncomes(freshInc.data as Income[])
  }

  const stats = useMemo(
    () => computeStats(transactions, incomes, people, categories, cardAccounts),
    [transactions, incomes, people, categories, cardAccounts],
  )

  // ─── Transactions ────────────────────────────────────────────────
  const addTransaction = async (data: TransactionFormData) => {
    const { people_splits, id: _id, ...rest } = data
    let groupId = rest.recurring_group_id
    if (rest.is_recurring && !groupId) groupId = crypto.randomUUID()

    const { data: newTx, error } = await supabase
      .from('transactions')
      .insert({ ...rest, recurring_group_id: groupId })
      .select()
      .maybeSingle()
    if (error) throw error
    if (!newTx) throw new Error('Failed to create transaction')

    if (people_splits.length > 0) {
      await supabase.from('transaction_people').insert(
        people_splits.map(s => ({
          transaction_id: newTx.id,
          person_id: s.person_id,
          amount: s.amount,
          reimbursement_status: 'pending',
        })),
      )
    }

    // Update account balance for non-card expenses
    if (rest.bank_account_id && rest.method !== 'credit_card') {
      await deltaAccountBalance(rest.bank_account_id, -rest.amount)
    }
    reload()
  }

  const addInstallments = async (data: TransactionFormData, card: CardAccount) => {
    const { people_splits, id: _id, installment_count, amount, my_amount, purchase_date, ...rest } = data
    const n = installment_count || 1

    if (n === 1) {
      // Single card purchase
      const purchDate = purchase_date || rest.date
      const [year, monthStr, day] = purchDate.split('-').map(Number)
      const firstPeriod = getFirstBillingPeriod(new Date(year, monthStr - 1, day), card.closing_day)
      const dueDate = billingDueDate(firstPeriod, card.due_day)
      await addTransaction({
        ...data,
        date: dueDate,
        purchase_date: purchDate,
        billing_year: firstPeriod.year,
        billing_month: firstPeriod.month,
        installment_count: 1,
        installment_number: 1,
        installment_group_id: null,
      })
      return
    }

    // Multiple installments — last installment absorbs rounding cents
    const groupId = crypto.randomUUID()
    const purchDate = purchase_date || rest.date
    const [year, monthStr, day] = purchDate.split('-').map(Number)
    const firstPeriod = getFirstBillingPeriod(new Date(year, monthStr - 1, day), card.closing_day)
    const perAmount = Math.round((amount / n) * 100) / 100
    const perMyAmount = Math.round((my_amount / n) * 100) / 100

    for (let i = 0; i < n; i++) {
      const isLast = i === n - 1
      const installmentAmount = isLast
        ? Math.round((amount - perAmount * (n - 1)) * 100) / 100
        : perAmount
      const installmentMyAmount = isLast
        ? Math.round((my_amount - perMyAmount * (n - 1)) * 100) / 100
        : perMyAmount

      const period = addBillingPeriods(firstPeriod, i)
      const dueDate = billingDueDate(period, card.due_day)

      const { data: newTx, error } = await supabase
        .from('transactions')
        .insert({
          ...rest,
          date: dueDate,
          purchase_date: purchDate,
          amount: installmentAmount,
          my_amount: installmentMyAmount,
          billing_year: period.year,
          billing_month: period.month,
          installment_count: n,
          installment_number: i + 1,
          installment_group_id: groupId,
          is_recurring: false,
          recurring_group_id: null,
        })
        .select()
        .maybeSingle()
      if (error) throw error
      if (!newTx) continue

      if (people_splits.length > 0) {
        const perSplit = people_splits.map(s => {
          const splitPer = Math.round((s.amount / n) * 100) / 100
          return {
            transaction_id: newTx.id,
            person_id: s.person_id,
            amount: isLast
              ? Math.round((s.amount - splitPer * (n - 1)) * 100) / 100
              : splitPer,
            reimbursement_status: 'pending',
          }
        })
        await supabase.from('transaction_people').insert(perSplit)
      }
    }
    reload()
  }

  const updateTransaction = async (id: string, data: TransactionFormData) => {
    const { people_splits, id: _id, ...rest } = data

    // Reverse old balance impact
    const { data: oldTx } = await supabase
      .from('transactions')
      .select('bank_account_id, amount, method')
      .eq('id', id)
      .maybeSingle()
    if (oldTx?.bank_account_id && oldTx.method !== 'credit_card') {
      await deltaAccountBalance(oldTx.bank_account_id, oldTx.amount)
    }

    const { error } = await supabase.from('transactions').update(rest).eq('id', id)
    if (error) throw error

    await supabase.from('transaction_people').delete().eq('transaction_id', id)
    if (people_splits.length > 0) {
      await supabase.from('transaction_people').insert(
        people_splits.map(s => ({
          transaction_id: id,
          person_id: s.person_id,
          amount: s.amount,
          reimbursement_status: 'pending',
        })),
      )
    }

    // Apply new balance impact
    if (rest.bank_account_id && rest.method !== 'credit_card') {
      await deltaAccountBalance(rest.bank_account_id, -rest.amount)
    }
    reload()
  }

  const deleteTransaction = async (id: string) => {
    const { data: tx } = await supabase
      .from('transactions')
      .select('bank_account_id, amount, method')
      .eq('id', id)
      .maybeSingle()
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
    if (tx?.bank_account_id && tx.method !== 'credit_card') {
      await deltaAccountBalance(tx.bank_account_id, tx.amount)
    }
    reload()
  }

  const deleteInstallmentGroup = async (groupId: string) => {
    // Get all transactions in group to reverse balances
    const { data: txs } = await supabase
      .from('transactions')
      .select('bank_account_id, amount, method')
      .eq('installment_group_id', groupId)
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('installment_group_id', groupId)
    if (error) throw error
    if (txs) {
      for (const tx of txs) {
        if (tx.bank_account_id && tx.method !== 'credit_card') {
          await deltaAccountBalance(tx.bank_account_id, tx.amount)
        }
      }
    }
    reload()
  }

  const markReimbursed = async (id: string) => {
    await supabase
      .from('transaction_people')
      .update({ reimbursement_status: 'received', received_at: new Date().toISOString() })
      .eq('id', id)
    reload()
  }

  const markUnreimbursed = async (id: string) => {
    await supabase
      .from('transaction_people')
      .update({ reimbursement_status: 'pending', received_at: null })
      .eq('id', id)
    reload()
  }

  // ─── Incomes ─────────────────────────────────────────────────────
  const addIncome = async (data: IncomeFormData) => {
    const { id: _id, ...rest } = data
    let groupId = rest.recurring_group_id
    if (rest.is_recurring && !groupId) groupId = crypto.randomUUID()
    const { data: newInc, error } = await supabase
      .from('incomes')
      .insert({ ...rest, recurring_group_id: groupId })
      .select()
      .maybeSingle()
    if (error) throw error
    if (newInc?.bank_account_id) {
      await deltaAccountBalance(newInc.bank_account_id, newInc.amount)
    }
    reload()
  }

  const updateIncome = async (id: string, data: IncomeFormData) => {
    const { id: _id, ...rest } = data
    const { data: oldInc } = await supabase
      .from('incomes')
      .select('bank_account_id, amount')
      .eq('id', id)
      .maybeSingle()
    if (oldInc?.bank_account_id) {
      await deltaAccountBalance(oldInc.bank_account_id, -oldInc.amount)
    }
    const { error } = await supabase.from('incomes').update(rest).eq('id', id)
    if (error) throw error
    if (rest.bank_account_id) {
      await deltaAccountBalance(rest.bank_account_id, rest.amount)
    }
    reload()
  }

  const deleteIncome = async (id: string) => {
    const { data: inc } = await supabase
      .from('incomes')
      .select('bank_account_id, amount')
      .eq('id', id)
      .maybeSingle()
    const { error } = await supabase.from('incomes').delete().eq('id', id)
    if (error) throw error
    if (inc?.bank_account_id) {
      await deltaAccountBalance(inc.bank_account_id, -inc.amount)
    }
    reload()
  }

  // ─── People ──────────────────────────────────────────────────────
  const addPerson = async (name: string): Promise<Person> => {
    const { data, error } = await supabase.from('people').insert({ name }).select().maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Failed to create person')
    setPeople(prev => [...prev, data as Person].sort((a, b) => a.name.localeCompare(b.name)))
    return data as Person
  }

  const deletePerson = async (id: string) => {
    const { error } = await supabase.from('people').delete().eq('id', id)
    if (error) throw error
    reload()
  }

  // ─── Categories ──────────────────────────────────────────────────
  const addCategory = async (name: string, color: string): Promise<Category> => {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, color })
      .select()
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Failed to create category')
    setCategories(prev =>
      [...prev, data as Category].sort((a, b) => a.name.localeCompare(b.name)),
    )
    return data as Category
  }

  const deleteCategory = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id)
    reload()
  }

  const updateCategory = async (id: string, name: string, color: string) => {
    await supabase.from('categories').update({ name, color }).eq('id', id)
    reload()
  }

  // ─── Bank Accounts ───────────────────────────────────────────────
  const addBankAccount = async (
    name: string,
    color: string,
    initialBalance: number,
  ): Promise<BankAccount> => {
    const { data, error } = await supabase
      .from('bank_accounts')
      .insert({ name, color, initial_balance: initialBalance, current_balance: initialBalance })
      .select()
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Failed to create bank account')
    setBankAccounts(prev => [...prev, data as BankAccount].sort((a, b) => a.name.localeCompare(b.name)))
    return data as BankAccount
  }

  const updateBankAccount = async (id: string, name: string, color: string) => {
    await supabase.from('bank_accounts').update({ name, color }).eq('id', id)
    reload()
  }

  const deleteBankAccount = async (id: string) => {
    await supabase.from('bank_accounts').delete().eq('id', id)
    reload()
  }

  const setAccountBalance = async (id: string, balance: number) => {
    await supabase
      .from('bank_accounts')
      .update({ current_balance: balance })
      .eq('id', id)
    reload()
  }

  // ─── Card Accounts ───────────────────────────────────────────────
  const addCardAccount = async (data: Partial<CardAccount>): Promise<CardAccount> => {
    const { data: result, error } = await supabase
      .from('credit_cards')
      .insert(data)
      .select()
      .maybeSingle()
    if (error) throw error
    if (!result) throw new Error('Failed to create card')
    setCardAccounts(prev => [...prev, result as CardAccount].sort((a, b) => a.name.localeCompare(b.name)))
    return result as CardAccount
  }

  const updateCardAccount = async (id: string, data: Partial<CardAccount>) => {
    await supabase.from('credit_cards').update(data).eq('id', id)
    reload()
  }

  const deleteCardAccount = async (id: string) => {
    await supabase.from('credit_cards').delete().eq('id', id)
    reload()
  }

  // ─── Transfers ───────────────────────────────────────────────────
  const addTransfer = async (data: TransferFormData) => {
    const { error } = await supabase.from('transfers').insert(data)
    if (error) throw error
    await deltaAccountBalance(data.from_account_id, -data.amount)
    await deltaAccountBalance(data.to_account_id, data.amount)
    reload()
  }

  const deleteTransfer = async (id: string) => {
    const { data: txf } = await supabase
      .from('transfers')
      .select('from_account_id, to_account_id, amount')
      .eq('id', id)
      .maybeSingle()
    const { error } = await supabase.from('transfers').delete().eq('id', id)
    if (error) throw error
    if (txf) {
      await deltaAccountBalance(txf.from_account_id, txf.amount)
      await deltaAccountBalance(txf.to_account_id, -txf.amount)
    }
    reload()
  }

  // ─── Card Bill Payments ──────────────────────────────────────────
  const payCardBill = async (cardId: string, year: number, month: number, amount: number, bankAccountId: string | null) => {
    const { error } = await supabase.from('card_bill_payments').upsert({
      credit_card_id: cardId,
      billing_year: year,
      billing_month: month,
      amount,
      bank_account_id: bankAccountId,
      paid_at: new Date().toISOString(),
    }, { onConflict: 'credit_card_id,billing_year,billing_month' })
    if (error) throw error
    if (bankAccountId) {
      await deltaAccountBalance(bankAccountId, -amount)
    }
    reload()
  }

  // ─── Budget Limits ──────────────────────────────────────────────
  const setBudgetLimit = async (categoryId: string, limit: number, year: number, month: number) => {
    const { error } = await supabase
      .from('budget_limits')
      .upsert({ category_id: categoryId, monthly_limit: limit, year, month, updated_at: new Date().toISOString() }, { onConflict: 'category_id,year,month' })
    if (error) throw error
    reload()
  }

  const deleteBudgetLimit = async (categoryId: string, year: number, month: number) => {
    const { error } = await supabase
      .from('budget_limits')
      .delete()
      .eq('category_id', categoryId)
      .eq('year', year)
      .eq('month', month)
    if (error) throw error
    reload()
  }

  const setBudgetLimitsInBatch = async (limits: {categoryId: string, limit: number}[], year: number, month: number) => {
    const rows = limits.filter(l => l.limit > 0).map(l => ({
      category_id: l.categoryId,
      monthly_limit: l.limit,
      year,
      month,
      updated_at: new Date().toISOString(),
    }))
    if (rows.length === 0) return
    const { error } = await supabase
      .from('budget_limits')
      .upsert(rows, { onConflict: 'category_id,year,month' })
    if (error) throw error
    reload()
  }

  const copyBudgetFromMonth = async (fromYear: number, fromMonth: number, toYear: number, toMonth: number) => {
    const { data: sourceLimits } = await supabase
      .from('budget_limits')
      .select('category_id, monthly_limit')
      .eq('year', fromYear)
      .eq('month', fromMonth)
    if (!sourceLimits || sourceLimits.length === 0) return
    const rows = sourceLimits.map(l => ({
      category_id: l.category_id,
      monthly_limit: l.monthly_limit,
      year: toYear,
      month: toMonth,
      updated_at: new Date().toISOString(),
    }))
    const { error } = await supabase
      .from('budget_limits')
      .upsert(rows, { onConflict: 'category_id,year,month' })
    if (error) throw error
    reload()
  }

  // ─── Subcategories ──────────────────────────────────────────────
  const addSubcategory = async (categoryId: string, name: string, color: string | null): Promise<Subcategory> => {
    const { data, error } = await supabase
      .from('subcategories')
      .insert({ category_id: categoryId, name, color })
      .select()
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Failed to create subcategory')
    setSubcategories(prev => [...prev, data as Subcategory].sort((a, b) => a.name.localeCompare(b.name)))
    return data as Subcategory
  }

  const updateSubcategory = async (id: string, name: string, color: string | null) => {
    await supabase.from('subcategories').update({ name, color }).eq('id', id)
    reload()
  }

  const deleteSubcategory = async (id: string) => {
    await supabase.from('subcategories').delete().eq('id', id)
    reload()
  }

  const unpayCardBill = async (cardId: string, year: number, month: number) => {
    const { data: payment } = await supabase
      .from('card_bill_payments')
      .select('amount, bank_account_id')
      .eq('credit_card_id', cardId)
      .eq('billing_year', year)
      .eq('billing_month', month)
      .maybeSingle()
    const { error } = await supabase
      .from('card_bill_payments')
      .delete()
      .eq('credit_card_id', cardId)
      .eq('billing_year', year)
      .eq('billing_month', month)
    if (error) throw error
    if (payment?.bank_account_id) {
      await deltaAccountBalance(payment.bank_account_id, payment.amount)
    }
    reload()
  }

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        incomes,
        people,
        categories,
        bankAccounts,
        cardAccounts,
        transfers,
        futureBills,
        billPayments,
        budgetLimits,
        subcategories,
        loading,
        selectedMonth,
        setSelectedMonth,
        stats,
        reload,
        addTransaction,
        addInstallments,
        updateTransaction,
        deleteTransaction,
        deleteInstallmentGroup,
        markReimbursed,
        markUnreimbursed,
        addIncome,
        updateIncome,
        deleteIncome,
        addPerson,
        deletePerson,
        addCategory,
        deleteCategory,
        updateCategory,
        addBankAccount,
        updateBankAccount,
        deleteBankAccount,
        setAccountBalance,
        addCardAccount,
        updateCardAccount,
        deleteCardAccount,
        addTransfer,
        deleteTransfer,
        payCardBill,
        unpayCardBill,

        setBudgetLimit,
        deleteBudgetLimit,
        setBudgetLimitsInBatch,
        copyBudgetFromMonth,

        addSubcategory,
        updateSubcategory,
        deleteSubcategory,

        navigate: onNavigate || (() => {}),
      }}
    >
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance(): FinanceContextType {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider')
  return ctx
}

export function useMonthKey() {
  const { selectedMonth } = useFinance()
  return monthKey(selectedMonth)
}
FILEOF

echo "==> src/components/layout/AppLayout.tsx..."
cat > src/components/layout/AppLayout.tsx << 'FILEOF'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { GlobalFAB } from './GlobalFAB'
import type { View } from '@/lib/types'

interface AppLayoutProps {
  children: React.ReactNode
  currentView: View
  onNavigate: (view: View) => void
}

export function AppLayout({ children, currentView, onNavigate }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-full bg-background antialiased overflow-hidden text-foreground">
      <Sidebar currentView={currentView} onNavigate={onNavigate} />
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-24 md:pb-6 relative">
        <div className="max-w-5xl w-full mx-auto p-4 md:p-6 space-y-5">
          {children}
        </div>
      </main>
      <BottomNav currentView={currentView} onNavigate={onNavigate} />
      <GlobalFAB />
    </div>
  )
}
FILEOF

echo "==> src/components/layout/Sidebar.tsx..."
cat > src/components/layout/Sidebar.tsx << 'FILEOF'
import {
  LayoutDashboard, ArrowLeftRight, Users, CreditCard,
  Layers, Settings, PieChart, Target,
} from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { cn } from '@/lib/utils'
import type { View } from '@/lib/types'

interface SidebarProps {
  currentView: View
  onNavigate: (view: View) => void
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const { stats } = useFinance()
  const pendingRateios = stats?.aReceberPending ?? 0

  const navItem = (
    id: View,
    icon: React.ReactNode,
    label: string,
    badge?: React.ReactNode,
  ) => {
    const isActive = currentView === id
    return (
      <button
        key={id}
        onClick={() => onNavigate(id)}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-left text-sm font-medium',
          isActive
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
        )}
      >
        <span className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
          isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground',
        )}>
          {icon}
        </span>
        <span className="flex-1 truncate">{label}</span>
        {badge}
      </button>
    )
  }

  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-border/60 bg-card/50 backdrop-blur-xl p-4 h-full shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 px-2 mt-1">
        <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-lg">
          <Layers className="w-4 h-4 text-primary" />
        </div>
        <span className="font-bold text-base tracking-tight">Finanças</span>
      </div>

      {/* Principal */}
      <p className="text-[10px] uppercase font-bold tracking-widest text-tertiary mb-2 px-2">Principal</p>
      <nav className="flex flex-col gap-0.5 mb-6">
        {navItem('dashboard', <LayoutDashboard className="w-4 h-4" />, 'Dashboard')}
        {navItem('transactions', <ArrowLeftRight className="w-4 h-4" />, 'Lançamentos')}
        {navItem(
          'receivables',
          <Users className="w-4 h-4" />,
          'Acertos & Rateios',
          pendingRateios > 0 && (
            <span className="ml-auto rounded-md bg-warning/20 px-1.5 py-0.5 text-[10px] font-bold text-warning">
              {pendingRateios > 99 ? '99+' : pendingRateios}
            </span>
          ),
        )}
      </nav>

      {/* Gestão */}
      <p className="text-[10px] uppercase font-bold tracking-widest text-tertiary mb-2 px-2">Gestão</p>
      <nav className="flex flex-col gap-0.5 mb-6">
        {navItem('budget',      <PieChart    className="w-4 h-4" />, 'Orçamentos')}
        {navItem('credit-card', <CreditCard  className="w-4 h-4" />, 'Cartões')}
        {navItem('goals',       <Target      className="w-4 h-4" />, 'Metas')}
      </nav>

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-0.5">
        <div className="mb-2 h-px bg-border/60" />
        {navItem('settings', <Settings className="w-4 h-4" />, 'Configurações')}
      </div>
    </aside>
  )
}
FILEOF

echo "==> src/components/layout/BottomNav.tsx..."
cat > src/components/layout/BottomNav.tsx << 'FILEOF'
import { LayoutDashboard, ArrowLeftRight, Users, LayoutGrid } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { cn } from '@/lib/utils'
import type { View } from '@/lib/types'

interface BottomNavProps {
  currentView: View
  onNavigate: (view: View) => void
}

export function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  const { stats } = useFinance()
  const pendingRateios = stats?.aReceberPending ?? 0

  const navItem = (id: View, icon: React.ReactNode, label: string, badge?: boolean) => {
    const isActive = currentView === id
    return (
      <button
        onClick={() => onNavigate(id)}
        className={cn(
          'relative flex flex-col items-center gap-1 transition-all w-14',
          isActive ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <span className={cn(
          'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
          isActive && 'bg-primary/15',
        )}>
          {icon}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wide leading-none">{label}</span>
        {badge && (
          <span className="absolute top-0 right-1.5 h-2 w-2 rounded-full bg-warning border-2 border-background" />
        )}
      </button>
    )
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full z-40">
      <nav className="glass-card border-t border-border/60 flex items-center justify-around px-2 pt-2 pb-safe" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {navItem('dashboard',    <LayoutDashboard className="w-5 h-5" />, 'Início')}
        {navItem('transactions', <ArrowLeftRight  className="w-5 h-5" />, 'Trans.')}

        {/* Espaço pro FAB */}
        <div className="w-14" />

        {navItem('receivables', <Users      className="w-5 h-5" />, 'Rateio', pendingRateios > 0)}
        {navItem('settings',    <LayoutGrid className="w-5 h-5" />, 'Menu')}
      </nav>
    </div>
  )
}
FILEOF

echo "==> src/pages/Dashboard.tsx..."
cat > src/pages/Dashboard.tsx << 'FILEOF'
import { useState } from 'react'
import {
  CreditCard,
  CalendarDays,
  Users,
  Wallet,
  Repeat,
  Target,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MonthSelector } from '@/components/layout/MonthSelector'
import { useFinance } from '@/context/FinanceContext'
import { formatBRL, formatDate } from '@/lib/format'
import { billingPeriodLabel } from '@/lib/billing'
import { getCategoryIcon } from '@/lib/category-icons'
import { cn } from '@/lib/utils'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { PieChart, Pie, Cell } from 'recharts'
import type { ChartConfig } from '@/components/ui/chart'
import { METHOD_LABELS } from '@/lib/types'
import type { CategoryStat, BankAccount, Transaction, PersonReceivable, BudgetLimit } from '@/lib/types'

export function Dashboard() {
  const { transactions, incomes, loading, stats, bankAccounts, futureBills, budgetLimits, navigate } = useFinance()
  const [viewMode, setViewMode] = useState<'mine' | 'overview'>('mine')

  const {
    gastoBruto,
    gastoRealMeu,
    totalIncome,
    aReceberPending,
    aReceberByPerson,
    byCategory,
    byMethod,
    cardBills,
    subscriptions,
    annualSubscriptionsTotal,
  } = stats

  const recentTx = transactions.slice(0, 5)
  const totalBalance = bankAccounts.reduce((s, a) => s + a.current_balance, 0)
  const futureCommitted = futureBills.reduce((s, b) => s + b.myAmount, 0)
  const pendingPeople = aReceberByPerson.filter(p => p.totalPending > 0)
  const isMine = viewMode === 'mine'
  const displayedGasto = isMine ? gastoRealMeu : gastoBruto
  const displayedSobra = totalIncome - displayedGasto
  const positive = displayedSobra >= 0

  // Margem projetada — próximos 3 meses (renda recorrente vs compromissos)
  const recurringIncome = incomes.filter(i => i.is_recurring).reduce((s, i) => s + i.amount, 0)
  const recurringSpend = transactions
    .filter(t => t.is_recurring)
    .reduce((s, t) => s + (isMine ? t.my_amount : t.amount), 0)
  const today = new Date()
  const forwardMonths = [1, 2, 3].map(offset => {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const fb = futureBills.find(f => f.year === year && f.month === month)
    const installments = fb ? (isMine ? fb.myAmount : fb.total) : 0
    const committedTotal = installments + recurringSpend
    const label = d.toLocaleDateString('pt-BR', { month: 'long' })
    return {
      year,
      month,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      committedTotal,
      margin: recurringIncome - committedTotal,
    }
  })
  const showForward = recurringIncome > 0 || forwardMonths.some(m => m.committedTotal > 0)

  // Budget summary
  const limitMap = new Map(budgetLimits.map((b: BudgetLimit) => [b.category_id, b.monthly_limit]))
  const budgetCategories = byCategory.filter((c: CategoryStat) => c.category && limitMap.has(c.category.id))
  const totalBudgeted = budgetCategories.reduce((s: number, c: CategoryStat) => s + limitMap.get(c.category!.id)!, 0)
  const totalSpentOnBudgeted = budgetCategories.reduce((s: number, c: CategoryStat) => s + c.myAmount, 0)
  const budgetOverCount = budgetCategories.filter((c: CategoryStat) => c.myAmount > limitMap.get(c.category!.id)!).length

  const chartData = byCategory.slice(0, 6).map((c: CategoryStat) => ({
    name: c.label,
    value: isMine ? c.myAmount : c.amount,
    color: c.color,
  }))

  const chartConfig: ChartConfig = {
    value: { label: 'Gasto' },
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral das suas finanças</p>
        </div>
        <MonthSelector />
      </div>

      {/* Toggle: Apenas meu / Visão geral */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setViewMode('mine')}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
              isMine ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
            )}
          >
            Apenas meu
          </button>
          <button
            type="button"
            onClick={() => setViewMode('overview')}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
              !isMine ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
            )}
          >
            Visão geral
          </button>
        </div>
        <span className="text-[11px] text-tertiary">
          {isMine ? 'Só o que é seu' : 'Tudo que passou pela conta'}
        </span>
      </div>

      {/* HERO — Sobra Real */}
      {loading ? (
        <Skeleton className="h-40 rounded-3xl" />
      ) : (
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{isMine ? 'Sobra real do mês' : 'Sobra bruta do mês'}</span>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{
                background: positive ? 'var(--positive)' : 'var(--destructive)',
                color: positive ? 'var(--positive-foreground)' : 'var(--destructive-foreground)',
              }}
            >
              {positive ? 'no azul' : 'no vermelho'}
            </span>
          </div>
          <p
            className={cn(
              'mt-3 font-mono text-[2.75rem] font-bold tabular-nums leading-none',
              positive ? 'text-foreground' : 'text-destructive',
            )}
          >
            {formatBRL(displayedSobra)}
          </p>
          <div className="mt-6 flex items-end justify-between border-t border-border pt-4">
            <div>
              <p className="text-[11px] text-tertiary">Entrou</p>
              <p className="mt-0.5 font-mono text-lg font-semibold text-positive tabular-nums">
                +{formatBRL(totalIncome)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-tertiary">{isMine ? 'Gasto seu' : 'Gasto bruto'}</p>
              <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums">
                {formatBRL(displayedGasto)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Secondary metrics */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <SmallMetric label={isMine ? 'Gasto bruto' : 'Gasto seu'} value={isMine ? gastoBruto : gastoRealMeu} />
          <SmallMetric label="A receber" value={aReceberPending} highlight={aReceberPending > 0} />
          <SmallMetric label="Próx. faturas" value={futureCommitted} />
        </div>
      )}

      {/* Margem projetada — próximos 3 meses */}
      {!loading && showForward && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Margem projetada · próximos 3 meses
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {forwardMonths.map(m => {
              const pos = m.margin >= 0
              return (
                <div key={`${m.year}-${m.month}`} className="rounded-xl border border-border bg-secondary/40 p-3">
                  <p className="text-[11px] text-tertiary">{m.label}</p>
                  <p
                    className={cn(
                      'mt-1 font-mono text-base font-bold tabular-nums leading-none',
                      pos ? 'text-positive' : 'text-destructive',
                    )}
                  >
                    {formatBRL(m.margin)}
                  </p>
                  <p className="mt-1.5 text-[10px] text-tertiary">
                    comprometido {formatBRL(m.committedTotal)}
                  </p>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[10px] leading-snug text-tertiary">
            Renda recorrente de {formatBRL(recurringIncome)}/mês menos parcelas e assinaturas já comprometidas. Antes do gasto variável.
          </p>
        </div>
      )}

      {/* Budget quick summary */}
      {!loading && budgetLimits.length > 0 && (
        <button
          type="button"
          className="w-full text-left rounded-2xl border border-border bg-card p-4 active:opacity-80 transition-opacity"
          onClick={() => navigate('budget')}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Target className="h-4 w-4" />
              Orçamento do Mês
            </span>
            {budgetOverCount > 0 && (
              <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[11px] font-semibold">
                {budgetOverCount} estouro{budgetOverCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {budgetCategories.slice(0, 3).map((c: CategoryStat) => {
            const limit = limitMap.get(c.category!.id)!
            const pct = Math.min((c.myAmount / limit) * 100, 100)
            const over = c.myAmount > limit
            const warn = !over && c.myAmount / limit >= 0.8
            return (
              <div key={c.category!.id} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-muted-foreground w-24 truncate">{c.category!.name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      over ? 'bg-destructive' : warn ? 'bg-amber-500' : 'bg-emerald-500',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums font-mono text-muted-foreground w-16 text-right">
                  {formatBRL(c.myAmount)}
                </span>
              </div>
            )
          })}
          {budgetCategories.length > 3 && (
            <p className="text-[11px] text-muted-foreground mt-2">
              +{budgetCategories.length - 3} categoria{budgetCategories.length - 3 !== 1 ? 's' : ''} mais — ver tudo
            </p>
          )}
          {budgetCategories.length <= 3 && (
            <div className="flex justify-between border-t border-border pt-2 mt-1">
              <span className="text-xs text-muted-foreground">Total orçado</span>
              <span className="font-mono text-xs font-semibold tabular-nums">
                {formatBRL(totalSpentOnBudgeted)} / {formatBRL(totalBudgeted)}
              </span>
            </div>
          )}
        </button>
      )}

      {/* Account balances */}
      {!loading && bankAccounts.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Contas
            </span>
            <span className="font-mono text-sm font-bold tabular-nums">{formatBRL(totalBalance)}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {bankAccounts.map(acc => (
              <AccountBalanceChip key={acc.id} account={acc} />
            ))}
          </div>
        </div>
      )}

      {/* A RECEBER — prominent */}
      {!loading && pendingPeople.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Users className="h-4 w-4" />
              Quem te deve
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pb-4">
            {pendingPeople.map((pr: PersonReceivable) => (
              <div key={pr.person.id} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: 'var(--icon-bg)', color: 'var(--accent-foreground)' }}>
                  {pr.person.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 truncate text-sm font-medium">{pr.person.name}</span>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold tabular-nums text-amber-400">
                    {formatBRL(pr.totalPending)}
                  </p>
                  <p className="text-[10px] text-tertiary">pendente</p>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-2.5">
              <span className="text-xs text-muted-foreground">Total a receber</span>
              <span className="font-mono text-sm font-bold tabular-nums text-amber-400">
                {formatBRL(aReceberPending)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card bills summary */}
      {!loading && cardBills.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Faturas do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {cardBills.map(bill => (
              <div key={bill.card.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bill.card.color }} />
                  <span className="text-sm">{bill.card.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-semibold tabular-nums">{formatBRL(bill.myAmount)}</span>
                  {bill.total !== bill.myAmount && (
                    <span className="ml-1 text-xs text-muted-foreground">({formatBRL(bill.total)} bruto)</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Future bills panel */}
      {!loading && futureBills.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Próximas Faturas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {futureBills.slice(0, 4).map(bill => (
              <div key={`${bill.year}-${bill.month}`} className="flex items-center justify-between">
                <span className="text-sm capitalize text-muted-foreground">
                  {billingPeriodLabel(bill.year, bill.month)}
                </span>
                <div className="text-right">
                  <span className="font-mono text-sm font-semibold tabular-nums">{formatBRL(bill.myAmount)}</span>
                  {bill.fromInstallments > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">{formatBRL(bill.fromInstallments)} parc.</span>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-xs text-muted-foreground">Total comprometido</span>
              <span className="font-mono text-sm font-bold tabular-nums text-primary">
                {formatBRL(futureCommitted)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions annual summary */}
      {!loading && subscriptions.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Repeat className="h-4 w-4" />
              Assinaturas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {subscriptions.slice(0, 4).map((sub, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  {sub.card && (
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: sub.card.color }} />
                  )}
                  <span className="truncate">{sub.description}</span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-mono font-medium tabular-nums">{formatBRL(sub.monthlyAmount)}/mês</span>
                  <span className="ml-1 text-xs text-muted-foreground">({formatBRL(sub.annualAmount)}/ano)</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-xs text-muted-foreground">Total anual</span>
              <span className="font-mono text-sm font-bold tabular-nums text-primary">{formatBRL(annualSubscriptionsTotal)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category donut chart - Pierre style */}
      {!loading && chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center gap-4">
              <div className="relative h-[140px] w-[140px] shrink-0">
                <ChartContainer config={chartConfig} className="h-[140px] w-[140px]">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatBRL(Number(v))} />} />
                  </PieChart>
                </ChartContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-tertiary">Total</span>
                  <span className="font-mono text-sm font-bold tabular-nums">{formatBRL(displayedGasto)}</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                {byCategory.slice(0, 5).map((c: CategoryStat) => (
                  <div key={c.label} className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="flex-1 truncate text-xs text-muted-foreground">{c.label}</span>
                    <span className="font-mono text-xs font-medium tabular-nums">{formatBRL(isMine ? c.myAmount : c.amount)}</span>
                  </div>
                ))}
                {byCategory.length > 5 && (
                  <p className="text-[10px] text-tertiary pl-4">+{byCategory.length - 5} mais</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Method breakdown - Pierre style */}
      {!loading && byMethod.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Por Método de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            {byMethod.map(m => {
              const mVal = isMine ? m.myAmount : m.amount
              const pct = displayedGasto > 0 ? (mVal / displayedGasto) * 100 : 0
              return (
                <div key={m.method}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatBRL(mVal)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-tertiary mt-0.5 text-right">{pct.toFixed(0)}%</p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent transactions */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2 pt-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Últimos Lançamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : recentTx.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum lançamento neste mês</p>
          ) : (
            <div>
              {recentTx.map(tx => (
                <RecentRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incomes */}
      {!loading && incomes.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Receitas do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {incomes.map(inc => (
              <div key={inc.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{inc.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(inc.date)}{inc.is_recurring && ' · recorrente'}
                  </p>
                </div>
                <span className="ml-3 shrink-0 font-mono text-sm font-semibold tabular-nums text-positive">
                  +{formatBRL(inc.amount)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  )
}

function AccountBalanceChip({ account }: { account: BankAccount }) {
  return (
    <div className="min-w-[120px] shrink-0 rounded-xl border border-border bg-secondary p-3">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: account.color }} />
        <span className="truncate text-xs font-medium">{account.name}</span>
      </div>
      <p className={cn('mt-1 font-mono text-base font-bold tabular-nums', account.current_balance >= 0 ? 'text-foreground' : 'text-destructive')}>
        {formatBRL(account.current_balance)}
      </p>
    </div>
  )
}

function SmallMetric({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-2.5 text-center">
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 font-mono text-sm font-bold tabular-nums', highlight && 'text-amber-400')}>
        {formatBRL(value)}
      </p>
    </div>
  )
}

function RecentRow({ tx }: { tx: Transaction }) {
  const Icon = getCategoryIcon(tx.category)
  return (
    <div className="flex items-center gap-3 border-b border-border/50 py-2.5 last:border-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]" style={{ background: 'var(--icon-bg)', color: 'var(--accent-foreground)' }}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          {tx.description}
          {tx.method === 'credit_card' && tx.is_recurring && (
            <Repeat className="h-3 w-3 shrink-0 text-tertiary" />
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {(tx.category?.name || 'Sem categoria')} · {METHOD_LABELS[tx.method]}
          {formatDate(tx.date) ? ` · ${formatDate(tx.date)}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {tx.type === 'repasse' ? (
          <>
            <p className="font-mono text-sm font-medium tabular-nums text-tertiary">R$ 0</p>
            <p className="text-[10px] text-tertiary">seu</p>
          </>
        ) : tx.type === 'rateado' ? (
          <>
            <p className="font-mono text-sm font-medium tabular-nums">−{formatBRL(tx.my_amount)}</p>
            <p className="text-[10px] text-tertiary">de {formatBRL(tx.amount)}</p>
          </>
        ) : (
          <p className="font-mono text-sm font-medium tabular-nums">−{formatBRL(tx.my_amount)}</p>
        )}
      </div>
    </div>
  )
}
FILEOF

echo "==> src/pages/Goals.tsx..."
cat > src/pages/Goals.tsx << 'FILEOF'
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
FILEOF

echo "==> src/components/layout/GlobalFAB.tsx (novo)..."
cat > src/components/layout/GlobalFAB.tsx << 'FILEOF'
import { useState } from 'react'
import { Plus, TrendingDown, TrendingUp, ArrowLeftRight, X } from 'lucide-react'
import { TransactionForm } from '@/components/TransactionForm'
import { IncomeForm } from '@/components/IncomeForm'
import { TransferForm } from '@/components/TransferForm'
import { useFinance } from '@/context/FinanceContext'
import { cn } from '@/lib/utils'

export function GlobalFAB() {
  const { bankAccounts } = useFinance()
  const [open, setOpen] = useState(false)
  const [txOpen, setTxOpen] = useState(false)
  const [incOpen, setIncOpen] = useState(false)
  const [trfOpen, setTrfOpen] = useState(false)

  const openAction = (action: 'tx' | 'inc' | 'trf') => {
    setOpen(false)
    if (action === 'tx')  setTxOpen(true)
    if (action === 'inc') setIncOpen(true)
    if (action === 'trf') setTrfOpen(true)
  }

  const actions = [
    {
      id: 'trf' as const,
      icon: <ArrowLeftRight className="h-4 w-4" />,
      label: 'Transferência',
      color: 'bg-secondary border border-border text-foreground',
      show: bankAccounts.length >= 2,
    },
    {
      id: 'inc' as const,
      icon: <TrendingUp className="h-4 w-4" />,
      label: 'Receita',
      color: 'bg-positive text-positive-foreground',
      show: true,
    },
    {
      id: 'tx' as const,
      icon: <TrendingDown className="h-4 w-4" />,
      label: 'Despesa',
      color: 'bg-destructive text-destructive-foreground',
      show: true,
    },
  ]

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Speed-dial container */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 md:bottom-6">
        {/* Action items */}
        <div className={cn(
          'flex flex-col items-end gap-2 transition-all duration-200',
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none',
        )}>
          {actions.filter(a => a.show).map((action, i) => (
            <button
              key={action.id}
              onClick={() => openAction(action.id)}
              style={{ transitionDelay: open ? `${i * 40}ms` : '0ms' }}
              className={cn(
                'flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition-all duration-200',
                open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
                action.color,
              )}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>

        {/* Main FAB button */}
        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 active:scale-95',
            'bg-primary text-primary-foreground',
            'shadow-[0_4px_20px_rgba(167,139,250,0.4)]',
            open && 'rotate-45',
          )}
        >
          {open
            ? <X className="h-6 w-6" />
            : <Plus className="h-6 w-6" />
          }
        </button>
      </div>

      <TransactionForm open={txOpen}  onOpenChange={setTxOpen}  />
      <IncomeForm      open={incOpen} onOpenChange={setIncOpen} />
      <TransferForm    open={trfOpen} onOpenChange={setTrfOpen} />
    </>
  )
}
FILEOF

echo "==> Garantindo dependencias..."
[ -d node_modules ] || npm install

echo "==> BUILD GATE..."
if ! npm run build; then
  echo "############################################################"
  echo "# BUILD FALHOU. Reverter: git reset --hard $TAG"
  echo "############################################################"
  exit 1
fi

git config user.email >/dev/null 2>&1 || git config user.email "jefherson@local"
git config user.name  >/dev/null 2>&1 || git config user.name  "Jefherson"
git add -A
git commit -m "feat: FAB speed-dial global + Metas completas + Sidebar/BottomNav redesign + fix setAccountBalance"
git push origin HEAD:main

echo "############################################################"
echo "# SUCESSO. Backup na tag: $TAG"
echo "############################################################"
