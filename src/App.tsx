import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { FinanceProvider } from '@/context/FinanceContext'
import { BottomNav } from '@/components/layout/BottomNav'
import { Dashboard } from '@/pages/Dashboard'
import { Transactions } from '@/pages/Transactions'
import { CreditCardPage } from '@/pages/CreditCard'
import { Receivables } from '@/pages/Receivables'
import { SettingsPage } from '@/pages/Settings'
import { Import } from '@/pages/Import'
import { BudgetPage } from '@/pages/Budget'
import type { View } from '@/lib/types'

export default function App() {
  const [view, setView] = useState<View>('dashboard')

  return (
    <FinanceProvider onNavigate={setView}>
      <div className="min-h-dvh bg-background pb-16">
        <main className="mx-auto max-w-lg">
          {view === 'dashboard' && <Dashboard />}
          {view === 'transactions' && <Transactions />}
          {view === 'credit-card' && <CreditCardPage />}
          {view === 'receivables' && <Receivables />}
          {view === 'settings' && <SettingsPage />}
          {view === 'import' && <Import />}
          {view === 'budget' && <BudgetPage />}
        </main>
        <BottomNav current={view} onChange={setView} />
      </div>
      <Toaster />
    </FinanceProvider>
  )
}
