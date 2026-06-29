import type { TransactionMethod, TransactionType } from './types'

export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
}

export interface ImportMemory {
  id: string
  description_pattern: string
  method: TransactionMethod
  type: TransactionType
  category_id: string | null
  bank_account_id: string | null
  credit_card_id: string | null
  use_count: number
  last_used_at: string
  created_at: string
}

export type RowKind = 'transaction' | 'transfer' | 'skip'

export interface ImportPreviewRow {
  id: string
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  // transaction fields
  method: TransactionMethod
  transactionType: TransactionType
  category_id: string | null
  subcategory_id: string | null
  bank_account_id: string | null
  credit_card_id: string | null
  // transfer fields
  rowKind: RowKind
  transfer_from_account_id: string | null
  transfer_to_account_id: string | null
  // meta
  isDuplicate: boolean
  isTransferDuplicate: boolean  // matched an existing transfer
  duplicateId?: string
  memoryMatch: ImportMemory | null
}

export interface ColumnMapping {
  date: string
  description: string
  amount: string
  type?: string
}

const OFX_REGEX = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
const OFX_FIELD_REGEX = /<(DTPOSTED|DTUSER|NAME|MEMO|FITID|TRNAMT)>([^<\r\n]*)/gi

export function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  const matches = content.matchAll(OFX_REGEX)

  for (const match of matches) {
    const block = match[1]
    let date = ''
    let name = ''
    let memo = ''
    let fitid = ''
    let amount = 0
    let type: 'debit' | 'credit' = 'debit'

    const fieldMatches = block.matchAll(OFX_FIELD_REGEX)
    for (const field of fieldMatches) {
      const tagName = field[1].toUpperCase()
      const value = field[2].trim()

      if (tagName === 'DTPOSTED') {
        date = parseOFXDate(value)
      } else if (tagName === 'DTUSER' && !date) {
        date = parseOFXDate(value)
      } else if (tagName === 'TRNAMT') {
        const num = parseFloat(value.replace(',', '.'))
        amount = Math.abs(num)
        type = num < 0 ? 'debit' : 'credit'
      } else if (tagName === 'NAME') {
        name = value
      } else if (tagName === 'MEMO') {
        memo = value
      } else if (tagName === 'FITID') {
        fitid = value
      }
    }

    const description = name || memo || fitid || 'Transação'

    if (date && amount > 0) {
      transactions.push({ date, description, amount, type })
    }
  }

  return transactions
}

function parseOFXDate(dateStr: string): string {
  const cleaned = dateStr.replace(/\[.*\]/, '').trim()
  if (/^\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`
  }
  if (/^\d{14}/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`
  }
  return new Date().toISOString().split('T')[0]
}

function parseBRLAmount(raw: string): number {
  let s = raw
    .replace(/\u2212/g, '-')
    .replace(/[R$\s\u00a0]/g, '')
    .replace(/^\+/, '')
    .trim()

  const negative = s.startsWith('-')
  s = s.replace(/^-/, '')

  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',')) {
    const parts = s.split(',')
    if (parts.length === 2 && parts[1].length <= 2) {
      s = s.replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  }

  const num = parseFloat(s) || 0
  return negative ? -num : num
}

