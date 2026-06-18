import type {
  Transaction,
  Income,
  Person,
  Category,
  FinanceStats,
  PersonReceivable,
  CategoryStat,
  MethodStat,
  TransactionMethod,
  CardAccount,
  CardBill,
  SubscriptionStat,
} from './types'
import { METHOD_LABELS } from './types'

export function computeStats(
  transactions: Transaction[],
  incomes: Income[],
  people: Person[],
  categories: Category[],
  cardAccounts: CardAccount[],
): FinanceStats {
  const gastoBruto = transactions.reduce((s, t) => s + t.amount, 0)
  const gastoRealMeu = transactions.reduce((s, t) => s + t.my_amount, 0)
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0)
  const sobraReal = totalIncome - gastoRealMeu

  // Card bill stats
  const cardTx = transactions.filter(t => t.method === 'credit_card')
  const cardBillTotal = cardTx.reduce((s, t) => s + t.amount, 0)
  const cardBillMine = cardTx.reduce((s, t) => s + t.my_amount, 0)

  // Card bills by card
  const cardMap = new Map(cardAccounts.map(c => [c.id, c]))
  const cardBillsMap = new Map<string, CardBill>()
  for (const t of cardTx) {
    const cardId = t.credit_card_id || '__none__'
    const cardInfo = t.credit_card_id ? cardMap.get(t.credit_card_id) : null
    if (!cardBillsMap.has(cardId)) {
      cardBillsMap.set(cardId, {
        card: cardInfo ? { id: cardInfo.id, name: cardInfo.name, color: cardInfo.color } : { id: '__none__', name: 'Sem cartão', color: '#6b7280' },
        total: 0,
        myAmount: 0,
      })
    }
    const entry = cardBillsMap.get(cardId)!
    entry.total += t.amount
    entry.myAmount += t.my_amount
  }
  const cardBills = Array.from(cardBillsMap.values()).sort((a, b) => b.total - a.total)

  // Subscriptions (recurring card transactions)
  const recurringCardTx = cardTx.filter(t => t.is_recurring)
  const subscriptionsMap = new Map<string, SubscriptionStat>()
  for (const t of recurringCardTx) {
    const key = t.description.toLowerCase().trim()
    if (!subscriptionsMap.has(key)) {
      const cardInfo = t.credit_card_id ? cardMap.get(t.credit_card_id) : null
      subscriptionsMap.set(key, {
        description: t.description,
        monthlyAmount: 0,
        annualAmount: 0,
        category: t.category || null,
        card: cardInfo ? { id: cardInfo.id, name: cardInfo.name, color: cardInfo.color } : null,
      })
    }
    const entry = subscriptionsMap.get(key)!
    entry.monthlyAmount += t.my_amount
    entry.annualAmount = Math.round(entry.monthlyAmount * 12 * 100) / 100
  }
  const subscriptions = Array.from(subscriptionsMap.values()).sort((a, b) => b.monthlyAmount - a.monthlyAmount)
  const annualSubscriptionsTotal = subscriptions.reduce((s, sub) => s + sub.annualAmount, 0)

  // Margin projection: income minus all real spending this month (all methods)
  const marginProjection = totalIncome - gastoRealMeu

  // A receber
  const allTPs = transactions.flatMap(t =>
    (t.transaction_people || []).map(tp => ({ tp, t })),
  )
  const pendingTPs = allTPs.filter(x => x.tp.reimbursement_status === 'pending')
  const receivedTPs = allTPs.filter(x => x.tp.reimbursement_status === 'received')
  const aReceberPending = pendingTPs.reduce((s, x) => s + x.tp.amount, 0)
  const aReceberReceived = receivedTPs.reduce((s, x) => s + x.tp.amount, 0)
  const aReceberTotal = aReceberPending + aReceberReceived

  // A receber by person
  const peopleMap = new Map(people.map(p => [p.id, p]))
  const byPersonMap = new Map<string, PersonReceivable>()
  for (const { tp, t } of allTPs) {
    const person = tp.person || peopleMap.get(tp.person_id)
    if (!person) continue
    if (!byPersonMap.has(person.id)) {
      byPersonMap.set(person.id, { person, totalPending: 0, totalReceived: 0, items: [] })
    }
    const entry = byPersonMap.get(person.id)!
    if (tp.reimbursement_status === 'pending') {
      entry.totalPending += tp.amount
    } else {
      entry.totalReceived += tp.amount
    }
    entry.items.push({ transactionPerson: tp, transaction: t })
  }
  const aReceberByPerson = Array.from(byPersonMap.values()).sort(
    (a, b) => b.totalPending - a.totalPending,
  )

  // By category
  const catMap = new Map(categories.map(c => [c.id, c]))
  const byCatMap = new Map<string, CategoryStat>()
  for (const t of transactions) {
    const key = t.category_id || '__none__'
    const cat = t.category_id
      ? (t.category || catMap.get(t.category_id) || null)
      : null
    if (!byCatMap.has(key)) {
      byCatMap.set(key, {
        category: cat,
        amount: 0,
        myAmount: 0,
        label: cat?.name || 'Sem categoria',
        color: cat?.color || '#6b7280',
      })
    }
    const entry = byCatMap.get(key)!
    entry.amount += t.amount
    entry.myAmount += t.my_amount
  }
  const byCategory = Array.from(byCatMap.values()).sort((a, b) => b.myAmount - a.myAmount)

  // By method
  const methodOrder: TransactionMethod[] = ['credit_card', 'pix', 'debit', 'cash']
  const byMethodMap = new Map<TransactionMethod, MethodStat>(
    methodOrder.map(m => [m, { method: m, label: METHOD_LABELS[m], amount: 0, myAmount: 0 }]),
  )
  for (const t of transactions) {
    const entry = byMethodMap.get(t.method)!
    entry.amount += t.amount
    entry.myAmount += t.my_amount
  }
  const byMethod = Array.from(byMethodMap.values()).filter(m => m.amount > 0)

  return {
    gastoBruto,
    gastoRealMeu,
    totalIncome,
    sobraReal,
    aReceberTotal,
    aReceberPending,
    aReceberReceived,
    aReceberByPerson,
    byCategory,
    byMethod,
    cardBillTotal,
    cardBillMine,
    cardBills,
    subscriptions,
    annualSubscriptionsTotal,
    marginProjection,
  }
}
