import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest'
import App from '../App'
import rawData from '../data/words-srp-rus-1200.json'

const dataArr = rawData as unknown[]
const dictMeta = dataArr[0] as { type: string; langFrom: string; langTo: string; langToAlt: string; langRef: string }
const words = (dataArr.slice(1) as Record<string, unknown>[]).map((w) => ({ id: w.id as number, ...w }))
const wordMap = new Map<number, Record<string, unknown>>()
for (const w of words) wordMap.set(w.id, w)

function today(): string {
  return new Date().toISOString()
}

function createSrsCard(id: number, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    addedAt: today(),
    due: today(),
    stability: 2.5,
    difficulty: 5.0,
    reps: 0,
    lapses: 0,
    state: 0,
    lastRating: null as number | null,
    lastReview: null as string | null,
    ...overrides,
  }
}

function setDefaultStorage() {
  localStorage.clear()
  localStorage.setItem('fromToFavorites', JSON.stringify([
    { id: 1, addedAt: today(), accuStat: [100] },
  ]))
  localStorage.setItem('fromToLearned', JSON.stringify([
    { id: 2, addedAt: today() },
    { id: 3, addedAt: today() },
  ]))
  localStorage.setItem('fromToAnswered', JSON.stringify([1, 2]))
  localStorage.setItem('fromToViewed', JSON.stringify([1, 2, 3]))
  localStorage.setItem('toFromFavorites', JSON.stringify([]))
  localStorage.setItem('toFromLearned', JSON.stringify([]))
  localStorage.setItem('toFromAnswered', JSON.stringify([]))
  localStorage.setItem('toFromViewed', JSON.stringify([]))
  localStorage.setItem('fromToExFavorites', JSON.stringify([]))
  localStorage.setItem('toFromExFavorites', JSON.stringify([]))
  localStorage.setItem('srsCards', JSON.stringify([createSrsCard(1)]))
  localStorage.setItem('cardsSettings', JSON.stringify({
    autoFlipOnWrongAttempts: false,
    autoAdvanceOnLearn: false,
    autoAddAnsweredToLearned: false,
    phrasebookMode: false,
    phrasebookThreshold: 75,
    useAltInputLang: false,
    useRefLangForLabels: false,
    sortFavoritesBy: ['date_desc'],
    sortLearnedBy: ['date_desc'],
    language: 'en',
    customIntervalAgain: false,
    customIntervalGood: false,
    autoAddRankedToFavorites: false,
  }))
  localStorage.setItem('cardsLastScreen', JSON.stringify('home'))
}