export function parseCSV(content: string, mapping: ColumnMapping, delimiter: string = ','): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  const lines = content.split(/\r?\n/).filter(l => l.trim())

  if (lines.length < 2) return transactions

  const headers = parseCSVLine(lines[0], delimiter)
  const headerMap = new Map(headers.map((h, i) => [h.toLowerCase().trim(), i]))

  const dateIdx = findColumnIndex(headerMap, mapping.date)
  const descIdx = findColumnIndex(headerMap, mapping.description)
  const amountIdx = findColumnIndex(headerMap, mapping.amount)
  const typeIdx = mapping.type ? findColumnIndex(headerMap, mapping.type) : -1

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    return transactions
  }

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter)
    if (values.length <= Math.max(dateIdx, descIdx, amountIdx)) continue

    const date = parseCSVDate(values[dateIdx])
    const description = values[descIdx].trim()
    const amount = Math.abs(parseBRLAmount(values[amountIdx]))

    const rawAmt = values[amountIdx]
    const isNegativeRaw = rawAmt.includes('\u2212') || rawAmt.trimStart().startsWith('-')
    let type: 'debit' | 'credit' = isNegativeRaw ? 'debit' : 'credit'
    if (typeIdx >= 0 && values[typeIdx]) {
      const typeVal = values[typeIdx].toLowerCase()
      if (typeVal.includes('credito') || typeVal.includes('credit') || typeVal.includes('entrada') ||
          typeVal.includes('recebido') || typeVal.includes('recebida')) {
        type = 'credit'
      } else if (typeVal.includes('debito') || typeVal.includes('debit') || typeVal.includes('pagamento') ||
                 typeVal.includes('enviado') || typeVal.includes('enviada') || typeVal.includes('saida')) {
        type = 'debit'
      }
    }

    if (date && amount > 0) {
      transactions.push({ date, description: description || 'Transação', amount, type })
    }
  }

  return transactions
}

function findColumnIndex(headerMap: Map<string, number>, pattern: string): number {
  const normalized = pattern.toLowerCase().trim()
  if (headerMap.has(normalized)) return headerMap.get(normalized)!

  for (const [key, idx] of headerMap) {
    if (key.includes(normalized) || normalized.includes(key)) return idx
  }
  return -1
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function parseCSVDate(dateStr: string): string {
  const cleaned = dateStr.trim()

  const brFormat = /^(\d{2})\/(\d{2})\/(\d{4})$/
  if (brFormat.test(cleaned)) {
    const [, day, month, year] = cleaned.match(brFormat)!
    return `${year}-${month}-${day}`
  }

  const isoFormat = /^(\d{4})-(\d{2})-(\d{2})/
  if (isoFormat.test(cleaned)) {
    return cleaned.slice(0, 10)
  }

  const usFormat = /^(\d{2})\/(\d{2})\/(\d{4})$/
  if (usFormat.test(cleaned)) {
    const [, month, day, year] = cleaned.match(usFormat)!
    return `${year}-${month}-${day}`
  }

  return new Date().toISOString().split('T')[0]
}

export function detectCSVColumns(headers: string[]): Partial<ColumnMapping> {
  const headerLower = headers.map(h => h.toLowerCase().trim())
  const mapping: Partial<ColumnMapping> = {}

  const datePatterns = [
    'data', 'date', 'data lançamento', 'data lancamento',
    'dt lançamento', 'dt lancamento', 'dt transacao', 'dt_transacao',
    'data pagamento', 'data compra',
  ]
  const descPatterns = [
    'origem / destino', 'origem/destino',
    'descricao', 'description', 'memo', 'historico',
    'lançamento', 'lancamento', 'estabelecimento',
    'descricao transacao', 'titulo',
  ]
  const amountPatterns = [
    'valor', 'amount', 'value', 'montante',
    'valor (r$)', 'valor(r$)', 'vlr', 'valor transacao',
    'valor lançamento', 'valor lancamento',
  ]

  for (const pattern of datePatterns) {
    const idx = headerLower.findIndex(h => h.includes(pattern))
    if (idx !== -1) { mapping.date = headers[idx]; break }
  }

  for (const pattern of descPatterns) {
    const idx = headerLower.findIndex(h => h.includes(pattern))
    if (idx !== -1) { mapping.description = headers[idx]; break }
  }

  for (const pattern of amountPatterns) {
    const idx = headerLower.findIndex(h => h.includes(pattern))
    if (idx !== -1) { mapping.amount = headers[idx]; break }
  }

  return mapping
}

export function detectDelimiter(content: string): string {
  const firstLine = content.split(/\r?\n/)[0]
  const commaCount = (firstLine.match(/,/g) || []).length
  const semicolonCount = (firstLine.match(/;/g) || []).length
  return semicolonCount > commaCount ? ';' : ','
}

export function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr)
  return !isNaN(date.getTime()) && dateStr.match(/^\d{4}-\d{2}-\d{2}$/) !== null
}
