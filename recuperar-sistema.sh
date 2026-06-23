#!/usr/bin/env bash
#
# recuperar-sistema.sh
# Reverte a "cagada" da IA: restaura types.ts, TransactionForm e as paginas
# Dashboard/Transactions/Receivables para suas versoes completas (com a logica
# real de my_amount / Meu-Repasse-Rateado), valida com build e da push no main.
#
# Uso (na raiz do repo, no terminal do Codespace):
#   bash recuperar-sistema.sh
#
set -euo pipefail

# --- commits de origem das versoes boas (ja existem no historico do repo) ---
C_FULL="51e66606"   # Dashboard (578l) e Receivables (167l) completos
C_REDESIGN="f53fd671" # Transactions (616l) e TransactionForm (706l) redesenhados

echo "==> Verificando ambiente..."
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "ERRO: rode na raiz do repositorio git."; exit 1; }
cd "$(git rev-parse --show-toplevel)"

for c in "$C_FULL" "$C_REDESIGN"; do
  git cat-file -e "${c}^{commit}" 2>/dev/null || { echo "ERRO: commit $c nao encontrado no historico local. Rode 'git fetch --all' e tente de novo."; exit 1; }
done

# --- ponto de retorno seguro ---
STAMP="$(date +%Y%m%d-%H%M%S)"
TAG="backup/pre-recuperacao-${STAMP}"
git tag "$TAG"
echo "==> Backup criado na tag: $TAG (para reverter: git reset --hard $TAG)"

echo "==> Restaurando paginas e formulario das versoes completas..."
git show "${C_FULL}:src/pages/Dashboard.tsx"            > src/pages/Dashboard.tsx
git show "${C_FULL}:src/pages/Receivables.tsx"          > src/pages/Receivables.tsx
git show "${C_REDESIGN}:src/pages/Transactions.tsx"     > src/pages/Transactions.tsx
git show "${C_REDESIGN}:src/components/TransactionForm.tsx" > src/components/TransactionForm.tsx
echo "    Dashboard       -> $(wc -l < src/pages/Dashboard.tsx)l"
echo "    Receivables     -> $(wc -l < src/pages/Receivables.tsx)l"
echo "    Transactions    -> $(wc -l < src/pages/Transactions.tsx)l"
echo "    TransactionForm -> $(wc -l < src/components/TransactionForm.tsx)l"

echo "==> Reescrevendo src/lib/types.ts (completo + tipos das telas novas)..."
cat > src/lib/types.ts << 'TYPES_EOF'
export type TransactionMethod = 'credit_card' | 'pix' | 'debit' | 'cash'
export type TransactionType = 'mine' | 'repasse' | 'rateado'
export type ReimbursementStatus = 'pending' | 'received'
export type View = 'dashboard' | 'transactions' | 'credit-card' | 'receivables' | 'settings' | 'import' | 'budget' | 'goals' | 'auth'

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

export interface Goal {
  id: string
  title: string
  target_amount: number
  current_amount: number
  deadline: string
  icon: string
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
TYPES_EOF

echo "==> Limpando imports nao usados em Goals.tsx..."
sed -i "s/import { Target, Car, Home, Plane } from 'lucide-react'/import { Target } from 'lucide-react'/" src/pages/Goals.tsx || true

echo "==> Garantindo dependencias..."
[ -d node_modules ] || npm install

echo "==> BUILD GATE (tsc + vite build)..."
if ! npm run build; then
  echo ""
  echo "############################################################"
  echo "# BUILD FALHOU. Nada foi commitado nem enviado.            #"
  echo "# Para reverter tudo: git reset --hard $TAG"
  echo "############################################################"
  exit 1
fi

echo "==> Build OK. Commitando e enviando para o main..."
git config user.email >/dev/null 2>&1 || git config user.email "jefherson@local"
git config user.name  >/dev/null 2>&1 || git config user.name  "Jefherson"
git add -A
git commit -m "fix: recupera types.ts, TransactionForm e paginas (Dashboard/Transactions/Receivables) destruidos pela IA"
git push origin HEAD:main

echo ""
echo "############################################################"
echo "# SUCESSO. Sistema recuperado e enviado para o main.       #"
echo "# Backup de seguranca na tag: $TAG"
echo "############################################################"
