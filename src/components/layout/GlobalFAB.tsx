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
