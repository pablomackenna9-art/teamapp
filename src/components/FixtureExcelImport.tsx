import { useRef, useState } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { read as xlsxRead, utils as xlsxUtils, write as xlsxWrite } from 'xlsx'
import { Button } from '@/components/Button'
import toast from 'react-hot-toast'
import type { FixtureMatch } from '@/types'

interface ParsedRow {
  round: number
  home_team: string
  away_team: string
  date: string
  home_score: number | null
  away_score: number | null
  valid: boolean
  error?: string
}

interface FixtureExcelImportProps {
  categoryId: string
  onClose: () => void
  onImport: (matches: FixtureMatch[]) => void
}

function excelDateToISO(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    // Excel serial date → JS date
    const epoch = new Date(Date.UTC(1899, 11, 30))
    const ms = value * 86400000
    return new Date(epoch.getTime() + ms).toISOString()
  }
  const parsed = new Date(String(value))
  if (!isNaN(parsed.getTime())) return parsed.toISOString()
  return null
}

function parseRows(rows: unknown[][]): ParsedRow[] {
  if (rows.length < 2) return []
  return rows.slice(1)
    .map(cols => {
      const round = parseInt(String(cols[0] ?? '').trim(), 10)
      const home_team = String(cols[1] ?? '').trim()
      const away_team = String(cols[2] ?? '').trim()
      const dateRaw = cols[3]
      const date = excelDateToISO(dateRaw)
      const hsRaw = String(cols[4] ?? '').trim()
      const asRaw = String(cols[5] ?? '').trim()
      const home_score = hsRaw !== '' ? parseInt(hsRaw, 10) : null
      const away_score = asRaw !== '' ? parseInt(asRaw, 10) : null

      let error: string | undefined
      if (!home_team || !away_team) error = 'Faltan equipos'
      else if (isNaN(round)) error = 'Jornada inválida'
      else if (!date) error = 'Fecha inválida'

      return {
        round: isNaN(round) ? 0 : round,
        home_team,
        away_team,
        date: date ?? new Date().toISOString(),
        home_score: home_score !== null && !isNaN(home_score) ? home_score : null,
        away_score: away_score !== null && !isNaN(away_score) ? away_score : null,
        valid: !error,
        error,
      }
    })
    .filter(r => r.home_team || r.away_team)
}

export function FixtureExcelImport({ categoryId, onClose, onImport }: FixtureExcelImportProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [step, setStep] = useState<'upload' | 'preview'>('upload')

  function handleFile(file: File) {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        let parsed: ParsedRow[]
        if (isExcel) {
          const buffer = e.target?.result as ArrayBuffer
          const wb = xlsxRead(buffer, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const data: unknown[][] = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' })
          parsed = parseRows(data)
        } else {
          const text = e.target?.result as string
          const lines = text.trim().split('\n').filter(l => l.trim())
          const delimiter = lines[0]?.includes(';') ? ';' : ','
          const data = lines.map(line => line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, '')))
          parsed = parseRows(data)
        }

        if (parsed.length === 0) {
          toast.error('No se encontraron partidos. Verificá el formato.')
          return
        }
        setRows(parsed)
        setStep('preview')
      } catch {
        toast.error('No se pudo leer el archivo.')
      }
    }

    if (isExcel) reader.readAsArrayBuffer(file)
    else reader.readAsText(file, 'UTF-8')
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleImport() {
    const valid = rows.filter(r => r.valid)
    if (valid.length === 0) { toast.error('No hay partidos válidos para importar'); return }

    const matches: FixtureMatch[] = valid.map((r, i) => ({
      id: `fx-import-${Date.now()}-${i}`,
      category_id: categoryId,
      round: r.round,
      home_team: r.home_team,
      away_team: r.away_team,
      date: r.date,
      home_score: r.home_score,
      away_score: r.away_score,
      played: r.home_score !== null && r.away_score !== null,
    }))

    onImport(matches)
    toast.success(`${matches.length} partidos importados al fixture`)
    onClose()
  }

  function downloadTemplate() {
    const wb = xlsxUtils.book_new()
    const ws = xlsxUtils.aoa_to_sheet([
      ['Jornada', 'Local', 'Visitante', 'Fecha', 'GolesLocal', 'GolesVisitante'],
      [1, 'Maestros', 'Rival FC', '2026-08-02', '', ''],
      [1, 'Otro Equipo', 'Tercer Equipo', '2026-08-02', '', ''],
      [2, 'Rival FC', 'Maestros', '2026-08-16', '', ''],
    ])
    xlsxUtils.book_append_sheet(wb, ws, 'Fixture')
    const buf: ArrayBuffer = xlsxWrite(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'plantilla_fixture.xlsx'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-700 p-5 pb-8 sm:pb-5 max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">Importar fixture</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {step === 'upload' ? (
          <div className="flex flex-col gap-4">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 text-sm font-medium py-2.5 px-4 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <Download size={15} style={{ color: 'var(--team-color)' }} />
              Descargar plantilla Excel (.xlsx)
            </button>

            <div className="bg-gray-800/50 rounded-xl p-3 text-xs text-gray-400 leading-relaxed">
              <p className="font-semibold text-gray-300 mb-1">Formato del archivo:</p>
              <p>• Columna A: <span className="text-white">Jornada</span> (número de fecha)</p>
              <p>• Columna B: <span className="text-white">Local</span></p>
              <p>• Columna C: <span className="text-white">Visitante</span></p>
              <p>• Columna D: <span className="text-white">Fecha</span> (AAAA-MM-DD)</p>
              <p>• Columna E y F: <span className="text-white">Goles</span> (opcional, si ya se jugó)</p>
              <p className="mt-2 text-gray-500">Formatos: .xlsx, .xls, .csv — cargá todos los partidos de todas las jornadas de la categoría de una sola vez.</p>
            </div>

            <div
              className="border-2 border-dashed border-gray-700 rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-gray-500 transition-colors"
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={32} className="text-gray-600" />
              <p className="text-gray-400 text-sm text-center">
                Arrastrá tu archivo aquí<br />o tocá para seleccionar
              </p>
              <span className="text-xs text-gray-600">.xlsx · .xls · .csv</span>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                <span className="text-white font-semibold">{rows.filter(r => r.valid).length}</span> partidos válidos
                {rows.filter(r => !r.valid).length > 0 && (
                  <span className="text-red-400"> · {rows.filter(r => !r.valid).length} con error</span>
                )}
              </p>
              <button onClick={() => setStep('upload')} className="text-xs text-gray-500 hover:text-white">
                Cambiar archivo
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ borderColor: r.valid ? '#374151' : '#7f1d1d', background: r.valid ? 'transparent' : '#7f1d1d20' }}
                >
                  {r.valid
                    ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                    : <AlertCircle size={16} className="text-red-400 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      J{r.round}: {r.home_team || '?'} vs {r.away_team || '?'}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {r.home_score !== null ? `${r.home_score} - ${r.away_score}` : 'Sin jugar'}
                    </p>
                  </div>
                  {r.error && <p className="text-red-400 text-xs shrink-0">{r.error}</p>}
                </div>
              ))}
            </div>

            <Button fullWidth onClick={handleImport}>
              Importar {rows.filter(r => r.valid).length} partidos
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
