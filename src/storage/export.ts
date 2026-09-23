import { ENTRIES, getEntry } from '@content/index'
import { accuracy } from '@/engine/srs'
import type { ProgressDoc, ProgressExport } from './progress-schema'

export function toExport(doc: ProgressDoc, now = Date.now()): ProgressExport {
  return {
    version: 1,
    app: 'riankeng',
    exportedAt: new Date(now).toISOString(),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    settings: doc.settings,
    items: Object.values(doc.items),
    sessions: doc.sessions,
    opened: doc.opened,
  }
}

export function exportJson(doc: ProgressDoc, now = Date.now()): string {
  return JSON.stringify(toExport(doc, now), null, 2)
}

export function exportCsv(doc: ProgressDoc): string {
  const header = 'id,rom,en,level,stage,due,reps,lapses,accuracy'
  const rows = ENTRIES.map((e) => {
    const p = doc.items[e.id]
    const acc = p ? accuracy(p).toFixed(2) : ''
    const en = (e.en[0] ?? '').replaceAll('"', '""')
    return [
      e.id,
      `"${e.rom.replaceAll('"', '""')}"`,
      `"${en}"`,
      e.level,
      p?.stage ?? '',
      p?.due ?? '',
      p?.reps ?? '',
      p?.lapses ?? '',
      acc,
    ].join(',')
  })
  return [header, ...rows].join('\n')
}

export function download(filename: string, body: string, mime: string): void {
  const blob = new Blob([body], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function csvRowCount(csv: string): number {
  return Math.max(0, csv.split('\n').length - 1)
}

export { getEntry }