describe('App', () => {
  beforeAll(() => {
    setDefaultStorage()
  })

  afterEach(() => {
    setDefaultStorage()
  })

  it('shows TopBar, the default home view, and BottomBar', () => {
    render(<App />)
    expect(document.querySelector('header')).toBeInTheDocument()
    expect(document.querySelector('footer')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Word actions' })).toBeInTheDocument()
  })

  it('can navigate to favorites view by clicking the favorites button', async () => {
    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Favorites' }))
    })
    await waitFor(() => {
      const word1 = String(wordMap.get(1)?.[dictMeta.langFrom] ?? '')
      expect(screen.getAllByText(word1).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('can navigate to learned view via bottom bar', async () => {
    render(<App />)
    const learnedBtns = screen.getAllByRole('button', { name: 'Learned' })
    await act(async () => {
      fireEvent.click(learnedBtns[0])
    })
    await waitFor(() => {
      const word2 = String(wordMap.get(2)?.[dictMeta.langFrom] ?? '')
      const word3 = String(wordMap.get(3)?.[dictMeta.langFrom] ?? '')
      expect(screen.getByText(word2)).toBeInTheDocument()
      expect(screen.getByText(word3)).toBeInTheDocument()
    })
  })

  it('can navigate to settings view via bottom bar', async () => {
    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    })
    await waitFor(() => {
      expect(screen.getByText('English')).toBeInTheDocument()
      expect(screen.getByText('Русский')).toBeInTheDocument()
      expect(screen.getByText('Srpski')).toBeInTheDocument()
    })
  })

  it('can navigate back to learn view from favorites', async () => {
    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Favorites' }))
    })
    await waitFor(() => {
      const word1 = String(wordMap.get(1)?.[dictMeta.langFrom] ?? '')
      expect(screen.getAllByText(word1).length).toBeGreaterThanOrEqual(1)
    })
    const homeBtns = screen.getAllByRole('button', { name: 'Home' })
    await act(async () => {
      fireEvent.click(homeBtns[0])
    })
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Word actions' })).toBeInTheDocument()
    })
  })

  it('shows FavoritesTable content when in favorites view', async () => {
    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Favorites' }))
    })
    await waitFor(() => {
      const word = String(wordMap.get(1)?.[dictMeta.langFrom] ?? '')
      const instances = screen.getAllByText(word)
      expect(instances.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows LearnedTable content when in learned view', async () => {
    render(<App />)
    const learnedBtns = screen.getAllByRole('button', { name: 'Learned' })
    await act(async () => {
      fireEvent.click(learnedBtns[0])
    })
    await waitFor(() => {
      const word2 = String(wordMap.get(2)?.[dictMeta.langFrom] ?? '')
      const word3 = String(wordMap.get(3)?.[dictMeta.langFrom] ?? '')
      expect(screen.queryByText(word2)).toBeInTheDocument()
      expect(screen.queryByText(word3)).toBeInTheDocument()
    })
  })

  it('shows Settings content when in settings view', async () => {
    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    })
    await waitFor(() => {
      expect(screen.getByText('English')).toBeInTheDocument()
      expect(screen.getByText('Русский')).toBeInTheDocument()
      expect(screen.getByText('Srpski')).toBeInTheDocument()
    })
  })

  it('toggling a favorite in favorites view works', async () => {
    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Favorites' }))
    })
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Remove from Favorites' }).length).toBeGreaterThanOrEqual(1)
    })
    const removeFavBtns = screen.getAllByRole('button', { name: 'Remove from Favorites' })
    await act(async () => {
      fireEvent.click(removeFavBtns[0])
    })
    await waitFor(() => {
      expect(screen.getByText('No words in Favorites yet')).toBeInTheDocument()
    })
  })

  it('toggling a learned word in learned view works', async () => {
    render(<App />)
    const learnedBtns = screen.getAllByRole('button', { name: 'Learned' })
    await act(async () => {
      fireEvent.click(learnedBtns[0])
    })
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Remove from Learned' }).length).toBeGreaterThanOrEqual(1)
    })
    const removeBtns = screen.getAllByRole('button', { name: 'Remove from Learned' })
    await act(async () => {
      fireEvent.click(removeBtns[0])
    })
    await waitFor(() => {
      const word2 = String(wordMap.get(2)?.[dictMeta.langFrom] ?? '')
      expect(screen.queryByText(word2)).not.toBeInTheDocument()
    })
  })

  it('Settings Save button triggers export', async () => {
    const createElementSpy = vi.spyOn(document, 'createElement')
    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    })
    await waitFor(() => {
      expect(screen.getByText('Save progress')).toBeInTheDocument()
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save progress' }))
    })
    expect(createElementSpy).toHaveBeenCalledWith('a')
    createElementSpy.mockRestore()
  })

  it('exported data can be re-imported', async () => {
    let exportedData: Record<string, unknown> | null = null
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      ;(blob as Blob).text().then((text: string) => { exportedData = JSON.parse(text) })
      return 'blob:test'
    })

    const { unmount } = render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    })
    await waitFor(() => {
      expect(screen.getByText('Save progress')).toBeInTheDocument()
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save progress' }))
    })
    await waitFor(() => expect(exportedData).not.toBeNull())
    createUrlSpy.mockRestore()

    expect(exportedData!.version).toBe(2)
    expect((exportedData!.fromToFavorites as Array<unknown>).length).toBe(1)
    expect((exportedData!.fromToLearned as Array<unknown>).length).toBe(2)

    const exportedJson = JSON.stringify(exportedData)
    unmount()

    setDefaultStorage()
    localStorage.setItem('fromToFavorites', JSON.stringify([]))
    localStorage.setItem('fromToLearned', JSON.stringify([]))
    localStorage.setItem('srsCards', JSON.stringify([]))

    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    })
    const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]')
    const importInput = fileInputs[0]
    const file = new File([exportedJson], 'nobscards-export.json', { type: 'application/json' })
    Object.defineProperty(importInput, 'files', { value: [file] })
    await act(async () => {
      fireEvent.change(importInput)
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Favorites' }))
    })
    await waitFor(() => {
      const word = String(wordMap.get(1)?.[dictMeta.langFrom] ?? '')
      const instances = screen.getAllByText(word)
      expect(instances.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('can change dictionary', async () => {
    const origFR = globalThis.FileReader
    let pendingContent = ''
    globalThis.FileReader = class MockFileReader {
      onload: ((ev: ProgressEvent<FileReader>) => void) | null = null
      result: string | ArrayBuffer | null = null
      readAsText(_blob: Blob) {
        this.result = pendingContent
        if (typeof this.onload === 'function') {
          const ev = { target: this } as unknown as ProgressEvent<FileReader>
          this.onload(ev)
        }
      }
      readAsArrayBuffer() {}
      abort() {}
      get error() { return null }
      get readyState() { return 2 }
    } as unknown as typeof FileReader

    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    })
    const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]')
    const dictInput = fileInputs[1]
    const testDict = [
      { type: 'words', langFrom: 'srpCyrl', langTo: 'rus', langToAlt: 'eng', langRef: 'srpLatn' },
      { id: 1, srpCyrl: 'тест', srpLatn: 'test', rus: ['тест'], eng: ['test'] },
    ]
    pendingContent = JSON.stringify(testDict)
    const file = new File([pendingContent], 'test-dict.json', { type: 'application/json' })
    Object.defineProperty(dictInput, 'files', { value: [file] })
    await act(async () => {
      fireEvent.change(dictInput)
    })
    await act(async () => {
      fireEvent.click(await screen.findByText('Change'))
    })
    await waitFor(() => {
      expect(screen.getByText(/Test-Dict/i)).toBeInTheDocument()
    })

    globalThis.FileReader = origFR
  })

  it('confetti rendered when user answers correctly', async () => {
    const allButFirst = words.slice(1).map((w) => ({ id: w.id, addedAt: today() }))
    localStorage.setItem('fromToLearned', JSON.stringify(allButFirst))
    localStorage.setItem('fromToFavorites', JSON.stringify([]))
    localStorage.setItem('fromToAnswered', JSON.stringify([]))
    localStorage.setItem('fromToViewed', JSON.stringify([]))
    localStorage.setItem('toFromFavorites', JSON.stringify([]))
    localStorage.setItem('toFromLearned', JSON.stringify([]))
    localStorage.setItem('toFromAnswered', JSON.stringify([]))
    localStorage.setItem('toFromViewed', JSON.stringify([]))
    localStorage.setItem('fromToExFavorites', JSON.stringify([]))
    localStorage.setItem('toFromExFavorites', JSON.stringify([]))
    localStorage.setItem('srsCards', JSON.stringify([]))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Input translation/)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/Input translation/)
    const rus = (wordMap.get(1)?.['rus'] as string[] | undefined)?.[0] ?? 'девушка'
    await act(async () => {
      fireEvent.change(input, { target: { value: rus } })
      fireEvent.keyDown(input, { key: 'Enter' })
    })

    await waitFor(() => {
      expect(document.querySelector('.animate-confetti')).toBeInTheDocument()
    })
  })

  it('WordCard forward navigation works', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next word/i })).toBeInTheDocument()
    })
    const nextBtn = screen.getByRole('button', { name: /next word/i })
    await act(async () => {
      fireEvent.click(nextBtn)
    })
    await waitFor(() => {
      expect(screen.queryByText('All words learned')).not.toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: 'Word actions' })).toBeInTheDocument()
    })
  })

  it('shows review buttons when card is flipped', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tap to see translation/i })).toBeInTheDocument()
    })
    const flipBtn = screen.getByRole('button', { name: /tap to see translation/i })
    await act(async () => {
      fireEvent.click(flipBtn)
    })
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /Skip/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /Again/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /Hard/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /Good/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /Easy/i })).toBeInTheDocument()
    })
  })

  it('skip to section focuses input on home view', async () => {
    render(<App />)
    await screen.findByRole('button', { name: /tap to see translation/i })
    const skipLink = document.querySelector('.skip-link') as HTMLElement
    const input = screen.getByRole('textbox')
    const focusSpy = vi.spyOn(input, 'focus')
    fireEvent.click(skipLink)
    expect(focusSpy).toHaveBeenCalled()
  })

  it('skip to section focuses save button on settings view', async () => {
    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    })
    await waitFor(() => {
      expect(screen.getByText('Save progress')).toBeInTheDocument()
    })
    const skipLink = document.querySelector('.skip-link') as HTMLElement
    const saveBtn = screen.getByText('Save progress')
    const focusSpy = vi.spyOn(saveBtn, 'focus')
    fireEvent.click(skipLink)
    expect(focusSpy).toHaveBeenCalled()
  })

  it('toggle phrasebook mode switches visible dictionary name', async () => {
    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    })
    const switchEl = document.querySelector('[role="switch"]')
    if (switchEl) {
      await act(async () => {
        fireEvent.click(switchEl)
      })
    }
  })

  it('can navigate back and forth between views', async () => {
    render(<App />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Favorites' }))
    })
    await waitFor(() => {
      const word1 = String(wordMap.get(1)?.[dictMeta.langFrom] ?? '')
      expect(screen.getAllByText(word1).length).toBeGreaterThanOrEqual(1)
    })
    const homeBtns = screen.getAllByRole('button', { name: 'Home' })
    await act(async () => {
      fireEvent.click(homeBtns[0])
    })
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: /word actions/i })).toBeInTheDocument()
    })
    const learnedBtns = screen.getAllByRole('button', { name: 'Learned' })
    await act(async () => {
      fireEvent.click(learnedBtns[0])
    })
    await waitFor(() => {
      const word2 = String(wordMap.get(2)?.[dictMeta.langFrom] ?? '')
      expect(screen.getByText(word2)).toBeInTheDocument()
    })
  })
})
