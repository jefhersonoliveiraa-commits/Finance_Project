export type TransactionMethod = 'credit_card' | 'pix' | 'debit' | 'cash'
export type TransactionType = 'mine' | 'repasse' | 'rateado'
export type ReimbursementStatus = 'pending' | 'received'
export type View = 'dashboard' | 'transactions' | 'credit-card' | 'receivables' | 'settings' | 'import' | 'budget'

export interface Subcategory {
  id: string
  category_id: string
  name: string
  color: string | null
  created_at: string
}

export interface BudgetLimit {
  id: string
  category_id: string
  monthly_limit: number
  year: number
  month: number
  created_at: string
  updated_at: string
  category?: Category
}

export interface BankAccount {
  id: string
  name: string
  color: string
  initial_balance: number
  current_balance: number
  created_at: string
}

export interface CardAccount {
  id: string
  name: string
  color: string
  closing_day: number
  due_day: number
  bank_account_id: string | null
  credit_limit: number | null
  created_at: string
  bank_account?: BankAccount
}

export interface Transfer {
  id: string
  date: string
  description: string
  amount: number
  from_account_id: string
  to_account_id: string
  created_at: string
  from_account?: BankAccount
  to_account?: BankAccount
}

export interface Category {
  id: string
  name: string
  color: string
  created_at: string
  subcategories?: Subcategory[]
}

export interface Person {
  id: string
  name: string
  created_at: string
}

export interface TransactionPerson {
  id: string
  transaction_id: string
  person_id: string
  amount: number
  reimbursement_status: ReimbursementStatus
  received_at: string | null
  created_at: string
  person?: Person
}

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  my_amount: number
  method: TransactionMethod
  type: TransactionType
  category_id: string | null
  subcategory_id: string | null
  bank_account_id: string | null
  credit_card_id: string | null
  purchase_date: string | null
  billing_year: number | null
  billing_month: number | null
  installment_count: number
  installment_number: number
  installment_group_id: string | null
  is_recurring: boolean
  recurring_day: number | null
  recurring_group_id: string | null
  notes: string | null
  created_at: string
  category?: Category
  subcategory?: Subcategory
  transaction_people?: TransactionPerson[]
  credit_card?: CardAccount
  bank_account?: BankAccount
}

export interface Income {
  id: string
  date: string
  description: string
  amount: number
  is_recurring: boolean
  recurring_day: number | null
  recurring_group_id: string | null
  bank_account_id: string | null
  created_at: string
}

export interface TransactionFormData {
  id?: string
  date: string
  description: string
  amount: number
  my_amount: number
  method: TransactionMethod
  type: TransactionType
  category_id: string | null
  subcategory_id: string | null
  bank_account_id: string | null
  credit_card_id: string | null
  purchase_date: string | null
  billing_year: number | null
  billing_month: number | null
  installment_count: number
  installment_number: number
  installment_group_id: string | null
  is_recurring: boolean
  recurring_day: number | null
  recurring_group_id: string | null
  notes: string | null
  people_splits: { person_id: string; amount: number }[]
}

export interface IncomeFormData {
  id?: string
  date: string
  description: string
  amount: number
  is_recurring: boolean
  recurring_day: number | null
  recurring_group_id: string | null
  bank_account_id: string | null
}

export interface TransferFormData {
  date: string
  description: string
  amount: number
  from_account_id: string
  to_account_id: string
}

export interface CardBill {
  card: { id: string; name: string; color: string }
  total: number
  myAmount: number
}

export interface SubscriptionStat {
  description: string
  monthlyAmount: number
  annualAmount: number
  category: Category | null
  card: { id: string; name: string; color: string } | null
}

export interface CardBillPayment {
  id: string
  credit_card_id: string
  billing_year: number
  billing_month: number
  amount: number
  bank_account_id: string | null
  paid_at: string
}

export interface FutureBillCard {
  cardId: string
  cardName: string
  cardColor: string
  total: number
  myAmount: number
  aReceber: number
  fromInstallments: number
  isPaid: boolean
}

export interface FutureBillMonth {
  year: number
  month: number
  total: number
  myAmount: number
  aReceber: number
  fromInstallments: number
  cards: FutureBillCard[]
}

export interface FinanceStats {
  gastoBruto: number
  gastoRealMeu: number
  totalIncome: number
  sobraReal: number
  aReceberTotal: number
  aReceberPending: number
  aReceberReceived: number
  aReceberByPerson: PersonReceivable[]
  byCategory: CategoryStat[]
  byMethod: MethodStat[]
  cardBillTotal: number
  cardBillMine: number
  cardBills: CardBill[]
  subscriptions: SubscriptionStat[]
  annualSubscriptionsTotal: number
  marginProjection: number
}

export interface PersonReceivable {
  person: Person
  totalPending: number
  totalReceived: number
  items: ReceivableItem[]
}

export interface ReceivableItem {
  transactionPerson: TransactionPerson
  transaction: Transaction
}

export interface CategoryStat {
  category: Category | null
  amount: number
  myAmount: number
  label: string
  color: string
}

export interface MethodStat {
  method: TransactionMethod
  label: string
  amount: number
  myAmount: number
}

export const METHOD_LABELS: Record<TransactionMethod, string> = {
  credit_card: 'Cartão de Crédito',
  pix: 'PIX / Transferência',
  debit: 'Débito',
  cash: 'Dinheiro',
}

export const TYPE_LABELS: Record<TransactionType, string> = {
  mine: 'Meu',
  repasse: 'Repasse',
  rateado: 'Rateado',
}
