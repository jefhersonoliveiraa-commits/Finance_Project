import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatBRLShort(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1000) {
    return `${sign}R$ ${(abs / 1000).toFixed(1).replace('.', ',')}k`
  }
  return formatBRL(value)
}

export function formatMonthYear(date: Date): string {
  return format(date, "MMMM 'de' yyyy", { locale: ptBR })
}

export function formatMonthShort(date: Date): string {
  return format(date, 'MMM/yy', { locale: ptBR })
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return format(d, 'dd/MM', { locale: ptBR })
}

export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return format(d, "dd 'de' MMMM", { locale: ptBR })
}

export function getMonthRange(date: Date): { start: string; end: string } {
  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end: format(endOfMonth(date), 'yyyy-MM-dd'),
  }
}

export function nextMonth(date: Date): Date {
  return addMonths(date, 1)
}

export function prevMonth(date: Date): Date {
  return subMonths(date, 1)
}

export function isCurrentMonth(date: Date): boolean {
  const now = new Date()
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  )
}

export function monthKey(date: Date): string {
  return format(date, 'yyyy-MM')
}

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function capMonthDay(date: Date, day: number): Date {
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const safeDay = Math.min(day, daysInMonth)
  return new Date(date.getFullYear(), date.getMonth(), safeDay)
}
