'use client'

import { Button } from '@r2-drive/ui/components/button'
import { UIR2Item } from '@r2-drive/utils/types/item'
import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface SpreadsheetViewerProps {
  url: string
  item: UIR2Item
}

type SheetData = (string | number | null)[][]

interface ParsedData {
  sheets: { name: string; data: SheetData }[]
  error?: string
}

export function SpreadsheetViewer({ url, item }: SpreadsheetViewerProps) {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)

  const isCSV = item.path.name.toLowerCase().endsWith('.csv')
  const isTSV = item.path.name.toLowerCase().endsWith('.tsv')

  useEffect(() => {
    let cancelled = false

    async function fetchAndParse() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to fetch file')

        if (isCSV || isTSV) {
          // Parse CSV/TSV
          const text = await response.text()
          if (cancelled) return

          Papa.parse(text, {
            delimiter: isTSV ? '\t' : ',',
            skipEmptyLines: true,
            complete: (results) => {
              if (!cancelled) {
                setParsedData({
                  sheets: [
                    {
                      name: item.path.name,
                      data: results.data as SheetData,
                    },
                  ],
                })
              }
            },
            error: (err: Error) => {
              if (!cancelled) {
                setError(err.message)
              }
            },
          })
        } else {
          // Parse Excel (XLSX/XLS)
          const arrayBuffer = await response.arrayBuffer()
          if (cancelled) return

          const workbook = XLSX.read(arrayBuffer, { type: 'array' })
          const sheets = workbook.SheetNames.map((sheetName) => {
            const worksheet = workbook.Sheets[sheetName]
            if (!worksheet) {
              return { name: sheetName, data: [] as SheetData }
            }
            const data = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              defval: null,
            }) as SheetData
            return { name: sheetName, data }
          })

          if (!cancelled) {
            setParsedData({ sheets })
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to parse file')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchAndParse()
    return () => {
      cancelled = true
    }
  }, [url, item.path.name, isCSV, isTSV])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-white/60">Loading spreadsheet...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-white/80">
        <p className="text-red-400 mb-2">Failed to load spreadsheet</p>
        <p className="text-sm text-white/60">{error}</p>
      </div>
    )
  }

  if (!parsedData || parsedData.sheets.length === 0) {
    return (
      <div className="text-center text-white/80">
        <p className="text-white/60">No data found in file</p>
      </div>
    )
  }

  const currentSheet = parsedData.sheets[activeSheetIndex]
  if (!currentSheet) {
    return (
      <div className="text-center text-white/80">
        <p className="text-white/60">Sheet not found</p>
      </div>
    )
  }

  const rowCount = currentSheet.data.length
  const colCount = currentSheet.data[0]?.length || 0

  return (
    <div className="w-full max-w-7xl">
      <div className="bg-zinc-900 rounded-lg border border-white/10">
        {/* Header */}
        <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <span className="text-white/80 text-sm font-mono">{item.path.name}</span>
          <span className="text-white/60 text-xs">
            {rowCount.toLocaleString()} rows × {colCount.toLocaleString()} columns
          </span>
        </div>

        {/* Sheet tabs for multi-sheet Excel files */}
        {parsedData.sheets.length > 1 && (
          <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex gap-2 overflow-x-auto">
            {parsedData.sheets.map((sheet, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => setActiveSheetIndex(index)}
                className={`text-xs h-7 ${
                  index === activeSheetIndex
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5'
                }`}
              >
                {sheet.name}
              </Button>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="overflow-auto max-h-[calc(100vh-16rem)]">
          <table className="w-full text-sm">
            <tbody>
              {currentSheet.data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={rowIndex === 0 ? 'bg-white/5 sticky top-0' : ''}
                >
                  {row.map((cell, colIndex) => {
                    const isHeader = rowIndex === 0
                    const CellTag = isHeader ? 'th' : 'td'
                    return (
                      <CellTag
                        key={colIndex}
                        className={`px-3 py-2 border-r border-b border-white/10 ${
                          isHeader
                            ? 'text-white/90 font-medium text-left'
                            : 'text-white/70'
                        }`}
                      >
                        {cell !== null && cell !== undefined ? String(cell) : ''}
                      </CellTag>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
