import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import LearnedTable from '../../components/LearnedTable'
import { I18nProvider } from '../../i18n'
import type { StoredWord, Word, DictMeta } from '../../types'

const writeTextMock = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: writeTextMock },
  writable: true,
  configurable: true,
})

const defaultDictMeta: DictMeta = {
  type: 'words',
  langFrom: 'srp',
  langTo: 'rus',
  langToAlt: 'rusAlt',
  langRef: 'eng',
}

function makeWord(id: number, overrides: Partial<Word> = {}): Word {
  return {
    id,
    srp: `srp-${id}`,
    rus: `rus-${id}`,
    rusAlt: `rusAlt-${id}`,
    eng: `eng-${id}`,
    ...overrides,
  }
}

function makeStoredWord(id: number, overrides: Partial<StoredWord> = {}): StoredWord {
  const d = new Date(2025, 0, id)
  const addedAt = d.toISOString()
  return {
    id,
    addedAt,
    ...overrides,
  }
}

const defaultOnToggle = vi.fn()
const defaultOnSort = vi.fn()

interface RenderOpts {
  learned?: StoredWord[]
  words?: Word[]
  dictMeta?: DictMeta
  onToggleLearned?: ReturnType<typeof vi.fn>
  phrasebookMode?: boolean
  useAltInputLang?: boolean
  useRefLangForLabels?: boolean
  sortLearnedBy?: string[]
  onSortLearnedBy?: ReturnType<typeof vi.fn>
}

function renderTable(opts: RenderOpts = {}) {
  const {
    learned = [],
    words = [],
    dictMeta = defaultDictMeta,
    onToggleLearned = defaultOnToggle,
    phrasebookMode = false,
    useAltInputLang = false,
    useRefLangForLabels = false,
    sortLearnedBy = [],
    onSortLearnedBy = defaultOnSort,
  } = opts

  const result = render(
    <I18nProvider lang="en">
      <LearnedTable
        learned={learned}
        words={words}
        dictMeta={dictMeta}
        onToggleLearned={onToggleLearned as (id: number) => void}
        phrasebookMode={phrasebookMode}
        useAltInputLang={useAltInputLang}
        useRefLangForLabels={useRefLangForLabels}
        sortLearnedBy={sortLearnedBy}
        onSortLearnedBy={onSortLearnedBy as (arr: string[]) => void}
      />
    </I18nProvider>,
  )

  return { ...result, onToggleLearned, onSortLearnedBy }
}

function setupBasicData() {
  const words = [makeWord(1), makeWord(2), makeWord(3)]
  const learned: StoredWord[] = [
    makeStoredWord(1),
    makeStoredWord(2),
    makeStoredWord(3),
  ]
  return { words, learned }
}

function getHeaderCells() {
  return screen.getAllByRole('columnheader')
}

function getGridCells() {
  return screen.getAllByRole('gridcell')
}

function getRows() {
  return screen.getAllByRole('row')
}

