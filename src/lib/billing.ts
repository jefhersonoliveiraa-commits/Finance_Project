/**
 * Billing cycle utilities for credit card installment calculations.
 *
 * Billing logic:
 *   - If purchase day <= closing_day → falls in current month's bill
 *   - If purchase day > closing_day  → falls in next month's bill
 *
 * The `date` field on card transactions is set to the due date in the
 * billing month so existing date-range filters work naturally.
 */

export interface BillingPeriod {
  year: number
  month: number // 1-indexed
}

export function getFirstBillingPeriod(purchaseDate: Date, closingDay: number): BillingPeriod {
  const day = purchaseDate.getDate()
  const year = purchaseDate.getFullYear()
  const month = purchaseDate.getMonth() // 0-indexed

  if (day <= closingDay) {
    return { year, month: month + 1 }
  }
  // Past closing day → next billing cycle
  if (month === 11) return { year: year + 1, month: 1 }
  return { year, month: month + 2 }
}

export function addBillingPeriods(
  base: BillingPeriod,
  count: number,
): BillingPeriod {
  let month = base.month + count
  let year = base.year
  while (month > 12) {
    month -= 12
    year++
  }
  return { year, month }
}

/** Returns a YYYY-MM-DD string for the due date in a billing period. */
export function billingDueDate(period: BillingPeriod, dueDay: number): string {
  const lastDayOfMonth = new Date(period.year, period.month, 0).getDate()
  const day = Math.min(dueDay, lastDayOfMonth)
  return `${period.year}-${String(period.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Human-readable billing period label, e.g. "Junho 2026". */
export function billingPeriodLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
}

/** Returns the billing period that a given calendar month represents. */
export function calendarToBillingPeriod(date: Date): BillingPeriod {
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}
