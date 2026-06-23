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
