import { useRef, useState } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { read as xlsxRead, utils as xlsxUtils, write as xlsxWrite } from 'xlsx'
import { Button } from '@/components/Button'
import toast from 'react-hot-toast'

interface ParsedPlayer {
  name: string
  position: string
  number: string
  valid: boolean
  error?: string
}

interface ExcelImportProps {
  onClose: () => void
  onImport: (players: ParsedPlayer[]) => Promise<void>
}

function parseRows(rows: string[][]): ParsedPlayer[] {
  if (rows.length < 2) return []
  // Skip header row (first row)
  return rows.slice(1)
    .map(cols => {
      const name = String(cols[0] ?? '').trim()
      const position = String(cols[1] ?? '').trim()
      const number = String(cols[2] ?? '').trim()
      const valid = name.length > 1
      return { name, position, number, valid, error: !valid ? 'Nombre requerido' : undefined }
    })
    .filter(p => p.name)
}

function parseExcel(buffer: ArrayBuffer): ParsedPlayer[] {
  const wb = xlsxRead(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: string[][] = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' })
  return parseRows(rows)
}

function parseCSVText(text: string): ParsedPlayer[] {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const delimiter = lines[0].includes(';') ? ';' : ','
  const rows = lines.map(line => line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, '')))
  return parseRows(rows)
}

export function ExcelImport({ onClose, onImport }: ExcelImportProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [players, setPlayers] = useState<ParsedPlayer[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview'>('upload')

  function handleFile(file: File) {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

    if (isExcel) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer
          const parsed = parseExcel(buffer)
          if (parsed.length === 0) {
            toast.error('No se encontraron jugadores. Verificá el formato.')
            return
          }
          setPlayers(parsed)
          setStep('preview')
        } catch {
          toast.error('No se pudo leer el archivo Excel.')
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const parsed = parseCSVText(text)
        if (parsed.length === 0) {
          toast.error('No se encontraron jugadores. Verificá el formato del archivo.')
          return
        }
        setPlayers(parsed)
        setStep('preview')
      }
      reader.readAsText(file, 'UTF-8')
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleImport() {
    const valid = players.filter(p => p.valid)
    if (valid.length === 0) { toast.error('No hay jugadores válidos para importar'); return }
    setLoading(true)
    try {
      await onImport(valid)
      toast.success(`${valid.length} jugadores importados correctamente`)
      onClose()
    } catch {
      toast.error('Error al importar jugadores')
    }
    setLoading(false)
  }

  function downloadTemplate() {
    // Build an xlsx template using the xlsx library
    const wb = xlsxUtils.book_new()
    const ws = xlsxUtils.aoa_to_sheet([
      ['Nombre', 'Posición', 'Número'],
      ['Juan Pérez', 'Delantero', '9'],
      ['Lucas Rodríguez', 'Arquero', '1'],
      ['Matías González', 'Defensor', '4'],
    ])
    xlsxUtils.book_append_sheet(wb, ws, 'Jugadores')
    const buf: ArrayBuffer = xlsxWrite(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'plantilla_jugadores.xlsx'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-700 p-5 pb-8 sm:pb-5 max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">Importar jugadores</h2>
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
              <p>• Columna A: <span className="text-white">Nombre</span> (requerido)</p>
              <p>• Columna B: <span className="text-white">Posición</span> (Arquero, Defensor, Mediocampista, Delantero)</p>
              <p>• Columna C: <span className="text-white">Número</span> de camiseta</p>
              <p className="mt-2 text-gray-500">Formatos aceptados: .xlsx, .xls, .csv</p>
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
                <span className="text-white font-semibold">{players.filter(p => p.valid).length}</span> jugadores válidos
                {players.filter(p => !p.valid).length > 0 && (
                  <span className="text-red-400"> · {players.filter(p => !p.valid).length} con error</span>
                )}
              </p>
              <button onClick={() => setStep('upload')} className="text-xs text-gray-500 hover:text-white">
                Cambiar archivo
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
              {players.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ borderColor: p.valid ? '#374151' : '#7f1d1d', background: p.valid ? 'transparent' : '#7f1d1d20' }}
                >
                  {p.valid
                    ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                    : <AlertCircle size={16} className="text-red-400 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.name || '(sin nombre)'}</p>
                    <p className="text-gray-500 text-xs">{p.position || '—'} {p.number ? `· #${p.number}` : ''}</p>
                  </div>
                  {p.error && <p className="text-red-400 text-xs">{p.error}</p>}
                </div>
              ))}
            </div>

            <Button fullWidth loading={loading} onClick={handleImport}>
              Importar {players.filter(p => p.valid).length} jugadores
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
