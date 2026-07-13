import { useState, useRef, useCallback, useEffect } from 'react'
import type { AppSettings, ExportedData, Word, DictMeta } from '../types'

interface SettingsProps {
  settings: AppSettings
  onUpdate: (settings: AppSettings) => void
  onReset: () => void
  dictionaryId: string
  onExport: () => void
  onImportData: (data: ExportedData) => void
  onChangeDictionary: (words: Word[], meta?: DictMeta, dictName?: string) => void
  saveRef?: React.RefObject<HTMLButtonElement | null>
  initialDictName?: string | null
}

export default function Settings({
  settings,
  onUpdate,
  onReset,
  dictionaryId,
  onExport,
  onImportData,
  onChangeDictionary,
  saveRef: saveRefProp,
  initialDictName,
}: SettingsProps) {
  const [pendingWrong, setPendingWrong] = useState(
    typeof settings.autoFlipOnWrong === 'number' ? settings.autoFlipOnWrong : 3,
  )
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [pendingDict, setPendingDict] = useState<{ words: Word[]; meta?: DictMeta } | null>(null)
  const [pendingDictFileName, setPendingDictFileName] = useState('')
  const [dictFileName, setDictFileName] = useState(initialDictName ?? 'words-srp-rus-1000')
  const prevDictIdRef = useRef(dictionaryId)
  const prevDictNameRef = useRef(initialDictName)
  const importRef = useRef<HTMLInputElement>(null)
  const dictRef = useRef<HTMLInputElement>(null)
  const errorPopover = useRef<HTMLDivElement>(null)
  const dictConfirmPopover = useRef<HTMLDivElement>(null)
  const importSuccessPopover = useRef<HTMLDivElement>(null)
  const internalSaveRef = useRef<HTMLButtonElement>(null)
  const saveRef = saveRefProp ?? internalSaveRef

  useEffect(() => {
    if (prevDictIdRef.current !== dictionaryId) {
      prevDictIdRef.current = dictionaryId
      setDictFileName(initialDictName ?? 'words-srp-rus-1000')
    } else if (prevDictNameRef.current !== initialDictName) {
      prevDictNameRef.current = initialDictName
      setDictFileName(initialDictName ?? 'words-srp-rus-1000')
    }
  }, [dictionaryId, initialDictName])

  const handleStepperKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    const group = target.closest<HTMLElement>('[role="group"]')
    if (!group) return
    const controls = Array.from(group.querySelectorAll<HTMLElement>('[data-stepper]'))
    const idx = controls.indexOf(target)
    if (idx === -1) return
    let next = -1
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        next = idx < controls.length - 1 ? idx + 1 : 0
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        next = idx > 0 ? idx - 1 : controls.length - 1
        break
      case 'Home':
        e.preventDefault()
        next = 0
        break
      case 'End':
        e.preventDefault()
        next = controls.length - 1
        break
    }
    if (next >= 0 && next < controls.length) {
      controls[next].focus()
    }
  }, [])

  const wrongEnabled = typeof settings.autoFlipOnWrong === 'number'
  const wrongValue: number = wrongEnabled ? (settings.autoFlipOnWrong as number) : pendingWrong

  const showPopover = (el: HTMLDivElement | null) => {
    requestAnimationFrame(() => el?.showPopover())
  }

  const handleImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target!.result as string) as ExportedData
        if (raw.dictId !== dictionaryId) {
          setImportError('Идентификатор словаря не совпадает. Загруженные данные относятся к другому словарю.')
          showPopover(errorPopover.current)
          return
        }
        if (
          !Array.isArray(raw.fromToFavorites) ||
          !Array.isArray(raw.fromToLearned) ||
          !Array.isArray(raw.fromToAnswered) ||
          !Array.isArray(raw.fromToViewed) ||
          !Array.isArray(raw.toFromFavorites) ||
          !Array.isArray(raw.toFromLearned) ||
          !Array.isArray(raw.toFromAnswered) ||
          !Array.isArray(raw.toFromViewed)
        ) {
          setImportError('Файл повреждён: отсутствуют обязательные поля данных.')
          showPopover(errorPopover.current)
          return
        }
        onImportData(raw)
        setImportSuccess('Данные успешно восстановлены!')
        showPopover(importSuccessPopover.current)
      } catch {
        setImportError('Не удалось прочитать файл. Проверьте формат.')
        showPopover(errorPopover.current)
      }
    }
    reader.readAsText(file)
  }

  const handleDictFile = (file: File) => {
    const fileName = file.name.replace(/\.json$/i, '')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target!.result as string) as unknown[]
        if (!Array.isArray(raw) || raw.length === 0) {
          setImportError('Файл не является словарём. Ожидается массив слов.')
          showPopover(errorPopover.current)
          return
        }

        const first = raw[0] as Record<string, unknown>
        const hasMeta = first && typeof first === 'object' && 'type' in first

        if (hasMeta) {
          const meta = first as unknown as DictMeta
          const wordData = raw.slice(1) as Record<string, unknown>[]
          if (wordData.length === 0 || typeof wordData[0].id !== 'number') {
            setImportError('Файл не является словарём. Ожидается массив слов с метаданными.')
            showPopover(errorPopover.current)
            return
          }
          const words = wordData.map((w) => ({ id: w.id as number, ...w }))
          setPendingDict({ words, meta })
          setPendingDictFileName(fileName)
        } else if (typeof first.id !== 'number') {
          setImportError('Файл не является словарём. Ожидается массив слов.')
          showPopover(errorPopover.current)
          return
        } else {
          const words = raw.map((w) => w as Word)
          setPendingDict({ words })
          setPendingDictFileName(fileName)
        }

        showPopover(dictConfirmPopover.current)
      } catch {
        setImportError('Не удалось прочитать файл. Проверьте формат.')
        showPopover(errorPopover.current)
      }
    }
    reader.readAsText(file)
  }

  const confirmDictChange = () => {
    if (pendingDict) {
      onChangeDictionary(pendingDict.words, pendingDict.meta, pendingDictFileName)
      setDictFileName(pendingDictFileName)
      setPendingDict(null)
      setPendingDictFileName('')
    }
    dictConfirmPopover.current?.hidePopover()
  }

  return (
    <section className="w-full mx-auto space-y-6 max-sm:max-w-[70%] sm:max-w-md">
      <h2 className="text-xl font-semibold text-subhead text-center">Настройки</h2>

      <label className="flex items-start gap-3 cursor-pointer group pt-2">
        <input
          type="checkbox"
          checked={settings.autoAdvanceOnLearn}
          onChange={() =>
            onUpdate({
              ...settings,
              autoAdvanceOnLearn: !settings.autoAdvanceOnLearn,
            })
          }
          className="mt-0.5"
        />
        <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
          Автоматически сменять слово при добавлении в пройденные
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={settings.autoAddAnsweredToLearned}
          onChange={() =>
            onUpdate({
              ...settings,
              autoAddAnsweredToLearned: !settings.autoAddAnsweredToLearned,
            })
          }
          className="mt-0.5"
        />
        <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
          Автоматически добавлять разгаданные слова в пройденные
        </span>
      </label>

      <div className="space-y-3" role="group" aria-label="Автопоказ карточки после неправильных попыток" onKeyDown={handleStepperKeyDown}>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={wrongEnabled}
            onChange={() =>
              onUpdate({
                ...settings,
                autoFlipOnWrong: wrongEnabled ? false : pendingWrong,
              })
            }
            className="mt-0.5"
            data-stepper
          />
          <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
            Автоматически показывать карточку слова после...
          </span>
        </label>
        <div className="flex max-sm:flex-col max-sm:items-start sm:items-center gap-3 ml-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const v = Math.max(1, wrongValue - 1)
                setPendingWrong(v)
                if (wrongEnabled) onUpdate({ ...settings, autoFlipOnWrong: v })
              }}
              disabled={!wrongEnabled}
              tabIndex={-1}
              data-stepper
              className="w-8 h-8 shrink-0 rounded-full bg-subhead/20 text-subhead flex items-center justify-center text-lg transition-all duration-150 hover:bg-subhead/40 focus-visible:bg-subhead/40 disabled:opacity-30 disabled:cursor-not-allowed focus-ring focus-circle"
              title="Уменьшить"
              aria-label="Уменьшить"
            >
              <i className="bi bi-dash" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={wrongValue}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '')
                const v = cleaned === '' ? 1 : Math.min(9, parseInt(cleaned, 10))
                setPendingWrong(v)
                if (wrongEnabled) onUpdate({ ...settings, autoFlipOnWrong: v })
              }}
              onBlur={() => {
                const v = Math.min(9, Math.max(1, wrongValue))
                setPendingWrong(v)
                if (wrongEnabled) onUpdate({ ...settings, autoFlipOnWrong: v })
              }}
              disabled={!wrongEnabled}
              tabIndex={-1}
              data-stepper
              className="text-lg font-mono text-accent w-10 text-center bg-transparent border-none outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none caret-caret"
            />
            <button
              onClick={() => {
                const v = Math.min(9, wrongValue + 1)
                setPendingWrong(v)
                if (wrongEnabled) onUpdate({ ...settings, autoFlipOnWrong: v })
              }}
              disabled={!wrongEnabled}
              tabIndex={-1}
              data-stepper
              className="w-8 h-8 shrink-0 rounded-full bg-subhead/20 text-subhead flex items-center justify-center text-lg transition-all duration-150 hover:bg-subhead/40 focus-visible:bg-subhead/40 disabled:opacity-30 disabled:cursor-not-allowed focus-ring focus-circle"
              title="Увеличить"
              aria-label="Увеличить"
            >
              <i className="bi bi-plus" />
            </button>
          </div>
          <span className="text-sm text-text opacity-60">неправильных попыток</span>
        </div>
      </div>

      <div className="space-y-3" role="group" aria-label="Порог совпадения разговорника" onKeyDown={handleStepperKeyDown}>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={settings.phrasebookMode}
            onChange={() =>
              onUpdate({
                ...settings,
                phrasebookMode: !settings.phrasebookMode,
              })
            }
            className="mt-0.5"
            data-stepper
          />
          <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
            Использовать режим разговорника с условием:
          </span>
        </label>
        <div className="flex max-sm:flex-col max-sm:items-start sm:items-center gap-3 ml-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const v = Math.max(50, settings.phrasebookThreshold - 5)
                onUpdate({ ...settings, phrasebookThreshold: v })
              }}
              disabled={!settings.phrasebookMode}
              tabIndex={-1}
              data-stepper
              className="w-8 h-8 shrink-0 rounded-full bg-subhead/20 text-subhead flex items-center justify-center text-lg transition-all duration-150 hover:bg-subhead/40 focus-visible:bg-subhead/40 disabled:opacity-30 disabled:cursor-not-allowed focus-ring focus-circle"
              title="Уменьшить"
              aria-label="Уменьшить"
            >
              <i className="bi bi-dash" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={settings.phrasebookThreshold}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '')
                const v = cleaned === '' ? 50 : parseInt(cleaned, 10)
                onUpdate({ ...settings, phrasebookThreshold: v })
              }}
              onBlur={() => {
                const v = Math.min(100, Math.max(50, settings.phrasebookThreshold))
                onUpdate({ ...settings, phrasebookThreshold: v })
              }}
              disabled={!settings.phrasebookMode}
              tabIndex={-1}
              data-stepper
              className="text-lg font-mono text-accent w-10 text-center bg-transparent border-none outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none caret-caret"
            />
            <button
              onClick={() => {
                const v = Math.min(100, settings.phrasebookThreshold + 5)
                onUpdate({ ...settings, phrasebookThreshold: v })
              }}
              disabled={!settings.phrasebookMode}
              tabIndex={-1}
              data-stepper
              className="w-8 h-8 shrink-0 rounded-full bg-subhead/20 text-subhead flex items-center justify-center text-lg transition-all duration-150 hover:bg-subhead/40 focus-visible:bg-subhead/40 disabled:opacity-30 disabled:cursor-not-allowed focus-ring focus-circle"
              title="Увеличить"
              aria-label="Увеличить"
            >
              <i className="bi bi-plus" />
            </button>
          </div>
          <span className="text-sm text-text opacity-60">% совпадения для засчитывания ответа</span>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={settings.useAltInputLang}
          onChange={() =>
            onUpdate({
              ...settings,
              useAltInputLang: !settings.useAltInputLang,
            })
          }
          className="mt-0.5"
        />
        <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
          Использовать альтернативный язык ввода (при наличии)
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={settings.useRefLangForLabels}
          onChange={() =>
            onUpdate({
              ...settings,
              useRefLangForLabels: !settings.useRefLangForLabels,
            })
          }
          className="mt-0.5"
        />
        <span className="text-sm text-text leading-relaxed group-hover:text-accent group-focus-visible:text-accent transition-colors duration-150">
          Использовать язык перевода в текстах заданий (при наличии)
        </span>
      </label>

      <div className="space-y-3">
        <button
          ref={saveRef}
          onClick={onExport}
          className="w-full px-4 py-2 rounded-lg border border-text/30 text-text text-sm transition-all duration-200 hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent cursor-pointer"
        >
          <i className="bi bi-download mr-2" />
          Сохранить пройденное
        </button>

        <button
          onClick={() => importRef.current?.click()}
          className="w-full px-4 py-2 rounded-lg border border-text/30 text-text text-sm transition-all duration-200 hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent cursor-pointer"
        >
          <i className="bi bi-upload mr-2" />
          Загрузить пройденное
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImportFile(file)
            e.target.value = ''
          }}
        />

        <button
          onClick={() => dictRef.current?.click()}
          className="w-full px-4 py-2 rounded-lg border border-text/30 text-text text-sm transition-all duration-200 hover:border-caret hover:text-caret focus-visible:border-caret focus-visible:text-caret cursor-pointer"
        >
          <i className="bi bi-book mr-2" />
          Сменить словарь
        </button>
        <input
          ref={dictRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleDictFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {/* Error popover */}
      <div
        ref={errorPopover}
        popover="manual"
        className="rounded-xl bg-subhead-alt border border-text/20 outline outline-1 outline-error p-6 text-center fixed inset-0 m-auto w-80 h-fit"
      >
        <p className="text-text text-sm mb-4">{importError}</p>
        <button
          onClick={() => errorPopover.current?.hidePopover()}
          className="px-4 py-1.5 rounded-lg bg-text/10 text-text text-sm transition-all duration-200 hover:bg-text/20 focus-visible:bg-text/20 cursor-pointer"
        >
          OK
        </button>
      </div>

      {/* Dictionary change confirm popover */}
      <div
        ref={dictConfirmPopover}
        popover="manual"
        className="rounded-xl bg-subhead-alt border border-text/20 outline outline-1 outline-subhead p-6 text-center fixed inset-0 m-auto w-80 h-fit"
      >
        <p className="text-text text-sm mb-4">Сменить словарь?<br/>Все данные (избранное, пройденное, счётчики) будут сброшены.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={confirmDictChange}
            className="px-4 py-1.5 rounded-lg bg-text/10 text-text text-sm transition-all duration-200 hover:bg-subhead hover:text-bg focus-visible:bg-subhead focus-visible:text-bg cursor-pointer"
          >
            Сменить
          </button>
          <button
            onClick={() => { setPendingDict(null); dictConfirmPopover.current?.hidePopover() }}
            className="px-4 py-1.5 rounded-lg bg-text/10 text-text text-sm transition-all duration-200 hover:bg-text/20 focus-visible:bg-text/20 cursor-pointer"
          >
            Отмена
          </button>
        </div>
      </div>

      <div>
        <button
          popoverTarget="reset-confirm"
          className="w-full px-4 py-2 rounded-lg border border-error/50 text-error text-sm transition-all duration-200 hover:bg-error/10 focus-visible:bg-error/10 cursor-pointer"
        >
          Сбросить данные
        </button>
        <div
          id="reset-confirm"
          popover="auto"
          className="rounded-xl bg-subhead-alt border border-text/20 outline outline-1 outline-subhead p-6 text-center fixed inset-0 m-auto w-80 h-fit"
        >
          <p className="text-text text-sm mb-4">Удалить все данные?<br/>Избранное, пройденное и счётчики будут очищены, а словарь сброшен.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onReset}
              popoverTarget="reset-confirm"
              popoverTargetAction="hide"
              className="px-4 py-1.5 rounded-lg bg-text/10 text-text text-sm transition-all duration-200 hover:bg-subhead hover:text-bg focus-visible:bg-subhead focus-visible:text-bg cursor-pointer"
            >
              Сбросить
            </button>
            <button
              popoverTarget="reset-confirm"
              popoverTargetAction="hide"
              className="px-4 py-1.5 rounded-lg bg-text/10 text-text text-sm transition-all duration-200 hover:bg-text/20 focus-visible:bg-text/20 cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>

      <div aria-live="polite" className="text-center">
        <span className="text-sm text-text/40">
          {dictFileName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')} loaded
        </span>
      </div>

      {/* Import success popover */}
      <div
        ref={importSuccessPopover}
        popover="manual"
        className="rounded-xl bg-subhead-alt border border-text/20 outline outline-1 outline-accent p-6 text-center fixed inset-0 m-auto w-80 h-fit"
      >
        <p className="text-text text-sm mb-4">{importSuccess}</p>
        <button
          onClick={() => importSuccessPopover.current?.hidePopover()}
          className="px-4 py-1.5 rounded-lg bg-text/10 text-text text-sm transition-all duration-200 hover:bg-text/20 focus-visible:bg-text/20 cursor-pointer"
        >
          OK
        </button>
      </div>
    </section>
  )
}
