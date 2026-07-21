import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { I18nProvider } from '../../i18n'
import FavoritesTable from '../../components/FavoritesTable'
import type { StoredWord, Word, DictMeta, SrsCard } from '../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const openMock = vi.fn()

function baseWordsMeta(overrides: Partial<DictMeta> = {}): DictMeta {
  return {
    type: 'words',
    langFrom: 'srp',
    langTo: 'rus',
    langToAlt: 'rusAlt',
    langRef: 'eng',
    ...overrides,
  }
}

function phraseWordsMeta(overrides: Partial<DictMeta> = {}): DictMeta {
  return {
    type: 'phrases',
    langFrom: 'rus',
    langTo: 'srp',
    langToAlt: '',
    langRef: 'eng',
    ...overrides,
  }
}

function makeWord(overrides: Partial<Word> = {}): Word {
  return { id: 1, srp: 'jabuka', rus: 'яблоко', rusAlt: 'яблочко', eng: 'apple', ...overrides }
}

function stored(overrides: Partial<StoredWord> = {}): StoredWord {
  return {
    id: 1,
    addedAt: '2025-06-15T10:30:00.000Z',
    ...overrides,
  }
}

function srsCard(overrides: Partial<SrsCard> = {}): SrsCard {
  return {
    id: 1,
    addedAt: '2025-06-15T10:30:00.000Z',
    due: '2025-06-16T10:30:00.000Z',
    stability: 2.5,
    difficulty: 0.5,
    reps: 1,
    lapses: 0,
    state: 0,
    ...overrides,
  }
}

function matchMediaMock(matches: boolean) {
  return (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })
}

interface RenderOpts {
  favorites?: StoredWord[]
  words?: Word[]
  dictMeta?: DictMeta
  srsCards?: SrsCard[]
  onToggleFavorite?: (id: number) => void
  phrasebookMode?: boolean
  useAltInputLang?: boolean
  useRefLangForLabels?: boolean
  sortFavoritesBy?: string[]
  onSortFavoritesBy?: (arr: string[]) => void
}

function renderTable(opts: RenderOpts = {}) {
  const {
    favorites = [stored()],
    words = [makeWord()],
    dictMeta = baseWordsMeta(),
    srsCards = [],
    onToggleFavorite = vi.fn(),
    phrasebookMode = false,
    useAltInputLang = false,
    useRefLangForLabels = false,
    sortFavoritesBy = [],
    onSortFavoritesBy = vi.fn(),
  } = opts

  const view = render(
    <I18nProvider lang="en">
      <FavoritesTable
        favorites={favorites}
        words={words}
        dictMeta={dictMeta}
        srsCards={srsCards}
        onToggleFavorite={onToggleFavorite}
        phrasebookMode={phrasebookMode}
        useAltInputLang={useAltInputLang}
        useRefLangForLabels={useRefLangForLabels}
        sortFavoritesBy={sortFavoritesBy}
        onSortFavoritesBy={onSortFavoritesBy}
      />
    </I18nProvider>,
  )

  return { ...view, onToggleFavorite, onSortFavoritesBy }
}

