import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFinance } from '@/context/FinanceContext'
import { formatMonthYear, nextMonth, prevMonth, isCurrentMonth } from '@/lib/format'
import { cn } from '@/lib/utils'

export function MonthSelector({ className }: { className?: string }) {
  const { selectedMonth, setSelectedMonth } = useFinance()
  const now = new Date()
  const futureLimit = new Date(now.getFullYear(), now.getMonth(), 1)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setSelectedMonth(prevMonth(selectedMonth))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[140px] text-center text-sm font-semibold capitalize">
        {formatMonthYear(selectedMonth)}
        {isCurrentMonth(selectedMonth) && (
          <span className="ml-1.5 inline-block rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
            atual
          </span>
        )}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setSelectedMonth(nextMonth(selectedMonth))}
        disabled={selectedMonth >= futureLimit}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
