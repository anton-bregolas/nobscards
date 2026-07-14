import { useState, useMemo, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import type { StoredWord, Word, DictMeta } from '../types'
import { useTranslation } from '../i18n'

interface LearnedTableProps {
  learned: StoredWord[]
  words: Word[]
  dictMeta: DictMeta
  onToggleLearned: (id: number) => void
  phrasebookMode: boolean
  useAltInputLang: boolean
  useRefLangForLabels: boolean
  sortTablesBy: string[]
  onSortTablesBy: (arr: string[]) => void
}

type SortKey = 'word' | 'date' | 'acc'
type SortDir = 'asc' | 'desc'

function parseSortEntry(e: string): [SortKey, SortDir] {
  const i = e.lastIndexOf('_')
  const key = i > 0 ? e.slice(0, i) as SortKey : 'date'
  const dir = e.slice(i + 1) === 'asc' ? 'asc' : 'desc'
  return [key, dir]
}

function displayText(v: string | string[] | number | null | undefined): string {
  if (v == null) return ''
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

function firstText(v: string | string[] | number | null | undefined): string {
  if (v == null) return ''
  if (Array.isArray(v)) return v.length > 0 ? String(v[0]) : ''
  return String(v)
}

export default function LearnedTable({ learned, words, dictMeta, onToggleLearned, phrasebookMode, useAltInputLang, useRefLangForLabels, sortTablesBy, onSortTablesBy }: LearnedTableProps) {
  const { t } = useTranslation()
  const availableKeys = phrasebookMode ? (['acc', 'word', 'date'] as SortKey[]) : (['date', 'word'] as SortKey[])
  const [sortKey, sortDir] = useMemo(() => {
    for (const e of sortTablesBy) {
      const [k] = parseSortEntry(e)
      if (availableKeys.includes(k)) return parseSortEntry(e)
    }
    return ['date', 'desc'] as [SortKey, SortDir]
  }, [sortTablesBy, phrasebookMode])
  const [pressedId, setPressedId] = useState<number | null>(null)
  const [swipe, setSwipe] = useState<{ id: number; offset: number; settled: boolean } | null>(null)
  const [sortAnnouncement, setSortAnnouncement] = useState('')
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const swipeActive = useRef(false)
  const tableRef = useRef<HTMLTableElement>(null)
  const swipeBtnRef = useRef<HTMLButtonElement>(null)
  const swipeFromKeyboard = useRef(false)
  const pendingFocus = useRef(false)
  const setLastFocused = (row: number, col: number) => {
    tableRef.current?.setAttribute('data-lastfocused', `${row}:${col}`)
  }
  const getLastFocused = (): { row: number; col: number } => {
    const val = tableRef.current?.getAttribute('data-lastfocused')
    if (!val) return { row: 0, col: 0 }
    const [r, c] = val.split(':').map(Number)
    return { row: r || 0, col: c || 0 }
  }
  const deleteTargetRef = useRef<{ row: number; col: number } | null>(null)
  const deleteOriginRef = useRef<{ row: number; col: number } | null>(null)

  useEffect(() => {
    if (!swipe || !swipe.settled || swipe.offset < 0) return
    const timer = setTimeout(() => setSwipe(null), 200)
    return () => clearTimeout(timer)
  }, [swipe])

  useEffect(() => {
    if (swipe?.settled && swipe.offset < 0 && pendingFocus.current && swipeFromKeyboard.current && swipeBtnRef.current) {
      swipeBtnRef.current.focus()
      pendingFocus.current = false
    }
  }, [swipe?.settled, swipe?.offset])

  const wordMap = useMemo(() => {
    const map = new Map<number, Word>()
    for (const w of words) map.set(w.id, w)
    return map
  }, [words])

  const sorted = useMemo(() => {
    const items = learned
      .map((l) => ({ ...l, word: wordMap.get(l.id) }))
      .filter((l) => l.word)

    items.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') {
        cmp = a.addedAt.localeCompare(b.addedAt)
      } else if (sortKey === 'acc') {
        const aPct = a.accuStat?.length ? a.accuStat[a.accuStat.length - 1] : -1
        const bPct = b.accuStat?.length ? b.accuStat[b.accuStat.length - 1] : -1
        cmp = aPct - bPct
      } else {
        const sortField = phrasebookMode ? dictMeta.langTo : dictMeta.langRef
        const aVal = displayText(a.word![sortField])
        const bVal = displayText(b.word![sortField])
        cmp = aVal.localeCompare(bVal)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return items
  }, [learned, wordMap, sortKey, sortDir, phrasebookMode, dictMeta])

  const handleSort = useCallback((key: SortKey) => {
    const defaultDir: SortDir = key === 'date' ? 'desc' : 'asc'
    const dirKeys: Record<SortKey, Record<SortDir, string>> = {
      word: { asc: 'sort.alphaAz', desc: 'sort.alphaZa' },
      acc: { asc: 'sort.accAsc', desc: 'sort.accDesc' },
      date: { asc: 'sort.dateAsc', desc: 'sort.dateDesc' },
    }
    if (key === sortKey) {
      const next: SortDir = sortDir === 'asc' ? 'desc' : 'asc'
      const entry = `${key}_${next}`
      onSortTablesBy([entry, ...sortTablesBy.filter(e => parseSortEntry(e)[0] !== key)])
      setSortAnnouncement(t('sort.changed', { label: t(dirKeys[key][next] as 'sort.alphaAz') }))
    } else {
      const entry = `${key}_${defaultDir}`
      onSortTablesBy([entry, ...sortTablesBy.filter(e => parseSortEntry(e)[0] !== key)])
      setSortAnnouncement(t('sort.changed', { label: t(dirKeys[key][defaultDir] as 'sort.alphaAz') }))
    }
  }, [sortKey, sortDir, sortTablesBy, onSortTablesBy, t])

  const moveTo = useCallback((row: number, col: number): boolean => {
    const el = tableRef.current?.querySelector<HTMLElement>(
      `[data-row="${row}"][data-col="${col}"]`
    )
    if (!el || el.offsetParent === null) return false
    const prev = tableRef.current?.querySelector<HTMLElement>('[tabindex="0"]')
    if (prev && prev !== el) prev.tabIndex = -1
    el.tabIndex = 0
    el.focus()
    return true
  }, [])

  useLayoutEffect(() => {
    if (!tableRef.current) return
    const first = tableRef.current.querySelector<HTMLElement>('[data-row="0"][data-col="0"]')
    if (first) first.tabIndex = 0
  }, [])

  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    const onFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      const row = target.dataset?.row ?? target.closest<HTMLElement>('[data-row]')?.dataset?.row
      const col = target.dataset?.col ?? target.closest<HTMLElement>('[data-col]')?.dataset?.col
      if (row != null && col != null) setLastFocused(Number(row), Number(col))
    }
    el.addEventListener('focusin', onFocus)
    return () => el.removeEventListener('focusin', onFocus)
  }, [])

  useLayoutEffect(() => {
    if (deleteTargetRef.current) {
      const { row, col } = deleteTargetRef.current
      deleteTargetRef.current = null
      if (!moveTo(row, col)) moveTo(row, 0)
    }
  }, [sorted.length, moveTo])

  useEffect(() => {
    if (!tableRef.current) return
    const observer = new ResizeObserver(() => {
      const tabCell = tableRef.current?.querySelector<HTMLElement>('[tabindex="0"]')
      if (tabCell && tabCell.offsetParent === null) {
        const last = getLastFocused()
        const candidates: [number, number][] = []
        if (last.col > 0) candidates.push([last.row, last.col - 1])
        for (let c = 0; c <= (last.col > 0 ? last.col - 1 : 0); c++) candidates.push([last.row, c])
        if (last.row > 0) candidates.push([last.row - 1, 0])
        candidates.push([0, 0])
        for (const [r2, c2] of candidates) {
          const el = tableRef.current?.querySelector<HTMLElement>(`[data-row="${r2}"][data-col="${c2}"]`)
          if (el && el.offsetParent !== null) {
            tabCell.tabIndex = -1
            el.tabIndex = 0
            setLastFocused(r2, c2)
            if (document.activeElement === tabCell || !tableRef.current?.contains(document.activeElement)) {
              el.focus()
            }
            return
          }
        }
      }
      const active = document.activeElement as HTMLElement
      if (active && tableRef.current?.contains(active) && active.offsetParent === null) {
        const cell = active.closest<HTMLElement>('[data-row]')
        const row = parseInt(cell?.dataset.row ?? '0', 10)
        for (const fallbackCol of [1, 0]) {
          if (moveTo(row, fallbackCol)) return
        }
        if (row > 0) {
          for (const fallbackCol of [1, 0]) {
            if (moveTo(row - 1, fallbackCol)) return
          }
        }
        moveTo(0, 0)
      }
    })
    observer.observe(tableRef.current)
    return () => observer.disconnect()
  }, [moveTo])

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <i className="bi bi-arrow-down-up text-xs opacity-40 ml-1" />
    return sortDir === 'asc' ? (
      <i className="bi bi-sort-up ml-1 text-accent" />
    ) : (
      <i className="bi bi-sort-down ml-1 text-accent" />
    )
  }

  if (learned.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-text opacity-60">
        <i className="bi bi-check-circle text-6xl" />
        <p className="text-lg">{t('learned.empty')}</p>
      </div>
    )
  }

  const wikiUrl = (w: Word) => {
    const ref = w[dictMeta.langRef]
    if (!ref) return null
    const s = Array.isArray(ref) ? ref[0] : ref
    return `https://sh.wiktionary.org/w/index.php?title=${encodeURIComponent(s)}`
  }

  const wordLabel = phrasebookMode ? dictMeta.langTo.toUpperCase().slice(0, 2) : dictMeta.langFrom.toUpperCase().slice(0, 2)
  const totalCols = phrasebookMode ? 5 : 4
  const removeCol = phrasebookMode ? 4 : 3

  const findNextCell = (row: number, col: number, dRow: number, dCol: number): { row: number; col: number } | null => {
    let r = row
    let c = col
    let wrapped = false
    for (let i = 0; i < 100; i++) {
      c += dCol
      r += dRow
      if (dCol !== 0) {
        if (c >= totalCols) { c = 0; r++; wrapped = true }
        if (c < 0) { c = totalCols - 1; r--; wrapped = true }
      }
      if (r < 0 || r > sorted.length) return null
      const cell = tableRef.current?.querySelector<HTMLElement>(
        `[data-row="${r}"][data-col="${c}"]`
      )
      if (cell && cell.offsetParent !== null) return { row: r, col: c }
      if (wrapped) break
    }
    return null
  }

  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    const cell = target.closest<HTMLElement>('[data-row]')
    const row = parseInt(cell?.dataset.row ?? '0', 10)
    const col = parseInt(cell?.dataset.col ?? '0', 10)

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault()
        const next = findNextCell(row, col, 0, 1)
        if (next) { moveTo(next.row, next.col) }
        return
      }
      case 'ArrowLeft': {
        e.preventDefault()
        const next = findNextCell(row, col, 0, -1)
        if (next) { moveTo(next.row, next.col) }
        return
      }
      case 'ArrowDown': {
        e.preventDefault()
        const next = findNextCell(row, col, 1, 0)
        if (next) { moveTo(next.row, next.col) }
        return
      }
      case 'ArrowUp': {
        e.preventDefault()
        const next = findNextCell(row, col, -1, 0)
        if (next) { moveTo(next.row, next.col) }
        return
      }
      case 'Home': {
        e.preventDefault()
        if (e.ctrlKey) {
          for (let c = 0; c < totalCols; c++) {
            const cell = tableRef.current?.querySelector<HTMLElement>(`[data-row="0"][data-col="${c}"]`)
            if (cell && cell.offsetParent !== null) {
              moveTo(0, c)
              return
            }
          }
        } else {
          for (let c = 0; c < totalCols; c++) {
            const cell = tableRef.current?.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${c}"]`)
            if (cell && cell.offsetParent !== null) {
              moveTo(row, c)
              return
            }
          }
        }
        return
      }
      case 'End': {
        e.preventDefault()
        if (e.ctrlKey) {
          for (let c = totalCols - 1; c >= 0; c--) {
            const cell = tableRef.current?.querySelector<HTMLElement>(`[data-row="${sorted.length}"][data-col="${c}"]`)
            if (cell && cell.offsetParent !== null) {
              moveTo(sorted.length, c)
              return
            }
          }
        } else {
          for (let c = totalCols - 1; c >= 0; c--) {
            const cell = tableRef.current?.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${c}"]`)
            if (cell && cell.offsetParent !== null) {
              moveTo(row, c)
              return
            }
          }
        }
        return
      }
      case 'PageDown': {
        e.preventDefault()
        const targetRow = Math.min(row + 5, sorted.length)
        if (!moveTo(targetRow, col)) {
          for (let r = sorted.length; r >= 0; r--) {
            if (moveTo(r, col)) return
          }
        }
        return
      }
      case 'PageUp': {
        e.preventDefault()
        const targetRow = Math.max(row - 5, 0)
        if (!moveTo(targetRow, col)) {
          for (let r = 0; r <= sorted.length; r++) {
            if (moveTo(r, col)) return
          }
        }
        return
      }
      case 'Enter':
      case ' ': {
        e.preventDefault()
        if (row === 0) {
          const sortableKeys: Record<number, SortKey> = phrasebookMode
            ? { 0: 'word', 2: 'acc', 3: 'date' }
            : { 0: 'word', 2: 'date' }
          if (sortableKeys[col]) handleSort(sortableKeys[col])
        } else {
          const item = sorted[row - 1]
          if (!item) return
          if (col === 0) {
            setPressedId((prev) => prev === item.id ? null : item.id)
          } else if (col === 1 && !phrasebookMode) {
            const url = wikiUrl(item.word!)
            if (url) window.open(url, '_blank', 'noopener,noreferrer')
          } else if (col === removeCol) {
            const targetRow = Math.max(0, row - 1)
            deleteTargetRef.current = { row: targetRow, col: removeCol }
            onToggleLearned(item.id)
          }
        }
        return
      }
      case 'Delete': {
        if (row > 0 && !(swipe?.settled && swipe.offset < 0)) {
          e.preventDefault()
          const item = sorted[row - 1]
          if (item && window.matchMedia('(max-width: 30em)').matches) {
            deleteOriginRef.current = { row, col }
            if (sorted.length === 1) {
              onToggleLearned(item.id)
            } else {
              swipeFromKeyboard.current = true
              pendingFocus.current = true
              setSwipe({ id: item.id, offset: -64, settled: true })
            }
          }
        }
        return
      }
      case 'Escape': {
        if (swipe) {
          e.preventDefault()
          setSwipe(null)
          if (deleteOriginRef.current) {
            const { row: oRow, col: oCol } = deleteOriginRef.current
            deleteOriginRef.current = null
            requestAnimationFrame(() => moveTo(oRow, oCol))
          }
        }
        return
      }
    }
  }

  const wordColIdx = 0
  const wikiColIdx = 1
  const accColIdx = phrasebookMode ? 2 : -1
  const dateColIdx = phrasebookMode ? 3 : 2
  const removeColIdx = phrasebookMode ? 4 : 3

  return (
    <div className="w-full max-w-[90%] mx-auto px-2 overflow-x-hidden">
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {sortAnnouncement}
      </div>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {pressedId != null ? (() => {
          const item = sorted.find(s => s.id === pressedId)
          if (!item) return ''
          const w = item.word!
          const isDefaultForType =
            (dictMeta.type === 'words' && !phrasebookMode) ||
            (dictMeta.type === 'phrases' && phrasebookMode)
          if (isDefaultForType) {
            const accentKey = useAltInputLang && dictMeta.langToAlt ? dictMeta.langToAlt : dictMeta.langTo
            return displayText(w[accentKey])
          } else {
            const accentKey = useAltInputLang && dictMeta.langRef ? dictMeta.langRef : dictMeta.langFrom
            return displayText(w[accentKey])
          }
        })() : ''}
      </div>
      <table
        ref={tableRef}
        className="w-full table-auto border-collapse"
        role="grid"
        aria-colcount={totalCols}
        onKeyDown={handleGridKeyDown}
        onFocus={(e) => {
          const target = e.target as HTMLElement
          if (target !== tableRef.current && target.offsetParent === null) {
            const last = getLastFocused()
            const candidates: [number, number][] = []
            if (last.col > 0) candidates.push([last.row, last.col - 1])
            for (let c = 0; c <= (last.col > 0 ? last.col - 1 : 0); c++) candidates.push([last.row, c])
            if (last.row > 0) candidates.push([last.row - 1, 0])
            candidates.push([0, 0])
            for (const [r, c] of candidates) {
              const el = tableRef.current?.querySelector<HTMLElement>(`[data-row="${r}"][data-col="${c}"]`)
              if (el && el.offsetParent !== null) {
                target.tabIndex = -1
                el.tabIndex = 0
                el.focus()
                return
              }
            }
          }
        }}
      >
        <thead role="rowgroup">
          <tr className="border-b border-text/20" role="row">
            <th
              role="columnheader"
              className="px-4 py-3 text-left text-sm font-medium text-subhead cursor-pointer select-none transition-colors duration-150 hover:text-accent focus-visible:text-accent min-[25em]:w-[350px]"
              data-row="0"
              data-col={wordColIdx}
              aria-colindex={wordColIdx + 1}
              aria-sort={sortKey === 'word' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              title={t('sort.wordHeader')}
              aria-label={t('sort.wordHeader')}
              onClick={() => handleSort('word')}
            >
              {wordLabel} {sortIcon('word')}
            </th>
            <th
              role="columnheader"
              className={`px-4 py-3 text-center text-sm font-medium text-subhead ${phrasebookMode ? 'hidden' : ''}`}
              data-row="0"
              data-col={wikiColIdx}
              aria-colindex={wikiColIdx + 1}
              title={t('sort.wikiHeader')}
              aria-label={t('sort.wikiHeader')}
            >
              <i className="bi bi-wikipedia" />
            </th>
            <th
              role="columnheader"
              className="px-4 py-3 text-center text-sm font-medium text-subhead cursor-pointer select-none transition-colors duration-150 hover:text-accent focus-visible:text-accent"
              data-row="0"
              data-col={phrasebookMode ? accColIdx : dateColIdx}
              aria-colindex={(phrasebookMode ? accColIdx : dateColIdx) + 1}
              aria-sort={sortKey === (phrasebookMode ? 'acc' : 'date') ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              title={phrasebookMode ? t('sort.accHeader') : t('sort.dateHeader')}
              aria-label={phrasebookMode ? t('sort.accHeader') : t('sort.dateHeader')}
              onClick={() => phrasebookMode ? handleSort('acc') : handleSort('date')}
            >
              {phrasebookMode ? <><i className="bi bi-bullseye" /> {sortIcon('acc')}</> : <><i className="bi bi-calendar3" /> {sortIcon('date')}</>}
            </th>
            {phrasebookMode && (
              <th
                role="columnheader"
                className="px-4 py-3 text-center text-sm font-medium text-subhead cursor-pointer select-none transition-colors duration-150 hover:text-accent focus-visible:text-accent"
                data-row="0"
                data-col={dateColIdx}
                aria-colindex={dateColIdx + 1}
                aria-sort={sortKey === 'date' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                title={t('sort.dateHeader')}
                aria-label={t('sort.dateHeader')}
                onClick={() => handleSort('date')}
              >
                <i className="bi bi-calendar3" /> {sortIcon('date')}
              </th>
            )}
            <th
              role="columnheader"
              className="px-4 py-3 text-center text-sm font-medium text-subhead max-[30em]:hidden"
              data-row="0"
              data-col={removeColIdx}
              aria-colindex={removeColIdx + 1}
              title={t('sort.removeHeader')}
              aria-label={t('sort.removeHeader')}
            >
              <i className="bi bi-trash" />
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {sorted.map((item, idx) => {
            const w = item.word!
            const showTranslation = pressedId === item.id
            const rowIndex = idx + 1

            return (
              <tr
                key={item.id}
                role="row"
                className="border-b border-text/10 transition-colors duration-150 hover:bg-text/5 focus-visible:bg-text/5 relative"
                style={{ touchAction: 'pan-y' }}
                onTouchStart={(e) => {
                  if (swipe?.settled && swipe.offset < 0) return
                  swipeFromKeyboard.current = false
                  touchStartX.current = e.touches[0].clientX
                  touchStartY.current = e.touches[0].clientY
                  swipeActive.current = false
                }}
                onTouchMove={(e) => {
                  if (swipe?.settled && swipe.offset < 0) return
                  const dx = e.touches[0].clientX - touchStartX.current
                  if (!swipeActive.current) {
                    if (Math.abs(dx) < 5) return
                    swipeActive.current = true
                    setSwipe({ id: item.id, offset: 0, settled: false })
                  }
                  const offset = Math.max(-64, Math.min(0, dx))
                  setSwipe((prev) => prev?.id === item.id ? { ...prev, offset } : prev)
                }}
                onTouchEnd={(e) => {
                  if (!swipeActive.current) return
                  swipeActive.current = false
                  const dx = e.changedTouches[0].clientX - touchStartX.current
                  const dy = e.changedTouches[0].clientY - touchStartY.current
                  if (dx < -50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                    setSwipe((prev) => prev?.id === item.id ? { ...prev, offset: -64, settled: true } : null)
                  } else {
                    setSwipe((prev) => prev?.id === item.id ? { ...prev, offset: 0, settled: true } : null)
                  }
                }}
              >
                <td
                  role="gridcell"
                  className="px-4 py-3 text-sm break-words cursor-help min-[25em]:w-[350px]"
                  data-row={rowIndex}
                  data-col={wordColIdx}
                  aria-colindex={wordColIdx + 1}
                  onMouseDown={() => setPressedId(item.id)}
                  onMouseUp={() => setPressedId(null)}
                  onMouseLeave={() => setPressedId(null)}
                  onTouchStart={() => setPressedId(item.id)}
                  onTouchEnd={() => setPressedId(null)}
                  onTouchCancel={() => setPressedId(null)}
                  onBlur={() => setPressedId((prev) => prev === item.id ? null : prev)}
                >
                  {showTranslation ? (() => {
                    const isDefaultForType =
                      (dictMeta.type === 'words' && !phrasebookMode) ||
                      (dictMeta.type === 'phrases' && phrasebookMode)
                    if (isDefaultForType) {
                      const accentKey = useAltInputLang && dictMeta.langToAlt ? dictMeta.langToAlt : dictMeta.langTo
                      return <span className="text-accent">{displayText(w[accentKey])}</span>
                    } else {
                      const accentKey = useAltInputLang && dictMeta.langRef ? dictMeta.langRef : dictMeta.langFrom
                      return <span className="text-accent">{displayText(w[accentKey])}</span>
                    }
                  })() : (() => {
                    const isWordsType = dictMeta.type === 'words'
                    if (isWordsType && !phrasebookMode) {
                      return <span>{useRefLangForLabels ? displayText(w[dictMeta.langRef]) : displayText(w[dictMeta.langFrom])}</span>
                    } else if (isWordsType && phrasebookMode) {
                      return <span>{(useRefLangForLabels && dictMeta.langToAlt && w[dictMeta.langToAlt] != null) ? firstText(w[dictMeta.langToAlt]) : firstText(w[dictMeta.langTo])}</span>
                    } else if (!isWordsType && phrasebookMode) {
                      return <span>{useRefLangForLabels ? firstText(w[dictMeta.langRef]) : firstText(w[dictMeta.langFrom])}</span>
                    } else {
                      return <span>{(useRefLangForLabels && dictMeta.langToAlt && w[dictMeta.langToAlt] != null) ? firstText(w[dictMeta.langToAlt]) : firstText(w[dictMeta.langTo])}</span>
                    }
                  })()}
                </td>
                <td
                  role="gridcell"
                  className={`px-4 py-3 text-center whitespace-nowrap ${phrasebookMode ? 'hidden' : ''}`}
                  data-row={rowIndex}
                  data-col={wikiColIdx}
                  aria-colindex={wikiColIdx + 1}
                >
                  {wikiUrl(w) && (
                    <a
                      href={wikiUrl(w)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={-1}
                      title={t('card.wikiPage')}
                      aria-label={t('card.wikiPage')}
                      onMouseDown={(e) => e.preventDefault()}
                      className="inline-block w-6 h-6 text-center leading-6 rounded-full text-text opacity-60 hover:opacity-100 hover:text-accent focus-visible:opacity-100 focus-visible:text-accent transition-all duration-200 focus-ring focus-circle"
                    >
                      <i className="bi bi-wikipedia" />
                    </a>
                  )}
                </td>
                <td
                  role="gridcell"
                  className="px-4 py-3 text-sm text-text opacity-70 text-center whitespace-nowrap overflow-hidden text-ellipsis"
                  data-row={rowIndex}
                  data-col={phrasebookMode ? accColIdx : dateColIdx}
                  aria-colindex={(phrasebookMode ? accColIdx : dateColIdx) + 1}
                >
                  {phrasebookMode ? (item.accuStat?.length ? `${item.accuStat[item.accuStat.length - 1]}%` : '—') : <><span className="hidden sm:inline">{item.addedAt.slice(0, 4)}-</span>{item.addedAt.slice(5, 10)}</>}
                </td>
                {phrasebookMode && (
                  <td
                    role="gridcell"
                    className="px-4 py-3 text-sm text-text opacity-70 text-center whitespace-nowrap overflow-hidden text-ellipsis"
                    data-row={rowIndex}
                    data-col={dateColIdx}
                    aria-colindex={dateColIdx + 1}
                  >
                    <span className="hidden sm:inline">{item.addedAt.slice(0, 4)}-</span>{item.addedAt.slice(5, 10)}
                  </td>
                )}
                <td
                  role="gridcell"
                  className="px-4 py-3 text-center whitespace-nowrap max-[30em]:hidden"
                  data-row={rowIndex}
                  data-col={removeColIdx}
                  aria-colindex={removeColIdx + 1}
                >
                  <button
                    tabIndex={-1}
                    onClick={() => {
                      const targetRow = Math.max(0, idx)
                      deleteTargetRef.current = { row: targetRow, col: removeColIdx }
                      onToggleLearned(item.id)
                    }}
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-text opacity-50 hover:text-error hover:opacity-100 focus-visible:text-error focus-visible:opacity-100 transition-all duration-200 focus-ring focus-circle"
                    title={t('learned.remove')}
                    aria-label={t('learned.remove')}
                  >
                    <i className="bi bi-x-lg text-sm" />
                  </button>
                </td>
                {swipe?.id === item.id && (
                  <td
                    className="absolute right-0 top-0 bottom-0 w-16 p-0 z-10"
                    style={{
                      transform: `translateX(calc(100% + ${swipe.offset}px))`,
                      transition: swipe.settled ? 'transform 0.25s ease-out' : 'none',
                    }}
                  >
                    <button
                      ref={swipeBtnRef}
                      tabIndex={0}
                      onClick={() => {
                        const targetRow = Math.max(0, idx)
                        deleteTargetRef.current = { row: targetRow, col: removeColIdx }
                        onToggleLearned(item.id)
                        setSwipe(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          const targetRow = Math.max(0, idx)
                          deleteTargetRef.current = { row: targetRow, col: removeColIdx }
                          onToggleLearned(item.id)
                          setSwipe(null)
                        }
                      }}
                      className="w-full h-full bg-error text-bg flex items-center justify-center text-2xl"
                      style={{ borderRadius: '0.33rem' }}
                    >
                      <i className="bi bi-trash-fill" />
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      {swipe?.settled && swipe.offset < 0 && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => setSwipe((prev) => prev ? { ...prev, offset: 0, settled: true } : null)}
        />
      )}
    </div>
  )
}
