import { useState, useRef, useMemo, useCallback } from 'react'
import { Upload, FileText, AlertCircle, Check, X, Loader2, ArrowLeft, CreditCard, Building2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useFinance } from '@/context/FinanceContext'
import { formatBRL, formatDate } from '@/lib/format'
import {
  parseOFX,
  parseCSV,
  detectCSVColumns,
  detectDelimiter,
  type ParsedTransaction,
  type ImportPreviewRow,
  type ImportMemory,
} from '@/lib/import-utils'
import type { TransactionMethod, TransactionType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

type ImportStep = 'upload' | 'mapping' | 'preview' | 'done'

export function Import() {
  const {
    transactions,
    categories,
    bankAccounts,
    cardAccounts,
    selectedMonth,
    addTransaction,
  } = useFinance()

  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<'ofx' | 'csv' | null>(null)
  const [rawContent, setRawContent] = useState<string>('')
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([])
  const [importMode, setImportMode] = useState<'transactions' | 'card_statement'>('transactions')
  const [selectedCardId, setSelectedCardId] = useState<string>('')
  const [delimiter, setDelimiter] = useState<string>(',')
  const [columnMapping, setColumnMapping] = useState({ date: '', description: '', amount: '', type: '' })
  const [loading, setLoading] = useState(false)
  const [importMemory, setImportMemory] = useState<ImportMemory[]>([])
  const [importCount, setImportCount] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const detectedMapping = useMemo(() => {
    if (!rawContent || fileType !== 'csv') return null
    const lines = rawContent.split('\n')
    if (lines.length === 0) return null
    const headers = lines[0].split(delimiter).map(h => h.replace(/"/g, '').trim())
    return detectCSVColumns(headers)
  }, [rawContent, delimiter, fileType])

  const currentMonthTransactions = useMemo(() => {
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth() + 1
    return transactions.filter(t => {
      const txDate = new Date(t.date)
      return txDate.getFullYear() === year && txDate.getMonth() + 1 === month
    })
  }, [transactions, selectedMonth])

  async function loadImportMemory() {
    const { data, error } = await supabase
      .from('import_memory')
      .select('*')
      .order('use_count', { ascending: false })
      .limit(100)
    if (!error && data) {
      setImportMemory(data as ImportMemory[])
    }
  }

  function findMemoryMatch(description: string): ImportMemory | null {
    const descLower = description.toLowerCase().trim()
    for (const mem of importMemory) {
      const patternLower = mem.description_pattern.toLowerCase().trim()
      if (descLower.includes(patternLower) || patternLower.includes(descLower)) {
        return mem
      }
      const words = descLower.split(/\s+/)
      const patternWords = patternLower.split(/\s+/)
      const matchCount = words.filter(w => patternWords.includes(w)).length
      if (matchCount >= Math.min(2, patternWords.length)) {
        return mem
      }
    }
    return null
  }

  function checkDuplicate(date: string, amount: number, description: string): { isDuplicate: boolean; duplicateId?: string } {
    const match = currentMonthTransactions.find(t => {
      const sameDate = t.date === date
      const sameAmount = Math.abs(t.amount - amount) < 0.01
      const similarDesc = t.description.toLowerCase().includes(description.toLowerCase().slice(0, 20)) ||
        description.toLowerCase().includes(t.description.toLowerCase().slice(0, 20))
      return sameDate && sameAmount && similarDesc
    })
    return match ? { isDuplicate: true, duplicateId: match.id } : { isDuplicate: false }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const extension = selectedFile.name.split('.').pop()?.toLowerCase()
    if (extension !== 'ofx' && extension !== 'csv') {
      alert('Por favor, selecione um arquivo .OFX ou .CSV')
      return
    }

    setFile(selectedFile)
    setFileType(extension as 'ofx' | 'csv')

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setRawContent(content || '')

      if (extension === 'csv' && content) {
        const detectedDelimiter = detectDelimiter(content)
        setDelimiter(detectedDelimiter)
        const lines = content.split('\n')
        if (lines.length > 0) {
          const headers = lines[0].split(detectedDelimiter).map(h => h.replace(/"/g, '').trim())
          const mapping = detectCSVColumns(headers)
          setColumnMapping({
            date: mapping.date || '',
            description: mapping.description || '',
            amount: mapping.amount || '',
            type: '',
          })
        }
      }
    }
    reader.readAsText(selectedFile, 'utf-8')
  }

  function processFile() {
    if (!rawContent) return

    setLoading(true)
    loadImportMemory()

    let parsed: ParsedTransaction[] = []
    if (fileType === 'ofx') {
      parsed = parseOFX(rawContent)
    } else if (fileType === 'csv' && columnMapping.date && columnMapping.description && columnMapping.amount) {
      parsed = parseCSV(rawContent, columnMapping, delimiter)
    }

    const rows: ImportPreviewRow[] = parsed.map((tx, idx) => {
      const memoryMatch = findMemoryMatch(tx.description)
      const dupCheck = checkDuplicate(tx.date, tx.amount, tx.description)

      return {
        id: `import-${idx}`,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        method: memoryMatch?.method || (tx.type === 'credit' ? 'pix' : 'pix'),
        transactionType: memoryMatch?.type || 'mine',
        category_id: memoryMatch?.category_id || null,
        bank_account_id: memoryMatch?.bank_account_id || null,
        credit_card_id: memoryMatch?.credit_card_id || (importMode === 'card_statement' ? selectedCardId : null),
        isDuplicate: dupCheck.isDuplicate,
        duplicateId: dupCheck.duplicateId,
        memoryMatch,
      }
    })

    setPreviewRows(rows)
    setLoading(false)
    setStep(fileType === 'csv' && !columnMapping.date ? 'mapping' : 'preview')
  }

  const updateRow = useCallback((id: string, updates: Partial<ImportPreviewRow>) => {
    setPreviewRows(prev => prev.map(row =>
      row.id === id ? { ...row, ...updates } : row
    ))
  }, [])

  const updateAllRows = useCallback((updates: Partial<ImportPreviewRow>) => {
    setPreviewRows(prev => prev.map(row => ({ ...row, ...updates })))
  }, [])

  async function handleImport() {
    setLoading(true)

    const rowsToImport = previewRows.filter(row => !row.isDuplicate)
    let successCount = 0

    for (const row of rowsToImport) {
      try {
        const myAmount = row.transactionType === 'mine' ? row.amount : row.amount

        if (importMode === 'card_statement' && row.credit_card_id) {
          const card = cardAccounts.find(c => c.id === row.credit_card_id)
          if (card) {
            const purchaseDate = new Date(row.date)
            let billingYear = purchaseDate.getFullYear()
            let billingMonth = purchaseDate.getMonth() + 1

            const closingDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), card.closing_day)
            if (purchaseDate > closingDate) {
              billingMonth += 1
              if (billingMonth > 12) {
                billingMonth = 1
                billingYear += 1
              }
            }

            await addTransaction({
              date: row.date,
              description: row.description,
              amount: row.amount,
              my_amount: myAmount,
              method: 'credit_card' as TransactionMethod,
              type: row.transactionType,
              category_id: row.category_id,
              subcategory_id: null,
              bank_account_id: null,
              credit_card_id: row.credit_card_id,
              purchase_date: row.date,
              billing_year: billingYear,
              billing_month: billingMonth,
              installment_count: 1,
              installment_number: 1,
              installment_group_id: null,
              is_recurring: false,
              recurring_day: null,
              recurring_group_id: null,
              notes: null,
              people_splits: [],
            })
          }
        } else {
          await addTransaction({
            date: row.date,
            description: row.description,
            amount: row.amount,
            my_amount: myAmount,
            method: row.method,
            type: row.transactionType,
            category_id: row.category_id,
            subcategory_id: null,
            bank_account_id: row.method === 'credit_card' ? null : row.bank_account_id,
            credit_card_id: row.method === 'credit_card' ? row.credit_card_id : null,
            purchase_date: row.method === 'credit_card' ? row.date : null,
            billing_year: null,
            billing_month: null,
            installment_count: 1,
            installment_number: 1,
            installment_group_id: null,
            is_recurring: false,
            recurring_day: null,
            recurring_group_id: null,
            notes: null,
            people_splits: [],
          })
        }

        const bestPattern = row.description.toLowerCase().trim().slice(0, 50)
        const { error } = await supabase
          .from('import_memory')
          .upsert({
            description_pattern: bestPattern,
            method: row.method,
            type: row.transactionType,
            category_id: row.category_id,
            bank_account_id: row.bank_account_id,
            credit_card_id: row.credit_card_id,
            use_count: 1,
            last_used_at: new Date().toISOString(),
          }, {
            onConflict: 'description_pattern',
            ignoreDuplicates: false,
          })

        if (error && error.code === '23505') {
          await supabase
            .from('import_memory')
            .update({
              method: row.method,
              type: row.transactionType,
              category_id: row.category_id,
              bank_account_id: row.bank_account_id,
              credit_card_id: row.credit_card_id,
              use_count: supabase.rpc('increment_use_count'),
              last_used_at: new Date().toISOString(),
            })
            .eq('description_pattern', bestPattern)
        }

        successCount++
      } catch (err) {
        console.error('Error importing row:', err)
      }
    }

    setImportCount(successCount)
    setLoading(false)
    setStep('done')
  }

  function reset() {
    setFile(null)
    setFileType(null)
    setRawContent('')
    setPreviewRows([])
    setStep('upload')
    setImportCount(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleBack() {
    if (step === 'preview' && fileType === 'csv') {
      setStep('mapping')
    } else if (step === 'mapping') {
      setStep('upload')
    } else if (step === 'preview' && fileType === 'ofx') {
      setStep('upload')
    }
  }

  const validRows = previewRows.filter(r => !r.isDuplicate)
  const duplicateRows = previewRows.filter(r => r.isDuplicate)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        {step !== 'upload' && step !== 'done' && (
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h1 className="text-xl font-bold tracking-tight">Importar Extrato</h1>
      </div>

      {step === 'upload' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Tipo de importação</p>
            </div>
            <div className="space-y-3 px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={importMode === 'transactions' ? 'default' : 'outline'}
                  className="h-auto flex-col gap-1 py-3"
                  onClick={() => setImportMode('transactions')}
                >
                  <Building2 className="h-4 w-4" />
                  <span className="text-xs">Extrato bancário</span>
                </Button>
                <Button
                  variant={importMode === 'card_statement' ? 'default' : 'outline'}
                  className="h-auto flex-col gap-1 py-3"
                  onClick={() => setImportMode('card_statement')}
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="text-xs">Fatura de cartão</span>
                </Button>
              </div>

              {importMode === 'card_statement' && (
                <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    {cardAccounts.map(card => (
                      <SelectItem key={card.id} value={card.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: card.color }}
                          />
                          {card.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
            <div className="p-4">
              <div
                className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-muted-foreground/25 p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Selecionar arquivo</p>
                  <p className="text-sm text-muted-foreground">.OFX ou .CSV</p>
                </div>
                {file && (
                  <Badge variant="secondary" className="gap-1">
                    <FileText className="h-3 w-3" />
                    {file.name}
                  </Badge>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ofx,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {file && (
            <Button
              className="w-full"
              onClick={processFile}
              disabled={loading || (importMode === 'card_statement' && !selectedCardId)}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Continuar
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {step === 'mapping' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Mapear colunas</p>
            </div>
            <div className="space-y-3 px-4 pb-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">Coluna de Data</label>
                <Select
                  value={columnMapping.date || detectedMapping?.date || ''}
                  onValueChange={v => setColumnMapping(prev => ({ ...prev, date: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawContent.split('\n')[0]?.split(delimiter).map((h, i) => (
                      <SelectItem key={i} value={h.replace(/"/g, '').trim()}>
                        {h.replace(/"/g, '').trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Coluna de Descrição</label>
                <Select
                  value={columnMapping.description || detectedMapping?.description || ''}
                  onValueChange={v => setColumnMapping(prev => ({ ...prev, description: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawContent.split('\n')[0]?.split(delimiter).map((h, i) => (
                      <SelectItem key={i} value={h.replace(/"/g, '').trim()}>
                        {h.replace(/"/g, '').trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Coluna de Valor</label>
                <Select
                  value={columnMapping.amount || detectedMapping?.amount || ''}
                  onValueChange={v => setColumnMapping(prev => ({ ...prev, amount: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawContent.split('\n')[0]?.split(delimiter).map((h, i) => (
                      <SelectItem key={i} value={h.replace(/"/g, '').trim()}>
                        {h.replace(/"/g, '').trim()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Separador</label>
                <Select value={delimiter} onValueChange={setDelimiter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=",">Vírgula (,)</SelectItem>
                    <SelectItem value=";">Ponto e vírgula (;)</SelectItem>
                    <SelectItem value="\t">Tab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={processFile}
            disabled={loading || !columnMapping.date || !columnMapping.description || !columnMapping.amount}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Pré-visualizar
              </>
            )}
          </Button>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {validRows.length} lançamentos para importar
            </div>
            {duplicateRows.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {duplicateRows.length} duplicados
              </Badge>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Classificar todos</p>
            </div>
            <div className="space-y-3 px-4 pb-4">
              {importMode === 'transactions' && (
                <div className="grid grid-cols-2 gap-2">
                  <Select defaultValue="mine" onValueChange={v => updateAllRows({ transactionType: v as TransactionType })}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mine">Meu</SelectItem>
                      <SelectItem value="repasse">Repasse</SelectItem>
                      <SelectItem value="rateado">Rateado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select onValueChange={v => updateAllRows({ method: v as TransactionMethod })}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_card">Cartão</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="debit">Débito</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Select onValueChange={v => updateAllRows({ category_id: v === 'none' ? null : v })}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Categoria (todas)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {importMode === 'transactions' && (
                <Select onValueChange={v => updateAllRows({ bank_account_id: v === 'none' ? null : v })}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Conta bancária (todas)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {bankAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs w-[80px]">Data</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs w-[90px] text-right">Valor</TableHead>
                    <TableHead className="text-xs w-[100px]">Tipo</TableHead>
                    {importMode === 'transactions' && (
                      <TableHead className="text-xs w-[100px]">Método</TableHead>
                    )}
                    <TableHead className="text-xs w-[120px]">Categoria</TableHead>
                    <TableHead className="text-xs w-[40px]">OK</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map(row => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        row.isDuplicate && 'bg-destructive/5 opacity-60',
                        row.memoryMatch && !row.isDuplicate && 'bg-emerald-500/5',
                      )}
                    >
                      <TableCell className="text-xs">{formatDate(row.date)}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="truncate max-w-[150px]">{row.description}</span>
                          {row.memoryMatch && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              sugestão aplicada
                            </span>
                          )}
                          {row.isDuplicate && (
                            <span className="text-[10px] text-destructive">
                              possível duplicado
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {formatBRL(row.amount)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Select
                          value={row.transactionType}
                          onValueChange={v => updateRow(row.id, { transactionType: v as TransactionType })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mine">Meu</SelectItem>
                            <SelectItem value="repasse">Repasse</SelectItem>
                            <SelectItem value="rateado">Rateado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {importMode === 'transactions' && (
                        <TableCell className="text-xs">
                          <Select
                            value={row.method}
                            onValueChange={v => updateRow(row.id, { method: v as TransactionMethod })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="credit_card">Cartão</SelectItem>
                              <SelectItem value="pix">PIX</SelectItem>
                              <SelectItem value="debit">Débito</SelectItem>
                              <SelectItem value="cash">Dinheiro</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                      <TableCell className="text-xs">
                        <Select
                          value={row.category_id || 'none'}
                          onValueChange={v => updateRow(row.id, { category_id: v === 'none' ? null : v })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            {categories.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {row.isDuplicate ? (
                          <X className="h-4 w-4 text-destructive" />
                        ) : (
                          <Check className="h-4 w-4 text-emerald-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleImport}
            disabled={loading || validRows.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Importar {validRows.length} lançamentos
              </>
            )}
          </Button>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold">Importação concluída!</h2>
            <p className="text-muted-foreground mt-1">
              {importCount} lançamentos importados com sucesso
            </p>
          </div>
          <Button onClick={reset} variant="outline">
            Importar outro arquivo
          </Button>
        </div>
      )}
    </div>
  )
}
