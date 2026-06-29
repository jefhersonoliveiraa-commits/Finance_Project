import { useState, useRef, useMemo, useCallback } from 'react'
import {
  Upload, FileText, AlertCircle, Check, Loader2, ArrowLeft,
  CreditCard, Building2, TrendingUp, TrendingDown, MinusCircle, ArrowLeftRight,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFinance } from '@/context/FinanceContext'
import { formatBRL, formatDate } from '@/lib/format'
import {
  parseOFX, parseCSV, detectCSVColumns, detectDelimiter,
  type ParsedTransaction, type ImportPreviewRow, type ImportMemory, type RowKind,
} from '@/lib/import-utils'
import type { TransactionMethod, TransactionType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

type ImportStep = 'upload' | 'mapping' | 'preview' | 'done'

export function Import() {
  const {
    transactions, transfers, categories, subcategories, bankAccounts, cardAccounts,
    selectedMonth, addTransaction, addTransfer, addCategory, addSubcategory,
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
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  // Criação rápida de categoria/subcategoria a partir da importação
  const [createDialog, setCreateDialog] = useState<{
    kind: 'category' | 'subcategory'
    rowId: string
    categoryId?: string  // para subcategoria
  } | null>(null)
  const [createName, setCreateName] = useState('')
  const [createColor, setCreateColor] = useState('#A78BFA')
  const [creating, setCreating] = useState(false)

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

  // Transferências do mês atual e adjacentes (para detectar duplicatas)
  const recentTransfers = useMemo(() => {
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth() + 1
    return (transfers || []).filter(t => {
      const d = new Date(t.date)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      // Pega mês atual e adjacentes
      return (y === year && m >= month - 1 && m <= month + 1)
    })
  }, [transfers, selectedMonth])

  async function loadImportMemory() {
    const { data, error } = await supabase
      .from('import_memory')
      .select('*')
      .order('use_count', { ascending: false })
      .limit(100)
    if (!error && data) setImportMemory(data as ImportMemory[])
  }

  function findMemoryMatch(description: string): ImportMemory | null {
    const descLower = description.toLowerCase().trim()
    for (const mem of importMemory) {
      const patternLower = mem.description_pattern.toLowerCase().trim()
      if (descLower.includes(patternLower) || patternLower.includes(descLower)) return mem
      const words = descLower.split(/\s+/)
      const patternWords = patternLower.split(/\s+/)
      const matchCount = words.filter(w => patternWords.includes(w)).length
      if (matchCount >= Math.min(2, patternWords.length)) return mem
    }
    return null
  }

  function checkDuplicate(date: string, amount: number, description: string) {
    const txMatch = currentMonthTransactions.find(t => {
      const sameDate = t.date === date
      const sameAmount = Math.abs(t.amount - amount) < 0.01
      const similarDesc = t.description.toLowerCase().includes(description.toLowerCase().slice(0, 20)) ||
        description.toLowerCase().includes(t.description.toLowerCase().slice(0, 20))
      return sameDate && sameAmount && similarDesc
    })
    if (txMatch) return { isDuplicate: true, isTransferDuplicate: false, duplicateId: txMatch.id }

    // Checa se é uma transferência já registrada (mesmo valor e data próxima ±1 dia)
    const tfrMatch = recentTransfers.find(t => {
      const dateDiff = Math.abs(new Date(t.date).getTime() - new Date(date).getTime())
      const sameAmount = Math.abs(t.amount - amount) < 0.01
      return dateDiff <= 86400000 && sameAmount // ±1 dia
    })
    if (tfrMatch) return { isDuplicate: false, isTransferDuplicate: true, duplicateId: tfrMatch.id }

    return { isDuplicate: false, isTransferDuplicate: false }
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

    const tryRead = (encoding: string) => {
      const r = new FileReader()
      r.onload = (event) => {
        const raw = event.target?.result as string
        if (encoding === 'utf-8' && raw.includes('\uFFFD')) {
          tryRead('iso-8859-1')
          return
        }
        setRawContent(raw || '')
        if (extension === 'csv' && raw) {
          const detectedDelimiter = detectDelimiter(raw)
          setDelimiter(detectedDelimiter)
          const rawLines = raw.split('\n')
          if (rawLines.length > 0) {
            const headers = rawLines[0].split(detectedDelimiter).map(h => h.replace(/"/g, '').trim())
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
      r.readAsText(selectedFile, encoding)
    }
    tryRead('utf-8')
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

      // Se é uma transferência já registrada, sugerir rowKind = 'skip'
      const suggestedKind: RowKind = dupCheck.isTransferDuplicate ? 'skip' : 'transaction'

      return {
        id: `import-${idx}`,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        method: memoryMatch?.method || 'pix',
        transactionType: memoryMatch?.type || 'mine',
        category_id: memoryMatch?.category_id || null,
        bank_account_id: memoryMatch?.bank_account_id || null,
        credit_card_id: memoryMatch?.credit_card_id || (importMode === 'card_statement' ? selectedCardId : null),
        subcategory_id: null,
        rowKind: suggestedKind,
        transfer_from_account_id: null,
        transfer_to_account_id: null,
        isDuplicate: dupCheck.isDuplicate,
        isTransferDuplicate: dupCheck.isTransferDuplicate,
        duplicateId: dupCheck.duplicateId,
        memoryMatch,
      }
    })

    // Auto-skip transferências já registradas
    const autoSkipped = new Set(
      rows.filter(r => r.isTransferDuplicate).map(r => r.id)
    )
    setSkipped(autoSkipped)
    setPreviewRows(rows)
    setLoading(false)
    setStep(fileType === 'csv' && !columnMapping.date ? 'mapping' : 'preview')
  }

  const updateRow = useCallback((id: string, updates: Partial<ImportPreviewRow>) => {
    setPreviewRows(prev => prev.map(row => row.id === id ? { ...row, ...updates } : row))
  }, [])

  const updateAllRows = useCallback((updates: Partial<ImportPreviewRow>) => {
    setPreviewRows(prev => prev.map(row => ({ ...row, ...updates })))
  }, [])

  async function handleImport() {
    setLoading(true)
    const rowsToImport = previewRows.filter(r => !r.isDuplicate && !skipped.has(r.id))
    let successCount = 0

    for (const row of rowsToImport) {
      try {
        if (row.rowKind === 'transfer') {
          // Grava como transferência entre contas
          if (row.transfer_from_account_id && row.transfer_to_account_id) {
            await addTransfer({
              date: row.date,
              description: row.description,
              amount: row.amount,
              from_account_id: row.transfer_from_account_id,
              to_account_id: row.transfer_to_account_id,
            })
            successCount++
          }
          continue
        }

        // Grava como transação normal
        const myAmount = row.amount

        if (importMode === 'card_statement' && row.credit_card_id) {
          const card = cardAccounts.find(c => c.id === row.credit_card_id)
          if (card) {
            const purchaseDate = new Date(row.date)
            let billingYear = purchaseDate.getFullYear()
            let billingMonth = purchaseDate.getMonth() + 1
            const closingDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), card.closing_day)
            if (purchaseDate > closingDate) {
              billingMonth += 1
              if (billingMonth > 12) { billingMonth = 1; billingYear += 1 }
            }
            await addTransaction({
              date: row.date, description: row.description,
              amount: row.amount, my_amount: myAmount,
              method: 'credit_card' as TransactionMethod,
              type: row.transactionType,
              category_id: row.category_id, subcategory_id: row.subcategory_id,
              bank_account_id: null, credit_card_id: row.credit_card_id,
              purchase_date: row.date, billing_year: billingYear,
              billing_month: billingMonth,
              installment_count: 1, installment_number: 1,
              installment_group_id: null, is_recurring: false,
              recurring_day: null, recurring_group_id: null,
              notes: null, people_splits: [],
            })
          }
        } else {
          await addTransaction({
            date: row.date, description: row.description,
            amount: row.amount, my_amount: myAmount,
            method: row.method, type: row.transactionType,
            category_id: row.category_id, subcategory_id: row.subcategory_id,
            bank_account_id: row.method === 'credit_card' ? null : row.bank_account_id,
            credit_card_id: row.method === 'credit_card' ? row.credit_card_id : null,
            purchase_date: row.method === 'credit_card' ? row.date : null,
            billing_year: null, billing_month: null,
            installment_count: 1, installment_number: 1,
            installment_group_id: null, is_recurring: false,
            recurring_day: null, recurring_group_id: null,
            notes: null, people_splits: [],
          })
        }

        // Salva na memória (só transações, não transferências)
        const bestPattern = row.description.toLowerCase().trim().slice(0, 50)
        const { error } = await supabase
          .from('import_memory')
          .upsert({
            description_pattern: bestPattern,
            method: row.method, type: row.transactionType,
            category_id: row.category_id, bank_account_id: row.bank_account_id,
            credit_card_id: row.credit_card_id,
            use_count: 1, last_used_at: new Date().toISOString(),
          }, { onConflict: 'description_pattern', ignoreDuplicates: false })

        if (error && error.code === '23505') {
          await supabase.from('import_memory')
            .update({
              method: row.method, type: row.transactionType,
              category_id: row.category_id, bank_account_id: row.bank_account_id,
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
    setFile(null); setFileType(null); setRawContent('')
    setPreviewRows([]); setStep('upload'); setImportCount(0)
    setSkipped(new Set())
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleBack() {
    if (step === 'preview' && fileType === 'csv') setStep('mapping')
    else if (step === 'mapping') setStep('upload')
    else if (step === 'preview' && fileType === 'ofx') setStep('upload')
  }

  const toggleSkip = useCallback((id: string) => {
    setSkipped(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSkipAll = useCallback(() => {
    const nonDupIds = previewRows.filter(r => !r.isDuplicate).map(r => r.id)
    if (skipped.size < nonDupIds.length) setSkipped(new Set(nonDupIds))
    else setSkipped(new Set())
  }, [skipped, previewRows])

  async function handleCreateCategoryOrSub() {
    if (!createDialog || !createName.trim()) return
    setCreating(true)
    try {
      if (createDialog.kind === 'category') {
        const cat = await addCategory(createName.trim(), createColor)
        // já atribui a categoria recém-criada à linha
        updateRow(createDialog.rowId, { category_id: cat.id, subcategory_id: null })
      } else if (createDialog.kind === 'subcategory' && createDialog.categoryId) {
        const sub = await addSubcategory(createDialog.categoryId, createName.trim(), null)
        updateRow(createDialog.rowId, { subcategory_id: sub.id })
      }
      setCreateDialog(null)
      setCreateName('')
      setCreateColor('#A78BFA')
    } catch (err) {
      console.error('Erro ao criar:', err)
    } finally {
      setCreating(false)
    }
  }

  const validRows    = previewRows.filter(r => !r.isDuplicate && !skipped.has(r.id))
  const skippedRows  = previewRows.filter(r => !r.isDuplicate && skipped.has(r.id))
  const duplicateRows = previewRows.filter(r => r.isDuplicate)
  const transferDupRows = previewRows.filter(r => r.isTransferDuplicate)
  const allNonDup    = previewRows.filter(r => !r.isDuplicate)
  const allSkipped   = skipped.size >= allNonDup.length && allNonDup.length > 0
  const selectedTotal = validRows.reduce((s, r) => s + r.amount, 0)


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

      {/* STEP: UPLOAD */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Tipo de importação</p>
            </div>
            <div className="space-y-3 px-4 pb-4 pt-3">
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
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: card.color }} />
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
              <input ref={fileInputRef} type="file" accept=".ofx,.csv" className="hidden" onChange={handleFileChange} />
            </div>
          </div>

          {file && (
            <Button
              className="w-full"
              onClick={processFile}
              disabled={loading || (importMode === 'card_statement' && !selectedCardId)}
            >
              {loading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processando...</>
                : <><Check className="h-4 w-4 mr-2" />Continuar</>
              }
            </Button>
          )}
        </div>
      )}

      {/* STEP: MAPPING */}
      {step === 'mapping' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Mapear colunas</p>
            </div>
            <div className="space-y-3 px-4 pb-4 pt-3">
              {(['date', 'description', 'amount'] as const).map(field => {
                const labels = { date: 'Data', description: 'Descrição', amount: 'Valor' }
                return (
                  <div key={field} className="space-y-1.5">
                    <label className="text-xs font-medium">{labels[field]}</label>
                    <Select
                      value={columnMapping[field] || detectedMapping?.[field] || ''}
                      onValueChange={v => setColumnMapping(prev => ({ ...prev, [field]: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {rawContent.split('\n')[0]?.split(delimiter).map((h, i) => (
                          <SelectItem key={i} value={h.replace(/"/g, '').trim()}>
                            {h.replace(/"/g, '').trim()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Separador</label>
                <Select value={delimiter} onValueChange={setDelimiter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
            className="w-full" onClick={processFile}
            disabled={loading || !columnMapping.date || !columnMapping.description || !columnMapping.amount}
          >
            {loading
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processando...</>
              : <><Check className="h-4 w-4 mr-2" />Pré-visualizar</>
            }
          </Button>
        </div>
      )}

      {/* STEP: PREVIEW */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">
                {validRows.length} de {allNonDup.length} selecionados
              </span>
              {skippedRows.length > 0 && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <MinusCircle className="h-3 w-3" />
                  {skippedRows.length} ignorados
                </Badge>
              )}
              {transferDupRows.length > 0 && (
                <Badge variant="outline" className="gap-1 text-primary/70">
                  <ArrowLeftRight className="h-3 w-3" />
                  {transferDupRows.length} transf. já registrada{transferDupRows.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {duplicateRows.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {duplicateRows.length} duplicados
                </Badge>
              )}
              <span className="font-mono text-sm font-semibold tabular-nums">
                {formatBRL(selectedTotal)}
              </span>
            </div>
          </div>

          {/* Bulk classify */}
          <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Classificar todos</p>
            </div>
            <div className="space-y-3 px-4 pb-4 pt-3">
              {importMode === 'transactions' && (
                <div className="grid grid-cols-2 gap-2">
                  <Select defaultValue="mine" onValueChange={v => updateAllRows({ transactionType: v as TransactionType })}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mine">Meu</SelectItem>
                      <SelectItem value="repasse">Repasse</SelectItem>
                      <SelectItem value="rateado">Rateado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select onValueChange={v => updateAllRows({ method: v as TransactionMethod })}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Método" /></SelectTrigger>
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
                <SelectTrigger className="text-xs"><SelectValue placeholder="Categoria (todas)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {importMode === 'transactions' && (
                <Select onValueChange={v => updateAllRows({ bank_account_id: v === 'none' ? null : v })}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Conta bancária (todas)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {bankAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Preview table */}
          <div className="rounded-xl border overflow-hidden">
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={!allSkipped && allNonDup.length > 0}
                        onCheckedChange={toggleSkipAll}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead className="text-xs w-[75px]">Data</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs w-[85px] text-right">Valor</TableHead>
                    <TableHead className="text-xs w-[130px]">Tipo</TableHead>
                    {importMode === 'transactions' && (
                      <TableHead className="text-xs w-[90px]">Método</TableHead>
                    )}
                    <TableHead className="text-xs w-[110px]">Categoria</TableHead>
                    <TableHead className="text-xs w-[110px]">Subcategoria</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map(row => {
                    const isSkipped = skipped.has(row.id)
                    const isTransfer = row.rowKind === 'transfer'
                    const needsTransferAccounts = isTransfer && (!row.transfer_from_account_id || !row.transfer_to_account_id)

                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          'transition-opacity',
                          row.isDuplicate && 'bg-destructive/5 opacity-40',
                          isSkipped && !row.isDuplicate && 'opacity-35',
                          row.isTransferDuplicate && !isSkipped && 'bg-primary/5',
                          row.memoryMatch && !row.isDuplicate && !isSkipped && !row.isTransferDuplicate && 'bg-positive/5',
                          isTransfer && !row.isDuplicate && !isSkipped && 'bg-accent/10',
                        )}
                      >
                        {/* Checkbox */}
                        <TableCell>
                          {!row.isDuplicate && (
                            <Checkbox
                              checked={!isSkipped}
                              onCheckedChange={() => toggleSkip(row.id)}
                            />
                          )}
                        </TableCell>

                        {/* Data */}
                        <TableCell className="text-xs">{formatDate(row.date)}</TableCell>

                        {/* Descrição + badges */}
                        <TableCell className="text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="truncate max-w-[140px] block">{row.description}</span>
                            {row.memoryMatch && !row.isDuplicate && !row.isTransferDuplicate && (
                              <span className="text-[10px] text-positive">✓ memória</span>
                            )}
                            {row.isDuplicate && <span className="text-[10px] text-destructive">duplicado</span>}
                            {row.isTransferDuplicate && !isSkipped && (
                              <span className="text-[10px] text-primary/70">transferência registrada</span>
                            )}
                            {isSkipped && !row.isDuplicate && (
                              <span className="text-[10px] text-muted-foreground">ignorado</span>
                            )}
                            {isTransfer && !isSkipped && needsTransferAccounts && (
                              <span className="text-[10px] text-warning">selecione as contas ↓</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Valor com cor */}
                        <TableCell className="text-xs text-right">
                          <div className="flex items-center justify-end gap-1">
                            {row.type === 'credit'
                              ? <TrendingUp className="h-3 w-3 text-positive shrink-0" />
                              : <TrendingDown className="h-3 w-3 text-destructive shrink-0" />
                            }
                            <span className={cn(
                              'font-mono font-medium tabular-nums',
                              row.type === 'credit' ? 'text-positive' : 'text-destructive',
                            )}>
                              {formatBRL(row.amount)}
                            </span>
                          </div>
                        </TableCell>

                        {/* Tipo: lançamento / transferência / ignorar */}
                        <TableCell className="text-xs">
                          <div className="flex flex-col gap-1">
                            <Select
                              value={row.rowKind}
                              onValueChange={v => updateRow(row.id, {
                                rowKind: v as RowKind,
                                // quando troca pra transfer, desmarca o skip se estava marcado
                                ...(v === 'transfer' && isSkipped ? {} : {}),
                              })}
                              disabled={row.isDuplicate}
                            >
                              <SelectTrigger className={cn('h-7 text-xs', isTransfer && 'border-accent/50')}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="transaction">
                                  <span className="flex items-center gap-1.5">
                                    <TrendingDown className="h-3 w-3" /> Lançamento
                                  </span>
                                </SelectItem>
                                <SelectItem value="transfer">
                                  <span className="flex items-center gap-1.5">
                                    <ArrowLeftRight className="h-3 w-3" /> Transferência
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Contas da transferência */}
                            {isTransfer && !row.isDuplicate && (
                              <div className="flex flex-col gap-1 mt-0.5">
                                <Select
                                  value={row.transfer_from_account_id || ''}
                                  onValueChange={v => updateRow(row.id, { transfer_from_account_id: v })}
                                >
                                  <SelectTrigger className="h-6 text-[10px]">
                                    <SelectValue placeholder="De (conta)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {bankAccounts.map(a => (
                                      <SelectItem key={a.id} value={a.id}>
                                        <span className="flex items-center gap-1.5">
                                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                                          {a.name}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={row.transfer_to_account_id || ''}
                                  onValueChange={v => updateRow(row.id, { transfer_to_account_id: v })}
                                >
                                  <SelectTrigger className="h-6 text-[10px]">
                                    <SelectValue placeholder="Para (conta)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {bankAccounts.map(a => (
                                      <SelectItem key={a.id} value={a.id}>
                                        <span className="flex items-center gap-1.5">
                                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                                          {a.name}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Método (só lançamentos) */}
                        {importMode === 'transactions' && (
                          <TableCell className="text-xs">
                            {row.rowKind === 'transaction' && !row.isDuplicate && (
                              <Select
                                value={row.method}
                                onValueChange={v => updateRow(row.id, { method: v as TransactionMethod })}
                              >
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="credit_card">Cartão</SelectItem>
                                  <SelectItem value="pix">PIX</SelectItem>
                                  <SelectItem value="debit">Débito</SelectItem>
                                  <SelectItem value="cash">Dinheiro</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        )}

                        {/* Categoria (só lançamentos) */}
                        <TableCell className="text-xs">
                          {row.rowKind === 'transaction' && !row.isDuplicate && (
                            <Select
                              value={row.category_id || 'none'}
                              onValueChange={v => {
                                if (v === '__create__') {
                                  setCreateDialog({ kind: 'category', rowId: row.id })
                                  setCreateName('')
                                  return
                                }
                                updateRow(row.id, {
                                  category_id: v === 'none' ? null : v,
                                  subcategory_id: null, // reset subcategoria ao trocar categoria
                                })
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-</SelectItem>
                                {categories.map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                                <SelectItem value="__create__" className="text-primary font-medium">
                                  + Criar categoria
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>

                        {/* Subcategoria (só quando tem categoria selecionada) */}
                        <TableCell className="text-xs">
                          {row.rowKind === 'transaction' && !row.isDuplicate && row.category_id && (() => {
                            const catSubs = subcategories.filter(s => s.category_id === row.category_id)
                            return (
                              <Select
                                value={row.subcategory_id || 'none'}
                                onValueChange={v => {
                                  if (v === '__create__') {
                                    setCreateDialog({ kind: 'subcategory', rowId: row.id, categoryId: row.category_id! })
                                    setCreateName('')
                                    return
                                  }
                                  updateRow(row.id, { subcategory_id: v === 'none' ? null : v })
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="-" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-</SelectItem>
                                  {catSubs.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                  ))}
                                  <SelectItem value="__create__" className="text-primary font-medium">
                                    + Criar subcategoria
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            )
                          })()}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <Button
            className="w-full" onClick={handleImport}
            disabled={loading || validRows.length === 0 ||
              validRows.some(r => r.rowKind === 'transfer' && (!r.transfer_from_account_id || !r.transfer_to_account_id))
            }
          >
            {loading
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando...</>
              : <><Check className="h-4 w-4 mr-2" />
                  Importar {validRows.length} {validRows.length !== 1 ? 'lançamentos' : 'lançamento'} · {formatBRL(selectedTotal)}
                </>
            }
          </Button>
          {validRows.some(r => r.rowKind === 'transfer' && (!r.transfer_from_account_id || !r.transfer_to_account_id)) && (
            <p className="text-xs text-center text-warning">
              Selecione as contas de origem e destino para todas as transferências antes de importar.
            </p>
          )}
        </div>
      )}

      {/* STEP: DONE */}
      {step === 'done' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-positive/10">
            <Check className="h-8 w-8 text-positive" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold">Importação concluída!</h2>
            <p className="text-muted-foreground mt-1">
              {importCount} {importCount !== 1 ? 'lançamentos importados' : 'lançamento importado'} com sucesso
            </p>
          </div>
          <Button onClick={reset} variant="outline">Importar outro arquivo</Button>
        </div>
      )}

      {/* Diálogo: criar categoria / subcategoria sem sair da importação */}
      <Dialog open={!!createDialog} onOpenChange={o => { if (!o) { setCreateDialog(null); setCreateName('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {createDialog?.kind === 'category' ? 'Nova categoria' : 'Nova subcategoria'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <Label>Nome</Label>
              <Input
                className="mt-1.5"
                placeholder={createDialog?.kind === 'category' ? 'Ex: Alimentação' : 'Ex: Restaurante'}
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateCategoryOrSub()}
                autoFocus
              />
            </div>

            {/* Cor só para categoria */}
            {createDialog?.kind === 'category' && (
              <div>
                <Label className="mb-2 block">Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {['#A78BFA', '#F87171', '#34D399', '#60A5FA', '#FBBF24', '#F472B6', '#22D3EE', '#A3E635', '#FB923C', '#94A3B8'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCreateColor(c)}
                      className={cn(
                        'h-7 w-7 rounded-full transition-transform',
                        createColor === c && 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110',
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialog(null); setCreateName('') }} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCategoryOrSub} disabled={creating || !createName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
              Criar e usar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