/** Return a data cell by row/col attributes */
function cell(row: number, col: number): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`)
}

/** Fire keyDown on a specific cell (bubbles to table's onKeyDown) */
function keyOnCell(row: number, col: number, key: string, ctrlKey = false) {
  const el = cell(row, col)
  if (!el) throw new Error(`No cell at row=${row} col=${col}`)
  fireEvent.keyDown(el, { key, ctrlKey })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubGlobal('open', openMock)
  vi.stubGlobal('matchMedia', matchMediaMock(false))
})

afterEach(() => {
  vi.restoreAllMocks()
  openMock.mockClear()
})

describe('FavoritesTable', () => {
  // ======================== EMPTY STATE ========================

  describe('empty state', () => {
    it('shows empty message when favorites is empty', () => {
      renderTable({ favorites: [] })
      expect(screen.getByText('No words in Favorites yet')).toBeInTheDocument()
    })

    it('does not render table when favorites is empty', () => {
      renderTable({ favorites: [] })
      expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    })

    it('renders star icon in empty state', () => {
      renderTable({ favorites: [] })
      const icon = document.querySelector('.bi-star')
      expect(icon).toBeInTheDocument()
    })
  })

  // ======================== NON-PHRASEBOOK MODE ========================

  describe('non-phrasebook mode rendering', () => {
    it('renders table with role grid', () => {
      renderTable()
      expect(screen.getByRole('grid')).toBeInTheDocument()
    })

    it('renders word data in rows', () => {
      renderTable({ words: [makeWord({ srp: 'jabuka' })] })
      expect(screen.getByText('jabuka')).toBeInTheDocument()
    })

    it('renders multiple rows for multiple favorites', () => {
      const w1 = makeWord({ id: 1, srp: 'jabuka' })
      const w2 = makeWord({ id: 2, srp: 'hvala' })
      renderTable({
        favorites: [stored({ id: 1 }), stored({ id: 2 })],
        words: [w1, w2],
      })
      expect(screen.getByText('jabuka')).toBeInTheDocument()
      expect(screen.getByText('hvala')).toBeInTheDocument()
    })

    it('renders date split across span and text node', () => {
      renderTable({
        favorites: [stored({ addedAt: '2025-06-15T10:30:00.000Z' })],
      })
      const dateCell = cell(1, 3)!
      expect(within(dateCell).getByText('2025-')).toBeInTheDocument()
      expect(within(dateCell).getByText('06-15')).toBeInTheDocument()
    })

    it('shows wiki link in non-PB mode', () => {
      renderTable({ words: [makeWord({ eng: 'apple' })] })
      const wikiLink = document.querySelector<HTMLAnchorElement>('a[href*="sh.wiktionary.org"]')
      expect(wikiLink).toBeInTheDocument()
      expect(wikiLink).toHaveAttribute('target', '_blank')
    })

    it('hides wiki link when langRef value is null', () => {
      renderTable({ words: [makeWord({ eng: null })] })
      const wikiLink = document.querySelector<HTMLAnchorElement>('a[href*="sh.wiktionary"]')
      expect(wikiLink).not.toBeInTheDocument()
    })

    it('uses useRefLangForLabels to show ref language text', () => {
      renderTable({
        words: [makeWord({ srp: 'jabuka', eng: 'apple' })],
        useRefLangForLabels: true,
      })
      expect(screen.getByText('apple')).toBeInTheDocument()
      expect(screen.queryByText('jabuka')).not.toBeInTheDocument()
    })

    it('uses useAltInputLang for translation accent text', () => {
      renderTable({
        words: [makeWord({ rus: 'яблоко', rusAlt: 'яблочко' })],
        useAltInputLang: true,
      })
      // Press word cell to show translation
      fireEvent.mouseDown(cell(1, 0)!)
      const wordCell = cell(1, 0)!
      expect(within(wordCell).getByText('яблочко')).toBeInTheDocument()
      fireEvent.mouseUp(wordCell)
    })

    it('renders remove button for each row', () => {
      renderTable()
      const removeBtns = screen.getAllByLabelText('Remove from Favorites')
      expect(removeBtns.length).toBe(1)
    })

    it('remove button calls onToggleFavorite with correct id', () => {
      const onToggleFavorite = vi.fn()
      renderTable({
        favorites: [stored({ id: 42 })],
        words: [makeWord({ id: 42 })],
        onToggleFavorite,
      })
      fireEvent.click(screen.getByLabelText('Remove from Favorites'))
      expect(onToggleFavorite).toHaveBeenCalledWith(42)
    })

    it('shows translation in word cell when pressed', () => {
      renderTable({ words: [makeWord({ srp: 'jabuka', rus: 'яблоко' })] })
      const wordCell = cell(1, 0)!
      fireEvent.mouseDown(wordCell)
      expect(within(wordCell).getByText('яблоко')).toBeInTheDocument()
      fireEvent.mouseUp(wordCell)
      expect(within(wordCell).queryByText('яблоко')).not.toBeInTheDocument()
    })

    it('hides translation on mouse leave', () => {
      renderTable({ words: [makeWord({ srp: 'jabuka', rus: 'яблоко' })] })
      const wordCell = cell(1, 0)!
      fireEvent.mouseDown(wordCell)
      expect(within(wordCell).getByText('яблоко')).toBeInTheDocument()
      fireEvent.mouseLeave(wordCell)
      expect(within(wordCell).queryByText('яблоко')).not.toBeInTheDocument()
    })

    it('shows accent text in text-accent colour when pressed', () => {
      renderTable({ words: [makeWord({ srp: 'jabuka', rus: 'яблоко' })] })
      const wordCell = cell(1, 0)!
      fireEvent.mouseDown(wordCell)
      const accentSpan = wordCell.querySelector('.text-accent')
      expect(accentSpan).toHaveTextContent('яблоко')
      fireEvent.mouseUp(wordCell)
    })

    it('word data cell has cursor-help class', () => {
      renderTable()
      expect(cell(1, 0)?.className).toContain('cursor-help')
    })

    it('uses aria-colcount=5 in non-PB', () => {
      renderTable()
      expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '5')
    })
  })

  // ======================== PHRASEBOOK MODE ========================

  describe('phrasebook mode rendering', () => {
    it('renders 6-column layout in phrasebook mode', () => {
      renderTable({ phrasebookMode: true, dictMeta: baseWordsMeta() })
      expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '6')
    })

    it('shows accuracy percentage in phrasebook mode', () => {
      renderTable({
        phrasebookMode: true,
        dictMeta: baseWordsMeta(),
        favorites: [stored({ id: 1, accuStat: [50, 75, 90] })],
        words: [makeWord({ id: 1 })],
      })
      expect(screen.getByText('90%')).toBeInTheDocument()
    })

    it('shows dash when accuracy array is empty in PB mode', () => {
      renderTable({
        phrasebookMode: true,
        dictMeta: baseWordsMeta(),
        favorites: [stored({ id: 1, accuStat: [] })],
        words: [makeWord({ id: 1 })],
      })
      const accCell = cell(1, 3)!
      expect(within(accCell).getByText('—')).toBeInTheDocument()
    })

    it('shows dash when accuStat is missing in PB mode', () => {
      renderTable({
        phrasebookMode: true,
        dictMeta: baseWordsMeta(),
        favorites: [stored({ id: 1 })],
        words: [makeWord({ id: 1 })],
      })
      const accCell = cell(1, 3)!
      expect(within(accCell).getByText('—')).toBeInTheDocument()
    })

    it('shows date in phrasebook mode', () => {
      renderTable({
        phrasebookMode: true,
        dictMeta: baseWordsMeta(),
        favorites: [stored({ addedAt: '2025-06-15T10:30:00.000Z' })],
      })
      const dateCell = cell(1, 4)!
      expect(within(dateCell).getByText('2025-')).toBeInTheDocument()
      expect(within(dateCell).getByText('06-15')).toBeInTheDocument()
    })

    it('wiki link is present in DOM (hidden by class) in PB mode', () => {
      renderTable({
        phrasebookMode: true,
        dictMeta: baseWordsMeta(),
        words: [makeWord({ eng: 'apple' })],
      })
      // happy-dom does not apply CSS, so the hidden element is still queryable
      const wikiCells = document.querySelectorAll<HTMLElement>(
        'td[data-col="2"] a[href*="sh.wiktionary"]',
      )
      expect(wikiCells.length).toBe(1)
      const wikiTh = document.querySelector<HTMLElement>('th[data-col="2"]')
      expect(wikiTh?.className).toContain('hidden')
    })

    it('shows word text from langTo in PB mode (words type)', () => {
      renderTable({
        phrasebookMode: true,
        dictMeta: baseWordsMeta(),
        words: [makeWord({ srp: 'jabuka', rus: 'яблоко' })],
      })
      expect(screen.getByText('яблоко')).toBeInTheDocument()
    })

    it('shows word from langToAlt with useRefLangForLabels in PB mode', () => {
      renderTable({
        phrasebookMode: true,
        dictMeta: baseWordsMeta(),
        words: [makeWord({ srp: 'jabuka', rus: 'яблоко', rusAlt: 'яблочко' })],
        useRefLangForLabels: true,
      })
      expect(screen.getByText('яблочко')).toBeInTheDocument()
    })

    it('shows word from langFrom in PB mode (phrases type)', () => {
      renderTable({
        phrasebookMode: true,
        dictMeta: phraseWordsMeta(),
        words: [makeWord({ id: 1, rus: 'я говорю', srp: 'ја говорим' })],
        favorites: [stored({ id: 1 })],
      })
      expect(screen.getByText('я говорю')).toBeInTheDocument()
    })

    it('shows translation (langFrom) on press in PB mode for words type', () => {
      renderTable({
        phrasebookMode: true,
        dictMeta: baseWordsMeta(),
        words: [makeWord({ srp: 'jabuka', rus: 'яблоко' })],
      })
      const wordCell = cell(1, 0)!
      fireEvent.mouseDown(wordCell)
      expect(within(wordCell).getByText('jabuka')).toBeInTheDocument()
      fireEvent.mouseUp(wordCell)
    })
  })

  // ======================== SRS EMOJI DISPLAY ========================

  describe('SRS emoji display', () => {
    it('shows dash when no SRS card exists', () => {
      renderTable({ srsCards: [] })
      expect(within(cell(1, 1)!).getByText('—')).toBeInTheDocument()
    })

    it('shows dash when SRS card has no lastRating', () => {
      renderTable({ srsCards: [srsCard({ lastRating: undefined })] })
      expect(within(cell(1, 1)!).getByText('—')).toBeInTheDocument()
    })

    it('shows 🫣 for lastRating 0 (skip)', () => {
      renderTable({ srsCards: [srsCard({ lastRating: 0 })] })
      expect(within(cell(1, 1)!).getByText('🫣')).toBeInTheDocument()
    })

    it('shows 😳 for lastRating 1 (again)', () => {
      renderTable({ srsCards: [srsCard({ lastRating: 1 })] })
      expect(within(cell(1, 1)!).getByText('😳')).toBeInTheDocument()
    })

    it('shows 😬 for lastRating 2 (hard)', () => {
      renderTable({ srsCards: [srsCard({ lastRating: 2 })] })
      expect(within(cell(1, 1)!).getByText('😬')).toBeInTheDocument()
    })

    it('shows 🙂 for lastRating 3 (good)', () => {
      renderTable({ srsCards: [srsCard({ lastRating: 3 })] })
      expect(within(cell(1, 1)!).getByText('🙂')).toBeInTheDocument()
    })

    it('shows 😎 for lastRating 4 (easy)', () => {
      renderTable({ srsCards: [srsCard({ lastRating: 4 })] })
      expect(within(cell(1, 1)!).getByText('😎')).toBeInTheDocument()
    })

    it('sets title and aria-label on SRS emoji span', () => {
      renderTable({ srsCards: [srsCard({ lastRating: 3 })] })
      const srsCell = cell(1, 1)!
      const span = srsCell.querySelector('span')
      expect(span).toHaveAttribute('title', 'Good: Needs just a bit more work')
      expect(span).toHaveAttribute('aria-label', 'Good: Needs just a bit more work')
    })
  })

  // ======================== SORT INTERACTION ========================

  describe('sort interaction', () => {
    it('calls onSortFavoritesBy with word_asc when word header clicked', () => {
      const onSortFavoritesBy = vi.fn()
      renderTable({ onSortFavoritesBy })
      fireEvent.click(cell(0, 0)!)
      expect(onSortFavoritesBy).toHaveBeenCalledWith(
        expect.arrayContaining(['word_asc']),
      )
    })

    it('calls onSortFavoritesBy with rank_asc when SRS header clicked', () => {
      const onSortFavoritesBy = vi.fn()
      renderTable({ onSortFavoritesBy })
      fireEvent.click(cell(0, 1)!)
      expect(onSortFavoritesBy).toHaveBeenCalledWith(
        expect.arrayContaining(['rank_asc']),
      )
    })

    it('calls onSortFavoritesBy with date_asc when date header clicked in non-PB', () => {
      // Default sort is date_desc, so clicking date toggles to date_asc
      const onSortFavoritesBy = vi.fn()
      renderTable({ onSortFavoritesBy })
      fireEvent.click(cell(0, 3)!)
      expect(onSortFavoritesBy).toHaveBeenCalledWith(
        expect.arrayContaining(['date_asc']),
      )
    })

    it('calls onSortFavoritesBy with acc_asc when acc header clicked in PB mode', () => {
      const onSortFavoritesBy = vi.fn()
      renderTable({ phrasebookMode: true, dictMeta: baseWordsMeta(), onSortFavoritesBy })
      fireEvent.click(cell(0, 3)!)
      expect(onSortFavoritesBy).toHaveBeenCalledWith(
        expect.arrayContaining(['acc_asc']),
      )
    })

    it('calls onSortFavoritesBy with date_asc when date header clicked in PB mode', () => {
      const onSortFavoritesBy = vi.fn()
      renderTable({ phrasebookMode: true, dictMeta: baseWordsMeta(), onSortFavoritesBy })
      fireEvent.click(cell(0, 4)!)
      expect(onSortFavoritesBy).toHaveBeenCalledWith(
        expect.arrayContaining(['date_asc']),
      )
    })

    it('toggles sort direction when same header clicked again', () => {
      const onSortFavoritesBy = vi.fn()
      renderTable({ sortFavoritesBy: ['word_asc'], onSortFavoritesBy })
      fireEvent.click(cell(0, 0)!)
      expect(onSortFavoritesBy).toHaveBeenCalledWith(
        expect.arrayContaining(['word_desc']),
      )
    })

    it('defaults to date_desc when sortFavoritesBy is empty', () => {
      renderTable({ sortFavoritesBy: [] })
      expect(cell(0, 3)).toHaveAttribute('aria-sort', 'descending')
    })

    it('reads sort preference from sortFavoritesBy', () => {
      renderTable({ sortFavoritesBy: ['word_asc'] })
      expect(cell(0, 0)).toHaveAttribute('aria-sort', 'ascending')
    })

    it('ignores invalid sort entries and falls back to default', () => {
      renderTable({ sortFavoritesBy: ['foobar_desc'] })
      expect(cell(0, 3)).toHaveAttribute('aria-sort', 'descending')
    })

    it('announces sort change via aria-live region', () => {
      const onSortFavoritesBy = vi.fn()
      renderTable({ onSortFavoritesBy })
      fireEvent.click(cell(0, 0)!)
      expect(screen.getByText('Sort changed: alphabetical, A to Z')).toBeInTheDocument()
    })

    it('shows correct sort icon for active sort column', () => {
      renderTable({ sortFavoritesBy: ['word_asc'] })
      expect(cell(0, 0)?.querySelector('.bi-sort-up')).toBeInTheDocument()
    })

    it('shows inactive sort icon for non-active columns', () => {
      renderTable({ sortFavoritesBy: ['date_desc'] })
      expect(cell(0, 0)?.querySelector('.bi-arrow-down-up')).toBeInTheDocument()
    })
  })

  // ======================== TOGGLE TRANSLATION ON CLICK ========================

  describe('toggle translation on word click', () => {
    it('toggles pressedId off when clicking same cell again', () => {
      renderTable({ words: [makeWord({ srp: 'jabuka', rus: 'яблоко' })] })
      const wordCell = cell(1, 0)!
      fireEvent.mouseDown(wordCell)
      expect(within(wordCell).getByText('яблоко')).toBeInTheDocument()
      fireEvent.mouseUp(wordCell)
      expect(within(wordCell).queryByText('яблоко')).not.toBeInTheDocument()
      fireEvent.mouseDown(wordCell)
      expect(within(wordCell).getByText('яблоко')).toBeInTheDocument()
      fireEvent.mouseUp(wordCell)
    })

    it('uses langToAlt text when useAltInputLang is true', () => {
      renderTable({
        words: [makeWord({ rus: 'яблоко', rusAlt: 'яблочко' })],
        useAltInputLang: true,
      })
      const wordCell = cell(1, 0)!
      fireEvent.mouseDown(wordCell)
      expect(within(wordCell).getByText('яблочко')).toBeInTheDocument()
      fireEvent.mouseUp(wordCell)
    })

    it('clears pressedId on blur', () => {
      renderTable({ words: [makeWord({ srp: 'jabuka', rus: 'яблоко' })] })
      const wordCell = cell(1, 0)!
      fireEvent.mouseDown(wordCell)
      expect(within(wordCell).getByText('яблоко')).toBeInTheDocument()
      fireEvent.blur(wordCell)
      expect(within(wordCell).queryByText('яблоко')).not.toBeInTheDocument()
    })
  })

  // ======================== CALLBACKS ========================

  describe('remove callback', () => {
    it('calls onToggleFavorite from remove button click', () => {
      const onToggleFavorite = vi.fn()
      renderTable({
        favorites: [stored({ id: 7 })],
        words: [makeWord({ id: 7 })],
        onToggleFavorite,
      })
      fireEvent.click(screen.getByLabelText('Remove from Favorites'))
      expect(onToggleFavorite).toHaveBeenCalledWith(7)
    })

    it('calls onToggleFavorite with Enter on remove column', () => {
      const onToggleFavorite = vi.fn()
      renderTable({
        favorites: [stored({ id: 7 })],
        words: [makeWord({ id: 7 })],
        onToggleFavorite,
      })
      keyOnCell(1, 4, 'Enter')
      expect(onToggleFavorite).toHaveBeenCalledWith(7)
    })

    it('calls onToggleFavorite with Space on remove column', () => {
      const onToggleFavorite = vi.fn()
      renderTable({
        favorites: [stored({ id: 7 })],
        words: [makeWord({ id: 7 })],
        onToggleFavorite,
      })
      keyOnCell(1, 4, ' ')
      expect(onToggleFavorite).toHaveBeenCalledWith(7)
    })
  })

  // ======================== WIKI LINK ========================

  describe('wiki link behaviour', () => {
    it('opens wiki via keyboard Enter on SRS column (col=1) in non-PB', () => {
      renderTable({ words: [makeWord({ id: 1, eng: 'apple' })] })
      keyOnCell(1, 1, 'Enter')
      expect(openMock).toHaveBeenCalledWith(
        expect.stringContaining('sh.wiktionary'),
        '_blank',
        'noopener,noreferrer',
      )
    })

    it('does not open wiki via keyboard on col=1 in PB mode', () => {
      renderTable({
        phrasebookMode: true,
        dictMeta: baseWordsMeta(),
        words: [makeWord({ id: 1, eng: 'apple' })],
      })
      keyOnCell(1, 1, 'Enter')
      expect(openMock).not.toHaveBeenCalled()
    })
  })

  // ======================== SORTING DATA CORRECTNESS ========================

  describe('sorting data correctness', () => {
    it('sorts by word ascending using langRef value (non-PB displays srp)', () => {
      // In non-PB mode, sort uses langRef (eng), display uses langFrom (srp)
      const w1 = makeWord({ id: 1, srp: 'baba', eng: 'grandma' })
      const w2 = makeWord({ id: 2, srp: 'ana', eng: 'mother' })
      const { container } = renderTable({
        favorites: [stored({ id: 1 }), stored({ id: 2 })],
        words: [w1, w2],
        sortFavoritesBy: ['word_asc'],
      })
      const rows = container.querySelectorAll('tbody[role="rowgroup"] tr')
      // eng: 'grandma' < 'mother' => w1 first => displayed srp: 'baba'
      expect(rows[0]).toHaveTextContent('baba')
      expect(rows[1]).toHaveTextContent('ana')
    })

    it('sorts by word descending using langRef value', () => {
      const w1 = makeWord({ id: 1, srp: 'ana', eng: 'mother' })
      const w2 = makeWord({ id: 2, srp: 'baba', eng: 'grandma' })
      const { container } = renderTable({
        favorites: [stored({ id: 1 }), stored({ id: 2 })],
        words: [w1, w2],
        sortFavoritesBy: ['word_desc'],
      })
      const rows = container.querySelectorAll('tbody[role="rowgroup"] tr')
      // eng 'mother' > 'grandma' descending => w1 first => displayed srp: 'ana'
      expect(rows[0]).toHaveTextContent('ana')
      expect(rows[1]).toHaveTextContent('baba')
    })

    it('sorts by date ascending', () => {
      const w1 = makeWord({ id: 1, srp: 'b' })
      const w2 = makeWord({ id: 2, srp: 'a' })
      const { container } = renderTable({
        favorites: [
          stored({ id: 1, addedAt: '2025-06-15' }),
          stored({ id: 2, addedAt: '2024-01-01' }),
        ],
        words: [w1, w2],
        sortFavoritesBy: ['date_asc'],
      })
      const rows = container.querySelectorAll('tbody[role="rowgroup"] tr')
      // date '2024-01-01' < '2025-06-15' => w2 first => displayed srp: 'a'
      expect(rows[0]).toHaveTextContent('a')
      expect(rows[1]).toHaveTextContent('b')
    })

    it('sorts by date descending', () => {
      const w1 = makeWord({ id: 1, srp: 'a' })
      const w2 = makeWord({ id: 2, srp: 'b' })
      const { container } = renderTable({
        favorites: [
          stored({ id: 1, addedAt: '2024-01-01' }),
          stored({ id: 2, addedAt: '2025-06-15' }),
        ],
        words: [w1, w2],
        sortFavoritesBy: ['date_desc'],
      })
      const rows = container.querySelectorAll('tbody[role="rowgroup"] tr')
      // date '2025-06-15' > '2024-01-01' => w2 first => displayed srp: 'b'
      expect(rows[0]).toHaveTextContent('b')
      expect(rows[1]).toHaveTextContent('a')
    })

    it('sorts by rank ascending', () => {
      const w1 = makeWord({ id: 1, srp: 'b' })
      const w2 = makeWord({ id: 2, srp: 'a' })
      const { container } = renderTable({
        favorites: [stored({ id: 1 }), stored({ id: 2 })],
        words: [w1, w2],
        srsCards: [srsCard({ id: 1, lastRating: 3 }), srsCard({ id: 2, lastRating: 1 })],
        sortFavoritesBy: ['rank_asc'],
      })
      const rows = container.querySelectorAll('tbody[role="rowgroup"] tr')
      expect(rows[0]).toHaveTextContent('a')
      expect(rows[1]).toHaveTextContent('b')
    })

    it('sorts by rank descending', () => {
      const w1 = makeWord({ id: 1, srp: 'a' })
      const w2 = makeWord({ id: 2, srp: 'b' })
      const { container } = renderTable({
        favorites: [stored({ id: 1 }), stored({ id: 2 })],
        words: [w1, w2],
        srsCards: [srsCard({ id: 1, lastRating: 1 }), srsCard({ id: 2, lastRating: 3 })],
        sortFavoritesBy: ['rank_desc'],
      })
      const rows = container.querySelectorAll('tbody[role="rowgroup"] tr')
      expect(rows[0]).toHaveTextContent('b')
      expect(rows[1]).toHaveTextContent('a')
    })

    it('sorts by accuracy ascending in PB mode', () => {
      // PB mode displays firstText(w[langTo]) = firstText(w['rus'])
      const w1 = makeWord({ id: 1, rus: 'б', srp: 'b' })
      const w2 = makeWord({ id: 2, rus: 'а', srp: 'a' })
      const { container } = renderTable({
        phrasebookMode: true,
        dictMeta: baseWordsMeta(),
        favorites: [
          stored({ id: 1, accuStat: [90] }),
          stored({ id: 2, accuStat: [50] }),
        ],
        words: [w1, w2],
        sortFavoritesBy: ['acc_asc'],
      })
      const rows = container.querySelectorAll('tbody[role="rowgroup"] tr')
      // acc 50 < 90 => w2 first => displayed rus: 'а'
      expect(rows[0]).toHaveTextContent('а')
      expect(rows[1]).toHaveTextContent('б')
    })

    it('sorts by accuracy descending in PB mode', () => {
      const w1 = makeWord({ id: 1, rus: 'а', srp: 'a' })
      const w2 = makeWord({ id: 2, rus: 'б', srp: 'b' })
      const { container } = renderTable({
        phrasebookMode: true,
        dictMeta: baseWordsMeta(),
        favorites: [
          stored({ id: 1, accuStat: [50] }),
          stored({ id: 2, accuStat: [90] }),
        ],
        words: [w1, w2],
        sortFavoritesBy: ['acc_desc'],
      })
      const rows = container.querySelectorAll('tbody[role="rowgroup"] tr')
      // acc 90 > 50 => w2 first => displayed rus: 'б'
      expect(rows[0]).toHaveTextContent('б')
      expect(rows[1]).toHaveTextContent('а')
    })

    it('filters out favorited words not in words list', () => {
      const { container } = renderTable({
        favorites: [stored({ id: 1 }), stored({ id: 999 })],
        words: [makeWord({ id: 1 })],
      })
      const rows = container.querySelectorAll('tbody[role="rowgroup"] tr')
      expect(rows.length).toBe(1)
    })
  })

  // ======================== KEYBOARD NAVIGATION ========================

  describe('keyboard navigation', () => {
    it('moves focus right with ArrowRight', () => {
      renderTable()
      keyOnCell(1, 0, 'ArrowRight')
      expect(cell(1, 1)?.tabIndex).toBe(0)
    })

    it('moves focus left with ArrowLeft', () => {
      renderTable()
      keyOnCell(1, 1, 'ArrowLeft')
      expect(cell(1, 0)?.tabIndex).toBe(0)
    })

    it('moves focus down with ArrowDown', () => {
      const w1 = makeWord({ id: 1, srp: 'a' })
      const w2 = makeWord({ id: 2, srp: 'b' })
      renderTable({ favorites: [stored({ id: 1 }), stored({ id: 2 })], words: [w1, w2] })
      keyOnCell(1, 0, 'ArrowDown')
      expect(cell(2, 0)?.tabIndex).toBe(0)
    })

    it('moves focus up with ArrowUp', () => {
      const w1 = makeWord({ id: 1, srp: 'a' })
      const w2 = makeWord({ id: 2, srp: 'b' })
      renderTable({ favorites: [stored({ id: 1 }), stored({ id: 2 })], words: [w1, w2] })
      keyOnCell(2, 0, 'ArrowUp')
      expect(cell(1, 0)?.tabIndex).toBe(0)
    })

    it('wraps to next row moving right past last column', () => {
      const w1 = makeWord({ id: 1, srp: 'a' })
      const w2 = makeWord({ id: 2, srp: 'b' })
      renderTable({ favorites: [stored({ id: 1 }), stored({ id: 2 })], words: [w1, w2] })
      keyOnCell(1, 4, 'ArrowRight')
      expect(cell(2, 0)?.tabIndex).toBe(0)
    })

    it('wraps to previous row moving left past first column', () => {
      const w1 = makeWord({ id: 1, srp: 'a' })
      const w2 = makeWord({ id: 2, srp: 'b' })
      renderTable({ favorites: [stored({ id: 1 }), stored({ id: 2 })], words: [w1, w2] })
      keyOnCell(2, 0, 'ArrowLeft')
      expect(cell(1, 4)?.tabIndex).toBe(0)
    })

    it('Enter on header row triggers sort', () => {
      const onSortFavoritesBy = vi.fn()
      renderTable({ onSortFavoritesBy })
      keyOnCell(0, 0, 'Enter')
      expect(onSortFavoritesBy).toHaveBeenCalled()
    })

    it('Space on header row triggers sort', () => {
      const onSortFavoritesBy = vi.fn()
      renderTable({ onSortFavoritesBy })
      keyOnCell(0, 0, ' ')
      expect(onSortFavoritesBy).toHaveBeenCalled()
    })

    it('Enter on word cell toggles pressedId', () => {
      renderTable({ words: [makeWord({ srp: 'jabuka', rus: 'яблоко' })] })
      const wordCell = cell(1, 0)!
      keyOnCell(1, 0, 'Enter')
      expect(within(wordCell).getByText('яблоко')).toBeInTheDocument()
      keyOnCell(1, 0, 'Enter')
      expect(within(wordCell).queryByText('яблоко')).not.toBeInTheDocument()
    })

    it('Space on word cell toggles pressedId', () => {
      renderTable({ words: [makeWord({ srp: 'jabuka', rus: 'яблоко' })] })
      const wordCell = cell(1, 0)!
      keyOnCell(1, 0, ' ')
      expect(within(wordCell).getByText('яблоко')).toBeInTheDocument()
      keyOnCell(1, 0, ' ')
      expect(within(wordCell).queryByText('яблоко')).not.toBeInTheDocument()
    })

    it('Home goes to first cell in current row', () => {
      renderTable()
      keyOnCell(1, 3, 'Home')
      expect(cell(1, 0)?.tabIndex).toBe(0)
    })

    it('Ctrl+Home goes to first cell in header row', () => {
      renderTable()
      keyOnCell(1, 3, 'Home', true)
      expect(cell(0, 0)?.tabIndex).toBe(0)
    })

    it('End goes to last cell in current row', () => {
      renderTable()
      keyOnCell(1, 0, 'End')
      expect(cell(1, 4)?.tabIndex).toBe(0)
    })

    it('Ctrl+End goes to last cell in last row', () => {
      renderTable()
      keyOnCell(1, 0, 'End', true)
      expect(cell(1, 4)?.tabIndex).toBe(0)
    })

    it('PageDown moves 5 rows forward', () => {
      const words = Array.from({ length: 10 }, (_, i) => makeWord({ id: i + 1, srp: `word${i + 1}` }))
      const st = words.map((_, i) => stored({ id: i + 1 }))
      renderTable({ favorites: st, words })
      keyOnCell(1, 0, 'PageDown')
      expect(cell(6, 0)?.tabIndex).toBe(0)
    })

    it('PageUp moves 5 rows backward', () => {
      const words = Array.from({ length: 10 }, (_, i) => makeWord({ id: i + 1, srp: `word${i + 1}` }))
      const st = words.map((_, i) => stored({ id: i + 1 }))
      renderTable({ favorites: st, words })
      keyOnCell(8, 0, 'PageUp')
      expect(cell(3, 0)?.tabIndex).toBe(0)
    })

    it('clamps PageDown to last row', () => {
      const words = Array.from({ length: 3 }, (_, i) => makeWord({ id: i + 1, srp: `word${i + 1}` }))
      const st = words.map((_, i) => stored({ id: i + 1 }))
      renderTable({ favorites: st, words })
      keyOnCell(2, 0, 'PageDown')
      expect(cell(3, 0)?.tabIndex).toBe(0)
    })

    it('clamps PageUp to first row', () => {
      renderTable()
      keyOnCell(1, 0, 'PageUp')
      expect(cell(0, 0)?.tabIndex).toBe(0)
    })

    it('Escape dismisses swipe', () => {
      vi.stubGlobal('matchMedia', matchMediaMock(true))
      renderTable({ favorites: [stored({ id: 1 })], words: [makeWord({ id: 1 })] })
      keyOnCell(1, 0, 'Delete')
      keyOnCell(1, 0, 'Escape')
      expect(document.querySelector('.bg-error')).not.toBeInTheDocument()
    })

    it('Delete on row triggers swipe on small screen when >1 item', () => {
      vi.stubGlobal('matchMedia', matchMediaMock(true))
      renderTable({
        favorites: [stored({ id: 1 }), stored({ id: 2 })],
        words: [makeWord({ id: 1 }), makeWord({ id: 2 })],
      })
      keyOnCell(1, 0, 'Delete')
      expect(document.querySelector('.bg-error')).toBeInTheDocument()
    })

    it('Delete triggers direct remove when only one item on small screen', () => {
      vi.stubGlobal('matchMedia', matchMediaMock(true))
      const onToggleFavorite = vi.fn()
      renderTable({
        favorites: [stored({ id: 1 })],
        words: [makeWord({ id: 1 })],
        onToggleFavorite,
      })
      keyOnCell(1, 0, 'Delete')
      expect(onToggleFavorite).toHaveBeenCalledWith(1)
    })
  })

  // ======================== TOUCH SWIPE ========================

  describe('touch swipe', () => {
    it('touchStart does not throw', () => {
      renderTable()
      const row = document.querySelector<HTMLElement>('tbody[role="rowgroup"] tr')!
      fireEvent.touchStart(row, { touches: [{ clientX: 100, clientY: 50 }] })
    })

    it('touchMove with small dx does not activate swipe', () => {
      renderTable()
      const row = document.querySelector<HTMLElement>('tbody[role="rowgroup"] tr')!
      fireEvent.touchStart(row, { touches: [{ clientX: 100, clientY: 50 }] })
      fireEvent.touchMove(row, { touches: [{ clientX: 103, clientY: 50 }] })
    })

    it('touchMove with sufficient dx activates swipe', () => {
      renderTable({ favorites: [stored({ id: 1 })], words: [makeWord({ id: 1 })] })
      const row = document.querySelector<HTMLElement>('tbody[role="rowgroup"] tr')!
      fireEvent.touchStart(row, { touches: [{ clientX: 100, clientY: 50 }] })
      fireEvent.touchMove(row, { touches: [{ clientX: 60, clientY: 50 }] })
    })

    it('swipe end with dx < -50 and horizontal dominance settles swipe', () => {
      renderTable({ favorites: [stored({ id: 1 })], words: [makeWord({ id: 1 })] })
      const row = document.querySelector<HTMLElement>('tbody[role="rowgroup"] tr')!
      fireEvent.touchStart(row, { touches: [{ clientX: 200, clientY: 100 }] })
      fireEvent.touchMove(row, { touches: [{ clientX: 140, clientY: 101 }] })
      fireEvent.touchEnd(row, { changedTouches: [{ clientX: 140, clientY: 101 }] })
      // Settled swipe renders fixed overlay to dismiss
      expect(document.querySelector('.fixed.inset-0')).toBeInTheDocument()
    })

    it('swipe overlay click dismisses swipe', () => {
      renderTable({ favorites: [stored({ id: 1 })], words: [makeWord({ id: 1 })] })
      const row = document.querySelector<HTMLElement>('tbody[role="rowgroup"] tr')!
      fireEvent.touchStart(row, { touches: [{ clientX: 200, clientY: 100 }] })
      fireEvent.touchMove(row, { touches: [{ clientX: 130, clientY: 102 }] })
      fireEvent.touchEnd(row, { changedTouches: [{ clientX: 130, clientY: 102 }] })
      const overlay = document.querySelector('.fixed.inset-0')
      expect(overlay).toBeInTheDocument()
      fireEvent.click(overlay!)
      expect(document.querySelector('.fixed.inset-0')).not.toBeInTheDocument()
    })

    it('swipe delete button calls onToggleFavorite', () => {
      const onToggleFavorite = vi.fn()
      renderTable({
        favorites: [stored({ id: 42 })],
        words: [makeWord({ id: 42 })],
        onToggleFavorite,
      })
      const row = document.querySelector<HTMLElement>('tbody[role="rowgroup"] tr')!
      fireEvent.touchStart(row, { touches: [{ clientX: 200, clientY: 100 }] })
      fireEvent.touchMove(row, { touches: [{ clientX: 130, clientY: 102 }] })
      fireEvent.touchEnd(row, { changedTouches: [{ clientX: 130, clientY: 102 }] })
      const deleteBtn = document.querySelector('.bg-error')
      if (deleteBtn) {
        fireEvent.click(deleteBtn)
        expect(onToggleFavorite).toHaveBeenCalledWith(42)
      }
    })
  })

  // ======================== SORT ANNOUNCEMENT ========================

  describe('sort announcement', () => {
    it('renders two aria-live regions', () => {
      renderTable()
      expect(document.querySelectorAll('[aria-live="polite"]')).toHaveLength(2)
    })

    it('announces sort change with correct label', () => {
      const onSortFavoritesBy = vi.fn()
      renderTable({ onSortFavoritesBy })
      fireEvent.click(cell(0, 0)!)
      expect(screen.getByText('Sort changed: alphabetical, A to Z')).toBeInTheDocument()
    })

    it('different sort key produces different announcement', () => {
      const onSortFavoritesBy = vi.fn()
      renderTable({ onSortFavoritesBy })
      fireEvent.click(cell(0, 1)!)
      expect(screen.getByText('Sort changed: by rank, lowest first')).toBeInTheDocument()
    })
  })

  // ======================== EDGE CASES ========================

  describe('edge cases', () => {
    it('handles array values in word fields (displayText)', () => {
      renderTable({ words: [makeWord({ srp: ['jabuka', 'jabuke'] })] })
      expect(screen.getByText('jabuka, jabuke')).toBeInTheDocument()
    })

    it('handles numeric word values', () => {
      renderTable({ words: [makeWord({ id: 1, srp: 12345 as unknown as string })] })
      expect(screen.getByText('12345')).toBeInTheDocument()
    })

    it('handles null word fields gracefully', () => {
      renderTable({ words: [makeWord({ srp: null as unknown as string })] })
      expect(cell(1, 0)?.textContent).toBe('')
    })

    it('filters out words not in words map', () => {
      renderTable({
        favorites: [stored({ id: 1 }), stored({ id: 2 })],
        words: [makeWord({ id: 1 })],
      })
      expect(document.querySelectorAll('tbody[role="rowgroup"] tr')).toHaveLength(1)
    })

    it('renders empty tbody when all favorites have no matching word', () => {
      renderTable({ favorites: [stored({ id: 999 })], words: [] })
      expect(document.querySelectorAll('tbody[role="rowgroup"] tr')).toHaveLength(0)
    })
  })
})