describe('LearnedTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('empty state', () => {
    it('shows empty message when learned is empty', () => {
      renderTable()
      expect(screen.getByText('No Learned words yet')).toBeInTheDocument()
    })

    it('shows check-circle icon when empty', () => {
      renderTable()
      expect(document.querySelector('.bi-check-circle')).toBeInTheDocument()
    })

    it('does not render table when empty', () => {
      renderTable()
      expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    })

    it('shows empty message even when words exist but no learned entries', () => {
      const words = [makeWord(1)]
      renderTable({ learned: [], words })
      expect(screen.getByText('No Learned words yet')).toBeInTheDocument()
    })
  })

  describe('table rendering — non-phrasebook mode', () => {
    it('renders table with grid role', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      expect(screen.getByRole('grid')).toBeInTheDocument()
    })

    it('renders 4 column headers in non-PB mode', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      expect(getHeaderCells()).toHaveLength(4)
    })

    it('renders word column header with label', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words, dictMeta: defaultDictMeta })
      expect(screen.getByText('SR')).toBeInTheDocument()
    })

    it('renders 4 columns in non-PB mode (aria-colcount)', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '4')
    })

    it('renders a row for each learned word plus header row', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      expect(getRows()).toHaveLength(4)
    })

    it('renders word text in each row', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      expect(screen.getByText('srp-1')).toBeInTheDocument()
      expect(screen.getByText('srp-2')).toBeInTheDocument()
      expect(screen.getByText('srp-3')).toBeInTheDocument()
    })

    it('renders date in each row (non-PB)', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      const dateCells = screen.getAllByRole('gridcell').filter((c) =>
        /\d{2}-\d{2}/.test(c.textContent ?? '')
      )
      expect(dateCells.length).toBeGreaterThanOrEqual(3)
    })

    it('renders remove button for each row', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      const removeButtons = screen.getAllByRole('button')
      expect(removeButtons.length).toBeGreaterThanOrEqual(3)
    })

    it('renders wiki links in non-PB mode', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      const links = screen.getAllByRole('link')
      expect(links.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('table rendering — phrasebook mode', () => {
    it('renders 5 column headers in PB mode', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words, phrasebookMode: true })
      const headers = getHeaderCells()
      expect(headers).toHaveLength(5)
    })

    it('renders 5 columns in PB mode (aria-colcount)', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words, phrasebookMode: true })
      expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '5')
    })

    it('hides wiki column in PB mode', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words, phrasebookMode: true })
      const wikiTh = screen.getByTitle('Link to word page on Wiktionary')
      expect(wikiTh.className).toContain('hidden')
    })

    it('renders accuracy column in PB mode', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words, phrasebookMode: true })
      expect(screen.getByLabelText('Sort by last input accuracy')).toBeInTheDocument()
    })

    it('renders date column header in PB mode', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words, phrasebookMode: true })
      expect(screen.getByLabelText('Sort by date added')).toBeInTheDocument()
    })

    it('renders accuracy percentage when accuStat available', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [
        makeStoredWord(1, { accuStat: [50, 75, 90] }),
      ]
      renderTable({ learned, words, phrasebookMode: true })
      expect(screen.getByText('90%')).toBeInTheDocument()
    })

    it('renders em-dash when no accuStat', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words, phrasebookMode: true })
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('renders date in PB mode column', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words, phrasebookMode: true })
      const dateCells = screen.getAllByRole('gridcell').filter((c) =>
        /\d{2}-\d{2}/.test(c.textContent ?? '')
      )
      expect(dateCells.length).toBeGreaterThanOrEqual(1)
    })

    it('renders word label based on langTo in PB mode', () => {
      const dictMeta: DictMeta = { type: 'words', langFrom: 'srp', langTo: 'rus', langToAlt: 'rusAlt', langRef: 'eng' }
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words, dictMeta, phrasebookMode: true })
      expect(screen.getByText('RU')).toBeInTheDocument()
    })
  })

  describe('word text display', () => {
    it('shows langFrom text — words + non-PB', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      expect(screen.getByText('srp-1')).toBeInTheDocument()
    })

    it('shows langTo text — words + PB', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words, phrasebookMode: true })
      expect(screen.getByText('rus-1')).toBeInTheDocument()
    })

    it('shows langFrom text — phrases + PB', () => {
      const dictMeta: DictMeta = { type: 'phrases', langFrom: 'rus', langTo: 'srp', langToAlt: '', langRef: 'eng' }
      const words = [makeWord(1, { rus: 'phrase-rus', srp: 'phrase-srp' })]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words, dictMeta, phrasebookMode: true })
      expect(screen.getByText('phrase-rus')).toBeInTheDocument()
    })

    it('shows langTo text — phrases + non-PB', () => {
      const dictMeta: DictMeta = { type: 'phrases', langFrom: 'rus', langTo: 'srp', langToAlt: '', langRef: 'eng' }
      const words = [makeWord(1, { rus: 'phrase-rus', srp: 'phrase-srp' })]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words, dictMeta })
      expect(screen.getByText('phrase-srp')).toBeInTheDocument()
    })

    it('shows refLang text with useRefLangForLabels — words + non-PB', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words, useRefLangForLabels: true })
      expect(screen.getByText('eng-1')).toBeInTheDocument()
    })

    it('shows langToAlt text — words + PB + useRefLangForLabels', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words, phrasebookMode: true, useRefLangForLabels: true })
      expect(screen.getByText('rusAlt-1')).toBeInTheDocument()
    })

    it('shows translation when word cell is pressed', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const wordCell = table.querySelector<HTMLElement>('[data-row="1"][data-col="0"]')!
      fireEvent.mouseDown(wordCell)
      expect(within(wordCell).getByText('rus-1')).toBeInTheDocument()
      fireEvent.mouseUp(wordCell)
    })

    it('shows accent-colored translation on press', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const wordCell = table.querySelector<HTMLElement>('[data-row="1"][data-col="0"]')!
      fireEvent.mouseDown(wordCell)
      const translation = within(wordCell).getByText('rus-1')
      expect(translation.className).toContain('text-accent')
      fireEvent.mouseUp(wordCell)
    })

    it('hides translation on mouse up', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const wordCell = table.querySelector<HTMLElement>('[data-row="1"][data-col="0"]')!
      fireEvent.mouseDown(wordCell)
      expect(within(wordCell).getByText('rus-1')).toBeInTheDocument()
      fireEvent.mouseUp(wordCell)
      expect(within(wordCell).queryByText('rus-1')).not.toBeInTheDocument()
    })
  })

  describe('sort interactions', () => {
    it('calls onSortLearnedBy when clicking word header', () => {
      const { learned, words } = setupBasicData()
      const { onSortLearnedBy } = renderTable({ learned, words })
      fireEvent.click(screen.getByText('SR'))
      expect(onSortLearnedBy).toHaveBeenCalled()
      const args = onSortLearnedBy.mock.calls[0][0]
      expect(args[0]).toMatch(/^word_/)
    })

    it('toggles sort direction on second word header click', () => {
      const { learned, words } = setupBasicData()
      const { onSortLearnedBy } = renderTable({ learned, words, sortLearnedBy: ['word_asc'] })
      fireEvent.click(screen.getByText('SR'))
      expect(onSortLearnedBy).toHaveBeenCalled()
      const args = onSortLearnedBy.mock.calls[0][0]
      expect(args[0]).toBe('word_desc')
    })

    it('calls onSortLearnedBy when clicking date header', () => {
      const { learned, words } = setupBasicData()
      const { onSortLearnedBy } = renderTable({ learned, words })
      const dateHeader = screen.getByLabelText('Sort by date added')
      fireEvent.click(dateHeader)
      expect(onSortLearnedBy).toHaveBeenCalled()
      const args = onSortLearnedBy.mock.calls[0][0]
      expect(args[0]).toMatch(/^date_/)
    })

    it('defaults to date_desc when no sort matches available keys', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words, sortLearnedBy: ['acc_asc'] })
      const dateHeader = screen.getByLabelText('Sort by date added')
      expect(dateHeader).toHaveAttribute('aria-sort', 'descending')
    })

    it('calls onSortLearnedBy when clicking acc header in PB mode', () => {
      const { learned, words } = setupBasicData()
      const { onSortLearnedBy } = renderTable({ learned, words, phrasebookMode: true })
      const accHeader = screen.getByLabelText('Sort by last input accuracy')
      fireEvent.click(accHeader)
      expect(onSortLearnedBy).toHaveBeenCalled()
      const args = onSortLearnedBy.mock.calls[0][0]
      expect(args[0]).toBe('acc_asc')
    })

    it('sets aria-sort on active word column', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words, sortLearnedBy: ['word_asc'] })
      const wordHeader = screen.getByLabelText('Sort alphabetically. Click a word cell to see its translation')
      expect(wordHeader).toHaveAttribute('aria-sort', 'ascending')
    })

    it('sets aria-sort on inactive column to none', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words, sortLearnedBy: ['word_asc'] })
      const dateHeader = screen.getByLabelText('Sort by date added')
      expect(dateHeader).toHaveAttribute('aria-sort', 'none')
    })

    it('announces sort change in aria-live region', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      fireEvent.click(screen.getByText('SR'))
      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion?.textContent).toContain('Sort changed')
    })

    it('shows sort-up icon for asc sort', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words, sortLearnedBy: ['word_asc'] })
      expect(document.querySelector('.bi-sort-up')).toBeInTheDocument()
    })

    it('shows sort-down icon for desc sort', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words, sortLearnedBy: ['word_desc'] })
      expect(document.querySelector('.bi-sort-down')).toBeInTheDocument()
    })

    it('shows default unsorted icon for inactive column', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words, sortLearnedBy: ['word_desc'] })
      expect(document.querySelector('.bi-arrow-down-up')).toBeInTheDocument()
    })
  })

  describe('wiki link', () => {
    it('shows wiki link in non-PB mode', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      expect(screen.getByLabelText('Open word page on Wiktionary')).toBeInTheDocument()
    })

    it('has correct wiki href', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      const link = screen.getByLabelText('Open word page on Wiktionary')
      expect(link).toHaveAttribute('href', 'https://sh.wiktionary.org/w/index.php?title=eng-1')
    })

    it('opens wiki link in new tab', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      const link = screen.getByLabelText('Open word page on Wiktionary')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('hides wiki link when langRef value is null', () => {
      const words = [makeWord(1, { eng: null })]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      expect(screen.queryByLabelText('Open word page on Wiktionary')).not.toBeInTheDocument()
    })

    it('hides wiki link in PB mode', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words, phrasebookMode: true })
      const wikiCells = screen.getAllByTitle('Open word page on Wiktionary')
      wikiCells.forEach((cell) => {
        const td = cell.closest('td')!
        expect(td.className).toContain('hidden')
      })
    })
  })

  describe('remove button', () => {
    it('calls onToggleLearned when remove button clicked', () => {
      const words = [makeWord(1), makeWord(2)]
      const learned: StoredWord[] = [makeStoredWord(1), makeStoredWord(2)]
      const { onToggleLearned } = renderTable({ learned, words, sortLearnedBy: ['word_asc'] })
      const removeButtons = screen.getAllByLabelText('Remove from Learned')
      fireEvent.click(removeButtons[0])
      expect(onToggleLearned).toHaveBeenCalledWith(1)
    })

    it('calls onToggleLearned with correct id for each row', () => {
      const words = [makeWord(1), makeWord(2)]
      const learned: StoredWord[] = [makeStoredWord(1), makeStoredWord(2)]
      const { onToggleLearned } = renderTable({ learned, words, sortLearnedBy: ['word_asc'] })
      const removeButtons = screen.getAllByLabelText('Remove from Learned')
      fireEvent.click(removeButtons[1])
      expect(onToggleLearned).toHaveBeenCalledWith(2)
    })

    it('renders trash icon in remove button', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      expect(document.querySelector('.bi-x-lg')).toBeInTheDocument()
    })
  })

  describe('filtering', () => {
    it('filters out learned entries whose word is not in words array', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [
        makeStoredWord(1),
        makeStoredWord(999),
      ]
      renderTable({ learned, words })
      expect(screen.getByText('srp-1')).toBeInTheDocument()
      expect(screen.queryByText('srp-999')).not.toBeInTheDocument()
    })

    it('renders table with empty body when all word IDs are missing', () => {
      const words: Word[] = []
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      expect(screen.getByRole('grid')).toBeInTheDocument()
      expect(screen.queryByText('srp-1')).not.toBeInTheDocument()
    })
  })

  describe('keyboard navigation — arrow keys', () => {
    it('moves focus with ArrowRight', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell00 = table.querySelector<HTMLElement>('[data-row="0"][data-col="0"]')!
      cell00.tabIndex = 0
      cell00.focus()
      expect(document.activeElement).toBe(cell00)
      fireEvent.keyDown(cell00, { key: 'ArrowRight' })
      const cell01 = table.querySelector<HTMLElement>('[data-row="0"][data-col="1"]')!
      expect(document.activeElement).toBe(cell01)
    })

    it('moves focus with ArrowLeft', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell01 = table.querySelector<HTMLElement>('[data-row="0"][data-col="1"]')!
      cell01.tabIndex = 0
      cell01.focus()
      fireEvent.keyDown(cell01, { key: 'ArrowLeft' })
      const cell00 = table.querySelector<HTMLElement>('[data-row="0"][data-col="0"]')!
      expect(document.activeElement).toBe(cell00)
    })

    it('moves focus with ArrowDown', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell00 = table.querySelector<HTMLElement>('[data-row="0"][data-col="0"]')!
      cell00.tabIndex = 0
      cell00.focus()
      fireEvent.keyDown(cell00, { key: 'ArrowDown' })
      const cell10 = table.querySelector<HTMLElement>('[data-row="1"][data-col="0"]')!
      expect(document.activeElement).toBe(cell10)
    })

    it('moves focus with ArrowUp', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell10 = table.querySelector<HTMLElement>('[data-row="1"][data-col="0"]')!
      cell10.tabIndex = 0
      cell10.focus()
      fireEvent.keyDown(cell10, { key: 'ArrowUp' })
      const cell00 = table.querySelector<HTMLElement>('[data-row="0"][data-col="0"]')!
      expect(document.activeElement).toBe(cell00)
    })
  })

  describe('keyboard navigation — Home/End', () => {
    it('Home key moves to first cell in same row', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell01 = table.querySelector<HTMLElement>('[data-row="0"][data-col="1"]')!
      cell01.tabIndex = 0
      cell01.focus()
      fireEvent.keyDown(cell01, { key: 'Home' })
      const cell00 = table.querySelector<HTMLElement>('[data-row="0"][data-col="0"]')!
      expect(document.activeElement).toBe(cell00)
    })

    it('Ctrl+Home moves to first row', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell10 = table.querySelector<HTMLElement>('[data-row="1"][data-col="0"]')!
      cell10.tabIndex = 0
      cell10.focus()
      fireEvent.keyDown(cell10, { key: 'Home', ctrlKey: true })
      const cell00 = table.querySelector<HTMLElement>('[data-row="0"][data-col="0"]')!
      expect(document.activeElement).toBe(cell00)
    })

    it('End key moves to last cell in same row', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell00 = table.querySelector<HTMLElement>('[data-row="0"][data-col="0"]')!
      cell00.tabIndex = 0
      cell00.focus()
      fireEvent.keyDown(cell00, { key: 'End' })
      const cell03 = table.querySelector<HTMLElement>('[data-row="0"][data-col="3"]')!
      expect(document.activeElement).toBe(cell03)
    })

    it('Ctrl+End moves to last data row last column', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell00 = table.querySelector<HTMLElement>('[data-row="0"][data-col="0"]')!
      cell00.tabIndex = 0
      cell00.focus()
      fireEvent.keyDown(cell00, { key: 'End', ctrlKey: true })
      const cell33 = table.querySelector<HTMLElement>('[data-row="3"][data-col="3"]')!
      expect(document.activeElement).toBe(cell33)
    })
  })

  describe('keyboard navigation — PageUp/PageDown', () => {
    it('PageDown moves 5 rows down', () => {
      const learned: StoredWord[] = []
      const words: Word[] = []
      for (let i = 1; i <= 10; i++) {
        learned.push(makeStoredWord(i))
        words.push(makeWord(i))
      }
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell00 = table.querySelector<HTMLElement>('[data-row="0"][data-col="0"]')!
      cell00.tabIndex = 0
      cell00.focus()
      fireEvent.keyDown(cell00, { key: 'PageDown' })
      const cell50 = table.querySelector<HTMLElement>('[data-row="5"][data-col="0"]')!
      expect(document.activeElement).toBe(cell50)
    })

    it('PageUp moves 5 rows up', () => {
      const learned: StoredWord[] = []
      const words: Word[] = []
      for (let i = 1; i <= 10; i++) {
        learned.push(makeStoredWord(i))
        words.push(makeWord(i))
      }
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell70 = table.querySelector<HTMLElement>('[data-row="7"][data-col="0"]')!
      cell70.tabIndex = 0
      cell70.focus()
      fireEvent.keyDown(cell70, { key: 'PageUp' })
      const cell20 = table.querySelector<HTMLElement>('[data-row="2"][data-col="0"]')!
      expect(document.activeElement).toBe(cell20)
    })

    it('PageDown clamps to last row', () => {
      const learned: StoredWord[] = []
      const words: Word[] = []
      for (let i = 1; i <= 3; i++) {
        learned.push(makeStoredWord(i))
        words.push(makeWord(i))
      }
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell00 = table.querySelector<HTMLElement>('[data-row="0"][data-col="0"]')!
      cell00.tabIndex = 0
      cell00.focus()
      fireEvent.keyDown(cell00, { key: 'PageDown' })
      const cell30 = table.querySelector<HTMLElement>('[data-row="3"][data-col="0"]')!
      expect(document.activeElement).toBe(cell30)
    })

    it('PageUp clamps to first row', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell10 = table.querySelector<HTMLElement>('[data-row="1"][data-col="0"]')!
      cell10.tabIndex = 0
      cell10.focus()
      fireEvent.keyDown(cell10, { key: 'PageUp' })
      const cell00 = table.querySelector<HTMLElement>('[data-row="0"][data-col="0"]')!
      expect(document.activeElement).toBe(cell00)
    })
  })

  describe('keyboard navigation — Enter/Space on header', () => {
    it('Enter on header sorts by column', () => {
      const { learned, words } = setupBasicData()
      const { onSortLearnedBy } = renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const headerCell = table.querySelector<HTMLElement>('[data-row="0"][data-col="0"]')!
      headerCell.tabIndex = 0
      fireEvent.keyDown(headerCell, { key: 'Enter' })
      expect(onSortLearnedBy).toHaveBeenCalled()
    })

    it('Space on header sorts by column', () => {
      const { learned, words } = setupBasicData()
      const { onSortLearnedBy } = renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const headerCell = table.querySelector<HTMLElement>('[data-row="0"][data-col="0"]')!
      headerCell.tabIndex = 0
      fireEvent.keyDown(headerCell, { key: ' ' })
      expect(onSortLearnedBy).toHaveBeenCalled()
    })

    it('Enter on date header in PB mode sorts by date', () => {
      const { learned, words } = setupBasicData()
      const { onSortLearnedBy } = renderTable({ learned, words, phrasebookMode: true })
      const table = screen.getByRole('grid')
      const dateHeader = table.querySelector<HTMLElement>('[data-row="0"][data-col="3"]')!
      dateHeader.tabIndex = 0
      fireEvent.keyDown(dateHeader, { key: 'Enter' })
      expect(onSortLearnedBy).toHaveBeenCalled()
      const args = onSortLearnedBy.mock.calls[0][0]
      expect(args[0]).toMatch(/^date_/)
    })

    it('Enter on acc header in PB mode sorts by accuracy', () => {
      const { learned, words } = setupBasicData()
      const { onSortLearnedBy } = renderTable({ learned, words, phrasebookMode: true })
      const table = screen.getByRole('grid')
      const accHeader = table.querySelector<HTMLElement>('[data-row="0"][data-col="2"]')!
      accHeader.tabIndex = 0
      fireEvent.keyDown(accHeader, { key: 'Enter' })
      expect(onSortLearnedBy).toHaveBeenCalled()
      const args = onSortLearnedBy.mock.calls[0][0]
      expect(args[0]).toBe('acc_asc')
    })
  })

  describe('keyboard navigation — Enter/Space on data rows', () => {
    it('Enter on word cell shows translation', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell = table.querySelector<HTMLElement>('[data-row="1"][data-col="0"]')!
      cell.tabIndex = 0
      fireEvent.keyDown(cell, { key: 'Enter' })
      expect(within(cell).getByText('rus-1')).toBeInTheDocument()
    })

    it('Space on word cell shows translation', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell = table.querySelector<HTMLElement>('[data-row="1"][data-col="0"]')!
      cell.tabIndex = 0
      fireEvent.keyDown(cell, { key: ' ' })
      expect(within(cell).getByText('rus-1')).toBeInTheDocument()
    })

    it('Enter toggles translation off when already shown', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell = table.querySelector<HTMLElement>('[data-row="1"][data-col="0"]')!
      cell.tabIndex = 0
      fireEvent.keyDown(cell, { key: 'Enter' })
      expect(within(cell).getByText('rus-1')).toBeInTheDocument()
      fireEvent.keyDown(cell, { key: 'Enter' })
      expect(within(cell).queryByText('rus-1')).not.toBeInTheDocument()
    })

    it('Enter on wiki cell opens wiki URL (non-PB)', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell = table.querySelector<HTMLElement>('[data-row="1"][data-col="1"]')!
      cell.tabIndex = 0
      fireEvent.keyDown(cell, { key: 'Enter' })
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('wiktionary'),
        '_blank',
        'noopener,noreferrer',
      )
    })

    it('Enter on remove cell calls onToggleLearned', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      const { onToggleLearned } = renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell = table.querySelector<HTMLElement>('[data-row="1"][data-col="3"]')!
      cell.tabIndex = 0
      fireEvent.keyDown(cell, { key: 'Enter' })
      expect(onToggleLearned).toHaveBeenCalledWith(1)
    })
  })

  describe('keyboard navigation — Delete key', () => {
    it('does not trigger delete in wide viewport', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell = table.querySelector<HTMLElement>('[data-row="1"][data-col="0"]')!
      cell.tabIndex = 0
      fireEvent.keyDown(cell, { key: 'Delete' })
      expect(screen.queryByLabelText('Remove from Learned')).toBeInTheDocument()
    })

    it('triggers swipe on Delete key in narrow viewport', () => {
      vi.spyOn(window, 'matchMedia').mockImplementation(() => ({
        matches: true,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
      const words = [makeWord(1), makeWord(2)]
      const learned: StoredWord[] = [makeStoredWord(1), makeStoredWord(2)]
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell10 = table.querySelector<HTMLElement>('[data-row="1"][data-col="0"]')!
      cell10.tabIndex = 0
      fireEvent.keyDown(cell10, { key: 'Delete' })
      const swipeBtn = document.querySelector('.bi-trash-fill')
      expect(swipeBtn).toBeInTheDocument()
    })
  })

  describe('keyboard navigation — Escape', () => {
    it('Escape cancels swipe', () => {
      vi.spyOn(window, 'matchMedia').mockImplementation(() => ({
        matches: true,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
      const words = [makeWord(1), makeWord(2)]
      const learned: StoredWord[] = [makeStoredWord(1), makeStoredWord(2)]
      renderTable({ learned, words })
      const table = screen.getByRole('grid')
      const cell = table.querySelector<HTMLElement>('[data-row="1"][data-col="0"]')!
      cell.tabIndex = 0
      fireEvent.keyDown(cell, { key: 'Delete' })
      expect(document.querySelector('.bi-trash-fill')).toBeInTheDocument()
      fireEvent.keyDown(cell, { key: 'Escape' })
      expect(document.querySelector('.bi-trash-fill')).not.toBeInTheDocument()
    })
  })

  describe('touch swipe', () => {
    function getFirstRow() {
      const table = screen.getByRole('grid')
      return table.querySelector<HTMLElement>('tbody tr')!
    }

    it('swipe left reveals delete button', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      const row = getFirstRow()
      fireEvent.touchStart(row, { touches: [{ clientX: 200, clientY: 100 }] })
      fireEvent.touchMove(row, { touches: [{ clientX: 120, clientY: 100 }] })
      fireEvent.touchEnd(row, { changedTouches: [{ clientX: 120, clientY: 100 }] })
      expect(document.querySelector('.bi-trash-fill')).toBeInTheDocument()
    })

    it('small swipe does not reveal delete button', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      renderTable({ learned, words })
      const row = getFirstRow()
      fireEvent.touchStart(row, { touches: [{ clientX: 200, clientY: 100 }] })
      fireEvent.touchEnd(row, { changedTouches: [{ clientX: 195, clientY: 100 }] })
      expect(document.querySelector('.bi-trash-fill')).not.toBeInTheDocument()
    })

    it('swipe delete button calls onToggleLearned', () => {
      const words = [makeWord(1)]
      const learned: StoredWord[] = [makeStoredWord(1)]
      const { onToggleLearned } = renderTable({ learned, words })
      const row = getFirstRow()
      fireEvent.touchStart(row, { touches: [{ clientX: 200, clientY: 100 }] })
      fireEvent.touchMove(row, { touches: [{ clientX: 120, clientY: 100 }] })
      fireEvent.touchEnd(row, { changedTouches: [{ clientX: 120, clientY: 100 }] })
      const swipeBtn = document.querySelector<HTMLElement>('[class*="bg-error"]')!
      fireEvent.click(swipeBtn)
      expect(onToggleLearned).toHaveBeenCalledWith(1)
    })
  })

  describe('aria attributes', () => {
    it('has aria-colcount matching column count', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '4')
    })

    it('has aria-live polite region for sort announcement', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
    })

    it('sets aria-sort on sortable column headers', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      const sortable = getHeaderCells().filter((h) => h.getAttribute('aria-sort') !== null)
      expect(sortable).toHaveLength(2)
    })

    it('has aria-colindex on gridcells', () => {
      const { learned, words } = setupBasicData()
      renderTable({ learned, words })
      getGridCells().forEach((cell) => {
        expect(cell).toHaveAttribute('aria-colindex')
      })
    })
  })

  describe('sort order', () => {
    it('sorts by date descending by default', () => {
      const d1 = '2025-01-03T00:00:00.000Z'
      const d2 = '2025-01-02T00:00:00.000Z'
      const d3 = '2025-01-01T00:00:00.000Z'
      const words = [makeWord(1), makeWord(2), makeWord(3)]
      const learned: StoredWord[] = [
        makeStoredWord(1, { addedAt: d1 }),
        makeStoredWord(2, { addedAt: d2 }),
        makeStoredWord(3, { addedAt: d3 }),
      ]
      renderTable({ learned, words })
      const rows = screen.getAllByRole('row')
      const dataRows = rows.slice(1)
      expect(dataRows[0].textContent).toContain('01-03')
      expect(dataRows[1].textContent).toContain('01-02')
      expect(dataRows[2].textContent).toContain('01-01')
    })

    it('sorts by word ascending', () => {
      const words = [makeWord(3), makeWord(1), makeWord(2)]
      const learned: StoredWord[] = [
        makeStoredWord(3),
        makeStoredWord(1),
        makeStoredWord(2),
      ]
      renderTable({ learned, words, sortLearnedBy: ['word_asc'] })
      const rows = screen.getAllByRole('row')
      const dataRows = rows.slice(1)
      expect(dataRows[0].textContent).toContain('srp-1')
      expect(dataRows[1].textContent).toContain('srp-2')
      expect(dataRows[2].textContent).toContain('srp-3')
    })
  })
})
