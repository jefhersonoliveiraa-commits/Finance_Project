import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Toaster } from '@/components/ui/sonner'
import { supabase } from '@/lib/supabase'
import { FinanceProvider } from '@/context/FinanceContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Transactions } from '@/pages/Transactions'
import { CreditCardPage } from '@/pages/CreditCard'
import { Receivables } from '@/pages/Receivables'
import { SettingsPage } from '@/pages/Settings'
import { Import } from '@/pages/Import'
import { BudgetPage } from '@/pages/Budget'
import { AuthPage } from '@/pages/Auth'
import { Goals } from '@/pages/Goals'
import type { View } from '@/lib/types'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [view, setView] = useState<View>('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  if (!session) return (
    <>
      <AuthPage />
      <Toaster />
    </>
  )

  return (
    <FinanceProvider onNavigate={setView}>
      <AppLayout currentView={view} onNavigate={setView}>
        {view === 'dashboard' && <Dashboard />}
        {view === 'transactions' && <Transactions />}
        {view === 'credit-card' && <CreditCardPage />}
        {view === 'receivables' && <Receivables />}
        {view === 'goals' && <Goals />}
        {view === 'settings' && <SettingsPage />}
        {view === 'import' && <Import />}
        {view === 'budget' && <BudgetPage />}
      </AppLayout>
      <Toaster />
    </FinanceProvider>
  )
}
